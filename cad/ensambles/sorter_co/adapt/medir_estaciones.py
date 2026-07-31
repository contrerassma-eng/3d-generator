#!/usr/bin/env python3
"""medir_estaciones.py — mediciones dirigidas del DETALLE DE ESTACIONES sobre el
STEP del cliente. Complementa medir.py con lo que la lista corta no cubría:

  · IDLER-P01 (polea loca del IDLER-ENS): caja exacta por ocurrencia, EJE REAL
    (dirección e inclinación de la matriz de colocación) y posición relativa a
    las placas UR-P01 de su horquilla y a la conducida_63T de su calle.
  · POL-CON-TEN (polea tensora): superficies interiores → alojamientos de los
    W 6004-2Z y su retención (el patrón que replican V1…V4 del pozo nuevo).
  · C85C25_25 (horquilla trasera del cilindro del tensor): orejas, luz, bulón.
  · IDLER-E y Bearing 6203 2RS (paquete interior de la polea loca).

Todo es capa `step` (medido). Nada se rellena.

Uso:    python3 cad/ensambles/sorter_co/adapt/medir_estaciones.py
Salida: cad/ensambles/sorter_co/analisis/estaciones.json
"""
from __future__ import annotations

import json
import math
import sys
import time
from collections import defaultdict
from pathlib import Path

from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepGProp import BRepGProp
from OCP.Bnd import Bnd_Box
from OCP.GProp import GProp_GProps
from OCP.GeomAbs import GeomAbs_SurfaceType
from OCP.IFSelect import IFSelect_ReturnStatus
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TCollection import TCollection_AsciiString, TCollection_ExtendedString
from OCP.TDF import TDF_Label, TDF_LabelSequence, TDF_Tool
from OCP.TDataStd import TDataStd_Name
from OCP.TDocStd import TDocStd_Document
from OCP.TopAbs import TopAbs_FACE
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS
from OCP.XCAFApp import XCAFApp_Application
from OCP.XCAFDoc import XCAFDoc_DocumentTool

AQUI = Path(__file__).resolve().parent
STEP = AQUI.parent / "ref" / "sorter_CO.stp"
SALIDA = AQUI.parent / "analisis" / "estaciones.json"

QUIERO = {"IDLER-P01", "IDLER-E", "POL-CON-TEN", "C85C25_25", "UR-P01",
          "conducida_63T", "Bearing 6203 2RS", "SEPARADOR", "SF-01", "TENS-LN-01"}


def r(x, n=3):
    return None if x is None else round(float(x), n)


def nom(lab):
    it = TDataStd_Name()
    if lab.FindAttribute(TDataStd_Name.GetID_s(), it):
        return it.Get().ToExtString()
    return ""


def entry(lab):
    s = TCollection_AsciiString()
    TDF_Tool.Entry_s(lab, s)
    return s.ToCString()


def superficies(sh):
    cil = defaultdict(lambda: {"n": 0, "area": 0.0, "ejes": []})
    pla = defaultdict(lambda: {"n": 0, "area": 0.0})
    con = []
    ex = TopExp_Explorer(sh, TopAbs_FACE)
    while ex.More():
        f = TopoDS.Face_s(ex.Current())
        ex.Next()
        try:
            s = BRepAdaptor_Surface(f, True)
            g = GProp_GProps()
            BRepGProp.SurfaceProperties_s(f, g)
            ar = g.Mass()
            t = s.GetType()
            if t == GeomAbs_SurfaceType.GeomAbs_Cylinder:
                cy = s.Cylinder()
                d = round(cy.Radius() * 2, 3)
                k = cil[d]
                k["n"] += 1
                k["area"] += ar
                ax = cy.Axis()
                if len(k["ejes"]) < 6:
                    k["ejes"].append({
                        "dir": [r(ax.Direction().X()), r(ax.Direction().Y()), r(ax.Direction().Z())],
                        "loc": [r(ax.Location().X()), r(ax.Location().Y()), r(ax.Location().Z())]})
            elif t == GeomAbs_SurfaceType.GeomAbs_Plane:
                pl = s.Plane()
                n_ = pl.Axis().Direction()
                v = [n_.X(), n_.Y(), n_.Z()]
                for i in range(3):
                    if abs(v[i]) > 1e-7:
                        if v[i] < 0:
                            v = [-c for c in v]
                        break
                p0 = pl.Location()
                d0 = v[0] * p0.X() + v[1] * p0.Y() + v[2] * p0.Z()
                key = (round(v[0], 3), round(v[1], 3), round(v[2], 3), round(d0, 2))
                kk = pla[key]
                kk["n"] += 1
                kk["area"] += ar
            elif t == GeomAbs_SurfaceType.GeomAbs_Cone:
                c_ = s.Cone()
                con.append({"semiangulo_deg": r(math.degrees(c_.SemiAngle()), 2),
                            "radio_ref": r(c_.RefRadius()), "area": r(ar, 1)})
        except Exception:
            pass
    return {
        "cilindros": sorted(
            [{"dia": k, "n": v["n"], "area": r(v["area"], 1), "ejes": v["ejes"]} for k, v in cil.items()],
            key=lambda z: -z["area"])[:16],
        "planos": sorted(
            [{"normal": list(k[:3]), "d": k[3], "n": v["n"], "area": r(v["area"], 1)} for k, v in pla.items()],
            key=lambda z: -z["area"])[:16],
        "conos": con[:8],
    }


def main():
    t0 = time.time()
    app = XCAFApp_Application.GetApplication_s()
    doc = TDocStd_Document(TCollection_ExtendedString("s"))
    app.NewDocument(TCollection_ExtendedString("MDTV-XCAF"), doc)
    rd = STEPCAFControl_Reader()
    rd.SetNameMode(True)
    if rd.ReadFile(str(STEP)) != IFSelect_ReturnStatus.IFSelect_RetDone:
        print("ERROR ReadFile", file=sys.stderr)
        return 2
    rd.Transfer(doc)
    print(f"[{time.time()-t0:6.1f}s] STEP cargado", flush=True)
    ST = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())

    protos = {}
    ocurr = []

    def recorre(lab, ruta, trsf):
        if ST.IsAssembly_s(lab):
            hijos = TDF_LabelSequence()
            ST.GetComponents_s(lab, hijos, False)
            for i in range(1, hijos.Length() + 1):
                c = hijos.Value(i)
                loc = ST.GetLocation_s(c)
                t2 = trsf.Multiplied(loc.Transformation())
                ref = TDF_Label()
                h = ref if ST.GetReferredShape_s(c, ref) else c
                recorre(h, ruta + [nom(h) or nom(c) or "?"], t2)
            return
        n = nom(lab) or "?"
        if n not in QUIERO:
            return
        e = entry(lab)
        if e not in protos:
            sh0 = ST.GetShape_s(lab).Located(TopLoc_Location())
            protos[e] = {"nombre": n, **superficies(sh0)}
        sh = ST.GetShape_s(lab)
        b = Bnd_Box()
        BRepBndLib.AddOptimal_s(sh.Moved(TopLoc_Location(trsf)), b, True, False)
        xm, ym, zm, xM, yM, zM = b.Get()
        ocurr.append({
            "nombre": n, "ruta": "/".join(ruta), "proto": e,
            "caja_exacta": {"min": [r(xm), r(ym), r(zm)], "max": [r(xM), r(yM), r(zM)],
                            "dim": [r(xM - xm), r(yM - ym), r(zM - zm)]},
            "matriz": [[r(trsf.Value(i, j), 6) for j in range(1, 5)] for i in range(1, 4)],
        })

    libres = TDF_LabelSequence()
    ST.GetFreeShapes(libres)
    for i in range(1, libres.Length() + 1):
        L = libres.Value(i)
        recorre(L, [nom(L) or "raiz"], ST.GetLocation_s(L).Transformation())

    # --- derivadas del punto 3: eje real de IDLER-P01 y relación con UR/conducida
    idlers = [o for o in ocurr if o["nombre"] == "IDLER-P01"]
    urs = [o for o in ocurr if o["nombre"] == "UR-P01"]
    conds = [o for o in ocurr if o["nombre"] == "conducida_63T"]
    derivadas = []
    for o in idlers:
        m = o["matriz"]
        # columna 3 de la matriz = a dónde va el eje local Z del prototipo
        ejz = [m[0][2], m[1][2], m[2][2]]
        centro = [m[0][3], m[1][3], m[2][3]]
        incl = math.degrees(math.asin(max(-1, min(1, abs(ejz[2])))))
        cx = centro[0]
        urs_cerca = [u for u in urs if abs((u["caja_exacta"]["min"][0] + u["caja_exacta"]["max"][0]) / 2 - cx) < 60]
        cond_cerca = [c for c in conds if abs((c["caja_exacta"]["min"][0] + c["caja_exacta"]["max"][0]) / 2 - cx) < 60]
        d = {"centro_eje": [r(c) for c in centro], "dir_eje": [r(c) for c in ejz],
             "inclinacion_eje_deg": r(incl, 3)}
        if urs_cerca:
            y0 = min(u["caja_exacta"]["min"][1] for u in urs_cerca)
            y1 = max(u["caja_exacta"]["max"][1] for u in urs_cerca)
            d["horquilla_UR_P01_y"] = [r(y0), r(y1)]
            d["eje_a_extremo_sur_horquilla"] = r(centro[1] - y0)
        if cond_cerca:
            c0 = cond_cerca[0]["caja_exacta"]
            d["conducida_centro"] = [r((c0["min"][0] + c0["max"][0]) / 2),
                                     r((c0["min"][1] + c0["max"][1]) / 2),
                                     r((c0["min"][2] + c0["max"][2]) / 2)]
            d["coaxial_con_conducida_dYZ"] = [r(centro[1] - d["conducida_centro"][1]),
                                              r(centro[2] - d["conducida_centro"][2])]
            d["solape_X_con_conducida"] = r(min(o["caja_exacta"]["max"][0], c0["max"][0])
                                            - max(o["caja_exacta"]["min"][0], c0["min"][0]))
        derivadas.append(d)

    out = {
        "$comment": "Mediciones del detalle de estaciones (IDLER-P01, POL-CON-TEN, C85C25). Capa 'step'. "
                    "Reproducible: python3 cad/ensambles/sorter_co/adapt/medir_estaciones.py",
        "generado": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "unidad": "mm",
        "metodo": {
            "caja_exacta": "BRepBndLib::AddOptimal sobre el B-Rep colocado (Moved compone la localización horneada)",
            "superficies": "BRepAdaptor_Surface por cara del prototipo, en su sistema LOCAL",
            "eje_idler": "columna 3 de la matriz de colocación = imagen del eje local Z del prototipo",
        },
        "prototipos": protos,
        "ocurrencias": ocurr,
        "idler_p01_derivadas": derivadas,
    }
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[{time.time()-t0:6.1f}s] OK → {SALIDA} · {len(ocurr)} ocurrencias, {len(protos)} prototipos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
