#!/usr/bin/env python3
# gen_mecanum50_v7.py — MECANUM 50 IZQUIERDA v7: PLACA ÚNICA hermafrodita
# con corona dentada anular optimizada para impresión por capas.
#
# Evolución de la v6 (gen_mecanum50_v6.py) según pedido del usuario:
#
#   V1. CORONA DENTADA en vez de dientes rectos: los dientes verticales de
#       la v6 cargan el cortante en un plano de capa (adhesión intercapa).
#       La v7 usa una corona anular a TODO el ancho del collar (desde la
#       pared del hex hasta Ø26) con 3 DIENTES TRAPEZOIDALES profundos
#       (8 mm de altura, ±4 respecto del plano de unión) y FLANCOS
#       INCLINADOS ~15°: la fuerza de flanco entra oblicua a las capas
#       (compresión + cortante repartido en ~40 capas) y la sección de
#       raíz del diente es mucho mayor.
#   V2. UNA SOLA PIEZA (A = B): se imprime dos veces y se montan
#       enfrentadas con el reloj de 60°. Los huecos de la corona se
#       generan aplicando la TRANSFORMACIÓN REAL DE MONTAJE a los propios
#       dientes → complementariedad exacta por construcción. Contacto de
#       apoyo en el plano z=0 (las mesetas de raíz), flancos con holgura
#       mínima (0.05) y alivio de 0.4 en cresta/fondo.
#   V3. PERNERÍA ALTERNADA (como la rueda comercial de referencia):
#       6 posiciones a 60°, alternando bolsillo HEX de tuerca (60°+120k)
#       y asiento de cabeza DIN912 (0°+120k). Montada, cada perno M3x40
#       encuentra tuerca capturada en una placa y cabeza asentada en la
#       otra; quedan 3 perforaciones sin usar por lado (aceptado por el
#       usuario). Los pasos Ø5.9 viejos (30°+120k) se tapan.
#   V4. HEX de MEDIA PULGADA: barra hexagonal 1/2 in = 12.70 entre caras;
#       barreno 12.70 + 0.15 de ajuste deslizante FDM = 12.85 e/c
#       (parámetro `hex_ajuste`: calibrar con una impresión de prueba).
#       El hex 14.5 viejo se rellena y se recorta el nuevo.
#
# Se conserva de la v6: brazos unificados por patrón del maestro (C1),
# saneo de esquinitas, rodillos/pasadores intactos del STEP del usuario,
# ancho total y booleanos robustos con asertos de volumen.
#
# Compuertas (el script FALLA si alguna no pasa):
#   GM1 estanqueidad y volumen sano
#   GM2 los 6 brazos idénticos
#   GM3 sin esquinitas (ninguna cara < 0.005 mm²)
#   GM4 holgura placa-rodillo >= 0.65 en las dos placas montadas
#   GM5 corona: cero interferencia montada, apoyo de raíz en z=0,
#       holgura de flanco en [0.02, 0.12] y alivio de fondo >= 0.3
#   GM6 pernería alternada: vástago Ø3.2 pasa, cabeza alojada con hombro,
#       tuerca entra y girada 30° choca (capturada)
#   GM7 hex 1/2 in: calibre 12.75 pasa; calibre 13.15 choca (hay pared)
#
# Emite en out/: placa_v7.step/.stl (UNA pieza, imprimir x2) y
# Mecanum50_izq_v7.step (ensamble completo); versionado: verificacion_v7.json
#
# Uso:  python cad/ensambles/mecanum50/gen_mecanum50_v7.py
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
from OCP.TopTools import (TopTools_IndexedDataMapOfShapeListOfShape,
                          TopTools_ListOfShape)
from OCP.TopoDS import TopoDS, TopoDS_Shape
from OCP.BRepGProp import BRepGProp
from OCP.GProp import GProp_GProps
from OCP.BRepAlgoAPI import (BRepAlgoAPI_Common, BRepAlgoAPI_Cut,
                             BRepAlgoAPI_Fuse, BRepAlgoAPI_Defeaturing)
from OCP.BRepPrimAPI import BRepPrimAPI_MakeCylinder, BRepPrimAPI_MakePrism
from OCP.BRepBuilderAPI import (BRepBuilderAPI_MakeFace,
                                BRepBuilderAPI_MakePolygon,
                                BRepBuilderAPI_Transform)
from OCP.gp import gp_Trsf, gp_Ax1, gp_Ax2, gp_Pnt, gp_Dir, gp_Vec
from OCP.ShapeUpgrade import ShapeUpgrade_UnifySameDomain
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.StlAPI import StlAPI_Writer

AQUI = Path(__file__).parent
OUT = AQUI / "out"
STP = AQUI / "Mecanum50_izq.stp"

# ---------------------------------------------------------------------------
# P — parámetros. med = medido en el STEP / dato del usuario, dis = diseño.
# ---------------------------------------------------------------------------
P = {
    # C1 brazos (igual que v6)
    "sector_maestro": 315.0,  # dis: brazo maestro 315-375°
    "r_nucleo": 14.5,         # dis: frontera núcleo/brazos
    # hex nuevo
    "hex_barra": 12.70,       # med-user: barra hexagonal de 1/2 in
    "hex_ajuste": 0.15,       # dis: ajuste deslizante FDM (calibrar)
    "hex_viejo_r": 8.60,      # med: tapón que traga el hex 14.5 (vértice 8.37)
    "hex_viejo_z": 18.35,     # med: el hex viejo llega a z=18.3
    # corona
    "cubo_r": 13.0,           # med: radio exterior del collar/cubo
    "collar_h": 6.5,          # dis: collar z 0..6.5 (los huecos entran 4.4)
    "diente_n": 3,            # dis-user: 3 dientes
    "diente_centro": 60.0,    # dis: dientes a 60+120k (huecos a 0+120k)
    "diente_prof": 8.0,       # dis-user: altura total del diente (±4 de z=0)
    "diente_semibase": 3.6,   # dis: semiancho tangencial en la raíz
    "flanco_deg": 15.0,       # dis-user: inclinación del flanco (desde vertical)
    "holgura_flanco": 0.05,   # dis: por flanco; el apoyo manda en z=0
    "alivio_fondo": 0.4,      # dis: cresta no toca fondo
    # pernería alternada (pernos de trabajo a 60+120k)
    "perno_pos": 10.9,        # med: círculo de pernos
    "paso_viejo_r": 2.95,     # med: paso Ø5.9 viejo (30+120k) a tapar
    "z_hombro": 18.3,         # dis: hombro del asiento de cabeza
    "z_tuerca": 18.8,         # dis: piso del bolsillo de tuerca
    "tuerca_af": 5.5,         # med: tuerca M3 DIN934
    "tuerca_encaje_af": 5.6,  # dis: bolsillo hex (apriete leve, no gira)
    "clock_montaje": 60.0,    # dis: placa2 = Rot(180° sobre la línea a 30°)
    # remaches de acero en los extremos de cada rodillo (med-user:
    # SUN REM 1001, 6.3x16: cabeza Ø12 x 1.1, cuerpo Ø6.25 x 16,
    # pasante Ø4.6) — actúan de bujes de acero y cara limpia
    "rem_cabeza_d": 12.0,     # med-user
    "rem_cabeza_e": 1.1,      # med-user
    "rem_cuerpo_d": 6.25,     # med-user
    "rem_cuerpo_L": 16.0,     # med-user
    "rem_pasante_d": 4.6,     # med-user
    "rem_apriete": 0.15,      # dis: barreno 6.10 para que el cuerpo entre a presión
    "rem_rebaje_d": 12.25,    # dis: alojamiento de la cabeza (rodillo cara Ø13.02)
    "rem_rebaje_e": 1.15,     # dis: cabeza a ras (-0.05); OJO: 2x(16+1.15)=34.3
                              #      > largo del rodillo 33.51 -> rebajar ~0.8 mm
                              #      la punta de un remache (o 0.4 de cada uno)
    "pasador_d": 4.0,         # med-user: pasador nuevo Ø4 (corre en el Ø4.6)
    "ranura_pasador_d": 4.4,  # dis: ranura del brazo para el Ø4
    "fuzzy": 0.005,
    "sliver_umbral": 0.005,
}
P["hex_af"] = P["hex_barra"] + P["hex_ajuste"]

MALLA_FINA = 0.015


# ------------------------- utilidades (v6) ----------------------------------
def vol(sh):
    p = GProp_GProps(); BRepGProp.VolumeProperties_s(sh, p); return p.Mass()


def _lista(shapes):
    L = TopTools_ListOfShape()
    for s in shapes:
        L.Append(s)
    return L


def fuse_multi(base, tools, esperado=None, tol=5.0, nombre=""):
    op = BRepAlgoAPI_Fuse()
    op.SetArguments(_lista([base])); op.SetTools(_lista(tools))
    op.SetFuzzyValue(P["fuzzy"]); op.Build()
    if not op.IsDone():
        print(f"ERROR: fuse '{nombre}' no completó"); sys.exit(1)
    r = op.Shape(); v = vol(r)
    if esperado is not None and abs(v - esperado) > tol:
        print(f"ERROR: fuse '{nombre}': volumen {v:.1f}, esperado "
              f"{esperado:.1f} ± {tol}"); sys.exit(1)
    return r


def cut_multi(base, tools, nombre=""):
    op = BRepAlgoAPI_Cut()
    op.SetArguments(_lista([base])); op.SetTools(_lista(tools))
    op.SetFuzzyValue(P["fuzzy"]); op.Build()
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


def cil_en(cx, cy, r, z0, z1):
    return BRepPrimAPI_MakeCylinder(
        gp_Ax2(gp_Pnt(cx, cy, z0), gp_Dir(0, 0, 1)), r, z1 - z0).Shape()


def prisma_poligono(pts_xy, z0, z1):
    poly = BRepBuilderAPI_MakePolygon()
    for x, y in pts_xy:
        poly.Add(gp_Pnt(float(x), float(y), z0))
    poly.Close()
    cara = BRepBuilderAPI_MakeFace(poly.Wire()).Face()
    return BRepPrimAPI_MakePrism(cara, gp_Vec(0, 0, z1 - z0)).Shape()


def hex_prisma(af, z0, z1, girado=0.0, cx=0.0, cy=0.0, base=30.0):
    rv = af / math.sqrt(3.0)
    pts = [(cx + rv * math.cos(math.radians(base + girado + 60 * i)),
            cy + rv * math.sin(math.radians(base + girado + 60 * i)))
           for i in range(6)]
    return prisma_poligono(pts, z0, z1)


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
                        and acepta(df.Shape()):
                    sh = df.Shape(); avance = True; break
        if not avance:
            f, _, c = min(caras_chicas(sh), key=lambda x: x[1])
            nv = np.array([c[0], c[1], 0.0]); nv /= np.linalg.norm(nv)
            broca = BRepPrimAPI_MakeCylinder(
                gp_Ax2(gp_Pnt(c[0] + 0.35 * nv[0], c[1] + 0.35 * nv[1], c[2]),
                       gp_Dir(*(-nv))), 0.3, 0.75).Shape()
            op = BRepAlgoAPI_Cut(sh, broca); op.Build()
            if op.IsDone() and acepta(op.Shape()):
                sh = op.Shape()
            else:
                break
    if abs(vol(sh) - v0) > 2.0:
        print(f"ERROR: saneo '{nombre}' movió el volumen {vol(sh)-v0:+.2f}")
        sys.exit(1)
    return sh


def unificar(sh):
    uni = ShapeUpgrade_UnifySameDomain(sh, True, True, False)
    uni.Build()
    return uni.Shape()


def _trsf_montaje():
    """Placa 2 = rotación de 180° sobre la línea horizontal a 30°
    (equivale a Rz(60)·Rx(180): la que alinea pernos y pasadores)."""
    a = math.radians(P["clock_montaje"] / 2.0)
    t = gp_Trsf()
    t.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0),
                         gp_Dir(math.cos(a), math.sin(a), 0)), math.pi)
    return t


def a_mundo_2(sh):
    return BRepBuilderAPI_Transform(sh, _trsf_montaje(), True).Shape()


# ------------------------- corona v7 ----------------------------------------
def diente(ang_deg, semibase, prof, flanco_deg, z_base=0.3):
    """Diente trapezoidal de la corona: trapecio en el plano tangencial-axial
    extruido RADIALMENTE (flancos = planos exactos). Va de z_base (solapa en
    el collar) hasta -prof/2... la mitad proud; el trapecio completo cubre
    z_base..-(prof/2). Se recorta después con el hex y el cilindro Ø26."""
    a = math.radians(ang_deg)
    rad = np.array([math.cos(a), math.sin(a), 0.0])
    tang = np.array([-math.sin(a), math.cos(a), 0.0])
    z_cresta = z_base - prof
    pend = math.tan(math.radians(flanco_deg))
    u_b, u_c = semibase, semibase - (z_base - z_cresta) * pend
    if u_c < 0.6:
        print("ERROR: cresta del diente demasiado fina"); sys.exit(1)
    pts = [(-u_b, z_base), (u_b, z_base), (u_c, z_cresta), (-u_c, z_cresta)]
    r0, r1 = 6.8, 13.6
    poly = BRepBuilderAPI_MakePolygon()
    for u, z in pts:
        p = rad * r0 + tang * u + np.array([0, 0, z])
        poly.Add(gp_Pnt(*p))
    poly.Close()
    cara = BRepBuilderAPI_MakeFace(poly.Wire()).Face()
    return BRepPrimAPI_MakePrism(cara, gp_Vec(*(rad * (r1 - r0)))).Shape()


# ------------------------------ pipeline ------------------------------------
def main():
    OUT.mkdir(exist_ok=True)
    import trimesh as tm

    print("Leyendo", STP.name)
    rd = STEPControl_Reader(); rd.ReadFile(str(STP)); rd.TransferRoots()
    ex = TopExp_Explorer(rd.OneShape(), TopAbs_SOLID)
    sol = []
    while ex.More():
        sol.append(TopoDS.Solid_s(ex.Current())); ex.Next()
    placa0 = sol[0]
    rodillos = [sol[i] for i in (1, 3, 5, 7, 9, 11)]
    pasadores = [sol[i] for i in (2, 4, 6, 8, 10, 12)]
    v_in = vol(placa0)
    print(f"placa entrada: V={v_in:.1f} mm3")

    # ---- C1: brazos uniformes (igual que v6) -----------------------------
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

    # ---- V2/V4: rellenos (hex viejo, pasos de perno viejos) + collar -----
    print("V7: collar, rellenos y corona…")
    rellenos = [cilindro(P["hex_viejo_r"], 0.0, P["hex_viejo_z"]),
                cilindro(P["cubo_r"], 0, P["collar_h"])]
    for ang in (30, 150, 270):
        a = math.radians(ang)
        rellenos.append(cil_en(P["perno_pos"] * math.cos(a),
                               P["perno_pos"] * math.sin(a),
                               P["paso_viejo_r"] + 0.03, 3.9, 19.85))
    rell_u = fuse_multi(rellenos[0], rellenos[1:], nombre="union rellenos")
    v_sol = vol(common2(rell_u, placa))
    base = fuse_multi(placa, rellenos,
                      esperado=v_uni + vol(rell_u) - v_sol, tol=5.0,
                      nombre="base v7")

    # ---- V1: corona — dientes propios y huecos del gemelo ----------------
    hd, sb, fl = P["diente_prof"], P["diente_semibase"], P["flanco_deg"]
    dientes = [common2(diente(P["diente_centro"] + 120 * k, sb, hd / 2 + 0.3,
                              fl), cilindro(P["cubo_r"], -hd / 2 - 1, 1))
               for k in range(P["diente_n"])]
    # OJO: diente() recibe prof = alcance por debajo de z_base; el diente
    # útil llega a -hd/2. Fusionar y luego cortar huecos.
    d_u = fuse_multi(dientes[0], dientes[1:], nombre="union dientes")
    v_sd = vol(common2(d_u, base))
    base = fuse_multi(base, dientes, esperado=vol(base) + vol(d_u) - v_sd,
                      tol=5.0, nombre="dientes corona")

    # huecos = imagen de MONTAJE de un diente engordado (holgura de flanco
    # + alivio de fondo) — complementariedad exacta por construcción
    huecos = []
    for k in range(P["diente_n"]):
        dh = diente(P["diente_centro"] + 120 * k, sb + P["holgura_flanco"],
                    hd / 2 + P["alivio_fondo"] + 0.3, fl)
        dh = common2(dh, cilindro(P["cubo_r"] + 1.0, -hd / 2 - 2, 1))
        huecos.append(a_mundo_2(dh))
    base = cut_multi(base, huecos, "huecos corona")

    # ---- V4: hex nuevo de 1/2 in (caras a 30+60k, como el original) ------
    base = cut_multi(base, [hex_prisma(P["hex_af"], -hd / 2 - 2, 22.5,
                                       base=0.0)], "hex 1/2 in")

    # ---- V3: pernería alternada (dos cortes; UnifySameDomain NO se
    # aplica al final: corrompe este sólido con tantas caras tangentes) ----
    brocas_t, brocas_c = [], []
    for k in range(3):  # tipo TUERCA a 60+120k
        ang = 60 + 120 * k
        a = math.radians(ang)
        cx, cy = P["perno_pos"] * math.cos(a), P["perno_pos"] * math.sin(a)
        brocas_t.append(hex_prisma(P["tuerca_encaje_af"], P["z_tuerca"], 22.3,
                                   cx=cx, cy=cy, base=ang + 30))
        brocas_t.append(cil_en(cx, cy, 1.7, -hd / 2 - 2, P["z_tuerca"] + 0.05))
    for k in range(3):  # tipo CABEZA a 0+120k
        ang = 120 * k
        a = math.radians(ang)
        cx, cy = P["perno_pos"] * math.cos(a), P["perno_pos"] * math.sin(a)
        brocas_c.append(cil_en(cx, cy, 2.95, P["z_hombro"], 22.3))
        brocas_c.append(cil_en(cx, cy, 1.7, -hd / 2 - 2, P["z_hombro"] + 0.05))
    base = cut_multi(base, brocas_t, "bolsillos tuerca")
    base = cut_multi(base, brocas_c, "asientos cabeza")

    # ---- V5: ejes de pasador (medidos del STEP) y ranuras a Ø4.4 --------
    pr = GProp_GProps(); BRepGProp.VolumeProperties_s(pasadores[0], pr)
    pc = pr.CentreOfMass()
    pp = pr.PrincipalProperties()
    mom = list(pp.Moments())
    axs = [pp.FirstAxisOfInertia(), pp.SecondAxisOfInertia(),
           pp.ThirdAxisOfInertia()]
    dmin = axs[int(np.argmin(mom))]
    eje0_c = np.array([pc.X(), pc.Y(), pc.Z()])
    eje0_d = np.array([dmin.X(), dmin.Y(), dmin.Z()])
    if eje0_d[2] < 0:
        eje0_d = -eje0_d
    eje0_d /= np.linalg.norm(eje0_d)

    def eje_k(k):
        th = math.radians(60 * k)
        R = np.array([[math.cos(th), -math.sin(th), 0],
                      [math.sin(th), math.cos(th), 0], [0, 0, 1]])
        return R @ eje0_c, R @ eje0_d

    def cil_eje(c, d, r, t0, t1):
        p0 = c + d * t0
        return BRepPrimAPI_MakeCylinder(
            gp_Ax2(gp_Pnt(*p0), gp_Dir(*d)), r, t1 - t0).Shape()

    ranuras = []
    for k in range(6):
        c, d = eje_k(k)
        ranuras.append(cil_eje(c, d, P["ranura_pasador_d"] / 2.0, -23.5, 23.5))
    base = cut_multi(base, ranuras, "ranuras pasador Ø4.4")

    placa_v7 = sanear_slivers(base, "placa v7")

    # ---- V5: rodillo con asientos de remache ----------------------------
    # largo axial medido 33.51 (t ±16.755): rebaje de cabeza Ø12.25 x 1.15
    # por lado + barreno pasante Ø6.10 (cuerpo Ø6.25 a presión)
    c0, d0 = eje_k(0)
    T_ROD = 16.755
    brocas_rod = [cil_eje(c0, d0, P["rem_rebaje_d"] / 2.0,
                          T_ROD - P["rem_rebaje_e"], T_ROD + 1.0),
                  cil_eje(c0, d0, P["rem_rebaje_d"] / 2.0,
                          -T_ROD - 1.0, -T_ROD + P["rem_rebaje_e"]),
                  cil_eje(c0, d0, (P["rem_cuerpo_d"] - P["rem_apriete"]) / 2.0,
                          -T_ROD - 1.0, T_ROD + 1.0)]
    rodillo_v7 = cut_multi(rodillos[0], brocas_rod, "asientos remache")
    rodillo_v7 = sanear_slivers(rodillo_v7, "rodillo v7")
    rodillos_v7 = [rotz(rodillo_v7, 60 * k) for k in range(6)]

    # remaches y pasadores nuevos (para el ensamble): el cuerpo modelado va
    # RECORTADO a 15.6 (los de 16 se tocan al centro: rebajar ~0.8 total)
    def remache(k, lado):
        c, d = eje_k(k)
        s = 1.0 if lado > 0 else -1.0
        tc0 = s * (T_ROD - P["rem_rebaje_e"])          # cara inferior de cabeza
        cab = cil_eje(c, d, P["rem_cabeza_d"] / 2.0,
                      min(tc0, tc0 + s * P["rem_cabeza_e"]),
                      max(tc0, tc0 + s * P["rem_cabeza_e"]))
        cue = cil_eje(c, d, P["rem_cuerpo_d"] / 2.0,
                      min(tc0, tc0 - s * 15.6), max(tc0, tc0 - s * 15.6))
        r = fuse_multi(cab, [cue], nombre="remache")
        return cut_multi(r, [cil_eje(c, d, P["rem_pasante_d"] / 2.0,
                                     -T_ROD - 2, T_ROD + 2)], "pasante")

    remaches = [remache(k, l) for k in range(6) for l in (+1, -1)]
    pasadores_v7 = []
    for k in range(6):
        c, d = eje_k(k)
        pasadores_v7.append(cil_eje(c, d, P["pasador_d"] / 2.0, -23.0, 23.0))

    # ---- compuertas ------------------------------------------------------
    print("Compuertas…")
    res, fallas = {}, []
    m1 = malla(placa_v7, "placa_v7", 0.03)
    m2 = m1.copy()
    a2 = math.radians(P["clock_montaje"] / 2.0)
    R2 = tm.transformations.rotation_matrix(
        math.pi, [math.cos(a2), math.sin(a2), 0])
    m2.apply_transform(R2)
    v1 = vol(placa_v7)

    res["GM1_estanqueidad"] = {"watertight": bool(m1.is_watertight),
                               "vol": round(v1, 1)}
    if not m1.is_watertight:
        fallas.append("GM1: malla no estanca")
    if not (v_uni - 500 < v1 < v_uni + 4500):
        fallas.append(f"GM1: volumen fuera de rango ({v1:.0f})")

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

    ch = [(round(a_, 5), [round(x, 2) for x in c])
          for _, a_, c in caras_chicas(placa_v7)]
    res["GM3_esquinitas"] = {"placa_v7": len(ch), "detalle": ch[:8]}
    if ch:
        fallas.append(f"GM3: quedan caras sliver ({len(ch)})")

    pq1 = tm.proximity.ProximityQuery(m1)
    pq2 = tm.proximity.ProximityQuery(m2)
    peor = 1e9
    for rsol in rodillos_v7:
        mr = malla(rsol, "_rod_tmp", 0.05)
        pts, _ = tm.sample.sample_surface(mr, 3000, seed=1)
        d1 = -pq1.signed_distance(pts[pts[:, 2] > 1.0])
        d2 = -pq2.signed_distance(pts[pts[:, 2] < -1.0])
        peor = min(peor, float(d1.min()), float(d2.min()))
    res["GM4_holgura_rodillo"] = {"min_mm": round(peor, 3)}
    if peor < 0.65:
        fallas.append(f"GM4: holgura rodillo {peor:.3f} < 0.65")

    # GM5 corona: interferencia montada, apoyo z=0, holgura de flanco, alivio
    otra = a_mundo_2(placa_v7)
    v_int = vol(common2(placa_v7, otra))
    corona1 = common2(placa_v7, cilindro(P["cubo_r"] + 0.2,
                                         -hd / 2 - 0.1, hd / 2 + 0.1))
    mc = malla(corona1, "_corona_tmp", 0.02)
    pts, _ = tm.sample.sample_surface(mc, 8000, seed=1)
    # flancos: puntos de la corona con |z| en (0.8, hd/2-0.8) y normal no axial
    band = pts[(np.abs(pts[:, 2]) > 0.8) & (np.abs(pts[:, 2]) < hd / 2 - 0.8)]
    dflanco = np.abs(pq2.signed_distance(band))
    # excluir superficies coincidentes (cilindros/hex, dist ~ 0) y lejanas
    sel = (dflanco > 0.008) & (dflanco < 0.5)
    gap_flanco = float(np.median(dflanco[sel])) if np.any(sel) else 9.9
    # apoyo de raíz: mis mesetas en z=0 deben quedar contra la otra placa
    land = pts[np.abs(pts[:, 2]) < 0.02]
    land_d = np.abs(pq2.signed_distance(land)) if len(land) else np.array([9.9])
    res["GM5_corona"] = {"interseccion_mm3": round(v_int, 3),
                         "holgura_flanco_mediana": round(gap_flanco, 3),
                         "pts_apoyo_z0": int(len(land)),
                         "apoyo_dist_mediana": round(float(np.median(land_d)), 3)}
    if v_int > 1e-2:
        fallas.append(f"GM5: interferencia montada {v_int:.3f} mm3")
    if not (0.02 <= gap_flanco <= 0.12):
        fallas.append(f"GM5: holgura de flanco {gap_flanco:.3f} fuera de rango")
    if len(land) < 30 or float(np.median(land_d)) > 0.03:
        fallas.append("GM5: falta apoyo de raíz en z=0")

    # GM6 pernería alternada (perno de trabajo a 60+120k del MONTAJE)
    ok6, det6 = True, {}
    for k in range(3):
        angw = 60 + 120 * k
        aw = math.radians(angw)
        cx, cy = P["perno_pos"] * math.cos(aw), P["perno_pos"] * math.sin(aw)
        v_vast = vol(common2(placa_v7, cil_en(cx, cy, 1.6, -20, 20.9))) + \
            vol(common2(otra, cil_en(cx, cy, 1.6, -20, 20.9)))
        v_cab = vol(common2(otra, cil_en(cx, cy, 2.8, -21.3,
                                         -P["z_hombro"] - 0.05)))
        v_asiento = vol(common2(otra, cil_en(cx, cy, 2.6,
                                             -P["z_hombro"] + 0.05,
                                             -P["z_hombro"] + 0.35)))
        v_tuerca = vol(common2(placa_v7,
                               hex_prisma(P["tuerca_af"], P["z_tuerca"] + 0.05,
                                          21.3, cx=cx, cy=cy, base=angw + 30)))
        v_giro = vol(common2(placa_v7,
                             hex_prisma(P["tuerca_af"], P["z_tuerca"] + 0.05,
                                        21.3, girado=30.0, cx=cx, cy=cy,
                                        base=angw + 30)))
        det6[str(angw)] = {"vastago": round(v_vast, 3),
                           "cabeza": round(v_cab, 3),
                           "hombro_material": round(v_asiento, 2),
                           "tuerca_entra": round(v_tuerca, 3),
                           "tuerca_girada_choca": round(v_giro, 2)}
        if v_vast > 1e-3 or v_cab > 1e-3 or v_tuerca > 1e-3:
            ok6 = False
            fallas.append(f"GM6: pernería a {angw}° obstruida {det6[str(angw)]}")
        if v_asiento < 1.0:
            ok6 = False; fallas.append(f"GM6: falta hombro a {angw}°")
        if v_giro < 0.5:
            ok6 = False; fallas.append(f"GM6: la tuerca a {angw}° podría girar")
    res["GM6_perneria"] = {"pasa": ok6, "detalle": det6}

    # GM7 hex 1/2 in: pasa el calibre de barra, choca el sobredimensionado
    g_pasa = hex_prisma(P["hex_barra"] + 0.05, -22, 22, base=0.0)
    g_choca = hex_prisma(P["hex_af"] + 0.3, -hd / 2 + 0.6, 15, base=0.0)
    v_p = vol(common2(placa_v7, g_pasa)) + vol(common2(otra, g_pasa))
    v_c = vol(common2(placa_v7, g_choca))
    res["GM7_hex_media_pulgada"] = {"calibre_12_75_interfiere": round(v_p, 3),
                                    "calibre_13_15_material": round(v_c, 2)}
    if v_p > 1e-3:
        fallas.append(f"GM7: la barra de 1/2 in no pasa ({v_p:.3f})")
    if v_c < 5.0:
        fallas.append("GM7: el barreno hex quedó sobredimensionado")

    # GM8 — remaches y pasador Ø4: calibres de paso, apriete y retención
    ok8 = True
    c0g, d0g = eje_k(0)
    v_pas = 0.0
    for k in (0, 2, 4):
        ck, dk = eje_k(k)
        g = cil_eje(ck, dk, 2.05, -23.2, 23.2)          # pasador Ø4.1 pasa
        v_pas = max(v_pas, vol(common2(placa_v7, g)) + vol(common2(otra, g)))
    v_ret = vol(common2(placa_v7, cil_eje(c0g, d0g, 2.45, 10, 21)))
    v_body = vol(common2(rodillo_v7, cil_eje(c0g, d0g, 3.0, -17.3, 17.3)))
    v_wall = vol(common2(rodillo_v7, cil_eje(c0g, d0g, 3.2, -15, 15)))
    v_head = vol(common2(rodillo_v7, cil_eje(c0g, d0g, 6.05,
                                             T_ROD - 1.1, T_ROD - 0.05)))
    v_piso = vol(common2(rodillo_v7, cil_eje(c0g, d0g, 6.05,
                                             T_ROD - 1.5, T_ROD - 1.3)))
    v_rem = max(vol(common2(placa_v7, remaches[0])),
                vol(common2(otra, remaches[1])))
    res["GM8_remaches_pasador"] = {
        "pasador_4p1_interfiere": round(v_pas, 3),
        "ranura_retiene_4p9": round(v_ret, 2),
        "cuerpo_6p0_pasa": round(v_body, 3),
        "pared_apriete_6p4": round(v_wall, 2),
        "cabeza_12p1_entra": round(v_head, 3),
        "piso_rebaje_presente": round(v_piso, 2),
        "remache_toca_placa": round(v_rem, 3)}
    if v_pas > 1e-3:
        ok8 = False; fallas.append(f"GM8: el pasador Ø4.1 no pasa ({v_pas:.2f})")
    if v_ret < 0.5:
        ok8 = False; fallas.append("GM8: la ranura quedó sobredimensionada")
    if v_body > 1e-3:
        ok8 = False; fallas.append(f"GM8: el cuerpo del remache no entra ({v_body:.2f})")
    if v_wall < 1.0:
        ok8 = False; fallas.append("GM8: no hay pared de apriete para el remache")
    if v_head > 1e-3:
        ok8 = False; fallas.append(f"GM8: la cabeza no entra en su rebaje ({v_head:.2f})")
    if v_piso < 1.0:
        ok8 = False; fallas.append("GM8: el rebaje de cabeza quedó pasado")
    if v_rem > 1e-3:
        ok8 = False; fallas.append(f"GM8: el remache toca la placa ({v_rem:.2f})")

    # ---- reporte y salidas ----------------------------------------------
    reporte = {
        "pieza": "Mecanum50 izq v7 — placa única hermafrodita, corona de 3 "
                 "dientes inclinados, pernería alternada, hex 1/2 in",
        "capa": "user",
        "parametros": {k: v for k, v in P.items()},
        "volumenes_mm3": {"placa_entrada": round(v_in, 1),
                          "placa_uniforme": round(v_uni, 1),
                          "placa_v7": round(v1, 1)},
        "compuertas": res,
        "fallas": fallas,
    }
    (AQUI / "verificacion_v7.json").write_text(
        json.dumps(reporte, indent=1, ensure_ascii=False), encoding="utf-8")

    if fallas:
        print("COMPUERTA FALLIDA — no se emiten STEP:")
        for f in fallas:
            print("  -", f)
        sys.exit(1)

    print("Exportando STEP…")
    import cadquery as cq
    uno = cq.Assembly()
    uno.add(cq.Shape.cast(placa_v7), name="placa_v7",
            color=cq.Color(0.3, 0.5, 0.4))
    uno.save(str(OUT / "placa_v7.step"))
    rasm = cq.Assembly()
    rasm.add(cq.Shape.cast(rodillo_v7), name="rodillo_v7",
             color=cq.Color(0.35, 0.35, 0.38))
    rasm.save(str(OUT / "rodillo_v7.step"))
    malla(rodillo_v7, "rodillo_v7", 0.02)

    pernos_v7, tuercas_v7 = [], []
    for k in range(3):
        aw = math.radians(60 + 120 * k)
        cx, cy = P["perno_pos"] * math.cos(aw), P["perno_pos"] * math.sin(aw)
        cab = cil_en(cx, cy, 2.75, -21.3, -18.3)
        vas = cil_en(cx, cy, 1.45, -18.35, 21.65)
        pernos_v7.append(fuse_multi(cab, [vas], nombre="perno"))
        tuercas_v7.append(cut_multi(
            hex_prisma(P["tuerca_af"], 18.85, 21.25, cx=cx, cy=cy,
                       base=60 + 120 * k + 30),
            [cil_en(cx, cy, 1.6, 18.5, 21.6)], "tuerca"))

    ens = cq.Assembly(name="Mecanum50_izq_v7")
    ens.add(cq.Shape.cast(placa_v7), name="placa_v7_B",
            color=cq.Color(0.25, 0.45, 0.65))
    ens.add(cq.Shape.cast(a_mundo_2(placa_v7)), name="placa_v7_A",
            color=cq.Color(0.85, 0.5, 0.2))
    for i, s in enumerate(rodillos_v7):
        ens.add(cq.Shape.cast(s), name=f"rodillo_v7_{i}",
                color=cq.Color(0.35, 0.35, 0.38))
    for i, s in enumerate(pasadores_v7):
        ens.add(cq.Shape.cast(s), name=f"pasador_d4_{i}",
                color=cq.Color(0.7, 0.72, 0.75))
    for i, s in enumerate(remaches):
        ens.add(cq.Shape.cast(s), name=f"remache_6x16_{i}",
                color=cq.Color(0.78, 0.78, 0.8))
    for i, s in enumerate(pernos_v7):
        ens.add(cq.Shape.cast(s), name=f"perno_M3x40_{i}",
                color=cq.Color(0.2, 0.2, 0.2))
    for i, s in enumerate(tuercas_v7):
        ens.add(cq.Shape.cast(s), name=f"tuerca_M3_{i}",
                color=cq.Color(0.45, 0.45, 0.48))
    ens.save(str(OUT / "Mecanum50_izq_v7.step"))

    print("OK — todas las compuertas pasan.")
    print(f"  placa_v7 {v1:.0f} mm3 (imprimir x2)")
    print(f"  salidas en {OUT}")


if __name__ == "__main__":
    main()
