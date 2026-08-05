#!/usr/bin/env python3
"""med_px.py — medición por píxeles sobre vistas técnicas (capa `measured-2D`).

Herramienta de apoyo para escalar dibujos rasterizados: NO inventa nada, solo
reporta coordenadas de píxel de rasgos realmente presentes en la imagen
(cruces de línea, círculos, extremos de flechas de cota) y convierte a mm con
un factor px→mm declarado por el usuario a partir de una cota conocida.

Subcomandos
-----------
  perfil   IMG --fila Y  [--x0 A --x1 B] [--umbral 128] [--min 1]
  perfil   IMG --col  X  [--y0 A --y1 B]
        Recorre una fila/columna y lista cada RACHA de píxeles oscuros (una
        línea del dibujo) con su centro en px. Es la medición más precisa que
        admite un plano de líneas: cada cruce de línea = una racha.

  circulos IMG [--roi X0 Y0 X1 Y1] [--rmin R] [--rmax R] [--param2 P]
        HoughCircles: centros y radios en px (poleas, rodillos, agujeros).

  lineas   IMG [--roi ...] [--minlen L]
        HoughLinesP: segmentos rectos largos (bordes de chapa, ejes).

  rejilla  IMG SALIDA [--roi X0 Y0 X1 Y1] [--escala S] [--paso P]
        Recorte ampliado con rejilla rotulada en coordenadas de la imagen
        ORIGINAL, para leer coordenadas a ojo sobre el recorte.

  escala   --px P --mm M          → factor mm/px y su recíproco.

Todas las coordenadas de salida están SIEMPRE en píxeles de la imagen original.
"""
from __future__ import annotations

import argparse
import json
import sys

import cv2
import numpy as np


def _load(path: str) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        sys.exit(f"no se pudo abrir la imagen: {path}")
    return img


def _roi(img: np.ndarray, roi):
    if not roi:
        return img, 0, 0
    x0, y0, x1, y1 = [int(v) for v in roi]
    return img[y0:y1, x0:x1], x0, y0


def cmd_perfil(a) -> None:
    img = _load(a.img)
    h, w = img.shape
    if a.fila is not None:
        y = int(a.fila)
        x0, x1 = int(a.x0 or 0), int(a.x1 or w)
        linea = img[y, x0:x1]
        eje, base = "x", x0
    else:
        x = int(a.col)
        y0, y1 = int(a.y0 or 0), int(a.y1 or h)
        linea = img[y0:y1, x]
        eje, base = "y", y0

    oscuro = linea < a.umbral
    rachas, ini = [], None
    for i, v in enumerate(oscuro):
        if v and ini is None:
            ini = i
        elif not v and ini is not None:
            if i - ini >= a.min:
                rachas.append((ini + base, i - 1 + base))
            ini = None
    if ini is not None and len(oscuro) - ini >= a.min:
        rachas.append((ini + base, len(oscuro) - 1 + base))

    salida = {
        "imagen": a.img, "corte": f"{'fila y' if a.fila is not None else 'columna x'}="
        f"{a.fila if a.fila is not None else a.col}",
        "eje": eje, "umbral": a.umbral, "n": len(rachas),
        "rachas": [{"ini": i, "fin": f, "centro": round((i + f) / 2, 1), "grosor": f - i + 1}
                   for i, f in rachas],
    }
    if len(rachas) > 1:
        c = [(i + f) / 2 for i, f in rachas]
        salida["separaciones"] = [round(c[k + 1] - c[k], 1) for k in range(len(c) - 1)]
    print(json.dumps(salida, indent=1, ensure_ascii=False))


def cmd_circulos(a) -> None:
    img = _load(a.img)
    sub, ox, oy = _roi(img, a.roi)
    sub = cv2.medianBlur(sub, 3)
    cs = cv2.HoughCircles(sub, cv2.HOUGH_GRADIENT, dp=1, minDist=a.mindist,
                          param1=a.param1, param2=a.param2,
                          minRadius=a.rmin, maxRadius=a.rmax)
    out = []
    if cs is not None:
        for x, y, r in np.round(cs[0]).astype(int):
            out.append({"cx": int(x + ox), "cy": int(y + oy), "r": int(r), "d": int(2 * r)})
        out.sort(key=lambda c: (c["cx"], c["cy"]))
    print(json.dumps({"imagen": a.img, "n": len(out), "circulos": out}, indent=1))


def cmd_lineas(a) -> None:
    img = _load(a.img)
    sub, ox, oy = _roi(img, a.roi)
    bordes = cv2.Canny(sub, 50, 150, apertureSize=3)
    segs = cv2.HoughLinesP(bordes, 1, np.pi / 720, threshold=a.thr,
                           minLineLength=a.minlen, maxLineGap=a.maxgap)
    out = []
    if segs is not None:
        # OpenCV <5 devuelve (N,1,4); OpenCV >=5 devuelve (N,4).
        segs = np.asarray(segs).reshape(-1, 4)
        for x1, y1, x2, y2 in segs:
            ang = float(np.degrees(np.arctan2(float(y2 - y1), float(x2 - x1))))
            out.append({"a": [int(x1 + ox), int(y1 + oy)], "b": [int(x2 + ox), int(y2 + oy)],
                        "largo": round(float(np.hypot(x2 - x1, y2 - y1)), 1),
                        "ang": round(ang, 1)})
        out.sort(key=lambda s: -s["largo"])
    print(json.dumps({"imagen": a.img, "n": len(out), "segmentos": out[:a.top]}, indent=1))


def cmd_rejilla(a) -> None:
    img = cv2.imread(a.img, cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"no se pudo abrir la imagen: {a.img}")
    x0, y0 = 0, 0
    if a.roi:
        x0, y0, x1, y1 = [int(v) for v in a.roi]
        img = img[y0:y1, x0:x1]
    s = a.escala
    img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
    h, w = img.shape[:2]
    paso = a.paso
    for xo in range(int(x0 // paso) * paso, x0 + int(w / s) + paso, paso):
        xp = int((xo - x0) * s)
        if 0 <= xp < w:
            cv2.line(img, (xp, 0), (xp, h), (0, 0, 255), 1)
            cv2.putText(img, str(xo), (xp + 2, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
    for yo in range(int(y0 // paso) * paso, y0 + int(h / s) + paso, paso):
        yp = int((yo - y0) * s)
        if 0 <= yp < h:
            cv2.line(img, (0, yp), (w, yp), (255, 0, 0), 1)
            cv2.putText(img, str(yo), (2, yp - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 0), 1)
    cv2.imwrite(a.salida, img)
    print(json.dumps({"salida": a.salida, "roi": a.roi, "escala": s, "paso_px_original": paso,
                      "tam": [w, h]}, indent=1))


def cmd_escala(a) -> None:
    mmpx = a.mm / a.px
    print(json.dumps({"px": a.px, "mm": a.mm, "mm_por_px": round(mmpx, 4),
                      "px_por_mm": round(1 / mmpx, 4),
                      "px_por_pulgada": round(25.4 / mmpx, 2)}, indent=1))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    q = sub.add_parser("perfil"); q.add_argument("img")
    g = q.add_mutually_exclusive_group(required=True)
    g.add_argument("--fila", type=int); g.add_argument("--col", type=int)
    q.add_argument("--x0", type=int); q.add_argument("--x1", type=int)
    q.add_argument("--y0", type=int); q.add_argument("--y1", type=int)
    q.add_argument("--umbral", type=int, default=128); q.add_argument("--min", type=int, default=1)
    q.set_defaults(f=cmd_perfil)

    q = sub.add_parser("circulos"); q.add_argument("img")
    q.add_argument("--roi", nargs=4, type=int); q.add_argument("--rmin", type=int, default=8)
    q.add_argument("--rmax", type=int, default=200); q.add_argument("--mindist", type=int, default=20)
    q.add_argument("--param1", type=int, default=120); q.add_argument("--param2", type=int, default=45)
    q.set_defaults(f=cmd_circulos)

    q = sub.add_parser("lineas"); q.add_argument("img")
    q.add_argument("--roi", nargs=4, type=int); q.add_argument("--minlen", type=int, default=60)
    q.add_argument("--maxgap", type=int, default=4); q.add_argument("--thr", type=int, default=80)
    q.add_argument("--top", type=int, default=60)
    q.set_defaults(f=cmd_lineas)

    q = sub.add_parser("rejilla"); q.add_argument("img"); q.add_argument("salida")
    q.add_argument("--roi", nargs=4, type=int); q.add_argument("--escala", type=float, default=2.0)
    q.add_argument("--paso", type=int, default=50)
    q.set_defaults(f=cmd_rejilla)

    q = sub.add_parser("escala"); q.add_argument("--px", type=float, required=True)
    q.add_argument("--mm", type=float, required=True); q.set_defaults(f=cmd_escala)

    a = p.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
