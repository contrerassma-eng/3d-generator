#!/usr/bin/env python3
"""a_step.py — traduce un ensamble `foto3d-cad` a STEP con SÓLIDOS B-REP reales.

El modelo del repo se construye con mallas (CSG sobre triángulos). Para llevarlo
a un CAD de verdad —Inventor, SolidWorks, Fusion— hace falta geometría exacta:
caras planas, cilíndricas y de revolución, no facetas. Este traductor recorre las
MISMAS funciones paramétricas del JSON y las reconstruye con OpenCascade
(CadQuery), respetando las convenciones del motor `cad/js/model.js`:

  box       caja centrada en (at.x, at.y), creciendo +Z desde at.z
  cylinder  cilindro desde `at`, largo `h` en la dirección `dir`
  hole      cilindro de corte que arranca 0.5 mm antes de `at` (pasante o ciego)
  sketch    contorno cerrado extruido desde su plano; en `cut` la extrusión va
            hacia el lado OPUESTO de la normal (el corte se ancla en la cara
            contraria), y en `union` se solapa 0.2 mm para fundirse con lo previo
  revolve   perfil (h, r) revolucionado 360° alrededor del eje `u` del plano

Salidas (en `step/`):
  <nombre>_ensamble.step — un solo STEP con todas las piezas nombradas
                          (<nombre> = --nombre, o el del --doc; «nbt90» por defecto)
  piezas/<n>.step       — un STEP por pieza fabricada (con --piezas)

En Inventor: Abrir el .step → queda un ensamble con sus componentes; «Guardar
como» genera el .iam y los .ipt. Los formatos .ipt/.iam son binarios propietarios
y solo Inventor puede escribirlos: STEP AP242 es el camino soportado.

Uso:
  python3 cad/ensambles/nbt90/a_step.py [--piezas] [--solo REGEX] [--verificar]
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import time
from pathlib import Path

import cadquery as cq
from cadquery import Vector

AQUI = Path(__file__).resolve().parent
LARGO_PASANTE = 3000.0          # longitud de un agujero "pasante" (mm)


# ---------------------------------------------------------------------------
# Utilidades de vectores
# ---------------------------------------------------------------------------
def norm(v):
    n = math.sqrt(sum(c * c for c in v)) or 1.0
    return [c / n for c in v]


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def limpiar(pts, tol=1e-7):
    """Quita puntos consecutivos repetidos y el cierre duplicado: OpenCascade
    no admite segmentos de longitud nula al construir el alambre."""
    out = []
    for q in pts:
        if not out or abs(q[0] - out[-1][0]) > tol or abs(q[1] - out[-1][1]) > tol:
            out.append((float(q[0]), float(q[1])))
    while len(out) > 2 and abs(out[0][0] - out[-1][0]) <= tol and abs(out[0][1] - out[-1][1]) <= tol:
        out.pop()
    return out


def base_plano(dir_, u_):
    """Devuelve (n, u, v) ortonormales del plano de un boceto."""
    n = norm(dir_)
    u = list(u_)
    d = sum(u[i] * n[i] for i in range(3))
    u = norm([u[i] - d * n[i] for i in range(3)])
    v = cross(n, u)
    return n, u, v


# ---------------------------------------------------------------------------
# Traducción de cada función a un sólido de OpenCascade
# ---------------------------------------------------------------------------
def solido_box(f):
    p = f["params"]
    w, d, h = p["w"], p["d"], p["h"]
    at = f["at"]
    return cq.Solid.makeBox(w, d, h, cq.Vector(at[0] - w / 2, at[1] - d / 2, at[2]))


def solido_cyl(f):
    p = f["params"]
    return cq.Solid.makeCylinder(p["dia"] / 2, p["h"], cq.Vector(*f["at"]), cq.Vector(*norm(f["dir"])))


def solido_hole(f):
    p = f["params"]
    d = norm(f["dir"])
    atras = 0.5
    largo = (LARGO_PASANTE if p.get("through") else p.get("depth", 0)) + atras
    if largo <= atras:
        return None
    ini = [f["at"][i] - d[i] * atras for i in range(3)]
    return cq.Solid.makeCylinder(p["dia"] / 2, largo, cq.Vector(*ini), cq.Vector(*d))


def solido_sketch(f, primera):
    """Contorno cerrado extruido. Replica exactamente el convenio de model.js."""
    p = f["params"]
    pts = p.get("pts")
    if not pts or len(pts) < 3:
        return None
    h = p["h"]
    es_corte = f.get("op") == "cut"
    lado = p.get("side", "pos")
    sobra, fuse = 0.5, (0.0 if primera else 0.2)
    if lado == "sym":
        zlo, zhi = -h / 2 - (sobra if es_corte else fuse), h / 2 + (sobra if es_corte else fuse)
    elif lado == "neg":
        zlo, zhi = (-sobra, h) if es_corte else (-h, fuse)
    else:                                            # 'pos' (por defecto)
        zlo, zhi = (-h, sobra) if es_corte else (-fuse, h)

    n, u, v = base_plano(f["dir"], p["u"])
    at = f["at"]
    # el contorno vive en el plano (u, v) con origen en `at`
    plano = cq.Plane(origin=cq.Vector(*at), xDir=cq.Vector(*u), normal=cq.Vector(*n))
    limpio = limpiar(pts)
    if len(limpio) < 3:
        return None
    wp = cq.Workplane(plano).polyline(limpio).close()
    solido = wp.extrude(zhi - zlo, combine=False).val()
    if abs(zlo) > 1e-9:
        solido = solido.translate(cq.Vector(*[n[i] * zlo for i in range(3)]))
    return solido


def solido_revolve(f):
    """Perfil (h, r) girado 360° alrededor del eje `u` del plano del boceto."""
    p = f["params"]
    ents = p.get("entities") or []
    if not ents:
        return None
    # cadena de segmentos → polilínea cerrada en coordenadas (h, r)
    pts = [tuple(e["a"]) for e in ents]
    if not pts:
        return None
    if max(abs(r) for _, r in pts) < 1e-9:
        return None
    n, u, v = base_plano(f["dir"], p["u"])
    at = f["at"]
    # plano de trabajo con x = u (eje de giro) y normal = -n  ⇒  y local = v
    plano = cq.Plane(origin=cq.Vector(*at), xDir=cq.Vector(*u),
                     normal=cq.Vector(*[-c for c in n]))
    limpio = limpiar(pts)
    if len(limpio) < 3:
        return None
    wp = cq.Workplane(plano).polyline(limpio).close()
    ang = p.get("angle", 360) or 360
    return wp.revolve(ang, (0, 0, 0), (1, 0, 0), combine=False).val()


def construir(part):
    """Reconstruye una pieza aplicando sus funciones en orden."""
    acc = None
    for f in part["features"]:
        if f.get("suppressed"):
            continue
        forma = f["shape"]
        try:
            if forma == "box":
                s = solido_box(f)
            elif forma == "cylinder":
                s = solido_cyl(f)
            elif forma == "hole":
                s = solido_hole(f)
            elif forma == "sketch":
                s = solido_sketch(f, acc is None)
            elif forma == "revolve":
                s = solido_revolve(f)
            else:
                continue                              # patrón/espejo/chapa: no usados aquí
        except Exception as e:                        # noqa: BLE001
            raise RuntimeError(f"función «{f.get('name', forma)}»: {e}") from e
        if s is None:
            continue
        if f.get("op") == "cut":
            if acc is not None:
                acc = acc.cut(s)
        else:
            acc = s if acc is None else acc.fuse(s)
    if acc is None:
        return None
    acc = acc.clean()
    pos = part.get("pos", [0, 0, 0])
    if any(abs(c) > 1e-12 for c in pos):
        acc = acc.translate(cq.Vector(*pos))
    return acc


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--doc", default=str(AQUI / "narrow_belt_transfer_90.json"))
    ap.add_argument("--salida", default=str(AQUI / "step"))
    ap.add_argument("--solo", help="expresión regular sobre el nombre de la pieza")
    ap.add_argument("--piezas", action="store_true", help="además, un STEP por pieza")
    ap.add_argument("--sin-contexto", action="store_true", default=True)
    # El nombre del fichero y el del ensamble iban cableados a «nbt90». Con
    # `--doc` apuntando a otro ensamble —el sorter CO— salía un STEP llamado
    # `nbt90_ensamble.step` con el sorter dentro, que es una trampa esperando
    # a que alguien lo abra en Inventor creyendo que es la transferencia.
    ap.add_argument("--nombre", default=None,
                    help="nombre del ensamble y del fichero (por defecto, el del --doc)")
    a = ap.parse_args()

    doc = json.loads(Path(a.doc).read_text(encoding="utf-8"))
    partes = [p for p in doc["parts"] if not (a.sin_contexto and p.get("contexto"))]
    if a.solo:
        rx = re.compile(a.solo, re.I)
        partes = [p for p in partes if rx.search(p["name"])]
    out = Path(a.salida)
    out.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    nombre = a.nombre or ("NBT90" if Path(a.doc).name == "narrow_belt_transfer_90.json"
                          else Path(a.doc).stem)
    ens = cq.Assembly(name=nombre)
    hechas, fallidas, vol_total = 0, [], 0.0
    for i, part in enumerate(partes, 1):
        try:
            s = construir(part)
        except Exception as e:                        # noqa: BLE001
            fallidas.append((part["name"], str(e)[:110]))
            continue
        if s is None:
            fallidas.append((part["name"], "sin sólido"))
            continue
        v = s.Volume()
        if v <= 0:
            fallidas.append((part["name"], f"volumen {v:.3f}"))
            continue
        vol_total += v
        color = part.get("color", "#8899aa").lstrip("#")
        rgb = tuple(int(color[k:k + 2], 16) / 255 for k in (0, 2, 4))
        ens.add(cq.Workplane(obj=s), name=f"{i:03d} {part['name']}"[:120],
                color=cq.Color(*rgb, 1.0))
        hechas += 1
        if a.piezas:
            seguro = re.sub(r"[^A-Za-z0-9]+", "_", part["name"])[:70]
            (out / "piezas").mkdir(exist_ok=True)
            cq.exporters.export(cq.Workplane(obj=s), str(out / "piezas" / f"{i:03d}_{seguro}.step"))
        if i % 25 == 0:
            print(f"  {i}/{len(partes)} piezas… ({time.time() - t0:.0f} s)", flush=True)

    destino = out / f"{nombre.lower()}_ensamble.step"
    ens.save(str(destino), "STEP")
    print(f"\nOK: {hechas}/{len(partes)} piezas como sólidos B-rep → {destino}")
    print(f"    volumen total {vol_total / 1000:.0f} cm³ · {time.time() - t0:.0f} s")
    if fallidas:
        print(f"    {len(fallidas)} sin sólido:")
        for nombre, motivo in fallidas[:25]:
            print(f"      · {nombre[:70]}: {motivo}")
    return 0 if hechas else 1


if __name__ == "__main__":
    sys.exit(main())
