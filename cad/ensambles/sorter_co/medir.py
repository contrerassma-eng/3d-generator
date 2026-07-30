#!/usr/bin/env python3
"""medir.py — mediciones dirigidas sobre el STEP del clasificador del cliente.

Complementa `leer_step.py` (que da el inventario por ocurrencia) con las cotas
que gobiernan el acoplamiento de la transferencia 90°:

  · caras CILÍNDRICAS por prototipo: radio, eje, área  →  diámetros de poleas,
    rodillos, barrenos de rodamiento, camisa del cilindro neumático.
  · caras PLANARES por prototipo: normal y cota  →  espesores de chapa, planos.
  · caja envolvente EXACTA (B-Rep) de las ocurrencias de la lista corta, en
    coordenadas del conjunto  →  paso entre bandas, ancho útil, plano de
    transporte.
  · ejes de revolución en coordenadas del conjunto  →  ejes de poleas y rodillos.

Todo es capa `step` (medido). Nada se rellena.

Uso: python3 cad/ensambles/sorter_co/medir.py
Salida: analisis/medidas.json
"""
from __future__ import annotations

import argparse
import json
import math
import re
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
from OCP.gp import gp_Trsf

AQUI = Path(__file__).resolve().parent
STEP = AQUI / "ref" / "sorter_CO.stp"

# Ocurrencias cuya caja EXACTA (B-Rep, no malla) se calcula en el conjunto:
# son las que fijan las cotas de acoplamiento.
CORTA = re.compile(
    r"^(banda_T5_3p4|motriz_63T|conducida_63T|guia_entrada_liso|guia_salida_liso|"
    r"roller|guia|TSLOT|rail|Polea_AT10_32T_pestanas|cierre guia|"
    r"FRAME_MIR|FRAME_MIR_MIR|FRAME_MIR_MIR_MIR|FRONT TOP2|FRONT TOP2_MIR|LAT TOP|"
    r"TER1|TER1_MIR|CAN0|CAN1|CAN0_MIR|CAN1_MIR|front top|inner top|"
    r"U_004|U_005|U_005_MIR|U_006|U_006_MIR1|U_007|U_007_MIR|"
    r"CD85N25-80T-B\(0__1_0\)|CD85N25-80-B\(0\)_BODY|C8525-80T_ROD_CPY2|"
    r"SOPORTE MOTRIZ 2 T|SOPORTE MOTRIZ 2 T_MIR|SOPORTE MOTRIZ P1-1|SOPORTE MOTRIZ P1-2|"
    r"UA-DRIVE PULLEY|POL-CON-TEN|POL-COND-TEN|POL-COND-TEN2|IDLER PULLEY|IDLER-P01|"
    r"SKF_UCFL 205|UC 205\+33_7_b|FL 205\+_h|skf_bearing_1206_etn9_2|"
    r"skf_bearing_nk_19_20_2|W 6004-2Z|Bearing 6203 2RS|Outer Race|Inner Race|"
    r"LK30-C65-20H7-D30-R|LK30-C65-20H7-D30-R_1|LK30-C65-20H7-D30-R_2|"
    r"T-Sliding Nut M8|SCMRT906VT-1211|SCMRT906VT-100-401_3|SCMRT906VCT-150-111|"
    r"TENS-LN-01|BUJE-TECH-01|PZA-TEN-1|EJE-PST-01|SEPARADOR|SEP|SF|"
    r"EJE-25mm-PASADOR|TEFLON 45-56\.905|ANSI B 27\.7M - 3AMI-20|"
    r"Std Motor with Molex & D-Shape Shaft|SOPORTE MOTOR|CT-ENS|UA-T01|UA-T02|"
    r"UR-P01|UR-P02|UR-P03|UA-DER|SH-04|Uni_001|uni_002|uni_003|"
    r"KJ10D_CPY2|AS2201FS-01-06S|AN101-01-01|CILINDRO 25mm|C85C25_25|314759014|"
    r"cal_4_f40___65_1|Unbrako - M6 x 45|AS 1111 - M8 x 70|AS 1112 - M8  Tipo 5|"
    r"AS 1420 - 1973 - M8 x 16|AS 1420 - 1973 - M10 x 50|AS 1420 - 1973 - M4 x 12|"
    r"AS 1110 - M10 x 16|DIN 1587 - M4|ISO 8673  - M8 x 1|DIN 472 - Anillo de Retencion Interno|"
    r"ASME/ANSI B18\.3\.5M - M8x16\(2\)|IFI 532 - 4, ITLWTA|IFI 532 - 4, ITLWTB|"
    r"ANSI B18\.22M - 8 N|ANSI B18\.21\.1 - 0\.375|IFI - 10, RTW|AS 1420 - 1973 - M8 x 65|"
    r"AS 1112 - M8  Tipo 5_1|ANSI B18\.16\.3M.*|AS 2465.*|1_4-28 UNF_2|_RO3100_part1|"
    r"_RUP500_part2_p2|ucfl-IEC_BBY_006-25-34--52-15-39-7_938)$")


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--step", default=str(STEP))
    ap.add_argument("--salida", default=str(AQUI / "analisis" / "medidas.json"))
    a = ap.parse_args()
    t0 = time.time()

    app = XCAFApp_Application.GetApplication_s()
    doc = TDocStd_Document(TCollection_ExtendedString("s"))
    app.NewDocument(TCollection_ExtendedString("MDTV-XCAF"), doc)
    rd = STEPCAFControl_Reader()
    rd.SetNameMode(True)
    if rd.ReadFile(a.step) != IFSelect_ReturnStatus.IFSelect_RetDone:
        print("ERROR ReadFile", file=sys.stderr)
        return 2
    rd.Transfer(doc)
    print(f"[{time.time()-t0:6.1f}s] STEP cargado", flush=True)
    ST = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())

    # -------------------------------------------------- superficies por prototipo
    superficies = {}

    def analiza_proto(lab):
        e = entry(lab)
        if e in superficies:
            return superficies[e]
        sh = ST.GetShape_s(lab).Located(TopLoc_Location())
        cil = defaultdict(lambda: {"n": 0, "area": 0.0, "ejes": []})
        pla = defaultdict(lambda: {"n": 0, "area": 0.0})
        con = []
        tor = []
        otros = defaultdict(int)
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
                    if len(k["ejes"]) < 4:
                        k["ejes"].append({
                            "dir": [r(ax.Direction().X()), r(ax.Direction().Y()), r(ax.Direction().Z())],
                            "loc": [r(ax.Location().X()), r(ax.Location().Y()), r(ax.Location().Z())]})
                elif t == GeomAbs_SurfaceType.GeomAbs_Plane:
                    pl = s.Plane()
                    n_ = pl.Axis().Direction()
                    # normal canónica (signo fijo) + distancia al origen
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
                elif t == GeomAbs_SurfaceType.GeomAbs_Torus:
                    tt = s.Torus()
                    tor.append({"R": r(tt.MajorRadius()), "r": r(tt.MinorRadius()), "area": r(ar, 1)})
                else:
                    otros[str(t).split("_")[-1]] += 1
            except Exception:
                otros["error"] += 1
        d = {
            "cilindros": sorted(
                [{"dia": k, "n": v["n"], "area": r(v["area"], 1), "ejes": v["ejes"]} for k, v in cil.items()],
                key=lambda z: -z["area"])[:24],
            "n_cil_distintos": len(cil),
            "planos": sorted(
                [{"normal": list(k[:3]), "d": k[3], "n": v["n"], "area": r(v["area"], 1)} for k, v in pla.items()],
                key=lambda z: -z["area"])[:24],
            "n_planos_distintos": len(pla),
            "conos": con[:8], "n_conos": len(con),
            "toros": tor[:8], "n_toros": len(tor),
            "otras_superficies": dict(otros),
        }
        superficies[e] = d
        return d

    # -------------------------------------------------- recorrido de ocurrencias
    exactas = []
    vistos_proto = set()

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
        if not CORTA.match(n):
            return
        e = entry(lab)
        if e not in vistos_proto:
            analiza_proto(lab)
            superficies[e]["nombre"] = n
            vistos_proto.add(e)
        # OJO: se usa `Moved`, que COMPONE sobre la localización que la etiqueta ya
        # traiga incorporada, en lugar de `Located`, que la sustituiría (y perdería
        # cualquier transformación horneada en el prototipo).
        sh = ST.GetShape_s(lab)
        try:
            b = Bnd_Box()
            BRepBndLib.AddOptimal_s(sh.Moved(TopLoc_Location(trsf)), b, True, False)
            xm, ym, zm, xM, yM, zM = b.Get()
            caja = {"min": [r(xm), r(ym), r(zm)], "max": [r(xM), r(yM), r(zM)],
                    "dim": [r(xM - xm), r(yM - ym), r(zM - zm)]}
        except Exception as ex:
            caja = None
        exactas.append({
            "nombre": n, "ruta": "/".join(ruta), "proto": e, "caja_exacta": caja,
            "matriz": [[r(trsf.Value(i, j), 6) for j in range(1, 5)] for i in range(1, 4)],
        })
        if len(exactas) % 50 == 0:
            print(f"[{time.time()-t0:6.1f}s] {len(exactas)} cajas exactas…", flush=True)

    libres = TDF_LabelSequence()
    ST.GetFreeShapes(libres)
    for i in range(1, libres.Length() + 1):
        L = libres.Value(i)
        recorre(L, [nom(L) or "raiz"], ST.GetLocation_s(L).Transformation())

    out = {
        "$comment": "Mediciones dirigidas sobre el STEP del cliente. Capa 'step'.",
        "generado": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "unidad": "mm (los 135 GEOMETRIC_REPRESENTATION_CONTEXT del STEP usan SI_UNIT(.MILLI.,.METRE.))",
        "metodo": {
            "caja_exacta": "BRepBndLib::AddOptimal sobre el B-Rep ya colocado (sin teselar) — precisión de modelo",
            "cilindros": "BRepAdaptor_Surface por cara; diámetro = 2·R, agrupado a 0.001 mm; eje en el sistema LOCAL del prototipo",
        },
        "n_ocurrencias_medidas": len(exactas),
        "superficies_por_prototipo": superficies,
        "ocurrencias": exactas,
    }
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(a.salida).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[{time.time()-t0:6.1f}s] OK → {a.salida} · {len(exactas)} ocurrencias, {len(superficies)} prototipos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
