"""Modelo de costo del YT0100: dónde está la plata y cuánto cuesta cada palanca.

No inventa precios. Lee `design/costos.json`, donde cada valor lleva su fuente;
lo que está en PENDIENTE se reporta como faltante en vez de rellenarse. Lo que
sí calcula, y es lo que de verdad se cotiza, son las CANTIDADES FÍSICAS:

  - barras de 6 m por unidad, con el corte optimizado (bin packing) y el
    descarte real por lote — que es muy distinto del descarte por unidad;
  - láminas de 1220x2440 por unidad, con anidado real de los blancos;
  - minutos de láser (corte + perforaciones) por espesor;
  - minutos de armado a partir del número de uniones.

uso: python design/costo.py [nº de unidades del lote, def. 10]
"""
from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path

DESIGN = Path(__file__).resolve().parent
PROJ = DESIGN.parent

P = json.loads((DESIGN / "parametros.json").read_text(encoding="utf-8"))
C = json.loads((DESIGN / "costos.json").read_text(encoding="utf-8"))
SUP = C["supuestos_de_proceso"]


# ---------------------------------------------------------------------------
# Corte de barras: first-fit decreasing sobre barra comercial
# ---------------------------------------------------------------------------

def cortar_barras(largos: list[float], barra: float, sierra: float) -> list[list[float]]:
    barras: list[list[float]] = []
    for L in sorted(largos, reverse=True):
        for b in barras:
            if sum(b) + len(b) * sierra + L <= barra:
                b.append(L); break
        else:
            barras.append([L])
    return barras


# ---------------------------------------------------------------------------
# Anidado: estanterías (shelf FFD) con rotación, sobre lámina comercial
# ---------------------------------------------------------------------------

def anidar(blancos: list[tuple[float, float, str]], lamina, sep: float):
    """Devuelve (nº de láminas, aprovechamiento %). Conservador: un nester real
    aprovecha además los vaciados interiores, que acá se ignoran."""
    W, H = max(lamina), min(lamina)
    piezas = []
    for w, h, cod in blancos:
        w, h = w + sep, h + sep
        if h > H and w <= H and h <= W:          # rotar si no entra de lado
            w, h = h, w
        piezas.append((w, h, cod))
    piezas.sort(key=lambda p: -p[1])
    laminas, area = [], 0.0
    for w, h, cod in piezas:
        area += (w - sep) * (h - sep)
        for lam in laminas:
            for est in lam:
                if est["alto"] >= h and est["libre"] >= w:
                    est["libre"] -= w; break
            else:
                usado = sum(e["alto"] for e in lam)
                if usado + h <= H:
                    lam.append({"alto": h, "libre": W - w}); break
                continue
            break
        else:
            if h <= H and w <= W:
                laminas.append([{"alto": h, "libre": W - w}])
            else:
                laminas.append([{"alto": H, "libre": 0}])   # no entra: lámina propia
    n = max(len(laminas), 1)
    return n, 100 * area / (n * W * H)


# ---------------------------------------------------------------------------

def cargar_bom():
    with open(PROJ / "out" / "BOM.csv", encoding="utf-8-sig") as f:
        return [r for r in csv.DictReader(f, delimiter=";") if r["familia"] != "utillaje"]


def analisis(lote: int) -> dict:
    bom = cargar_bom()
    res = json.loads((PROJ / "out" / "resumen.json").read_text(encoding="utf-8"))
    barra, sierra = SUP["barra_comercial_mm"], SUP["ancho_corte_sierra_mm"]
    lamina, sep = SUP["lamina_mm"], SUP["separacion_anidado_mm"]

    # --- tubo ---------------------------------------------------------------
    tubos, largos = {}, []
    for r in bom:
        if not r["largo_mm"] or "tubo" not in r["material"]:
            continue
        seccion = "40x40" if "40x40" in r["material"] else "25x25"
        tubos.setdefault(seccion, []).extend([float(r["largo_mm"])] * int(r["cantidad"]))
    corte_tubo = {}
    for sec, ls in tubos.items():
        b1 = cortar_barras(ls, barra, sierra)
        bl = cortar_barras(ls * lote, barra, sierra)
        corte_tubo[sec] = {
            "largo_util_m": round(sum(ls) / 1000, 2),
            "barras_1u": len(b1),
            "descarte_1u_pct": round(100 * (1 - sum(ls) / (len(b1) * barra)), 1),
            "barras_lote": len(bl),
            "barras_por_unidad_en_lote": round(len(bl) / lote, 2),
            "descarte_lote_pct": round(100 * (1 - sum(ls) * lote / (len(bl) * barra)), 1),
        }

    # --- chapa --------------------------------------------------------------
    chapa = {}
    for esp in ("3", "2"):
        blancos = []
        for r in bom:
            if not r["desarrollo_mm"] or not r["material"].endswith("e" + esp):
                continue
            w, h = (float(x) for x in r["desarrollo_mm"].split(" x "))
            blancos += [(w, h, r["codigo"])] * int(r["cantidad"])
        if not blancos:
            continue
        n1, ap1 = anidar(blancos, lamina, sep)
        nl, apl = anidar(blancos * lote, lamina, sep)
        chapa[f"e{esp}"] = {
            "blancos": len(blancos),
            "laminas_1u": n1, "aprovechamiento_1u_pct": round(ap1, 1),
            "laminas_lote": nl, "laminas_por_unidad_en_lote": round(nl / lote, 2),
            "aprovechamiento_lote_pct": round(apl, 1),
            "unidades_por_lamina": round(lote / nl, 2),
        }

    # --- láser --------------------------------------------------------------
    vel, tper = SUP["velocidad_corte_m_min"], SUP["tiempo_perforacion_s"]["valor"]
    laser = {}
    for esp in ("3", "2"):
        m = sum(float(r["largo_corte_mm"]) * int(r["cantidad"]) / 1000
                for r in bom if r["largo_corte_mm"] and r["material"].endswith("e" + esp))
        n_per = sum((int(r["agujeros"] or 0) + 1) * int(r["cantidad"])
                    for r in bom if r["largo_corte_mm"] and r["material"].endswith("e" + esp))
        if not m:
            continue
        t = m / vel["e" + esp] + n_per * tper / 60
        laser[f"e{esp}"] = {"corte_m": round(m, 1), "perforaciones": n_per,
                            "minutos": round(t, 1)}
    laser["total_min"] = round(sum(v["minutos"] for v in laser.values() if isinstance(v, dict)), 1)

    # --- armado -------------------------------------------------------------
    tu = SUP["tiempo_union_s"]
    uniones, seg = {}, 0.0
    for r in bom:
        cod, q = r["codigo"], int(r["cantidad"])
        for k in ("M8", "M6", "M5"):
            if cod.startswith("TOR-") and k in cod:
                uniones[k] = uniones.get(k, 0) + q; seg += q * tu[k]
        if cod == "TOR-PASADOR":
            uniones["M8"] = uniones.get("M8", 0) + q; seg += q * tu["M8"]
        if cod == "TIR-MADERA":
            uniones["tirafondo"] = q; seg += q * tu["tirafondo"]
    armado = {"uniones": uniones, "total_uniones": sum(uniones.values()),
              "minutos_estimados": round(seg / 60, 0)}

    # --- pintura: dos listas ------------------------------------------------
    CALIENTE = {"TAM-CUBA", "TAM-TAPA", "PER-CANTO", "BRA-CUERPO", "BRA-SOP", "CRE-RACK",
                "TIR-DISCO", "SOP-CHUM", "SOP-MOTOR", "PAR-BARRA", "CUN-CUNA"}
    pintura = {"alta_temperatura_kg": 0.0, "estandar_kg": 0.0}
    for r in bom:
        if r["familia"] in ("madera", "comprados", "tornillería"):
            continue
        m = float(r["masa_total_kg"])
        pintura["alta_temperatura_kg" if r["codigo"] in CALIENTE else "estandar_kg"] += m
    pintura = {k: round(v, 1) for k, v in pintura.items()}
    pintura["pct_masa_que_evita_alta_temperatura"] = round(
        100 * pintura["estandar_kg"] / (pintura["estandar_kg"] + pintura["alta_temperatura_kg"]), 0)

    # --- precios: lo que se puede valorizar y lo que falta -------------------
    faltan = [f"{g}.{k}" for g in ("materiales", "procesos", "comprados")
              for k, v in C[g].items() if v.get("valor") is None]
    valorizado = {}
    pl = C["materiales"]["tubo_40x40x2_barra6m"]
    if pl.get("valor"):
        valorizado["tubo_40x40 (precio del e2 citado, cota SUPERIOR del e1,5 real)"] = \
            corte_tubo["40x40"]["barras_por_unidad_en_lote"] * pl["valor"]
    lm = C["procesos"]["laser_minuto"]
    if lm.get("valor"):
        valorizado["corte láser (minutos x tarifa citada)"] = laser["total_min"] * lm["valor"]

    return {"lote": lote, "masa_kg": res["masa_total_kg"], "corte_tubo": corte_tubo,
            "chapa": chapa, "laser": laser, "armado": armado, "pintura": pintura,
            "valorizado_CLP": {k: round(v) for k, v in valorizado.items()},
            "precios_pendientes": faltan}


# ---------------------------------------------------------------------------
# Palancas: cuánto baja cada decisión, en unidades físicas
# ---------------------------------------------------------------------------

def opciones(lote: int) -> list[dict]:
    """Cada palanca con su efecto medido. La aritmética es explícita a propósito:
    son restas sobre el BOM, no simulaciones."""
    bom = {r["codigo"]: r for r in cargar_bom()}
    barra, sierra = SUP["barra_comercial_mm"], SUP["ancho_corte_sierra_mm"]
    tu = SUP["tiempo_union_s"]

    def tubo(largos):
        b = cortar_barras(largos * lote, barra, sierra)
        return round(sum(largos) / 1000, 2), round(len(b) / lote, 2)

    base_largos = []
    for cod, sec in (("TUB-PATA", 4), ("TUB-LARGUERO", 4), ("TUB-TRAVESANO", 4), ("TUB-POSTE", 2)):
        base_largos += [float(bom[cod]["largo_mm"])] * int(bom[cod]["cantidad"])
    m_base, b_base = tubo(base_largos)

    # O1: sin mesa lateral → fuera los postes y los largueros vuelven a la medida del marco
    l_corto = 2 * (float(P["bastidor"]["pata_x"]) + P["bastidor"]["tubo"] + 20)
    o1 = ([float(bom["TUB-PATA"]["largo_mm"])] * 4 + [l_corto] * 4
          + [float(bom["TUB-TRAVESANO"]["largo_mm"])] * 4)
    m1, b1 = tubo(o1)

    ops = [{
        "opcion": "O1 · Sin mesa lateral de roble",
        "quita": "MAD-MESA, SOP-MESA x2, TUB-POSTE x2; los largueros bajan de "
                 f"{float(bom['TUB-LARGUERO']['largo_mm']):.0f} a {l_corto:.0f} mm",
        "tubo_m": f"{m_base:.2f} → {m1:.2f} ({m1 - m_base:+.2f})",
        "barras_por_unidad": f"{b_base:.2f} → {b1:.2f} ({b1 - b_base:+.2f})",
        "roble_kg": -float(bom["MAD-MESA"]["masa_total_kg"]),
        "chapa_e3_kg": -float(bom["SOP-MESA"]["masa_total_kg"]),
        "uniones": -(8 + 2 + 8), "minutos_armado": -round((10 * tu["M8"] + 8 * tu["tirafondo"]) / 60),
        "piezas_cnc": -1,
        "cuesta": "Se pierde la superficie de apoyo. Es la palanca MÁS GRANDE del producto.",
    }, {
        "opcion": "O2 · Sin estante inferior de roble",
        "quita": "MAD-ESTANTE",
        "tubo_m": "sin cambio (los largueros inferiores son estructura)",
        "barras_por_unidad": "sin cambio",
        "roble_kg": -float(bom["MAD-ESTANTE"]["masa_total_kg"]),
        "chapa_e3_kg": 0.0, "uniones": 0, "minutos_armado": 0, "piezas_cnc": 0,
        "cuesta": "Se pierde el estante; los largueros quedan igual y admiten una tabla después.",
    }, {
        "opcion": "O3 · Sin motor de spiedo (parrilla pura)",
        "quita": "MOT-SPIEDO, SOP-MOTOR, SOP-CHUM x2, ESP-ESPETON, ESP-HORQUILLA x2, ESP-BUJE x2",
        "tubo_m": "sin cambio", "barras_por_unidad": "sin cambio",
        "roble_kg": 0.0,
        "chapa_e3_kg": -(float(bom["SOP-MOTOR"]["masa_total_kg"])
                         + float(bom["SOP-CHUM"]["masa_total_kg"])),
        "uniones": -6, "minutos_armado": -3, "piezas_cnc": -2,
        "cuesta": "Saca el ítem COMPRADO más caro, pero es una prestación pedida explícitamente.",
    }, {
        "opcion": "O4 · Fabricar la parrilla en vez de comprarla",
        "quita": "(agrega) PAR-RIEL x4, PAR-PLETINA x4, 52 varillas Ø8",
        "tubo_m": "sin cambio", "barras_por_unidad": "sin cambio",
        "roble_kg": 0.0, "chapa_e3_kg": +1.2,
        "uniones": +24, "minutos_armado": +round((24 * tu["M5"] + 104 * 8) / 60),
        "piezas_cnc": +2,
        "cuesta": "Es el camino CARO: +8 blancos, +104 agujeros y ~+25 min de armado. "
                  "Sólo conviene si la parrilla comprada supera ese costo.",
    }]
    return ops


def main(argv):
    lote = int(argv[0]) if argv else 10
    a = analisis(lote)
    a["opciones"] = opciones(lote)
    (PROJ / "out" / "costo.json").write_text(json.dumps(a, indent=2, ensure_ascii=False),
                                             encoding="utf-8")
    print(json.dumps(a, indent=2, ensure_ascii=False))
    return a


if __name__ == "__main__":
    main(sys.argv[1:])
