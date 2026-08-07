#!/usr/bin/env python3
"""acople.py — qué hay que mover del sorter para que entre la transferencia NBT90.

Parte de `inventario.json` (cajas por ocurrencia) y de `analisis/medidas.json`
(cajas exactas B-Rep) y responde, con números medidos, a:

  1. La FRANJA DE BARRIDO del rodillo de transferencia: qué material del sorter
     vive entre `planoBanda − 38.58` y `planoBanda + 6.35`, y qué ventanas libres
     quedan en X. Es la cota que decide qué se mueve.
  2. El PASO de las estaciones hoy contra los 76.2 mm congelados, y las dos
     opciones (5 estaciones y 4 repartidas) con su envolvente.
  3. El ANCHO ÚTIL del bastidor contra los 457.2 mm de BR.
  4. La TRANSFERENCIA INCOMPLETA: subárboles que no pertenecen al sorter, con su
     caja y el hueco que dejan.
  5. Interferencias evidentes del modelo del cliente (solapes de cajas exactas
     entre ocurrencias que no son padre/hijo).

Capa `step`: todo sale del STEP. Salida: analisis/acople.json
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent

# --- especificación CONGELADA de la transferencia (cad/ensambles/nbt90/params.mjs)
IN = 25.4
NBT = {
    "BR": 18 * IN,                 # 457.2 — entre almas de los canales laterales
    "paso": 3 * IN,                # 76.2  — entre ejes de rodillos y entre bandas
    "nRodillos": 6,
    "nBandas": 5,
    "rodDia": round(1.375 * IN, 3),   # 34.925
    "rodCara": 375.0,
    "ventanaBanda": round(1.25 * IN, 3),   # 31.75 — banda + regleta de 1-1/4"
    "emerge": round(0.25 * IN, 3),         # 6.35 sobre el plano de banda, elevado
    "carrera": 10.0,
    "largoModuloX": 463.0,
}
NBT["retraido"] = round(NBT["emerge"] - NBT["carrera"], 3)          # -3.65
NBT["barridoInf"] = round(NBT["retraido"] - NBT["rodDia"], 3)       # -38.575
NBT["envolvRodillos"] = round((NBT["nRodillos"] - 1) * NBT["paso"] + NBT["rodDia"], 3)
NBT["spanBandas"] = round((NBT["nBandas"] - 1) * NBT["paso"], 3)


def cargar():
    inv = json.loads((AQUI / "inventario.json").read_text(encoding="utf-8"))
    med = json.loads((AQUI / "analisis" / "medidas.json").read_text(encoding="utf-8"))
    exacta = {}
    for o in med["ocurrencias"]:
        if o.get("caja_exacta"):
            exacta[(o["ruta"], tuple(map(tuple, o["matriz"])))] = o["caja_exacta"]
    ocs = []
    for o in inv["ocurrencias"]:
        c = exacta.get((o["ruta"], tuple(map(tuple, o["matriz"])))) or o.get("caja")
        if not c:
            continue
        ocs.append({"nombre": o["nombre"], "ruta": o["ruta"], "caja": c,
                    "exacta": (o["ruta"], tuple(map(tuple, o["matriz"]))) in exacta,
                    "vol": o.get("volumen_mm3")})
    return inv, ocs


def ventanas(intervalos, x0, x1, minimo=1.0):
    """Huecos libres en [x0,x1] fuera de la unión de `intervalos`."""
    iv = sorted((a, b) for a, b in intervalos if b > x0 and a < x1)
    libres, cur = [], x0
    for a, b in iv:
        if a > cur + 1e-9:
            libres.append((cur, a))
        cur = max(cur, b)
    if cur < x1 - 1e-9:
        libres.append((cur, x1))
    return [{"x0": round(a, 3), "x1": round(b, 3), "ancho": round(b - a, 3)}
            for a, b in libres if b - a >= minimo]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plano-banda", type=float, default=52.333,
                    help="cota Z del plano de transporte medida en el STEP")
    ap.add_argument("--salida", default=str(AQUI / "analisis" / "acople.json"))
    a = ap.parse_args()
    inv, ocs = cargar()
    PB = a.plano_banda

    out = {"$comment": "Qué hay que mover del sorter para alojar la transferencia NBT90. "
                       "Cotas del sorter = capa 'step'; cotas del NBT90 = params.mjs (congeladas).",
           "plano_transporte_Z": PB, "nbt90_congelado": NBT}

    # ------------------------------------------------------ 1. franja de barrido
    z0 = round(PB + NBT["barridoInf"], 3)
    z1 = round(PB + NBT["emerge"], 3)
    lejos = [o for o in ocs if abs(o["caja"]["min"][1]) > 100000]      # FRAME_MIR extraviado
    utiles = [o for o in ocs if o not in lejos]
    dentro = [o for o in utiles
              if o["caja"]["max"][2] > z0 + 1e-6 and o["caja"]["min"][2] < z1 - 1e-6]
    porNombre = defaultdict(lambda: {"n": 0, "x": [1e30, -1e30], "y": [1e30, -1e30],
                                     "z": [1e30, -1e30]})
    for o in dentro:
        d = porNombre[o["nombre"]]
        d["n"] += 1
        for k, ej in enumerate("xyz"):
            d[ej][0] = min(d[ej][0], o["caja"]["min"][k])
            d[ej][1] = max(d[ej][1], o["caja"]["max"][k])
    out["franja_barrido_rodillo"] = {
        "z_inferior": z0, "z_superior": z1,
        "definicion": (f"el rodillo Ø{NBT['rodDia']} asoma +{NBT['emerge']} elevado y "
                       f"{NBT['retraido']} retraído ⇒ barre de planoBanda{NBT['barridoInf']} "
                       f"a planoBanda+{NBT['emerge']}"),
        "n_ocurrencias_que_la_cruzan": len(dentro),
        "piezas": sorted(({"nombre": k, "n": v["n"],
                           "x": [round(v["x"][0], 3), round(v["x"][1], 3)],
                           "y": [round(v["y"][0], 3), round(v["y"][1], 3)],
                           "z": [round(v["z"][0], 3), round(v["z"][1], 3)]}
                          for k, v in porNombre.items()), key=lambda d: d["x"][0]),
    }
    # ocupación en X dentro de la franja (solo en el tramo de deck donde hay rodillos)
    for etiqueta, (ya, yb) in {"todo_el_largo": (-1e9, 1e9),
                               "zona_con_rodillos_Y-1489..-640": (-1489.7, -639.7),
                               "zona_sin_rodillos_Y-600..-200": (-600.0, -200.0)}.items():
        iv = [(o["caja"]["min"][0], o["caja"]["max"][0]) for o in dentro
              if o["caja"]["max"][1] > ya and o["caja"]["min"][1] < yb]
        xs = [v for p in iv for v in p]
        out["franja_barrido_rodillo"].setdefault("ocupacion_X", {})[etiqueta] = {
            "n_piezas": len(iv),
            "x_rango": [round(min(xs), 3), round(max(xs), 3)] if xs else None,
            "ventanas_libres": ventanas(iv, min(xs), max(xs)) if xs else [],
        }

    # ------------------------------------------------------ 2. paso de estaciones
    ejes = {}
    for n in ("TSLOT", "banda_T5_3p4", "uni_002", "guiaw"):
        c = sorted(round((o["caja"]["min"][0] + o["caja"]["max"][0]) / 2, 3)
                   for o in utiles if o["nombre"] == n)
        ejes[n] = c
    tsl = ejes["TSLOT"]
    pasos = [round(tsl[i + 1] - tsl[i], 3) for i in range(len(tsl) - 1)]
    # envolvente de UNA estación: todo lo que pertenece a la calle, medido sobre
    # la estación central para no arrastrar el bastidor
    ancho_est = {}
    for n in ("TSLOT", "guiaw", "banda_T5_3p4", "cierre guia"):
        anchos = [round(o["caja"]["max"][0] - o["caja"]["min"][0], 3)
                  for o in utiles if o["nombre"] == n]
        ancho_est[n] = sorted(set(anchos))
    rod = sorted((o["caja"]["min"][0], o["caja"]["max"][0]) for o in utiles if o["nombre"] == "uni_002")
    off = []
    for a_, b_ in rod:
        c_ = (a_ + b_) / 2
        off.append(round(min((c_ - t for t in tsl), key=abs), 3))
    out["estaciones"] = {
        "n": len(tsl),
        "eje_X_TSLOT": tsl,
        "eje_X_banda": ejes["banda_T5_3p4"],
        "paso_medido": pasos,
        "paso_nbt90_congelado": NBT["paso"],
        "delta_paso": [round(p - NBT["paso"], 3) for p in pasos],
        "span_actual_primera_a_ultima": round(tsl[-1] - tsl[0], 3),
        "rodillos_del_sorter_offset_respecto_al_eje_de_calle": sorted(set(off)),
        "envolvente_calle_X": None,
        "anchos_por_pieza": ancho_est,
        "opcion_5_estaciones": {
            "span": NBT["spanBandas"],
            "ejes_relativos": [round((i - 2) * NBT["paso"], 3) for i in range(5)],
        },
        "opcion_4_estaciones_a_paso_76_2": {
            "span": round(3 * NBT["paso"], 3),
            "ejes_relativos": [round((i - 1.5) * NBT["paso"], 3) for i in range(4)],
            "nota": "deja 1 de los 5 huecos de banda de la transferencia sin banda portante",
        },
    }
    # envolvente real de una calle: TSLOT + guia + banda + 2 rodillos, centrada
    est = []
    for t in tsl:
        lo, hi = 1e30, -1e30
        for o in utiles:
            if o["nombre"] not in ("TSLOT", "guiaw", "banda_T5_3p4", "cierre guia", "uni_002",
                                   "Uni_001", "uni_003", "skf_bearing_nk_19_20_2"):
                continue
            cx = (o["caja"]["min"][0] + o["caja"]["max"][0]) / 2
            if abs(cx - t) > NBT["paso"]:          # solo lo que cae en esta calle
                continue
            lo = min(lo, o["caja"]["min"][0])
            hi = max(hi, o["caja"]["max"][0])
        est.append({"eje": t, "x0": round(lo, 3), "x1": round(hi, 3),
                    "ancho": round(hi - lo, 3)})
    out["estaciones"]["envolvente_calle_X"] = est

    # ------------------------------------------------------ 3. ancho útil
    def caras(nombre, cual):
        s = [o["caja"] for o in utiles if o["nombre"] == nombre]
        return round(min(c["min"][0] for c in s), 3) if cual == "min" else round(max(c["max"][0] for c in s), 3)

    anchos = {}
    for izq, der, etiqueta in (("FRAME_MIR_MIR", "FRAME_MIR_MIR_MIR", "entre bastidores principales"),
                               ("U_007_MIR", "U_007", "entre chapas interiores U_007"),
                               ("CAN0_MIR", "CAN0", "entre canales CAN0")):
        try:
            a1 = caras(izq, "max")
            a2 = caras(der, "min")
            anchos[etiqueta] = {"cara_izq_X": a1, "cara_der_X": a2, "luz": round(a2 - a1, 3),
                                "vs_BR_457.2": round(a2 - a1 - NBT["BR"], 3)}
        except ValueError:
            anchos[etiqueta] = None
    out["ancho_util"] = anchos

    # ------------------------------------------------------ 4. transferencia incompleta
    raiz = defaultdict(lambda: {"n": 0, "x": [1e30, -1e30], "y": [1e30, -1e30],
                                "z": [1e30, -1e30], "vol": 0.0, "hojas": set()})
    for o in utiles:
        p = o["ruta"].split("/")
        sub = p[1] if len(p) > 1 else p[0]
        d = raiz[sub]
        d["n"] += 1
        d["hojas"].add(o["nombre"])
        if o["vol"] and o["vol"] > 0:
            d["vol"] += o["vol"]
        for k, ej in enumerate("xyz"):
            d[ej][0] = min(d[ej][0], o["caja"]["min"][k])
            d[ej][1] = max(d[ej][1], o["caja"]["max"][k])
    out["subarboles_de_raiz"] = sorted(
        ({"subarbol": k, "n_ocurrencias": v["n"], "n_piezas_distintas": len(v["hojas"]),
          "vol_cm3": round(v["vol"] / 1000, 1),
          "x": [round(v["x"][0], 3), round(v["x"][1], 3)],
          "y": [round(v["y"][0], 3), round(v["y"][1], 3)],
          "z": [round(v["z"][0], 3), round(v["z"][1], 3)],
          "piezas": sorted(v["hojas"])[:14]}
         for k, v in raiz.items()), key=lambda d: -d["vol_cm3"])

    # ------------------------------------------------------ 5. interferencias
    # solape de cajas exactas entre ocurrencias de RAMAS distintas (no padre/hijo)
    solapes = []
    E = [o for o in utiles if o["exacta"]]
    for i in range(len(E)):
        ai = E[i]["caja"]
        for j in range(i + 1, len(E)):
            bj = E[j]["caja"]
            ov = [min(ai["max"][k], bj["max"][k]) - max(ai["min"][k], bj["min"][k]) for k in range(3)]
            if min(ov) <= 0.5:
                continue
            ra, rb = E[i]["ruta"], E[j]["ruta"]
            if ra.startswith(rb) or rb.startswith(ra):
                continue
            v = ov[0] * ov[1] * ov[2]
            if v < 2000:                       # ruido de tornillería y ajustes
                continue
            solapes.append({"a": E[i]["nombre"], "b": E[j]["nombre"],
                            "ruta_a": ra, "ruta_b": rb,
                            "solape_mm": [round(x, 3) for x in ov],
                            "vol_solape_cm3": round(v / 1000, 2)})
    solapes.sort(key=lambda d: -d["vol_solape_cm3"])
    out["solapes_de_caja"] = {
        "metodo": ("intersección de cajas exactas entre ocurrencias de ramas distintas; "
                   "solape > 0.5 mm en los 3 ejes y > 2 cm³. Una caja solapada NO prueba "
                   "que los sólidos choquen (las cajas son envolventes), pero señala "
                   "dónde mirar"),
        "n": len(solapes), "peores": solapes[:40],
    }

    Path(a.salida).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK → {a.salida}")
    print(f"  franja de barrido Z [{z0}, {z1}] · {len(dentro)} ocurrencias la cruzan")
    print(f"  paso medido {pasos} vs NBT90 {NBT['paso']}")
    print(f"  solapes de caja: {len(solapes)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
