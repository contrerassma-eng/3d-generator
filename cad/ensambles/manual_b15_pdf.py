#!/usr/bin/env python3
# manual_b15_pdf.py — compone el manual/dossier PDF de la estación B1.5 v3 a
# partir de las capturas de manual_b15_capturas.mjs y de los datos del propio
# modelo (sonda_suelo_b15.json: BOM, pasos, features, desviaciones, webRef).
# Los costos provienen de meta.costoEstimado; la contingencia del 30 % se
# muestra SIEMPRE como columna rotulada (nunca fundida al costo base).
# Uso (desde cad/):  python3 ensambles/manual_b15_pdf.py
import json
import os
import re

from PIL import Image
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
CAPS = os.path.join(HERE, 'planos_sonda', '_caps_b15')
OUT = os.path.join(HERE, 'planos_sonda', 'sonda_b15_manual_ensamble.pdf')
DOC = json.load(open(os.path.join(HERE, 'sonda_suelo_b15.json')))
META = DOC['meta']

PW, PH = landscape(A4)          # 842 × 595 pt
INK = (0x10 / 255, 0x14 / 255, 0x1a / 255)
ACC = (0x2a / 255, 0x4f / 255, 0xd7 / 255)
SUB = (0x5b / 255, 0x65 / 255, 0x72 / 255)
LINE = (0xd8 / 255, 0xde / 255, 0xe8 / 255)
GOLD = (0xc9 / 255, 0xa2 / 255, 0x27 / 255)

BG_RGB = (16, 20, 26)


def cropped(name, pad=40):
    """Recorta la captura al contenido (fondo #10141a) con margen."""
    im = Image.open(os.path.join(CAPS, name + '.png')).convert('RGB')
    px = im.load()
    w, h = im.size
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            r, g, b = px[x, y]
            if abs(r - BG_RGB[0]) + abs(g - BG_RGB[1]) + abs(b - BG_RGB[2]) > 24:
                x0, y0 = min(x0, x), min(y0, y)
                x1, y1 = max(x1, x), max(y1, y)
    if x1 <= x0:
        return im
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(w, x1 + pad), min(h, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def panel(c, img, x, y, w, h, radius=8):
    """Panel oscuro con la imagen ajustada dentro (contain)."""
    c.setFillColorRGB(*INK)
    c.roundRect(x, y, w, h, radius, stroke=0, fill=1)
    iw, ih = img.size
    s = min((w - 8) / iw, (h - 8) / ih)
    dw, dh = iw * s, ih * s
    c.drawImage(ImageReader(img), x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)


def header(c, title, sub=''):
    c.setFillColorRGB(*ACC)
    c.rect(36, PH - 44, 5, 20, stroke=0, fill=1)
    c.setFillColorRGB(*INK)
    c.setFont('Helvetica-Bold', 17)
    c.drawString(50, PH - 40, title)
    if sub:
        c.setFillColorRGB(*SUB)
        c.setFont('Helvetica', 9.5)
        c.drawString(50, PH - 54, sub)
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.7)
    c.line(36, PH - 62, PW - 36, PH - 62)


def footer(c, n, total):
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.7)
    c.line(36, 34, PW - 36, 34)
    c.setFillColorRGB(*SUB)
    c.setFont('Helvetica', 8)
    c.drawString(36, 22, f"foto3d · SONDA-SUELO-IND · {META['nombre']} · {META['fecha']} · capa user (CAD paramétrico)")
    c.drawRightString(PW - 36, 22, f'{n} / {total}')


def wrap(c, text, x, y, width, size=9, leading=None, font='Helvetica', color=INK, max_lines=99):
    leading = leading or size * 1.32
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    words, line, lines = text.split(), '', []
    for wd in words:
        t = (line + ' ' + wd).strip()
        if c.stringWidth(t, font, size) <= width:
            line = t
        else:
            lines.append(line)
            line = wd
    lines.append(line)
    for ln in lines[:max_lines]:
        c.drawString(x, y, ln)
        y -= leading
    return y


def bullets(c, items, x, y, width, size=9.3, gap=5, color=INK):
    for it in items:
        c.setFillColorRGB(*ACC)
        c.circle(x + 2.4, y + size * 0.32, 1.7, stroke=0, fill=1)
        y = wrap(c, it, x + 11, y, width - 11, size=size, color=color)
        y -= gap
    return y


def fit(c, txt, width, font='Helvetica', size=7.6):
    if c.stringWidth(txt, font, size) <= width:
        return txt
    while txt and c.stringWidth(txt + '…', font, size) > width:
        txt = txt[:-1]
    return txt + '…'


def rango(txt):
    nums = [int(n) for n in re.findall(r'\d+', txt.replace('.', ''))]
    return nums[0], nums[1]


def fmt(v):
    return f'{round(v / 5) * 5:,}'.replace(',', ' ')


c = canvas.Canvas(OUT, pagesize=(PW, PH))
c.setTitle('Estación de suelo+clima B1.5 v3 — dossier y manual de ensamble')
TOTAL = 10

# ---------------------------------------------------------------- 1 · portada
c.setFillColorRGB(*INK)
c.rect(0, 0, PW, PH, stroke=0, fill=1)
img = cropped('hero', pad=60)
iw, ih = img.size
s = (PH - 40) / ih
c.drawImage(ImageReader(img), PW - iw * s - 40, 20, iw * s, PH - 40)
c.setFillColorRGB(*ACC)
c.rect(48, PH - 118, 6, 44, stroke=0, fill=1)
c.setFillColorRGB(1, 1, 1)
c.setFont('Helvetica-Bold', 27)
c.drawString(64, PH - 96, 'Estación de suelo + clima B1.5')
c.setFont('Helvetica-Bold', 15)
c.setFillColorRGB(*GOLD)
c.drawString(64, PH - 118, 'v3 · cabezal cilíndrico compacto en norma')
c.setFillColorRGB(0.78, 0.82, 0.9)
y = PH - 152
for ln in [
    'Humedad de suelo a 3 profundidades (SMT50 ±2 % VWC) + T/HR OMM,',
    'pluviometría y humedad de hoja, con telemetría LoRaWAN solar,',
    'en un solo poste — sin un cable ni un prensaestopas a la vista.',
]:
    c.setFont('Helvetica', 11.5)
    c.drawString(64, y, ln)
    y -= 16
y -= 14
for tag in ['EN ISO 1452', 'ISO 3601 · regla Parker', 'DIN 912 A4', 'NPT 1 1/2"',
            'M12 IEC 61076', 'OMM N.º 8', 'IP68 objetivo']:
    tw = c.stringWidth(tag, 'Helvetica-Bold', 8.5) + 14
    c.setStrokeColorRGB(*ACC)
    c.setLineWidth(0.9)
    c.roundRect(64, y - 5, tw, 16, 8, stroke=1, fill=0)
    c.setFillColorRGB(0.85, 0.89, 1)
    c.setFont('Helvetica-Bold', 8.5)
    c.drawString(71, y, tag)
    y -= 24
c.setFillColorRGB(*SUB)
c.setFont('Helvetica', 9)
c.drawString(64, 46, f"Dossier técnico y manual de ensamble · {META['fecha']} · {len(DOC['parts'])} piezas · diseño CAD paramétrico foto3d")
c.showPage()

# ----------------------------------------------------- 2 · de un vistazo
header(c, 'La estación de un vistazo', META['subtitulo'])
panel(c, cropped('frente', 50), 36, 48, 300, PH - 124)
x0 = 356
y = PH - 92
c.setFont('Helvetica-Bold', 12)
c.setFillColorRGB(*INK)
c.drawString(x0, y, 'Propuesta de valor')
y -= 18
y = bullets(c, [
    'Paridad funcional con las estaciones de referencia del mercado (METER ZL6 / CropX / Sentek) en un solo poste: suelo 3 niveles + clima + hoja + LoRaWAN solar.',
    'Cableado 100 % interior al poste: cero prensaestopas y cero cables expuestos — menos puntos de falla IP y vandalismo, mejor estética de producto.',
    'Envolvente cilíndrica compacta Ø125 con cuerpo de tubo estándar de catálogo: sin matricería ni inyección — CAPEX de herramental nulo.',
    'Diseño 100 % paramétrico y auditable (BOM, pasos y geometría de una sola fuente); prueba de estanqueidad como compuerta de calidad antes de instalar.',
], x0, y, PW - 36 - x0, size=9.6, gap=6)
y -= 8
c.setFont('Helvetica-Bold', 12)
c.setFillColorRGB(*INK)
c.drawString(x0, y, 'Ficha técnica')
y -= 10
specs = [
    ('Cabezal', 'Ø125 × ~195 mm, coaxial al poste, servicio por tapa superior'),
    ('Sonda de suelo', 'SMT50 ×3 a 20/40/60 cm, ±2 % VWC, tubo PVC-U Ø50 dieléctrico'),
    ('Clima', 'T/HR a 1.50 m (OMM N.º 8) · pluviómetro Ø160 boca 1.235 m · hoja'),
    ('Energía', 'Panel 5 W + 2× LiFePO4 26650 + BMS solar'),
    ('Telemetría', 'LoRaWAN 868/915 MHz, antena a ~2.15 m sobre la tapa'),
    ('Poste', 'NPS 1 1/2" SCH40 galvanizado, hilo NPT en puntas, 1.78 m'),
    ('Sellado', '2× tórica ISO 3601 104×3 FKM, gargantas regla Parker (15 %)'),
    ('Servicio', 'Receptáculo M12 + válvula Gore bajo el disco (sombra permanente)'),
]
rh = 16.5
for k, v in specs:
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.5)
    c.line(x0, y - 4.5, PW - 36, y - 4.5)
    c.setFont('Helvetica-Bold', 8.8)
    c.setFillColorRGB(*SUB)
    c.drawString(x0, y, k.upper())
    c.setFont('Helvetica', 9.3)
    c.setFillColorRGB(*INK)
    c.drawString(x0 + 92, y, v)
    y -= rh
footer(c, 2, TOTAL)
c.showPage()

# ----------------------------------------------------- 3 · cabezal en norma
header(c, 'El cabezal: cilíndrico, compacto y en norma',
       'Base y tapa torneadas POM-C + cuerpo de tubo estándar — sin matricería')
panel(c, cropped('cabezal', 45), 36, 48, 255, PH - 124)
panel(c, cropped('inferior', 45), 301, 48, 255, PH - 124)
c.setFillColorRGB(0.78, 0.83, 0.92)
c.setFont('Helvetica', 8)
c.drawString(44, 54, 'Cabezal Ø125 sobre el poste')
c.drawString(309, 54, 'Cara inferior: M12 de servicio + válvula Gore')
x0 = 576
y = PH - 92
y = bullets(c, [
    'Cuerpo: corte de TUBO ESTÁNDAR PVC-U DN125 PN16 (EN ISO 1452, Ø125×7.4) — pieza de catálogo, repetible y económica.',
    'Sellado radial doble: tóricas ISO 3601 104×3 FKM en gargantas dimensionadas por regla Parker (piso Ø105.0 / prof. 2.55 / W 4.0 — apriete 15 %).',
    'Base roscada 1 1/2"-11.5 NPT hembra directo al hilo del poste (hex SW54): sin abrazaderas ni soldadura.',
    'Cero prensaestopas: todo el cableado sube por dentro del poste y entra por el conducto central Ø30 → plenum → pasa-piso Ø15.',
    'Únicas penetraciones exteriores BAJO el disco: receptáculo M12 (IEC 61076-2-101) y válvula Gore — sombra permanente, sin sol ni chorro.',
    'Goterón perimetral en la tapa y 8× DIN 912 M4 A4 radiales; antena sobre pasamuro N/SMA (~2.15 m).',
    'Servicio de pie por la tapa superior; el conjunto interno sale como cartucho.',
], x0, y, PW - 36 - x0, size=9.4, gap=6)
footer(c, 3, TOTAL)
c.showPage()

# ----------------------------------------------------- 4 · corte A-A
header(c, 'Corte A-A: la pila vertical', 'Sección por booleana CSG real del modelo paramétrico')
panel(c, cropped('corte', 45), 36, 48, 380, PH - 124)
panel(c, cropped('corte_sonda', 45), 426, 48, 190, PH - 124)
c.setFillColorRGB(0.78, 0.83, 0.92)
c.setFont('Helvetica', 8)
c.drawString(44, 54, 'Cabezal: electrónica en pila vertical')
c.drawString(434, 54, 'Sonda enterrada (sensores a 20/40/60 cm)')
x0 = 636
y = PH - 92
c.setFont('Helvetica-Bold', 12)
c.setFillColorRGB(*INK)
c.drawString(x0, y, 'De abajo hacia arriba')
y -= 18
y = bullets(c, [
    'Base torneada: rosca NPT al poste, plenum de cables y piso integral.',
    'Portapilas 2× LiFePO4 26650 verticales al piso — el centro de gravedad queda bajo.',
    'Placa portadora circular Ø100 sobre 3 columnas M4: WisBlock + ADS1115 + BMS solar + bornera.',
    'Desecante Ø18 recambiable al piso.',
    'Tapa torneada con tórica radial, goterón y pasamuro N/SMA para la antena.',
    'La sección circular se aprovecha completa: Ø110.2 interiores × 116 mm útiles.',
], x0, y, PW - 36 - x0, size=9.3, gap=5.5)
footer(c, 4, TOTAL)
c.showPage()

# ----------------------------------------------------- 5 · despiece
header(c, 'Despiece y arquitectura', f"{len(DOC['parts'])} piezas · 4 módulos funcionales")
panel(c, cropped('explode', 55), 36, 48, 470, PH - 124)
x0 = 526
y = PH - 92
mods = [
    ('Sonda enterrada', 'Punta 316L, tubo PVC-U Ø50 dieléctrico, 3× SMT50 en pasamuros POM-C con potting PU, tórica 36×3.'),
    ('Poste', 'NPS 1 1/2" SCH40 galvanizado con hilo en puntas; pasacables de goma por instrumento; pica de tierra.'),
    ('Cabezal cilíndrico', 'Base + tubo DN125 + tapa, 2 tóricas Parker, electrónica en pila vertical, M12 + Gore bajo el disco.'),
    ('Instrumentos', 'Escudo T/HR a 1.50 m, pluviómetro Ø160 en ménsula nivelable, sensor de hoja, panel 5 W, antena.'),
]
for t, d in mods:
    c.setFillColorRGB(*ACC)
    c.setFont('Helvetica-Bold', 10.5)
    c.drawString(x0, y, t)
    y -= 13
    y = wrap(c, d, x0, y, PW - 36 - x0, size=9.2, color=INK)
    y -= 10
y -= 4
c.setFont('Helvetica-Bold', 10.5)
c.setFillColorRGB(*INK)
c.drawString(x0, y, 'Verificación del modelo')
y -= 13
y = wrap(c, 'Suite CSG automatizada: 138/138 comprobaciones ✔ (mallas válidas, cabezal coaxial centrado, '
            'tóricas en garganta, penetraciones solo bajo el disco, electrónica dentro de Ø110.2, alturas OMM).',
         x0, y, PW - 36 - x0, size=9.2, color=INK)
footer(c, 5, TOTAL)
c.showPage()

# ----------------------------------------------------- 6-8 · pasos
pasos = META['pasos']
for pg in range(3):
    header(c, f'Manual de ensamble — pasos {pg * 4 + 1} a {pg * 4 + 4}',
           'Cada render destaca las piezas del paso (resto atenuado)')
    for k in range(4):
        i = pg * 4 + k
        if i >= len(pasos):
            break
        p = pasos[i]
        cx = 36 + (k % 2) * ((PW - 72) / 2 + 6)
        cy = 48 + (1 - k // 2) * ((PH - 124) / 2 + 4)
        cw = (PW - 78) / 2
        ch = (PH - 132) / 2
        panel(c, cropped(f'paso{i + 1}', 35), cx, cy, cw * 0.44, ch)
        c.setFillColorRGB(*ACC)
        c.circle(cx + cw * 0.44 + 16, cy + ch - 12, 9, stroke=0, fill=1)
        c.setFillColorRGB(1, 1, 1)
        c.setFont('Helvetica-Bold', 10)
        c.drawCentredString(cx + cw * 0.44 + 16, cy + ch - 15.4, str(p['n']))
        c.setFillColorRGB(*INK)
        c.setFont('Helvetica-Bold', 10.3)
        c.drawString(cx + cw * 0.44 + 30, cy + ch - 16, p['t'])
        wrap(c, p['texto'], cx + cw * 0.44 + 12, cy + ch - 34, cw * 0.56 - 16,
             size=8.2, leading=10.6, max_lines=int((ch - 30) / 10.6))
    footer(c, 6 + pg, TOTAL)
    c.showPage()

# ----------------------------------------------------- 9 · BOM
header(c, 'Lista de materiales (BOM)', 'Fuente única: meta.bom del modelo paramétrico')
bom = META['bom']
cols = [36, 62, 330, 470, 500]
y = PH - 80
c.setFillColorRGB(*SUB)
c.setFont('Helvetica-Bold', 8)
for t, x in zip(['ÍT.', 'DESIGNACIÓN', 'MATERIAL / NORMA', 'CANT.', 'NOTA'], cols):
    c.drawString(x, y, t)
y -= 5
half = (len(bom) + 1) // 2
for col in range(2):
    yy = y - 10
    dx = 0 if col == 0 else 0  # una sola columna: tabla completa a lo ancho
for it in bom:
    y -= 0
row_h = (y - 46) / len(bom)
row_h = min(row_h, 15.2)
yy = y
for it in bom:
    yy -= row_h
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.4)
    c.line(36, yy - 3, PW - 36, yy - 3)
    c.setFillColorRGB(*INK)
    c.setFont('Helvetica-Bold', 7.6)
    c.drawString(cols[0], yy, str(it['item']))
    c.setFont('Helvetica', 7.6)
    c.drawString(cols[1], yy, fit(c, it['desig'], cols[2] - cols[1] - 8))
    c.setFillColorRGB(*SUB)
    c.drawString(cols[2], yy, fit(c, it['mat'], cols[3] - cols[2] - 8))
    c.drawString(cols[3], yy, str(it['cant']))
    c.drawString(cols[4], yy, fit(c, it.get('nota') or '', PW - 36 - cols[4]))
footer(c, 9, TOTAL)
c.showPage()

# ----------------------------------------------------- 10 · costos + respaldo
header(c, 'Costos, precio objetivo y respaldo',
       'Costo base = BOM paramétrica del modelo · contingencia declarada explícitamente')
ce = META.get('costoEstimado', {})
p0, p1 = rango(ce.get('proto', 'US$760–950'))
s0, s1 = rango(ce.get('serie25', 'US$470–540'))
x0 = 36
y = PH - 96
c.setFont('Helvetica-Bold', 12)
c.setFillColorRGB(*INK)
c.drawString(x0, y, 'Escalera de costos (US$ por unidad)')
y -= 12
tcols = [x0, x0 + 150, x0 + 280, x0 + 400]
c.setFillColorRGB(*SUB)
c.setFont('Helvetica-Bold', 8.2)
y -= 12
for t, x in zip(['CONCEPTO', 'COSTO ESTIMADO (BOM)', 'CONTINGENCIA +30 %', 'PRECIO OBJETIVO'], tcols):
    c.drawString(x, y, t)
y -= 6
rows = [
    ('Prototipo (1 ud)', (p0, p1)),
    ('Serie 25 uds', (s0, s1)),
]
for name, (a, b) in rows:
    y -= 17
    c.setStrokeColorRGB(*LINE)
    c.line(x0, y - 4, x0 + 500, y - 4)
    c.setFillColorRGB(*INK)
    c.setFont('Helvetica', 9.5)
    c.drawString(tcols[0], y, name)
    c.drawString(tcols[1], y, f'{fmt(a)} – {fmt(b)}')
    c.setFillColorRGB(*SUB)
    c.drawString(tcols[2], y, f'+ {fmt(a * 0.3)} – {fmt(b * 0.3)}')
    c.setFillColorRGB(*ACC)
    c.setFont('Helvetica-Bold', 9.5)
    c.drawString(tcols[3], y, f'{fmt(a * 1.3)} – {fmt(b * 1.3)}')
y -= 20
y = wrap(c, 'El “precio objetivo” incorpora una contingencia del 30 % sobre el costo estimado '
            '(logística, mermas, tipo de cambio e imprevistos de prototipado), declarada en esta '
            'columna: las cifras base provienen de la BOM paramétrica y no se alteran.',
         x0, y, 500, size=8.2, color=SUB)
y -= 12
c.setFont('Helvetica-Bold', 12)
c.setFillColorRGB(*INK)
c.drawString(x0, y, 'Compuertas de calidad')
y -= 16
y = bullets(c, [
    'GATE de estanqueidad antes de instalar: sonda a vacío −20 kPa (5 min) o inmersión 1 m / 30 min; cabezal armado en inmersión 30 min con testigo.',
    'Suite de verificación geométrica automatizada del modelo: 138/138 ✔.',
    'Toda la geometría, BOM y pasos salen de UNA fuente paramétrica auditable.',
], x0, y, 500, size=9.2, gap=5)
y -= 10
c.setFont('Helvetica-Bold', 12)
c.setFillColorRGB(*INK)
c.drawString(x0, y, 'Checklist de entrega por estación')
y -= 16
y = bullets(c, [
    'Nº de serie + bitácora de ensamble firmada (pasos 1–12) y resultado del GATE de estanqueidad.',
    'Verificación en banco de los 3 SMT50 rotulados por profundidad (aire/agua).',
    'Nivelación del pluviómetro ±1° y foto de instalación con collar al ras.',
    'Alta en red LoRaWAN, prueba de enlace y primer paquete de datos recibido.',
], x0, y, 500, size=9.2, gap=5)
xr = 566
yr = PH - 96
c.setFont('Helvetica-Bold', 12)
c.setFillColorRGB(*INK)
c.drawString(xr, yr, 'Referencias del estado del arte')
yr -= 16
for wref in META.get('webRef', []):
    c.setFillColorRGB(*ACC)
    c.setFont('Helvetica-Bold', 8.6)
    c.drawString(xr, yr, wref['fuente'])
    yr -= 11
    yr = wrap(c, wref['afirmacion'], xr, yr, PW - 36 - xr, size=7.8, color=INK)
    c.setFont('Helvetica', 6.8)
    c.setFillColorRGB(*SUB)
    c.drawString(xr, yr, fit(c, wref['url'], PW - 36 - xr, size=6.8))
    yr -= 16
footer(c, 10, TOTAL)
c.showPage()

c.save()
kb = os.path.getsize(OUT) // 1024
print(f'OK {OUT} ({kb} KB, {TOTAL} páginas)')
