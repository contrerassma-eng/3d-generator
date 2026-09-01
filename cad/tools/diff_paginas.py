#!/usr/bin/env python3
"""diff_paginas.py ANTES.pdf AHORA.pdf [pag,pag,…]

Verificación visual del emisor (REPRESENTACION.md §11): rasteriza las mismas
páginas de dos versiones del MISMO documento y las compara píxel a píxel.

Ningún cambio del emisor PDF entra sin pasar por aquí. Clasifica lo que cambió:

  identico      la página no cambió en un solo píxel
  matiz         diferencias de <=8 niveles — antialiasing, no información
  PINTADO       claro -> oscuro: apareció tinta donde no había
  BORRADO       oscuro -> claro: DESAPARECIÓ tinta  <- esto es un defecto

Sin lista de páginas compara TODAS. Deja los PNG junto al informe para mirarlos.
"""
import os, subprocess, sys, tempfile
from pypdf import PdfReader, PdfWriter
from PIL import Image, ImageChops

AQUI = os.path.dirname(os.path.abspath(__file__))


def parte(pdf, dst, pags):
    r = PdfReader(pdf)
    for n in pags:
        w = PdfWriter(); w.add_page(r.pages[n - 1])
        with open(f'{dst}/p{n}.pdf', 'wb') as fh:
            w.write(fh)
    subprocess.run(['node', f'{AQUI}/raster_pdf.mjs', dst, ','.join(map(str, pags))], check=True)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    antes, ahora = sys.argv[1], sys.argv[2]
    n_antes, n_ahora = len(PdfReader(antes).pages), len(PdfReader(ahora).pages)
    if n_antes != n_ahora:
        print(f'AVISO: {n_antes} páginas antes, {n_ahora} ahora — se comparan las comunes')
    pags = ([int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3
            else list(range(1, min(n_antes, n_ahora) + 1)))

    base = tempfile.mkdtemp(prefix='diffpag_')
    a_dir, b_dir = f'{base}/antes', f'{base}/ahora'
    os.makedirs(a_dir); os.makedirs(b_dir)
    parte(antes, a_dir, pags); parte(ahora, b_dir, pags)

    peor = 0
    for n in pags:
        a = Image.open(f'{a_dir}/p{n}.png').convert('RGB')
        b = Image.open(f'{b_dir}/p{n}.png').convert('RGB')
        if a.size != b.size:
            print(f'  pag {n:>3}: TAMAÑO DISTINTO {a.size} vs {b.size}'); peor = 3; continue
        if not ImageChops.difference(a, b).getbbox():
            print(f'  pag {n:>3}: identica'); continue
        matiz = pintado = borrado = 0
        for pa, pb in zip(a.get_flattened_data(), b.get_flattened_data()):
            if pa == pb: continue
            la, lb = sum(pa) / 3, sum(pb) / 3
            if abs(lb - la) <= 8: matiz += 1
            elif lb < la: pintado += 1
            else: borrado += 1
        tot = a.size[0] * a.size[1]
        print(f'  pag {n:>3}: matiz {matiz:>7} · PINTADO {pintado:>6} · BORRADO {borrado:>6}'
              f'   ({100 * (matiz + pintado + borrado) / tot:.2f} % de la página)')
        peor = max(peor, 2 if borrado else 1)

    print(f'\nPNG en {base}  — MÍRALOS: el número no reemplaza el ojo (regla 12).')
    print({0: 'IDENTICO', 1: 'sólo matiz/tinta nueva — revisar y aceptar',
           2: 'HAY TINTA BORRADA — justificar o revertir',
           3: 'PAGINAS INCOMPARABLES'}[peor])
    return peor


if __name__ == '__main__':
    sys.exit(main())
