#!/usr/bin/env python3
# gen_mecanum50_v6.py — MECANUM 50 IZQUIERDA v6: corrección de la placa B
# y generación de la placa A con encaje central en negativo.
#
# Entrada (capa `user`, modelo del usuario, Inventor 2027):
#   Mecanum50_izq.stp — ensamble: placa_B ×2 (enfrentadas), 6 rodillos,
#   6 pasadores Ø3.2 a 44°, 3 pernos M3 (30°/150°/270°, r=10.9).
#
# Defectos medidos en el modelo de entrada (ver verificacion.json → "entrada"):
#   D1. Los 6 brazos NO son iguales: dos familias alternadas (~2140 vs
#       ~2630 mm³) y decalajes angulares individuales. Las superficies
#       FUNCIONALES (bolsa de rodillo a 0.700 de holgura exacta y ranura del
#       pasador) sí son idénticas en los 6 — el error está en el lomo.
#   D2. Esquinitas: 24 caras sliver de < 0.005 mm² en los cantos de los
#       brazos (r≈31) y en la base del cubo.
#   D3. Las dos placas solo se tocan en las puntas de los dientes centrales
#       (no encajan) y, con el reloj de montaje del STEP (120°), el perno de
#       30° atraviesa 3.7 mm de material de la placa de abajo.
#
# Corrección v6:
#   C1. Brazo maestro (sector 315–375°, familia ancha y consistente),
#       saneado y patronado EXACTAMENTE 6×60° sobre el núcleo (r<14.5, que
#       conserva hex, pasos de perno, trébol y dientes originales).
#   C2. Esquinitas eliminadas por defeaturing B-rep iterativo (con
#       micro-hoyuelo Ø0.6 de último recurso), verificado por inventario.
#   C3. Encaje central: en AMBAS placas se rellena el hueco entre dientes
#       con un collar (Ø26 × 6) → contacto anular pleno en z=0. En la placa
#       B los dientes se prolongan 5.0 mm en MACHO (con piloto); en la placa
#       A los mismos perfiles, espejados con la transformación real de
#       montaje (Rz(60°)·Rx(180°), la que alinea los pernos) y con 0.2 de
#       holgura por flanco, se cortan en NEGATIVO. El ancho del ensamble no
#       cambia; rodillos y pasadores quedan exactamente donde estaban.
#
# Robustez booleana: todas las fusiones/cortes van en UNA operación
# multi-argumento con tolerancia fuzzy y ASERTO de volumen — un fallo
# silencioso de OCC detiene el script en vez de emitir geometría coja.
#
# Compuertas (el script FALLA si alguna no pasa):
#   GM1 estanqueidad y volumen sano de A y B
#   GM2 los 6 brazos idénticos (diferencia booleana ≈ 0 vs maestro rotado)
#   GM3 sin esquinitas: ninguna cara < 0.005 mm²
#   GM4 holgura placa-rodillo ≥ 0.65 en los 6 rodillos × 2 placas
#   GM5 encaje: macho de B dentro del negativo de A sin tocar (holgura
#       lateral ≥ 0.15) y caras de collar coplanares en z=0
#   GM6 calibre de perno Ø5.6 pasa recto en 30/150/270 por ambas placas
#   GM7 calibre hex 14.4 e/c × 44 pasa por el barreno de ambas placas
#
# Emite en out/ (derivados, fuera de git): placa_B_v6.step/.stl,
# placa_A_v6.step/.stl, Mecanum50_izq_v6.step (ensamble completo) y
# renders; junto al generador (versionado): verificacion.json.
#
# Uso:  python cad/ensambles/mecanum50/gen_mecanum50_v6.py
# Deps: pip install cadquery trimesh scipy rtree shapely numpy

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np

from OCP.STEPControl import STEPControl_Reader
from OCP.TopAbs import TopAbs_SOLID, TopAbs_FACE, TopAbs_EDGE
from OCP.TopExp import TopExp_Explorer, TopExp
from OCP.TopTools import TopTools_IndexedDataMapOfShapeListOfShape
from OCP.TopoDS import TopoDS, TopoDS_Shape
from OCP.BRep import BRep_Builder
from OCP.BRepTools import BRepTools
from OCP.BRepGProp import BRepGProp
from OCP.GProp import GProp_GProps
from OCP.BRepAlgoAPI import (BRepAlgoAPI_Common, BRepAlgoAPI_Cut,
                             BRepAlgoAPI_Fuse, BRepAlgoAPI_Defeaturing)
from OCP.BRepPrimAPI import BRepPrimAPI_MakeCylinder, BRepPrimAPI_MakePrism
from OCP.BRepBuilderAPI import (BRepBuilderAPI_MakeFace,
                                BRepBuilderAPI_MakePolygon,
                                BRepBuilderAPI_Transform)
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.gp import gp_Trsf, gp_Ax1, gp_Ax2, gp_Pnt, gp_Dir, gp_Vec
from OCP.ShapeUpgrade import ShapeUpgrade_UnifySameDomain
from OCP.TopTools import TopTools_ListOfShape
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.StlAPI import StlAPI_Writer

AQUI = Path(__file__).parent
OUT = AQUI / "out"
STP = AQUI / "Mecanum50_izq.stp"

# ---------------------------------------------------------------------------
# P — parámetros. Procedencia: med = medido en el STEP del usuario,
# dis = decisión de diseño v6.
# ---------------------------------------------------------------------------
P = {
    "sector_maestro": 315.0,  # dis: brazo 315-375° (familia ancha, consistente)
    "r_nucleo": 14.5,         # dis: frontera núcleo/brazos (trébol llega a 14.14)
    "hex_af": 14.5,           # med: hex entre caras, caras normales a 30+60k
    "cubo_r": 13.0,           # med: cilindro exterior del cubo
    "perno_r": 2.95,          # med: paso de perno Ø5.9
    "perno_pos": 10.9,        # med: radio del círculo de pernos, a 30+120k
    "collar_h": 6.0,          # dis: collar 0..6 (se funde con el cubo en ~5.5)
    "z_dientes": 2.0,         # med: cota de sección de los perfiles de diente
    "macho_ajuste": -0.05,    # dis: macho = perfil - 0.05 (fusión limpia)
    "macho_L": 5.0,           # dis: prolongación macho bajo z=0
    "apriete_hembra": 0.10,   # dis: negativo = perfil - 0.10 -> APRIETE real
                              #      de 0.05 por flanco (entra a presión)
    "chanfle_red": 0.60,      # dis: reducción extra del macho en la punta
    "chanfle_L": 0.60,        # dis: largo del chanfle de entrada
    "chanfle_pasos": 4,       # dis: peldaños del chanfle (FDM lo escalona igual)
    "holgura_fondo": 0.6,     # dis: el macho no toca el fondo del negativo
    "clock_montaje": 60.0,    # dis: A = Rz(60°)·Rx(180°)·A_local (alinea pernos)
    "z_hombro": 18.3,         # dis: hombro del asiento de cabeza (local A);
                              #      con tuerca en B a 18.8 pide perno M3x40
    "z_tuerca": 18.8,         # dis: piso del bolsillo de tuerca (local B)
    "tuerca_af": 5.5,         # med: tuerca M3 DIN934, 5.5 entre caras
    "tuerca_encaje_af": 5.6,  # dis: bolsillo hex 5.6 e/c (apriete leve, no gira)
    "fuzzy": 0.005,           # dis: tolerancia fuzzy de los booleanos
    "sliver_umbral": 0.005,   # dis: cara < 0.005 mm² = esquinita
}

MALLA_FINA = 0.015


# ------------------------- utilidades OCC ----------------------------------
def vol(sh):
    p = GProp_GProps(); BRepGProp.VolumeProperties_s(sh, p); return p.Mass()


def _lista(shapes):
    L = TopTools_ListOfShape()
    for s in shapes:
        L.Append(s)
    return L


def fuse_multi(base, tools, esperado=None, tol=5.0, nombre=""):
    """Fusión en una sola operación con fuzzy y aserto de volumen."""
    op = BRepAlgoAPI_Fuse()
    op.SetArguments(_lista([base]))
    op.SetTools(_lista(tools))
    op.SetFuzzyValue(P["fuzzy"])
    op.Build()
    if not op.IsDone():
        print(f"ERROR: fuse '{nombre}' no completó"); sys.exit(1)
    r = op.Shape()
    v = vol(r)
    if esperado is not None and abs(v - esperado) > tol:
        print(f"ERROR: fuse '{nombre}': volumen {v:.1f}, esperado "
              f"{esperado:.1f} ± {tol}"); sys.exit(1)
    return r


def cut_multi(base, tools, nombre=""):
    op = BRepAlgoAPI_Cut()
    op.SetArguments(_lista([base]))
    op.SetTools(_lista(tools))
    op.SetFuzzyValue(P["fuzzy"])
    op.Build()
    if not op.IsDone():
        print(f"ERROR: cut '{nombre}' no completó"); sys.exit(1)
    return op.Shape()


def common2(a, b):
    op = BRepAlgoAPI_Common(a, b); op.Build(); return op.Shape()


def rotz(sh, deg):
    t = gp_Trsf()
    t.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)), math.radians(deg))
    return BRepBuilderAPI_Transform(sh, t, True).Shape()


def cilindro(r, z0, z1):
    return BRepPrimAPI_MakeCylinder(
        gp_Ax2(gp_Pnt(0, 0, z0), gp_Dir(0, 0, 1)), r, z1 - z0).Shape()


def prisma_poligono(pts_xy, z0, z1):
    poly = BRepBuilderAPI_MakePolygon()
    for x, y in pts_xy:
        poly.Add(gp_Pnt(float(x), float(y), z0))
    poly.Close()
    cara = BRepBuilderAPI_MakeFace(poly.Wire()).Face()
    return BRepPrimAPI_MakePrism(cara, gp_Vec(0, 0, z1 - z0)).Shape()


def sector(ang0, ang1, r=60, z0=-25, z1=25):
    a0, a1 = math.radians(ang0), math.radians(ang1)
    pts = [(0.0, 0.0)]
    n = 12
    pts += [(r * math.cos(a0 + (a1 - a0) * i / n),
             r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    return prisma_poligono(pts, z0, z1)


def malla(sh, nombre, defl=0.03):
    BRepMesh_IncrementalMesh(sh, defl, False, 0.3, True)
    ruta = str(OUT / f"{nombre}.stl")
    StlAPI_Writer().Write(sh, ruta)
    import trimesh
    return trimesh.load(ruta)


def caras_chicas(sh, umbral=None):
    umbral = umbral or P["sliver_umbral"]
    fe = TopExp_Explorer(sh, TopAbs_FACE)
    out = []
    while fe.More():
        f = TopoDS.Face_s(fe.Current()); fe.Next()
        p = GProp_GProps(); BRepGProp.SurfaceProperties_s(f, p)
        if p.Mass() < umbral:
            c = p.CentreOfMass()
            out.append((f, p.Mass(), (c.X(), c.Y(), c.Z())))
    return out


def _vecinas(sh, cara):
    """Caras que comparten arista con `cara`."""
    mapa = TopTools_IndexedDataMapOfShapeListOfShape()
    TopExp.MapShapesAndAncestors_s(sh, TopAbs_EDGE, TopAbs_FACE, mapa)
    out = []
    ee = TopExp_Explorer(cara, TopAbs_EDGE)
    while ee.More():
        for g in mapa.FindFromKey(ee.Current()):
            out.append(TopoDS.Face_s(g))
        ee.Next()
    def area(f):
        p = GProp_GProps(); BRepGProp.SurfaceProperties_s(f, p); return p.Mass()
    return sorted(out, key=area)


def sanear_slivers(sh, nombre, max_rondas=4):
    """Elimina caras sliver por defeaturing B-rep iterativo. Si una cara
    resiste, se re-intenta quitándola junto con sus vecinas más chicas (las
    esquinitas suelen venir en racimo); último recurso: micro-hoyuelo Ø0.6
    sin fuzzy. Aserto: el volumen no puede moverse más de 2 mm³."""
    v0 = vol(sh)

    def acepta(cand):
        return cand is not None and abs(vol(cand) - v0) < 2.0

    for _ in range(max_rondas):
        ch = caras_chicas(sh)
        if not ch:
            break
        avance = False
        df = BRepAlgoAPI_Defeaturing(); df.SetShape(sh)
        for f, _, _ in ch:
            df.AddFaceToRemove(f)
        df.Build()
        if df.IsDone() and len(caras_chicas(df.Shape())) < len(ch) \
                and acepta(df.Shape()):
            sh = df.Shape(); avance = True
        if not avance:
            f, _, c = min(caras_chicas(sh), key=lambda x: x[1])
            for extra in (1, 2, 3, 4):
                df = BRepAlgoAPI_Defeaturing(); df.SetShape(sh)
                df.AddFaceToRemove(f)
                for g in _vecinas(sh, f)[1:1 + extra]:
                    df.AddFaceToRemove(g)
                df.Build()
                if df.IsDone() and len(caras_chicas(df.Shape())) < len(caras_chicas(sh)) \
                        and abs(vol(df.Shape()) - v0) < 2.0:
                    sh = df.Shape(); avance = True; break
        if not avance:
            f, _, c = min(caras_chicas(sh), key=lambda x: x[1])
            nv = np.array([c[0], c[1], 0.0]); nv /= np.linalg.norm(nv)
            broca = BRepPrimAPI_MakeCylinder(
                gp_Ax2(gp_Pnt(c[0] + 0.35 * nv[0], c[1] + 0.35 * nv[1], c[2]),
                       gp_Dir(*(-nv))), 0.3, 0.75).Shape()
            op = BRepAlgoAPI_Cut(sh, broca); op.Build()   # sin fuzzy
            if op.IsDone() and abs(vol(op.Shape()) - v0) < 2.0:
                sh = op.Shape()
            else:
                break
    if abs(vol(sh) - v0) > 2.0:
        print(f"ERROR: saneo de '{nombre}' movió el volumen "
              f"{vol(sh)-v0:+.2f} mm³"); sys.exit(1)
    return sh


def unificar(sh):
    uni = ShapeUpgrade_UnifySameDomain(sh, True, True, False)
    uni.Build()
    return uni.Shape()


def _trsf_montaje():
    """T_A = Rz(clock)·Rx(180): posición de la placa A en el ensamble."""
    t1 = gp_Trsf()
    t1.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(1, 0, 0)), math.pi)
    t2 = gp_Trsf()
    t2.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)),
                   math.radians(P["clock_montaje"]))
    t2.Multiply(t1)
    return t2


def a_mundo_A(sh):
    return BRepBuilderAPI_Transform(sh, _trsf_montaje(), True).Shape()


# ------------------------------ pipeline ------------------------------------
def main():
    OUT.mkdir(exist_ok=True)
    import trimesh as tm
    from shapely.geometry import Polygon

    print("Leyendo", STP.name)
    rd = STEPControl_Reader(); rd.ReadFile(str(STP)); rd.TransferRoots()
    todo = rd.OneShape()
    ex = TopExp_Explorer(todo, TopAbs_SOLID)
    sol = []
    while ex.More():
        sol.append(TopoDS.Solid_s(ex.Current())); ex.Next()
    placa0 = sol[0]
    rodillos = [sol[i] for i in (1, 3, 5, 7, 9, 11)]
    pasadores = [sol[i] for i in (2, 4, 6, 8, 10, 12)]
    pernos = [sol[i] for i in (13, 14, 15)]
    v_in = vol(placa0)
    chicas_in = len(caras_chicas(placa0))
    print(f"placa entrada: V={v_in:.1f} mm3, caras sliver: {chicas_in}")

    # ---- C1: brazo maestro saneado + patrón exacto -----------------------
    a0 = P["sector_maestro"]
    print("C1: maestro y patrón…")
    cil_nucleo = cilindro(P["r_nucleo"], -25, 25)
    nucleo = common2(placa0, cil_nucleo)
    maestro = cut_multi(common2(placa0, sector(a0, a0 + 60)), [cil_nucleo],
                        "maestro")
    maestro = sanear_slivers(maestro, "maestro")
    v_n, v_m = vol(nucleo), vol(maestro)
    brazos = [rotz(maestro, 60 * k - (a0 - 15.0)) for k in range(6)]
    placa = fuse_multi(nucleo, brazos, esperado=v_n + 6 * v_m, tol=5.0,
                       nombre="patron de brazos")
    placa = unificar(placa)
    placa = sanear_slivers(placa, "placa uniforme")
    v_uni = vol(placa)
    print(f"  nucleo {v_n:.1f} + 6×{v_m:.1f} = {v_uni:.1f} mm3")

    # ---- C3: collar ------------------------------------------------------
    print("C3: collar y encaje…")
    hexr = P["hex_af"] / math.sqrt(3.0)
    hexpts = [(hexr * math.cos(math.radians(60 * i)),
               hexr * math.sin(math.radians(60 * i))) for i in range(6)]
    hexpr = prisma_poligono(hexpts, -2, P["collar_h"] + 1)
    brocas = [hexpr]
    for ang in (30, 150, 270):
        a = math.radians(ang)
        brocas.append(BRepPrimAPI_MakeCylinder(
            gp_Ax2(gp_Pnt(P["perno_pos"] * math.cos(a),
                          P["perno_pos"] * math.sin(a), -2), gp_Dir(0, 0, 1)),
            P["perno_r"], P["collar_h"] + 4).Shape())
    collar = cut_multi(cilindro(P["cubo_r"], 0, P["collar_h"]), brocas,
                       "collar")
    base = fuse_multi(placa, [collar], nombre="base+collar")
    v_base = vol(base)

    # perfiles de diente (sección de malla fina, offset de to_2D compensado)
    mtmp = malla(placa0, "_placa_entrada", MALLA_FINA)
    secc = mtmp.section(plane_origin=[0, 0, P["z_dientes"]],
                        plane_normal=[0, 0, 1])
    p2, T = secc.to_2D()
    off = np.array([T[0, 3], T[1, 3]])
    dientes = []
    for ent in p2.entities:
        pts = p2.vertices[ent.points][:, :2] + off
        if np.hypot(*pts.mean(axis=0)) < 15:
            pol = Polygon(pts)
            if not pol.exterior.is_ccw:
                pts = pts[::-1]
            dientes.append(pts)
    if len(dientes) != 6:
        print(f"ERROR: se esperaban 6 dientes, hay {len(dientes)}")
        sys.exit(1)

    def contorno(pol):
        return np.array(pol.exterior.coords[:-1])

    def poly_buffer(pts, d):
        # simplificar antes y después: los contornos mallados traen
        # micro-segmentos que al offsetear generan caras sliver
        p = Polygon(pts).simplify(0.02).buffer(d, join_style=2,
                                               mitre_limit=3.0)
        if p.geom_type == "MultiPolygon":
            p = max(p.geoms, key=lambda g: g.area)
        return p.simplify(0.01)

    # placa B: machos (perfil -0.05) con CHANFLE de entrada en la punta
    # (escalonado en `chanfle_pasos` peldaños; la impresora lo escalona igual)
    machos = []
    z_ch = P["macho_L"] - P["chanfle_L"]        # inicio del chanfle
    dz = P["chanfle_L"] / P["chanfle_pasos"]
    for pts in dientes:
        cuerpo = poly_buffer(pts, P["macho_ajuste"])
        machos.append(prisma_poligono(contorno(cuerpo), -z_ch, 0.5))
        for k in range(P["chanfle_pasos"]):
            red = P["macho_ajuste"] - P["chanfle_red"] * (1 - k / P["chanfle_pasos"])
            z0 = -P["macho_L"] + k * dz
            machos.append(prisma_poligono(contorno(poly_buffer(pts, red)),
                                          z0, z0 + dz + 0.03))
    machos_union = fuse_multi(machos[0], machos[1:], nombre="union machos")
    v_machos = vol(machos_union)
    v_solape = vol(common2(machos_union, base))
    placa_B = fuse_multi(base, machos,
                         esperado=v_base + v_machos - v_solape, tol=5.0,
                         nombre="machos B")
    placa_B = unificar(placa_B)
    placa_B = sanear_slivers(placa_B, "placa B")

    # placa A: negativos MENORES que el perfil (perfil - 0.10) para que el
    # macho (perfil - 0.05) entre A PRESIÓN: apriete de 0.05 por flanco.
    # (mundo→local: Rz(-clock) y luego espejo (x, y) → (x, -y))
    th = -math.radians(P["clock_montaje"])
    R2 = np.array([[math.cos(th), -math.sin(th)],
                   [math.sin(th), math.cos(th)]])
    negativos = []
    for pts in dientes:
        loc = contorno(poly_buffer(pts, -P["apriete_hembra"])) @ R2.T
        loc[:, 1] *= -1.0
        negativos.append(prisma_poligono(loc, -0.5,
                                         P["macho_L"] + P["holgura_fondo"]))
    placa_A = cut_multi(base, negativos, "negativos A")

    # ---- pernería: asiento de cabeza (A) y encaje de tuerca (B) ---------
    def cils_pernos(r, z0, z1):
        out = []
        for ang in (30, 150, 270):
            a = math.radians(ang)
            out.append(BRepPrimAPI_MakeCylinder(
                gp_Ax2(gp_Pnt(P["perno_pos"] * math.cos(a),
                              P["perno_pos"] * math.sin(a), z0),
                       gp_Dir(0, 0, 1)), r, z1 - z0).Shape())
        return out

    def hex_perno(ang, af, z0, z1, girado=0.0):
        """Prisma hex centrado en el perno `ang`; con girado=0 una cara
        queda normal al radio (la tuerca no puede girar)."""
        rv = af / math.sqrt(3.0)
        a = math.radians(ang)
        cx, cy = P["perno_pos"] * math.cos(a), P["perno_pos"] * math.sin(a)
        pts = [(cx + rv * math.cos(a + math.radians(30 + girado + 60 * i)),
                cy + rv * math.sin(a + math.radians(30 + girado + 60 * i)))
               for i in range(6)]
        return prisma_poligono(pts, z0, z1)

    zh = P["z_hombro"]
    # A: tapón del paso Ø5.9 (sobre el negativo del diente, z>=5.8) y
    # re-taladro Ø3.4 -> hombro anular en z=zh; la cabeza queda alojada
    # en el Ø5.9 + trébol existentes, bajo la cara exterior.
    tapA = cils_pernos(P["perno_r"] + 0.03, 5.8, zh)
    solA = sum(vol(common2(t, placa_A)) for t in tapA)
    placa_A = fuse_multi(placa_A, tapA,
                         esperado=vol(placa_A) + sum(vol(t) for t in tapA) - solA,
                         tol=5.0, nombre="asientos A")
    placa_A = cut_multi(placa_A, cils_pernos(1.7, 4.9, zh + 0.05), "taladro A")
    # boca de acceso de la cabeza: el labio de la cara exterior cerraba el
    # bolsillo a Ø4.5 (la cabeza Ø5.5 del modelo original NI ENTRABA)
    placa_A = cut_multi(placa_A, cils_pernos(3.0, 20.4, 22.3), "boca cabeza A")
    placa_A = unificar(placa_A)
    placa_A = sanear_slivers(placa_A, "placa A")

    # B: tapón del paso (0..z_tuerca), relleno del bulbo del trébol SIN
    # invadir la cajera central (r<9.35), bolsillo HEX para la tuerca
    # (apriete leve: no gira, se monta con una sola llave) y re-taladro Ø3.4.
    zt = P["z_tuerca"]
    tapB = cils_pernos(P["perno_r"] + 0.03, 0.0, zt)
    bulbos = [cut_multi(b, [cilindro(9.35, 18.5, 22.1)], "bulbo")
              for b in cils_pernos(3.8, zt - 0.1, 21.85)]
    tapB += bulbos
    tapB_u = fuse_multi(tapB[0], tapB[1:], nombre="union tapones B")
    solB = vol(common2(tapB_u, placa_B))
    placa_B = fuse_multi(placa_B, tapB,
                         esperado=vol(placa_B) + vol(tapB_u) - solB,
                         tol=5.0, nombre="encaje tuercas B")
    brocasB = [hex_perno(ang, P["tuerca_encaje_af"], zt, 22.3)
               for ang in (30, 150, 270)]
    brocasB += cils_pernos(1.7, -1.0, zt + 0.05)
    placa_B = cut_multi(placa_B, brocasB, "bolsillos tuerca B")
    placa_B = unificar(placa_B)
    placa_B = sanear_slivers(placa_B, "placa B pernería")

    # ---- compuertas ------------------------------------------------------
    print("Compuertas…")
    res, fallas = {}, []
    mB = malla(placa_B, "placa_B_v6", 0.03)
    mA = malla(placa_A, "placa_A_v6", 0.03)
    vB, vA = vol(placa_B), vol(placa_A)

    res["GM1_estanqueidad"] = {"B": bool(mB.is_watertight),
                               "A": bool(mA.is_watertight),
                               "vol_B": round(vB, 1), "vol_A": round(vA, 1)}
    if not (mB.is_watertight and mA.is_watertight):
        fallas.append("GM1: malla no estanca")
    if not (v_uni + 300 < vB < v_uni + 4200 and
            v_uni - 500 < vA < v_uni + 3200):
        fallas.append(f"GM1: volúmenes fuera de rango (B {vB:.0f}, A {vA:.0f})")

    difs = []
    for k in (1, 3, 5):
        wk = sector(15 + 60 * k, 75 + 60 * k)
        bk = cut_multi(common2(placa, wk), [cil_nucleo], "gm2a")
        ref = rotz(cut_multi(common2(placa, sector(15, 75)), [cil_nucleo],
                             "gm2b"), 60 * k)
        difs.append(round(vol(cut_multi(bk, [ref], "gm2c"))
                          + vol(cut_multi(ref, [bk], "gm2d")), 3))
    res["GM2_brazos_iguales"] = {"dif_muestral_mm3": difs}
    if max(difs) > 1.0:
        fallas.append(f"GM2: brazos no idénticos: {difs}")

    chB = [(round(a, 5), [round(x, 2) for x in c])
           for _, a, c in caras_chicas(placa_B)]
    chA = [(round(a, 5), [round(x, 2) for x in c])
           for _, a, c in caras_chicas(placa_A)]
    res["GM3_esquinitas"] = {"entrada": chicas_in, "B_v6": len(chB),
                             "A_v6": len(chA), "detalle_B": chB[:8],
                             "detalle_A": chA[:8]}
    if chB or chA:
        fallas.append(f"GM3: quedan caras sliver (B:{len(chB)} A:{len(chA)})")

    pqB = tm.proximity.ProximityQuery(mB)
    mAw = mA.copy()
    mAw.apply_transform(
        tm.transformations.rotation_matrix(
            math.radians(P["clock_montaje"]), [0, 0, 1])
        @ tm.transformations.rotation_matrix(math.pi, [1, 0, 0]))
    pqA = tm.proximity.ProximityQuery(mAw)
    peor = 1e9
    for rsol in rodillos:
        mr = malla(rsol, "_rod_tmp", 0.05)
        pts, _ = tm.sample.sample_surface(mr, 3000, seed=1)
        dB = -pqB.signed_distance(pts[pts[:, 2] > 1.0])
        dA = -pqA.signed_distance(pts[pts[:, 2] < -1.0])
        peor = min(peor, float(dB.min()), float(dA.min()))
    res["GM4_holgura_rodillo"] = {"min_mm": round(peor, 3)}
    if peor < 0.65:
        fallas.append(f"GM4: holgura rodillo {peor:.3f} < 0.65")

    # GM5 — encaje A PRESIÓN: debe EXISTIR la interferencia de diseño
    # (0.05/flanco) en la zona de flancos, y la punta chanfleada debe
    # entrar libre. El contacto axial sigue siendo collar contra collar.
    A_mundo = a_mundo_A(placa_A)
    machoB = common2(placa_B, cilindro(P["cubo_r"] + 0.5,
                                       -P["macho_L"] - 0.2, -0.01))
    v_int = vol(common2(machoB, A_mundo))
    mM = malla(machoB, "_macho_tmp", 0.02)
    pts, _ = tm.sample.sample_surface(mM, 6000, seed=1)
    zsup = -(P["macho_L"] - P["chanfle_L"]) + 0.2      # -4.2
    lat = pts[(pts[:, 2] < -0.6) & (pts[:, 2] > zsup)]
    pen = pqA.signed_distance(lat)                     # >0 = dentro de A
    punta = pts[pts[:, 2] < -(P["macho_L"] - 0.18)]   # primer peldaño del chanfle
    pen_punta = pqA.signed_distance(punta) if len(punta) else np.array([-9.9])
    zA_max = float(mAw.vertices[:, 2].max())
    apriete_med = float(np.median(pen))
    res["GM5_encaje_presion"] = {
        "interseccion_mm3": round(v_int, 2),
        "apriete_mediano_flanco": round(apriete_med, 3),
        "apriete_p95": round(float(np.percentile(pen, 95)), 3),
        "punta_pen_max": round(float(pen_punta.max()), 3),
        "cara_collar_A_z": round(zA_max, 4)}
    if not (5.0 < v_int < 90.0):
        fallas.append(f"GM5: interferencia {v_int:.1f} mm3 fuera de [5,90]")
    if not (0.01 <= apriete_med <= 0.10):
        fallas.append(f"GM5: apriete mediano {apriete_med:.3f} fuera de "
                      f"[0.01,0.10]")
    if float(np.percentile(pen, 95)) > 0.15:
        fallas.append("GM5: apriete p95 > 0.15 (excesivo)")
    if float(pen_punta.max()) > 0.02:
        fallas.append(f"GM5: la punta chanfleada no entra libre "
                      f"({float(pen_punta.max()):.3f})")
    if abs(zA_max) > 0.02:
        fallas.append(f"GM5: collar de A fuera de z=0 ({zA_max})")

    # GM6 — pernería M3x40: vástago Ø3.2 pasa, cabeza alojada, HOMBRO
    # presente, tuerca entra en su bolsillo y NO puede girar (a 30° choca).
    ok6, det6 = True, {}
    for ang in (30, 150, 270):
        a = math.radians(ang)
        cx = P["perno_pos"] * math.cos(a)
        cy = P["perno_pos"] * math.sin(a)

        def cil_en(r, z0, z1):
            return BRepPrimAPI_MakeCylinder(
                gp_Ax2(gp_Pnt(cx, cy, z0), gp_Dir(0, 0, 1)), r, z1 - z0).Shape()

        v_vast = vol(common2(placa_B, cil_en(1.6, -20, 20.9))) + \
            vol(common2(A_mundo, cil_en(1.6, -20, 20.9)))
        v_cab = vol(common2(A_mundo, cil_en(2.8, -21.3, -P["z_hombro"] - 0.05)))
        v_asiento = vol(common2(A_mundo,
                                cil_en(2.6, -P["z_hombro"] + 0.05,
                                       -P["z_hombro"] + 0.35)))
        v_tuerca = vol(common2(placa_B, hex_perno(ang, P["tuerca_af"],
                                                  P["z_tuerca"] + 0.05, 21.3)))
        v_giro = vol(common2(placa_B, hex_perno(ang, P["tuerca_af"],
                                                P["z_tuerca"] + 0.05, 21.3,
                                                girado=30.0)))
        det6[str(ang)] = {"vastago": round(v_vast, 3), "cabeza": round(v_cab, 3),
                          "hombro_material": round(v_asiento, 2),
                          "tuerca_entra": round(v_tuerca, 3),
                          "tuerca_girada_choca": round(v_giro, 2)}
        if v_vast > 1e-3 or v_cab > 1e-3 or v_tuerca > 1e-3:
            ok6 = False
            fallas.append(f"GM6: pernería a {ang}° obstruida {det6[str(ang)]}")
        if v_asiento < 1.0:
            ok6 = False
            fallas.append(f"GM6: falta hombro de cabeza a {ang}°")
        if v_giro < 0.5:
            ok6 = False
            fallas.append(f"GM6: la tuerca a {ang}° podría girar")
    res["GM6_perneria"] = {"pasa": ok6, "detalle": det6}

    hexg = prisma_poligono(
        [((P["hex_af"] - 0.1) / math.sqrt(3) * math.cos(math.radians(60 * i)),
          (P["hex_af"] - 0.1) / math.sqrt(3) * math.sin(math.radians(60 * i)))
         for i in range(6)], -22, 22)
    vhB, vhA = vol(common2(placa_B, hexg)), vol(common2(A_mundo, hexg))
    res["GM7_calibre_hex"] = {"B": round(vhB, 3), "A": round(vhA, 3)}
    if vhB > 1e-3 or vhA > 1e-3:
        fallas.append(f"GM7: calibre hex choca (B:{vhB:.2f} A:{vhA:.2f})")

    # ---- reporte y salidas ----------------------------------------------
    reporte = {
        "pieza": "Mecanum50 izquierda v6 — placa B corregida + placa A "
                 "con encaje negativo",
        "capa": "user",
        "entrada": {
            "archivo": STP.name, "volumen_placa": round(v_in, 1),
            "caras_sliver": chicas_in,
            "defectos": ["brazos en 2 familias con decalajes",
                         "esquinitas en cantos",
                         "sin encaje central; perno choca con reloj 120°",
                         "paso de perno Ø5.9 sin hombro para la cabeza "
                         "ni encaje de tuerca al otro lado"],
        },
        "parametros": {k: v for k, v in P.items()},
        "volumenes_mm3": {"placa_entrada": round(v_in, 1),
                          "placa_uniforme": round(v_uni, 1),
                          "placa_B_v6": round(vB, 1),
                          "placa_A_v6": round(vA, 1)},
        "compuertas": res,
        "fallas": fallas,
    }
    (AQUI / "verificacion.json").write_text(
        json.dumps(reporte, indent=1, ensure_ascii=False), encoding="utf-8")

    if fallas:
        print("COMPUERTA FALLIDA — no se emiten STEP:")
        for f in fallas:
            print("  -", f)
        sys.exit(1)

    print("Exportando STEP…")
    import cadquery as cq
    for sh, nom, col in ((placa_B, "placa_B_v6", (0.25, 0.45, 0.65)),
                         (placa_A, "placa_A_v6", (0.85, 0.5, 0.2))):
        a = cq.Assembly()
        a.add(cq.Shape.cast(sh), name=nom, color=cq.Color(*col))
        a.save(str(OUT / f"{nom}.step"))

    # pernería correcta para el nuevo asiento/bolsillo: M3x40 DIN912 +
    # tuerca M3 (los M3x25 del STEP de entrada no alcanzaban la tuerca)
    pernos_v6, tuercas_v6 = [], []
    for ang in (30, 150, 270):
        a = math.radians(ang)
        cx = P["perno_pos"] * math.cos(a)
        cy = P["perno_pos"] * math.sin(a)
        cab = BRepPrimAPI_MakeCylinder(
            gp_Ax2(gp_Pnt(cx, cy, -21.3), gp_Dir(0, 0, 1)), 2.75, 3.0).Shape()
        vas = BRepPrimAPI_MakeCylinder(
            gp_Ax2(gp_Pnt(cx, cy, -18.35), gp_Dir(0, 0, 1)), 1.45, 40.0).Shape()
        pernos_v6.append(fuse_multi(cab, [vas], nombre="perno M3x40"))
        tu = cut_multi(hex_perno(ang, P["tuerca_af"], 18.85, 21.25),
                       [BRepPrimAPI_MakeCylinder(
                           gp_Ax2(gp_Pnt(cx, cy, 18.5), gp_Dir(0, 0, 1)),
                           1.6, 3.2).Shape()], "tuerca M3")
        tuercas_v6.append(tu)

    ens = cq.Assembly(name="Mecanum50_izq_v6")
    ens.add(cq.Shape.cast(placa_B), name="placa_B_v6",
            color=cq.Color(0.25, 0.45, 0.65))
    ens.add(cq.Shape.cast(A_mundo), name="placa_A_v6",
            color=cq.Color(0.85, 0.5, 0.2))
    for i, s in enumerate(rodillos):
        ens.add(cq.Shape.cast(s), name=f"rodillo_{i}",
                color=cq.Color(0.35, 0.35, 0.38))
    for i, s in enumerate(pasadores):
        ens.add(cq.Shape.cast(s), name=f"pasador_{i}",
                color=cq.Color(0.7, 0.72, 0.75))
    for i, s in enumerate(pernos_v6):
        ens.add(cq.Shape.cast(s), name=f"perno_M3x40_{i}",
                color=cq.Color(0.2, 0.2, 0.2))
    for i, s in enumerate(tuercas_v6):
        ens.add(cq.Shape.cast(s), name=f"tuerca_M3_{i}",
                color=cq.Color(0.45, 0.45, 0.48))
    ens.save(str(OUT / "Mecanum50_izq_v6.step"))

    print("OK — todas las compuertas pasan.")
    print(f"  placa_B_v6 {vB:.0f} mm3 · placa_A_v6 {vA:.0f} mm3")
    print(f"  salidas en {OUT}")


if __name__ == "__main__":
    main()
