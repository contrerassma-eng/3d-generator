#!/usr/bin/env python3
"""secciones.py — perfiles y trayectorias medidos del STEP del cliente.

Tres cosas que la caja envolvente no puede dar:

  1. SECCIÓN de un perfil (TSLOT, guia, cierre guia, chapas): se corta el sólido
     con un plano y se listan los vértices del contorno resultante → anchura de
     ranura, paso entre ranuras, espesores.
  2. TRAYECTORIA de la banda: se tesela `banda_T5_3p4` y se recorre su envolvente
     en (Y, Z) con un barrido por franjas → dónde va el ramal portante, dónde
     baja la horquilla y a qué cota.
  3. Prototipos que `medir.py` no cazó por diferencias de nombre XCAF, y las
     comprobaciones dirigidas (interferencia eje/rodamiento, camisa del cilindro).

Capa `step`. Salida: analisis/secciones.json
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
from collections import defaultdict
from pathlib import Path

from OCP.BRep import BRep_Tool
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.BRepAlgoAPI import BRepAlgoAPI_Section
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeFace
from OCP.BRepGProp import BRepGProp
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.GProp import GProp_GProps
from OCP.GeomAbs import GeomAbs_SurfaceType
from OCP.IFSelect import IFSelect_ReturnStatus
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TCollection import TCollection_AsciiString, TCollection_ExtendedString
from OCP.TDF import TDF_Label, TDF_LabelSequence, TDF_Tool
from OCP.TDataStd import TDataStd_Name
from OCP.TDocStd import TDocStd_Document
from OCP.TopAbs import TopAbs_FACE, TopAbs_VERTEX, TopAbs_SOLID, TopAbs_SHELL
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS
from OCP.XCAFApp import XCAFApp_Application
from OCP.XCAFDoc import XCAFDoc_DocumentTool
from OCP.BRepBndLib import BRepBndLib
from OCP.Bnd import Bnd_Box
from OCP.gp import gp_Pln, gp_Pnt, gp_Dir

AQUI = Path(__file__).resolve().parent
STEP = AQUI / "ref" / "sorter_CO.stp"

# nombre XCAF → (eje del plano de corte, coordenada). eje: 0=X 1=Y 2=Z (local del prototipo)
SECCIONES = {
    "TSLOT":       [(2, 700.0)],
    "guiaw":       [(1, 0.0), (0, 0.0)],
    "cierre guia": [(1, 0.0)],
    "banda_T5_3p4": [(0, 0.0)],
    "U_007":       [(1, 0.0)],
    "CD85N25-80-B(0)_BODY": [(1, 0.0)],
}

# prototipos que hay que medir sí o sí (superficies), por nombre XCAF
EXTRA = {"guiaw", "LK30-C65-20H7-D30-RD", "cal_4_f40___65", "skf_bearing_1206_etn9_2_MIR",
         "300986+Std.+UniDrive+motor+D-Shaft", "IDLER-E", "Unbrako - M6 x 45M(2)",
         "DIN EN ISO 8673 - M8 x 1", "ASME_ANSI B18.3.5M - M8x16(2)", "DIN 1587 - M4 x 0.7",
         "IFI - 10(9)", "IFI 532 - 4(4) A", "IFI 532 - 4(4) B", "Ball", "Cage", "Seal",
         "Rivet", "T-Sliding Nut M8", "CD85N25-80-B(0)_BODY", "C8525-80T_ROD_CPY2",
         "KJ10D_CPY2", "AS2201FS-01-06S", "AN101-01-01", "uni_003",
         "skf_bearing_nk_19_20_2", "UC 205+33_7_b", "FL 205+_h", "W 6004-2Z",
         "Outer Race", "Inner Race", "SCMRT906VT-1211", "SCMRT906VCT-150-111",
         "EJE-PST-01", "EJE-25mm-PASADOR", "BUJE-TECH-01", "TEFLON 45-56.905",
         "POL-COND-TEN", "POL-COND-TEN2", "IDLER-P01", "SH-04", "ANSI B 27.7M - 3AMI-20",
         "DIN 472 - Anillo de Retencion Interno", "SEPARADOR", "SEP", "SF", "TENS-LN-01",
         "PZA-TEN-1", "banda_T5_3p4", "TSLOT", "cierre guia", "LK30-C65-20H7-D30-R"}


def r(x, n=3):
    return None if x is None else round(float(x), n)


def nom(lab):
    it = TDataStd_Name()
    if lab.FindAttribute(TDataStd_Name.GetID_s(), it):
        return it.Get().ToExtString()
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--step", default=str(STEP))
    ap.add_argument("--salida", default=str(AQUI / "analisis" / "secciones.json"))
    a = ap.parse_args()
    t0 = time.time()

    app = XCAFApp_Application.GetApplication_s()
    doc = TDocStd_Document(TCollection_ExtendedString("s"))
    app.NewDocument(TCollection_ExtendedString("MDTV-XCAF"), doc)
    rd = STEPCAFControl_Reader()
    rd.SetNameMode(True)
    if rd.ReadFile(a.step) != IFSelect_ReturnStatus.IFSelect_RetDone:
        return 2
    rd.Transfer(doc)
    print(f"[{time.time()-t0:6.1f}s] cargado", flush=True)
    ST = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())

    # localizar los prototipos por nombre
    protos = {}

    def busca(lab):
        if ST.IsAssembly_s(lab):
            hijos = TDF_LabelSequence()
            ST.GetComponents_s(lab, hijos, False)
            for i in range(1, hijos.Length() + 1):
                c = hijos.Value(i)
                ref = TDF_Label()
                busca(ref if ST.GetReferredShape_s(c, ref) else c)
            return
        n = nom(lab)
        if n and n not in protos:
            protos[n] = ST.GetShape_s(lab).Located(TopLoc_Location())

    libres = TDF_LabelSequence()
    ST.GetFreeShapes(libres)
    for i in range(1, libres.Length() + 1):
        busca(libres.Value(i))
    print(f"[{time.time()-t0:6.1f}s] {len(protos)} prototipos localizados", flush=True)

    salida = {"$comment": "Secciones y trayectorias medidas del STEP del cliente. Capa 'step'.",
              "generado": time.strftime("%Y-%m-%dT%H:%M:%S"),
              "unidad": "mm", "secciones": {}, "superficies_extra": {}, "banda": {},
              "notas": []}

    # ------------------------------------------------------------------ superficies
    for n in sorted(EXTRA):
        sh = protos.get(n)
        if sh is None:
            salida["notas"].append(f"prototipo «{n}» no encontrado por nombre XCAF")
            continue
        cil = defaultdict(lambda: {"n": 0, "area": 0.0, "dir": None})
        esf = defaultdict(lambda: {"n": 0, "area": 0.0})
        tor = defaultdict(lambda: {"n": 0, "area": 0.0})
        con = []
        nplanos = 0
        ex = TopExp_Explorer(sh, TopAbs_FACE)
        while ex.More():
            f = TopoDS.Face_s(ex.Current())
            ex.Next()
            s = BRepAdaptor_Surface(f, True)
            g = GProp_GProps()
            BRepGProp.SurfaceProperties_s(f, g)
            ar = g.Mass()
            t = s.GetType()
            if t == GeomAbs_SurfaceType.GeomAbs_Cylinder:
                cy = s.Cylinder()
                k = cil[round(cy.Radius() * 2, 3)]
                k["n"] += 1
                k["area"] += ar
                d = cy.Axis().Direction()
                k["dir"] = [r(d.X()), r(d.Y()), r(d.Z())]
            elif t == GeomAbs_SurfaceType.GeomAbs_Sphere:
                k = esf[round(s.Sphere().Radius() * 2, 3)]
                k["n"] += 1
                k["area"] += ar
            elif t == GeomAbs_SurfaceType.GeomAbs_Torus:
                tt = s.Torus()
                k = tor[(round(tt.MajorRadius(), 3), round(tt.MinorRadius(), 3))]
                k["n"] += 1
                k["area"] += ar
            elif t == GeomAbs_SurfaceType.GeomAbs_Cone:
                c_ = s.Cone()
                con.append({"semiang_deg": r(math.degrees(c_.SemiAngle()), 2),
                            "R_ref": r(c_.RefRadius()), "area": r(ar, 1)})
            elif t == GeomAbs_SurfaceType.GeomAbs_Plane:
                nplanos += 1
        salida["superficies_extra"][n] = {
            "cilindros": [{"dia": k, "n": v["n"], "area": r(v["area"], 1),
                           "L_equiv": r(v["area"] / (math.pi * k), 2) if k else None,
                           "dir": v["dir"]}
                          for k, v in sorted(cil.items(), key=lambda z: -z[1]["area"])][:16],
            "esferas": [{"dia": k, "n": v["n"]} for k, v in sorted(esf.items())][:8],
            "toros": [{"R": k[0], "r": k[1], "n": v["n"]} for k, v in sorted(tor.items(), key=lambda z: -z[1]["area"])][:8],
            "conos": sorted(con, key=lambda z: -z["area"])[:6],
            "n_planos": nplanos,
        }

    print(f"[{time.time()-t0:6.1f}s] superficies extra listas", flush=True)

    # ------------------------------------------------------------------ secciones
    for n, cortes in SECCIONES.items():
        sh = protos.get(n)
        if sh is None:
            salida["notas"].append(f"sección: prototipo «{n}» no encontrado")
            continue
        salida["secciones"][n] = []
        for eje, coord in cortes:
            d = [0, 0, 0]
            d[eje] = 1
            p = [0, 0, 0]
            p[eje] = coord
            pln = gp_Pln(gp_Pnt(*p), gp_Dir(*d))
            cara = BRepBuilderAPI_MakeFace(pln).Face()
            try:
                sec = BRepAlgoAPI_Section(sh, cara, True)
                sec.ComputePCurveOn1(False)
                sec.Approximation(False)
                sec.Build()
                res = sec.Shape()
            except Exception as ex:
                salida["secciones"][n].append({"eje": eje, "coord": coord, "error": str(ex)[:120]})
                continue
            pts = []
            ex_ = TopExp_Explorer(res, TopAbs_VERTEX)
            while ex_.More():
                v = BRep_Tool.Pnt_s(TopoDS.Vertex_s(ex_.Current()))
                q = tuple(round(c, 3) for c in (v.X(), v.Y(), v.Z()))
                pts.append(q)
                ex_.Next()
            # únicos, proyectados a los 2 ejes del plano
            ejes = [i for i in range(3) if i != eje]
            uv = sorted({(q[ejes[0]], q[ejes[1]]) for q in pts})
            salida["secciones"][n].append({
                "eje_corte": "XYZ"[eje], "coord": coord,
                "ejes_plano": "XYZ"[ejes[0]] + "XYZ"[ejes[1]],
                "n_vertices": len(uv),
                "rango_u": [r(min(q[0] for q in uv)), r(max(q[0] for q in uv))] if uv else None,
                "rango_v": [r(min(q[1] for q in uv)), r(max(q[1] for q in uv))] if uv else None,
                "u_distintos": sorted({q[0] for q in uv}),
                "v_distintos": sorted({q[1] for q in uv}),
                "vertices": uv[:400],
            })
        print(f"[{time.time()-t0:6.1f}s] sección {n} lista", flush=True)

    # ------------------------------------------------------------------ banda
    sh = protos.get("banda_T5_3p4")
    if sh is not None:
        ns = nsh = 0
        ex = TopExp_Explorer(sh, TopAbs_SOLID)
        while ex.More():
            ns += 1
            ex.Next()
        ex = TopExp_Explorer(sh, TopAbs_SHELL)
        while ex.More():
            nsh += 1
            ex.Next()
        BRepMesh_IncrementalMesh(sh, 0.2, False, 0.3, True)
        pts = []
        ex = TopExp_Explorer(sh, TopAbs_FACE)
        while ex.More():
            f = TopoDS.Face_s(ex.Current())
            loc = TopLoc_Location()
            tri = BRep_Tool.Triangulation_s(f, loc)
            if tri is not None:
                tr = loc.Transformation()
                for i in range(1, tri.NbNodes() + 1):
                    q = tri.Node(i).Transformed(tr)
                    pts.append((q.X(), q.Y(), q.Z()))
            ex.Next()
        # el sistema LOCAL de la banda no coincide con el del conjunto: se eligen
        # los ejes por extensión — el mayor es el recorrido, el segundo la altura
        # del lazo y el menor la anchura de la banda.
        ext = [(max(p[i] for p in pts) - min(p[i] for p in pts), i) for i in range(3)]
        ext.sort(reverse=True)
        ejeL, ejeH, ejeW = ext[0][1], ext[1][1], ext[2][1]
        franjas = defaultdict(lambda: [1e30, -1e30])
        for p in pts:
            k = math.floor(p[ejeL] / 20.0) * 20
            fr = franjas[k]
            if p[ejeH] < fr[0]:
                fr[0] = p[ejeH]
            if p[ejeH] > fr[1]:
                fr[1] = p[ejeH]
        perfil = [{"l": k, "h_min": r(v[0]), "h_max": r(v[1])} for k, v in sorted(franjas.items())]
        salida["banda"] = {
            "n_solidos": ns, "n_shells": nsh, "n_puntos_malla": len(pts),
            "aviso": ("la banda NO es un sólido: son "
                      f"{nsh} shells. Su volumen y su masa NO se pueden medir en este STEP."),
            "eje_local_recorrido": "XYZ"[ejeL], "eje_local_altura": "XYZ"[ejeH],
            "eje_local_anchura": "XYZ"[ejeW],
            "recorrido_rango": [r(min(p[ejeL] for p in pts)), r(max(p[ejeL] for p in pts))],
            "altura_rango": [r(min(p[ejeH] for p in pts)), r(max(p[ejeH] for p in pts))],
            "anchura_rango": [r(min(p[ejeW] for p in pts)), r(max(p[ejeW] for p in pts))],
            "anchura_banda": r(max(p[ejeW] for p in pts) - min(p[ejeW] for p in pts)),
            "perfil_por_franja_20mm": perfil,
        }
        print(f"[{time.time()-t0:6.1f}s] perfil de banda listo ({len(perfil)} franjas)", flush=True)

    # ------------------------------------------------------------------ mapas
    # Mapa de ocupación real (dentro/fuera del sólido) en el plano de corte: es
    # la lectura inequívoca del perfil, sin tener que reconstruir el contorno a
    # partir de vértices sueltos.
    from OCP.BRepClass3d import BRepClass3d_SolidClassifier
    from OCP.TopAbs import TopAbs_OUT
    salida["mapas"] = {}
    for n, (eje, paso) in {
        "TSLOT": (2, 0.5),
        "guiaw": (1, 0.25),
        "cierre guia": (1, 0.25),
        "U_007": (1, 0.25),
        "CD85N25-80-B(0)_BODY": (2, 0.25),
        "C8525-80T_ROD_CPY2": (2, 0.25),
    }.items():
        sh = protos.get(n)
        if sh is None:
            continue
        # el origen local de la pieza NO tiene por qué estar dentro de ella: el
        # plano de corte y la retícula se encuadran sobre su propia caja.
        bb = Bnd_Box()
        BRepBndLib.AddOptimal_s(sh, bb, True, False)
        lo = list(bb.Get()[:3])
        hi = list(bb.Get()[3:])
        coord = (lo[eje] + hi[eje]) / 2.0
        ejes_ = [i for i in range(3) if i != eje]
        u0, u1 = lo[ejes_[0]] - paso, hi[ejes_[0]] + paso
        v0, v1 = lo[ejes_[1]] - paso, hi[ejes_[1]] + paso
        if (u1 - u0) / paso > 320:
            paso = (u1 - u0) / 320.0
        cls = BRepClass3d_SolidClassifier(sh)
        ejes = ejes_
        filas = []
        v = v1
        while v >= v0 - 1e-9:
            fila = []
            u = u0
            while u <= u1 + 1e-9:
                p = [0.0, 0.0, 0.0]
                p[eje] = coord
                p[ejes[0]] = u
                p[ejes[1]] = v
                cls.Perform(gp_Pnt(*p), 1e-6)
                fila.append("." if cls.State() == TopAbs_OUT else "#")
                u += paso
            filas.append(f"{v:7.2f} |" + "".join(fila))
            v -= paso
        cab = "        " + "".join("|" if abs((u0 + i * paso) % 10) < paso / 2 else " "
                                   for i in range(int((u1 - u0) / paso) + 1))
        salida["mapas"][n] = {
            "eje_corte": "XYZ"[eje], "coord": coord,
            "ejes_plano": "XYZ"[ejes[0]] + " (horizontal, " + str(u0) + "…" + str(u1) + ") × "
                          + "XYZ"[ejes[1]] + " (vertical, " + str(v0) + "…" + str(v1) + ")",
            "paso_mm": paso, "leyenda": "# = material, . = aire",
            "filas": [cab] + filas,
        }
        print(f"[{time.time()-t0:6.1f}s] mapa {n} listo", flush=True)

    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(a.salida).write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[{time.time()-t0:6.1f}s] OK → {a.salida}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
