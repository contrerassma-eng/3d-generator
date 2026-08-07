#!/usr/bin/env python3
"""leer_step.py — inventario medido del STEP del clasificador del cliente.

Carga `ref/sorter_CO.stp` (AP214, Autodesk Inventor 2026) con OpenCascade vía
XCAF, recorre el árbol de ensamble y saca POR OCURRENCIA:

  nombre, ruta en el árbol, matriz de colocación (3x4), caja envolvente en
  coordenadas del conjunto, volumen y área.

Todo lo que emite es MEDIDO del STEP: nada se rellena. Si una ocurrencia no se
puede evaluar (sólido inválido, sin geometría) queda con el campo a `null` y el
motivo en `error`.

Optimizaciones (el STEP son 22.5 MB / 485 definiciones de producto):
  · volumen y área se calculan UNA vez por prototipo (label del producto) y se
    reutilizan en todas sus ocurrencias — son invariantes ante la colocación.
  · la caja envolvente sí se calcula por ocurrencia (una rotación cambia la
    caja), pero sobre una malla gruesa cacheada del prototipo, transformada por
    la matriz de la ocurrencia: exacto en vértices, y el error de la caja queda
    acotado por la flecha de teselado (se declara en el JSON).
  · además se emite la caja EXACTA por B-Rep de cada prototipo en su propio
    sistema local, para las cotas que necesitan precisión de catálogo.

Salida: inventario.json
Uso:    python3 cad/ensambles/sorter_co/leer_step.py [--salida inventario.json]
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path

from OCP.BRep import BRep_Tool
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepGProp import BRepGProp
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.Bnd import Bnd_Box
from OCP.GProp import GProp_GProps
from OCP.IFSelect import IFSelect_ReturnStatus
from OCP.Interface import Interface_Static
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TCollection import TCollection_AsciiString, TCollection_ExtendedString
from OCP.TDF import TDF_Label, TDF_LabelSequence
from OCP.TDataStd import TDataStd_Name
from OCP.TDocStd import TDocStd_Document
from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID, TopAbs_SHELL
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS
from OCP.XCAFApp import XCAFApp_Application
from OCP.XCAFDoc import XCAFDoc_DocumentTool

AQUI = Path(__file__).resolve().parent
STEP = AQUI / "ref" / "sorter_CO.stp"
FLECHA = 0.30          # mm — flecha lineal del teselado usado para las cajas
ANG = 0.5              # rad — flecha angular


def r(x, n=3):
    return None if x is None else round(float(x), n)


def nombre_label(lab: TDF_Label) -> str:
    from OCP.TDataStd import TDataStd_Name
    from OCP.Standard import Standard_GUID
    it = TDataStd_Name()
    if lab.FindAttribute(TDataStd_Name.GetID_s(), it):
        return it.Get().ToExtString()
    return ""


def entrada(lab: TDF_Label) -> str:
    s = TCollection_AsciiString()
    from OCP.TDF import TDF_Tool
    TDF_Tool.Entry_s(lab, s)
    return s.ToCString()


def trsf_lista(t):
    """gp_Trsf → matriz 3x4 [[r11,r12,r13,tx],…] tal cual la aplica OCC."""
    return [[r(t.Value(i, j), 6) for j in range(1, 5)] for i in range(1, 4)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--step", default=str(STEP))
    ap.add_argument("--salida", default=str(AQUI / "inventario.json"))
    ap.add_argument("--flecha", type=float, default=FLECHA)
    a = ap.parse_args()

    t0 = time.time()
    print(f"[{time.time()-t0:7.1f}s] abriendo {a.step}", flush=True)

    app = XCAFApp_Application.GetApplication_s()
    doc = TDocStd_Document(TCollection_ExtendedString("sorter"))
    app.NewDocument(TCollection_ExtendedString("MDTV-XCAF"), doc)

    Interface_Static.SetIVal_s("read.step.shape.relationship", 1)
    rd = STEPCAFControl_Reader()
    rd.SetNameMode(True)
    rd.SetColorMode(True)
    rd.SetLayerMode(True)
    st = rd.ReadFile(a.step)
    if st != IFSelect_ReturnStatus.IFSelect_RetDone:
        print(f"ERROR: ReadFile devolvió {st}", file=sys.stderr)
        return 2
    print(f"[{time.time()-t0:7.1f}s] fichero leído, transfiriendo…", flush=True)
    if not rd.Transfer(doc):
        print("ERROR: Transfer falló", file=sys.stderr)
        return 2
    t_carga = time.time() - t0
    print(f"[{time.time()-t0:7.1f}s] transferido", flush=True)

    # unidades declaradas en el STEP
    unidad = Interface_Static.CVal_s("xstep.cascade.unit") or "?"

    st_tool = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())

    # ---------------------------------------------------------------- prototipos
    proto = {}          # entry -> dict con métricas del prototipo (sistema local)

    def metricas_proto(lab: TDF_Label):
        e = entrada(lab)
        if e in proto:
            return proto[e]
        d = {"entry": e, "nombre": nombre_label(lab), "error": None}
        try:
            sh = st_tool.GetShape_s(lab)
        except Exception as ex:
            d["error"] = f"GetShape: {ex}"
            proto[e] = d
            return d
        if sh.IsNull():
            d["error"] = "shape nulo"
            proto[e] = d
            return d
        # el prototipo se mide SIN su localización (sistema local de la pieza)
        sh = sh.Located(TopLoc_Location())
        # conteos
        nf = ns = 0
        ex_ = TopExp_Explorer(sh, TopAbs_FACE)
        while ex_.More():
            nf += 1
            ex_.Next()
        ex_ = TopExp_Explorer(sh, TopAbs_SOLID)
        while ex_.More():
            ns += 1
            ex_.Next()
        d["caras"] = nf
        d["solidos"] = ns
        # volumen y área (invariantes ante colocación rígida)
        try:
            g = GProp_GProps()
            BRepGProp.VolumeProperties_s(sh, g)
            v = g.Mass()
            d["volumen_mm3"] = r(v, 2)
            c = g.CentreOfMass()
            d["centroide_local"] = [r(c.X()), r(c.Y()), r(c.Z())]
        except Exception as ex:
            d["volumen_mm3"] = None
            d["error"] = f"volumen: {ex}"
        try:
            g = GProp_GProps()
            BRepGProp.SurfaceProperties_s(sh, g)
            d["area_mm2"] = r(g.Mass(), 2)
        except Exception as ex:
            d["area_mm2"] = None
        # caja exacta B-Rep en el sistema local
        try:
            b = Bnd_Box()
            BRepBndLib.AddOptimal_s(sh, b, True, False)
            xm, ym, zm, xM, yM, zM = b.Get()
            d["caja_local"] = {"min": [r(xm), r(ym), r(zm)], "max": [r(xM), r(yM), r(zM)],
                               "dim": [r(xM - xm), r(yM - ym), r(zM - zm)]}
        except Exception as ex:
            d["caja_local"] = None
            d["error"] = (d["error"] or "") + f" caja_local: {ex}"
        # malla para las cajas por ocurrencia
        pts = []
        try:
            BRepMesh_IncrementalMesh(sh, a.flecha, False, ANG, True)
            ex_ = TopExp_Explorer(sh, TopAbs_FACE)
            while ex_.More():
                f = TopoDS.Face_s(ex_.Current())
                loc = TopLoc_Location()
                tri = BRep_Tool.Triangulation_s(f, loc)
                if tri is not None:
                    tr = loc.Transformation()
                    for i in range(1, tri.NbNodes() + 1):
                        p = tri.Node(i).Transformed(tr)
                        pts.append((p.X(), p.Y(), p.Z()))
                ex_.Next()
        except Exception as ex:
            d["error"] = (d["error"] or "") + f" malla: {ex}"
        d["_pts"] = pts
        d["n_pts"] = len(pts)
        proto[e] = d
        return d

    # ---------------------------------------------------------------- recorrido
    ocurrencias = []
    avisos = []

    def recorre(lab: TDF_Label, ruta, trsf, prof, ruta_entries):
        """lab: label de shape (prototipo). trsf: gp_Trsf acumulado."""
        nom = nombre_label(lab) or "(sin nombre)"
        if st_tool.IsAssembly_s(lab):
            hijos = TDF_LabelSequence()
            st_tool.GetComponents_s(lab, hijos, False)
            for i in range(1, hijos.Length() + 1):
                comp = hijos.Value(i)
                nom_i = nombre_label(comp) or ""
                loc = st_tool.GetLocation_s(comp)
                t2 = trsf.Multiplied(loc.Transformation()) if trsf is not None else loc.Transformation()
                ref = TDF_Label()
                if st_tool.GetReferredShape_s(comp, ref):
                    hijo = ref
                else:
                    hijo = comp
                etiqueta = nombre_label(hijo) or nom_i or "(?)"
                recorre(hijo, ruta + [etiqueta], t2, prof + 1, ruta_entries + [entrada(comp)])
            return
        # hoja
        p = metricas_proto(lab)
        oc = {
            "id": len(ocurrencias) + 1,
            "nombre": nom,
            "ruta": "/".join(ruta),
            "profundidad": prof,
            "proto_entry": p["entry"],
            "caras": p.get("caras"),
            "solidos": p.get("solidos"),
            "volumen_mm3": p.get("volumen_mm3"),
            "area_mm2": p.get("area_mm2"),
            "matriz": trsf_lista(trsf),
        }
        # caja envolvente en coordenadas del conjunto, desde la malla del prototipo
        pts = p.get("_pts") or []
        if pts:
            xm = ym = zm = 1e30
            xM = yM = zM = -1e30
            m = trsf
            a11, a12, a13, a14 = (m.Value(1, j) for j in range(1, 5))
            a21, a22, a23, a24 = (m.Value(2, j) for j in range(1, 5))
            a31, a32, a33, a34 = (m.Value(3, j) for j in range(1, 5))
            for (x, y, z) in pts:
                X = a11 * x + a12 * y + a13 * z + a14
                Y = a21 * x + a22 * y + a23 * z + a24
                Z = a31 * x + a32 * y + a33 * z + a34
                if X < xm: xm = X
                if X > xM: xM = X
                if Y < ym: ym = Y
                if Y > yM: yM = Y
                if Z < zm: zm = Z
                if Z > zM: zM = Z
            oc["caja"] = {"min": [r(xm), r(ym), r(zm)], "max": [r(xM), r(yM), r(zM)],
                          "dim": [r(xM - xm), r(yM - ym), r(zM - zm)]}
            oc["caja_metodo"] = f"malla flecha {a.flecha} mm"
        else:
            oc["caja"] = None
            oc["caja_metodo"] = None
            avisos.append(f"{oc['ruta']}: sin malla ({p.get('error')})")
        if p.get("error"):
            oc["error"] = p["error"]
        # centroide en coordenadas del conjunto
        c = p.get("centroide_local")
        if c:
            m = trsf
            oc["centroide"] = [
                r(m.Value(1, 1) * c[0] + m.Value(1, 2) * c[1] + m.Value(1, 3) * c[2] + m.Value(1, 4)),
                r(m.Value(2, 1) * c[0] + m.Value(2, 2) * c[1] + m.Value(2, 3) * c[2] + m.Value(2, 4)),
                r(m.Value(3, 1) * c[0] + m.Value(3, 2) * c[1] + m.Value(3, 3) * c[2] + m.Value(3, 4)),
            ]
        ocurrencias.append(oc)
        if len(ocurrencias) % 25 == 0:
            print(f"[{time.time()-t0:7.1f}s] {len(ocurrencias)} ocurrencias…", flush=True)

    libres = TDF_LabelSequence()
    st_tool.GetFreeShapes(libres)
    print(f"[{time.time()-t0:7.1f}s] {libres.Length()} shape(s) raíz", flush=True)
    from OCP.gp import gp_Trsf
    raices = []
    for i in range(1, libres.Length() + 1):
        lab = libres.Value(i)
        nom = nombre_label(lab) or f"raiz{i}"
        raices.append(nom)
        loc = st_tool.GetLocation_s(lab)
        recorre(lab, [nom], loc.Transformation(), 0, [entrada(lab)])

    # -------------------------------------------------------------- prototipos out
    for d in proto.values():
        d.pop("_pts", None)

    caja_g = {"min": [1e30] * 3, "max": [-1e30] * 3}
    for oc in ocurrencias:
        if oc.get("caja"):
            for k in range(3):
                caja_g["min"][k] = min(caja_g["min"][k], oc["caja"]["min"][k])
                caja_g["max"][k] = max(caja_g["max"][k], oc["caja"]["max"][k])
    caja_g["dim"] = [r(caja_g["max"][k] - caja_g["min"][k]) for k in range(3)]
    caja_g["min"] = [r(v) for v in caja_g["min"]]
    caja_g["max"] = [r(v) for v in caja_g["max"]]

    out = {
        "$comment": "Inventario MEDIDO del STEP del cliente. Capa 'step'. Ninguna cota inventada.",
        "fuente": {
            "archivo": str(Path(a.step).relative_to(AQUI.parent.parent.parent)) if str(a.step).startswith(str(AQUI.parent.parent.parent)) else a.step,
            "bytes": Path(a.step).stat().st_size,
            "esquema": "AUTOMOTIVE_DESIGN (AP214)",
            "originating_system": "Autodesk Inventor 2026",
            "unidad_xcaf": unidad,
        },
        "generado": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "tiempos_s": {"carga_step": r(t_carga, 1), "total": None},
        "metodo": {
            "caja": f"malla del prototipo (flecha lineal {a.flecha} mm, angular {ANG} rad) transformada por la matriz de la ocurrencia; el error de la caja está acotado por la flecha",
            "caja_local": "exacta (BRepBndLib::AddOptimal sobre B-Rep) en el sistema local del prototipo",
            "volumen_area": "GProp sobre el B-Rep del prototipo (invariante ante colocación rígida)",
            "matriz": "3x4, fila i = [r_i1 r_i2 r_i3 t_i]; p_conjunto = M · p_local",
        },
        "raices": raices,
        "caja_global": caja_g,
        "n_ocurrencias": len(ocurrencias),
        "n_prototipos": len(proto),
        "avisos": avisos,
        "prototipos": sorted(proto.values(), key=lambda d: d.get("nombre") or ""),
        "ocurrencias": ocurrencias,
    }
    out["tiempos_s"]["total"] = r(time.time() - t0, 1)
    Path(a.salida).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[{time.time()-t0:7.1f}s] OK → {a.salida}")
    print(f"  {len(ocurrencias)} ocurrencias · {len(proto)} prototipos · {len(avisos)} avisos")
    print(f"  caja global {caja_g['dim']} mm")
    return 0


if __name__ == "__main__":
    sys.exit(main())
