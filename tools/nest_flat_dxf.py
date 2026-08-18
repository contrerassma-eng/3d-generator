"""nest_flat_dxf.py — Nesting DXF 1:1 de corte láser desde un ensamble CAD.

Toma un ensamble JSON de cad/ensambles/ cuyas piezas de chapa llevan bloque
`flat` ANALÍTICO (contorno desarrollado + barrenos + líneas de plegado, ver
gen_lbp530.mjs / gen_hgr190e24.mjs) y arma UNA lámina DXF con todas las
instancias listas para nesting directo en el láser:

  - capa CORTE   (continua)   contornos y barrenos — lo único que se corta
  - capa PLEGADO (trazo-punto) eje de cada pliegue — NO CORTAR
  - capa TEXTO   rótulo por pieza y ángulo/sentido por pliegue — NO CORTAR

La cantidad de cada pieza = nº de veces que aparece en `parts` (los
generadores emiten una entrada por instancia física). Unidades: mm, R2010.

uso: python tools/nest_flat_dxf.py <ensamble.json> <salida.dxf>
       [--sep 6] [--ancho 420]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> None:
    import ezdxf

    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        sys.exit(__doc__)
    src, dst = Path(args[0]), Path(args[1])

    def opt(name, default):
        if name in sys.argv:
            return float(sys.argv[sys.argv.index(name) + 1])
        return default

    sep = opt("--sep", 6.0)
    ancho = opt("--ancho", 420.0)

    doc_in = json.loads(src.read_text(encoding="utf8"))
    grupos: dict[str, dict] = {}
    for p in doc_in.get("parts", []):
        f = p.get("flat")
        if not f:
            continue
        sig = json.dumps(f, sort_keys=True)
        g = grupos.setdefault(sig, {"part": p, "flat": f, "cant": 0})
        g["cant"] += 1
    if not grupos:
        sys.exit(f"ERROR: {src} no contiene piezas con bloque `flat`")

    doc = ezdxf.new("R2010", setup=True)
    doc.header["$INSUNITS"] = 4  # mm
    doc.layers.add("CORTE", color=7)
    doc.layers.add("PLEGADO", color=1, linetype="DASHDOT")
    doc.layers.add("TEXTO", color=3)
    msp = doc.modelspace()

    def emit(f, ox, oy, rot):
        """Una instancia del flat en (ox, oy); rot=True gira 90° (x,y)→(−y,x)."""
        T = (lambda p: (ox + p[1], oy + p[0])) if rot else \
            (lambda p: (ox + p[0], oy + p[1]))
        msp.add_lwpolyline([T(p) for p in f["contorno"]], close=True,
                           dxfattribs={"layer": "CORTE"})
        for c in f["cortes"]["circles"]:
            msp.add_circle(T(c["c"]), c["r"], dxfattribs={"layer": "CORTE"})
        for poly in f["cortes"]["polys"]:
            msp.add_lwpolyline([T(p) for p in poly],
                               dxfattribs={"layer": "CORTE"})
        for ln in f["pliegues"]:
            if ln["tipo"] == "eje":
                msp.add_line(T(ln["a"]), T(ln["b"]),
                             dxfattribs={"layer": "PLEGADO"})

    total_area = 0.0
    y = 0.0
    y_top = 0.0
    resumen = []
    orden = sorted(grupos.values(), key=lambda g: g["part"]["name"])
    for n, g in enumerate(orden, start=1):
        f, cant = g["flat"], g["cant"]
        xs = [p[0] for p in f["contorno"]]
        ys = [p[1] for p in f["contorno"]]
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        nombre = g["part"]["name"].split("·", 1)[-1].strip()
        # etiqueta del grupo con los datos de plegado (fuera de la zona de corte)
        pl = f.get("pliegueInfo", [])
        det = " · ".join(f"P{i + 1} {q['ang']}°" for i, q in enumerate(pl))
        msp.add_text(
            f"{nombre}  x{cant} — {w:.2f}×{h:.2f}  e{f['t']}"
            + (f"  K={f['k']} R{f['radio']}  [{det}] — PLEGADO NO CORTAR" if pl else ""),
            height=5, dxfattribs={"layer": "TEXTO"},
        ).set_placement((0, y + 1.5))
        y += 9.0
        x = 0.0
        fila_h = 0.0
        for _ in range(cant):
            if x + w > ancho and x > 0:
                x, y = 0.0, y + fila_h + sep
                fila_h = 0.0
            emit(f, x - min(xs), y - min(ys), rot=False)
            x += w + sep
            fila_h = max(fila_h, h)
            total_area += w * h
        y += fila_h + 2 * sep
        y_top = y
        resumen.append((nombre, cant, w, h))

    doc.saveas(dst)
    print(f"Nesting → {dst}")
    for nombre, cant, w, h in resumen:
        print(f"  {cant:>3}× {nombre}  ({w:.2f} × {h:.2f} mm)")
    print(f"  envolvente ≈ {ancho:.0f} × {y_top:.0f} mm · área neta piezas "
          f"{total_area / 1e6:.4f} m² · separación {sep:g} mm")


if __name__ == "__main__":
    main()
