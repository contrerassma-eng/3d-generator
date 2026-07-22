#!/usr/bin/env python3
# comercial_b15_pdf.py — documento COMERCIAL de la estación B1.5 v3 bajo la
# filosofía de diseño "Instrumento Nocturno" (planos_sonda/comercial_filosofia.md):
# fondo de tinta, información como luz calibrada, cifras monumentales, etiquetas
# monoespaciadas de bitácora. Enfocado en TOMA DE DECISIONES y AHORRO.
#
# Honestidad comercial: la plataforma de software es CONCEPTO DE PRODUCTO
# (interfaz ilustrativa, datos simulados, así rotulada); los ahorros citan
# estudios reales con URL; el precio objetivo declara su contingencia +30 %.
# Usa las capturas de manual_b15_capturas.mjs.
# Uso (desde cad/):  python3 ensambles/comercial_b15_pdf.py
import math
import os

from PIL import Image
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
CAPS = os.path.join(HERE, 'planos_sonda', '_caps_b15')
OUT = os.path.join(HERE, 'planos_sonda', 'sonda_b15_comercial.pdf')
FONTS = '/root/.claude/skills/canvas-design/canvas-fonts'

for name, f in [('Big', 'BigShoulders-Bold.ttf'), ('BigR', 'BigShoulders-Regular.ttf'),
                ('Sans', 'InstrumentSans-Regular.ttf'), ('SansB', 'InstrumentSans-Bold.ttf'),
                ('Mono', 'GeistMono-Regular.ttf'), ('MonoB', 'GeistMono-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name, os.path.join(FONTS, f)))

PW, PH = landscape(A4)
INK = (0x10 / 255, 0x14 / 255, 0x1a / 255)      # = fondo de los renders
GLASS = (0x14 / 255, 0x1a / 255, 0x24 / 255)
EDGE = (0x27 / 255, 0x33 / 255, 0x49 / 255)
FG = (0xe9 / 255, 0xee / 255, 0xf6 / 255)
MUT = (0x7e / 255, 0x8c / 255, 0xa4 / 255)
ACC = (0x47 / 255, 0x6c / 255, 0xff / 255)
GRN = (0x4e / 255, 0xc9 / 255, 0x7b / 255)
AMB = (0xd9 / 255, 0xa7 / 255, 0x2e / 255)
BG_RGB = (16, 20, 26)


def cropped(name, pad=40):
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
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))


def bg(c):
    c.setFillColorRGB(*INK)
    c.rect(0, 0, PW, PH, stroke=0, fill=1)


def ruler(c, x, y0, y1, step=8, major=5):
    """Regla graduada vertical — motivo de instrumento."""
    c.setStrokeColorRGB(*EDGE)
    c.setLineWidth(0.5)
    c.line(x, y0, x, y1)
    n = 0
    y = y0
    while y <= y1:
        L = 7 if n % major == 0 else 3.5
        c.line(x, y, x + L, y)
        y += step
        n += 1


def mono(c, txt, x, y, size=7, color=MUT, bold=False, tracking=0.6):
    c.setFont('MonoB' if bold else 'Mono', size)
    c.setFillColorRGB(*color)
    if tracking:
        for ch in txt:
            c.drawString(x, y, ch)
            x += pdfmetrics.stringWidth(ch, 'MonoB' if bold else 'Mono', size) + tracking
    else:
        c.drawString(x, y, txt)


def mono_w(txt, size=7, tracking=0.6):
    return sum(pdfmetrics.stringWidth(ch, 'Mono', size) + tracking for ch in txt) - tracking


def glass(c, x, y, w, h, r=6, edge=EDGE):
    c.setFillColorRGB(*GLASS)
    c.setStrokeColorRGB(*edge)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, r, stroke=1, fill=1)


def draw_img(c, img, x, y, w, h):
    iw, ih = img.size
    s = min(w / iw, h / ih)
    dw, dh = iw * s, ih * s
    c.drawImage(ImageReader(img), x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
    return x + (w - dw) / 2, y + (h - dh) / 2, dw, dh


def foot(c, n, tag):
    mono(c, f'FOTO3D · SONDA-SUELO-IND · B1.5 V3 · 2026-07', 36, 20, 6.5, MUT)
    mono(c, tag, PW / 2 - mono_w(tag, 6.5) / 2, 20, 6.5, MUT)
    mono(c, f'{n:02d} / 06', PW - 36 - mono_w(f'{n:02d} / 06', 6.5), 20, 6.5, MUT)


def wrap_sans(c, text, x, y, width, size=9, leading=None, color=FG, bold=False):
    f = 'SansB' if bold else 'Sans'
    leading = leading or size * 1.35
    c.setFont(f, size)
    c.setFillColorRGB(*color)
    words, line, lines = text.split(), '', []
    for wd in words:
        t = (line + ' ' + wd).strip()
        if c.stringWidth(t, f, size) <= width:
            line = t
        else:
            lines.append(line)
            line = wd
    lines.append(line)
    for ln in lines:
        c.drawString(x, y, ln)
        y -= leading
    return y


c = canvas.Canvas(OUT, pagesize=(PW, PH))
c.setTitle('Estación B1.5 v3 — documento comercial')

# ═══════════════════════════════════════════════════ 01 · PORTADA
bg(c)
img = cropped('hero', 60)
draw_img(c, img, PW * 0.52, 30, PW * 0.46, PH - 60)
ruler(c, 36, 60, PH - 60)
mono(c, 'DOCUMENTO COMERCIAL · ATLAS DE DECISIÓN Nº 1', 58, PH - 74, 7, MUT)
c.setFont('Big', 52)
c.setFillColorRGB(*FG)
c.drawString(56, PH - 138, 'DECIDIR CON')
c.drawString(56, PH - 190, 'DATOS DEL SUELO.')
c.setStrokeColorRGB(*ACC)
c.setLineWidth(2.2)
c.line(58, PH - 208, 218, PH - 208)
y = PH - 238
wrap_sans(c, 'Estación de suelo + clima con cabezal cilíndrico en norma: mide la raíz a 3 profundidades, '
             'el clima a alturas OMM, y convierte cada dato en una decisión de riego.', 58, y, 330, 11, 15.5)
y -= 58
for k, v in [('SONDA', '3 NIVELES · ±2 % VWC'), ('CLIMA', 'T/HR · LLUVIA · HOJA'),
             ('ENERGÍA', 'SOLAR AUTÓNOMA'), ('ENLACE', 'LORAWAN 2.15 M')]:
    mono(c, k, 58, y, 6.5, MUT)
    mono(c, v, 58, y - 11, 7.5, FG, bold=True)
    y -= 34
mono(c, 'CABEZAL Ø125 · EN ISO 1452 · ISO 3601 · OMM Nº 8', 58, 40, 6.5, MUT)
foot(c, 1, '')
c.showPage()

# ═══════════════════════════════════════════════════ 02 · DE DATO A DECISIÓN
bg(c)
ruler(c, 36, 60, PH - 60)
c.setFont('Big', 30)
c.setFillColorRGB(*FG)
c.drawString(56, PH - 64, 'DE DATO A DECISIÓN')
mono(c, 'EL AGUA INVISIBLE, MEDIDA DONDE VIVE LA RAÍZ', 58, PH - 80, 7, MUT)
img = cropped('paso4', 40)
ix, iy, iw, ih = draw_img(c, img, 60, 46, 210, PH - 150)
# marcas de profundidad (sensores a -200/-400/-600 en un tubo de -740 a +60)
for frac, lab in [(0.675, '-20 CM'), (0.425, '-40 CM'), (0.175, '-60 CM')]:
    yy = iy + ih * frac
    c.setStrokeColorRGB(*EDGE)
    c.setLineWidth(0.6)
    c.line(ix + iw * 0.62, yy, 300, yy)
    mono(c, lab, 304, yy - 2.4, 7, MUT)
# panel de barras VWC → umbral → decisión
px0, pw = 360, 210
for i, (lab, frac, col) in enumerate([('-20 CM', 0.64, GRN), ('-40 CM', 0.48, GRN), ('-60 CM', 0.30, AMB)]):
    yy = PH - 170 - i * 64
    mono(c, f'VWC {lab}', px0, yy + 30, 6.5, MUT)
    c.setFillColorRGB(*GLASS)
    c.roundRect(px0, yy, pw, 20, 4, stroke=0, fill=1)
    c.setFillColorRGB(*col)
    c.roundRect(px0, yy, pw * frac, 20, 4, stroke=0, fill=1)
    mono(c, f'{frac * 50:.0f} %', px0 + pw + 10, yy + 6, 8, FG, bold=True)
# umbral
ux = px0 + pw * 0.40
c.setStrokeColorRGB(*ACC)
c.setLineWidth(1)
c.setDash(3, 3)
c.line(ux, PH - 190 - 128, ux, PH - 128)
c.setDash()
mono(c, 'UMBRAL DE MANEJO', ux - 30, PH - 122, 6.5, ACC, bold=True)
# flecha → decisión
c.setStrokeColorRGB(*ACC)
c.setLineWidth(1.4)
c.line(px0 + pw + 42, PH - 234, px0 + pw + 72, PH - 234)
c.line(px0 + pw + 66, PH - 230, px0 + pw + 72, PH - 234)
c.line(px0 + pw + 66, PH - 238, px0 + pw + 72, PH - 234)
gx = px0 + pw + 84
glass(c, gx, PH - 292, 150, 96, edge=ACC)
mono(c, 'DECISIÓN', gx + 14, PH - 216, 6.5, MUT)
c.setFont('Big', 26)
c.setFillColorRGB(*FG)
c.drawString(gx + 14, PH - 246, 'REGAR 11 mm')
mono(c, 'LA RAÍZ PROFUNDA AÚN', gx + 14, PH - 262, 6, MUT)
mono(c, 'TIENE RESERVA: LÁMINA CORTA', gx + 14, PH - 272, 6, MUT)
mono(c, '· ILUSTRATIVO ·', gx + 14, PH - 284, 5.5, MUT)
# flujo inferior
flow = ['MEDIR', 'TRANSMITIR', 'DECIDIR', 'AHORRAR']
fx, fw = 360, (PW - 96 - 360) / 4
for i, st in enumerate(flow):
    cx = fx + i * fw
    c.setFillColorRGB(*(ACC if i < 3 else GRN))
    c.circle(cx + 8, 96, 3.2, stroke=0, fill=1)
    mono(c, st, cx + 18, 92.6, 8, FG, bold=True)
    if i < 3:
        c.setStrokeColorRGB(*EDGE)
        c.setLineWidth(0.8)
        c.line(cx + 18 + mono_w(st, 8) + 8, 96, cx + fw - 6, 96)
mono(c, 'CADA 15 MIN, LA ESTACIÓN REPITE ESTE CICLO SIN INTERVENCIÓN HUMANA', 360, 72, 6.5, MUT)
foot(c, 2, 'DE DATO A DECISIÓN')
c.showPage()

# ═══════════════════════════════════════════════════ 03 · LA ESTACIÓN
bg(c)
ruler(c, 36, 60, PH - 60)
c.setFont('Big', 30)
c.setFillColorRGB(*FG)
c.drawString(56, PH - 64, 'UN POSTE. TODO EL CAMPO.')
mono(c, 'HARDWARE V3 · 37 PIEZAS · VERIFICACIÓN GEOMÉTRICA 138/138 OK', 58, PH - 80, 7, MUT)
img = cropped('frente', 55)
ix, iy, iw, ih = draw_img(c, img, PW / 2 - 130, 44, 260, PH - 140)
CALL = [
    (0.985, 'ANTENA LORAWAN ~2.15 M', 'MEJOR HORIZONTE DE RADIO', 1),
    (0.928, 'CABEZAL Ø125 EN NORMA', 'EN ISO 1452 · TÓRICAS ISO 3601', 1),
    (0.890, 'PANEL SOLAR 5 W', 'AUTONOMÍA TODO EL AÑO', 0),
    (0.730, 'ESCUDO T/HR A 1.50 M', 'ALTURA NORMATIVA OMM Nº 8', 0),
    (0.645, 'PLUVIÓMETRO Ø160 · 1.235 M', 'NIVELABLE ± 1°', 1),
    (0.430, 'CERO CABLES A LA VISTA', '100 % INTERIOR AL POSTE', 0),
    (0.110, 'SONDA A 20 / 40 / 60 CM', 'SMT50 ±2 % VWC · TUBO DIELÉCTRICO', 1),
]
for frac, t1, t2, side in CALL:
    yy = iy + ih * frac
    if side:  # derecha
        x_lab = PW / 2 + 170
        c.setStrokeColorRGB(*EDGE)
        c.setLineWidth(0.6)
        c.line(PW / 2 + 34, yy, x_lab - 8, yy)
        c.setFillColorRGB(*ACC)
        c.circle(PW / 2 + 34, yy, 1.6, stroke=0, fill=1)
        mono(c, t1, x_lab, yy + 1.5, 7.5, FG, bold=True)
        mono(c, t2, x_lab, yy - 8.5, 6, MUT)
    else:     # izquierda
        x_lab = 66
        c.setStrokeColorRGB(*EDGE)
        c.setLineWidth(0.6)
        c.line(x_lab + 168, yy, PW / 2 - 34, yy)
        c.setFillColorRGB(*ACC)
        c.circle(PW / 2 - 34, yy, 1.6, stroke=0, fill=1)
        mono(c, t1, x_lab, yy + 1.5, 7.5, FG, bold=True)
        mono(c, t2, x_lab, yy - 8.5, 6, MUT)
foot(c, 3, 'LA ESTACIÓN')
c.showPage()

# ═══════════════════════════════════════════════════ 04 · LA PLATAFORMA (CONCEPTO)
bg(c)
c.setFont('Big', 30)
c.setFillColorRGB(*FG)
c.drawString(56, PH - 64, 'LA PLATAFORMA QUE VIENE')
mono(c, 'CONCEPTO DE PRODUCTO · INTERFAZ ILUSTRATIVA · DATOS SIMULADOS', 58, PH - 80, 7, AMB, bold=True)
# ventana
wx, wy, ww, wh = 56, 92, PW - 112, PH - 196
glass(c, wx, wy, ww, wh, 10)
for i, col in enumerate([(0.85, 0.35, 0.35), (0.85, 0.7, 0.3), (0.35, 0.75, 0.4)]):
    c.setFillColorRGB(*col)
    c.circle(wx + 16 + i * 13, wy + wh - 13, 3.4, stroke=0, fill=1)
mono(c, 'plataforma.foto3d — PARCELA NORTE · ESTACIÓN B1.5-001', wx + 60, wy + wh - 16, 6.5, MUT)
c.setStrokeColorRGB(*EDGE)
c.setLineWidth(0.7)
c.line(wx, wy + wh - 26, wx + ww, wy + wh - 26)
# KPIs
kw = (ww - 320 - 48) / 3
kpis = [('VWC RAÍZ (PONDERADO)', '31.4 %', GRN, 'EN BANDA DE MANEJO'),
        ('AGUA AHORRADA — MES', '12 400 L', ACC, 'VS. CALENDARIO FIJO · SIM.'),
        ('RIEGOS EVITADOS', '3', FG, 'ÚLTIMOS 30 DÍAS · SIM.')]
for i, (k, v, col, s) in enumerate(kpis):
    kx = wx + 16 + i * (kw + 8)
    ky = wy + wh - 92
    glass(c, kx, ky, kw, 56, 5)
    mono(c, k, kx + 10, ky + 42, 5.8, MUT)
    c.setFont('Big', 21)
    c.setFillColorRGB(*col)
    c.drawString(kx + 10, ky + 18, v)
    mono(c, s, kx + 10, ky + 7, 5.2, MUT)
# gráfico VWC
gx0, gy0 = wx + 16, wy + 16
gw, gh = ww - 320 - 24, wh - 92 - 40
glass(c, gx0, gy0, gw, gh, 5)
mono(c, 'HUMEDAD VOLUMÉTRICA · 3 PROFUNDIDADES · 14 DÍAS', gx0 + 10, gy0 + gh - 12, 6, MUT)
cx0, cy0, cw, ch = gx0 + 34, gy0 + 20, gw - 50, gh - 44
c.setFillColorRGB(0.13, 0.22, 0.19)
c.rect(cx0, cy0 + ch * 0.38, cw, ch * 0.34, stroke=0, fill=1)
mono(c, 'BANDA ÓPTIMA', cx0 + cw - 66, cy0 + ch * 0.66, 5.2, GRN)
for fr, lab in [(0.0, '20'), (0.5, '30'), (1.0, '40')]:
    mono(c, lab, cx0 - 16, cy0 + ch * fr - 2, 5.5, MUT)
    c.setStrokeColorRGB(*EDGE)
    c.setLineWidth(0.4)
    c.line(cx0, cy0 + ch * fr, cx0 + cw, cy0 + ch * fr)
riegos = [3.5, 8.2, 12.6]


def curva(base, amp, drop, phase, col, lw=1.3):
    c.setStrokeColorRGB(*col)
    c.setLineWidth(lw)
    pts = []
    for i in range(281):
        t = i / 280 * 14
        v = base + amp * math.sin(t / 2.1 + phase) - drop * (t % 4.6) / 4.6
        for r in riegos:
            if t >= r:
                v += drop * 0.9 * math.exp(-(t - r) / 1.6)
        frac = (v - 20) / 20
        pts.append((cx0 + cw * i / 280, cy0 + ch * max(0.03, min(0.97, frac))))
    p = c.beginPath()
    p.moveTo(*pts[0])
    for pt in pts[1:]:
        p.lineTo(*pt)
    c.drawPath(p, stroke=1, fill=0)


curva(31.5, 1.1, 5.0, 0.0, GRN)
curva(30.0, 0.8, 3.2, 1.1, (0.35, 0.62, 0.95))
curva(28.6, 0.5, 1.7, 2.3, AMB)
for r in riegos:
    xx = cx0 + cw * r / 14
    c.setStrokeColorRGB(*ACC)
    c.setLineWidth(0.8)
    c.setDash(2, 3)
    c.line(xx, cy0, xx, cy0 + ch)
    c.setDash()
    mono(c, 'RIEGO', xx - 9, cy0 + ch + 4, 5, ACC)
for i, (lab, col) in enumerate([('-20', GRN), ('-40', (0.35, 0.62, 0.95)), ('-60', AMB)]):
    lx = cx0 + 6 + i * 44
    c.setStrokeColorRGB(*col)
    c.setLineWidth(2)
    c.line(lx, cy0 + 8, lx + 12, cy0 + 8)
    mono(c, lab + ' CM', lx + 16, cy0 + 5.6, 5.5, MUT)
# rail derecho
rx = wx + ww - 296
glass(c, rx, wy + 16, 280, wh - 48, 6, edge=ACC)
mono(c, 'RECOMENDACIÓN', rx + 14, wy + wh - 52, 6, MUT)
c.setFont('Big', 22)
c.setFillColorRGB(*FG)
c.drawString(rx + 14, wy + wh - 78, 'REGAR 11 mm · JUE 06:00')
wrap_sans(c, 'La banda de -20 cm cruza el umbral mañana; -60 cm conserva reserva. Lámina corta para no percolar.',
          rx + 14, wy + wh - 96, 252, 8, 11, MUT)
c.setStrokeColorRGB(*EDGE)
c.line(rx + 14, wy + wh - 134, rx + 266, wy + wh - 134)
mono(c, 'ALERTAS', rx + 14, wy + wh - 148, 6, MUT)
for i, (t, s, col) in enumerate([
        ('RIESGO DE HELADA 02:40', 'T PRONOSTICADA -1.2 °C · ACTIVAR DEFENSA', AMB),
        ('HOJA MOJADA 9 H SEGUIDAS', 'VENTANA DE HONGOS · REVISAR PROGRAMA', AMB),
        ('VWC -20 BAJO UMBRAL', 'SECTOR 3 · CONFIRMAR RIEGO DE ANOCHE', ACC)]):
    ay = wy + wh - 170 - i * 34
    c.setFillColorRGB(*col)
    c.circle(rx + 20, ay + 8, 2.4, stroke=0, fill=1)
    mono(c, t, rx + 30, ay + 6, 6.8, FG, bold=True)
    mono(c, s, rx + 30, ay - 4, 5.4, MUT)
c.setStrokeColorRGB(*EDGE)
c.line(rx + 14, wy + 74, rx + 266, wy + 74)
mono(c, 'SALUD DE LA ESTACIÓN', rx + 14, wy + 62, 6, MUT)
mono(c, 'BAT 3.29 V ▂▄▆ CARGANDO · RSSI -97 dBm · ÚLT. PAQUETE 00:12', rx + 14, wy + 48, 5.6, GRN)
mono(c, 'DESECANTE OK · PRÓX. SERVICIO 180 D', rx + 14, wy + 36, 5.6, MUT)
# chips de features
chips = ['MULTI-PARCELA', 'ALERTAS PUSH', 'LÁMINA RECOMENDADA', 'REPORTES PDF', 'API ABIERTA',
         'OTA LORAWAN', 'GEMELO DIGITAL 3D', 'PRONÓSTICO ML']
cxx = 56
for ch_ in chips:
    wch = mono_w(ch_, 6) + 16
    c.setStrokeColorRGB(*EDGE)
    c.setLineWidth(0.7)
    c.roundRect(cxx, 56, wch, 15, 7.5, stroke=1, fill=0)
    mono(c, ch_, cxx + 8, 60.5, 6, MUT)
    cxx += wch + 8
foot(c, 4, 'LA PLATAFORMA · CONCEPTO')
c.showPage()

# ═══════════════════════════════════════════════════ 05 · EL AHORRO
bg(c)
ruler(c, 36, 60, PH - 60)
c.setFont('Big', 30)
c.setFillColorRGB(*FG)
c.drawString(56, PH - 64, 'EL AHORRO, CON FUENTES.')
mono(c, 'RIEGO GUIADO POR SENSORES DE HUMEDAD — EVIDENCIA PUBLICADA', 58, PH - 80, 7, MUT)
BIG = [
    ('10–17 %', 'MENOS AGUA', 'Riego guiado por sensores de humedad: 10–16 % en fresa y almendro con rendimiento máximo (UC ANR); 10–17 % con sistema de apoyo a decisión en Italia.', GRN),
    ('−28.8 %', 'AGUA EN SISTEMA IOT', 'Sensores capacitivos IoT vs. programación climática convencional en lechuga — estudio revisado por pares (2025).', ACC),
    ('−16.2 %', 'HORAS DE BOMBEO', 'El mismo estudio IoT: menos horas de bomba, menos energía y desgaste del equipo de riego.', AMB),
]
colw = (PW - 112 - 48) / 3
for i, (num, t, s, col) in enumerate(BIG):
    x = 56 + i * (colw + 24)
    y = PH - 175
    c.setFont('Big', 44)
    c.setFillColorRGB(*col)
    c.drawString(x, y, num)
    c.setStrokeColorRGB(*col)
    c.setLineWidth(1.6)
    c.line(x + 2, y - 14, x + 70, y - 14)
    mono(c, t, x + 2, y - 30, 8, FG, bold=True)
    wrap_sans(c, s, x + 2, y - 48, colw - 8, 8.3, 11.6, MUT)
mono(c, 'FUENTES · ucanr.edu/site/irrigation-and-nutrient-management/soil-moisture-sensors · pmc.ncbi.nlm.nih.gov/articles/PMC11902337', 56, PH - 296, 5.8, MUT)
mono(c, 'LOS PORCENTAJES DEPENDEN DE CULTIVO, SUELO Y PRÁCTICA DE BASE; NO CONSTITUYEN GARANTÍA DE RESULTADO', 56, PH - 306, 5.8, MUT)
# decisiones que habilita
c.setStrokeColorRGB(*EDGE)
c.line(56, PH - 322, PW - 56, PH - 322)
mono(c, 'LAS DECISIONES QUE HABILITA', 56, PH - 338, 7, FG, bold=True)
dec = [('CUÁNDO', 'regar: umbral por profundidad, no calendario'),
       ('CUÁNTO', 'lámina justa: sin percolar bajo la raíz'),
       ('DÓNDE', 'por sector: cada estación, su parcela'),
       ('RIESGO', 'helada y hongos: alerta antes del daño'),
       ('FLOTA', 'mantenimiento predictivo: batería, enlace, desecante')]
dx = 56
dw = (PW - 112) / 5
for k, v in dec:
    mono(c, k, dx, PH - 358, 8.5, ACC, bold=True)
    wrap_sans(c, v, dx, PH - 372, dw - 14, 8, 11, MUT)
    dx += dw
# escalera de precios
c.setStrokeColorRGB(*EDGE)
c.line(56, 116, PW - 56, 116)
mono(c, 'PRECIO OBJETIVO POR ESTACIÓN (HARDWARE)', 56, 100, 7, FG, bold=True)
c.setFont('Big', 20)
c.setFillColorRGB(*FG)
c.drawString(56, 72, 'US$ 990–1 235')
mono(c, 'PROTOTIPO · 1 UD', 56, 60, 6, MUT)
c.setFont('Big', 20)
c.setFillColorRGB(*FG)
c.drawString(240, 72, 'US$ 610–700')
mono(c, 'SERIE · 25 UDS', 240, 60, 6, MUT)
wrap_sans(c, 'Incluye contingencia del +30 % declarada sobre el costo estimado de BOM (760–950 / 470–540): '
             'logística, mermas, tipo de cambio e imprevistos de prototipado. Cifras base auditables en la BOM paramétrica.',
          400, 86, PW - 456, 7.5, 10.5, MUT)
foot(c, 5, 'EL AHORRO')
c.showPage()

# ═══════════════════════════════════════════════════ 06 · RUTA + CTA
bg(c)
img = cropped('cabezal', 60)
draw_img(c, img, PW - 300, 60, 250, PH - 140)
ruler(c, 36, 60, PH - 60)
c.setFont('Big', 30)
c.setFillColorRGB(*FG)
c.drawString(56, PH - 64, 'LA RUTA')
mono(c, 'FASES PROPUESTAS — EL HARDWARE DE LA FASE 0 YA ESTÁ DISEÑADO Y VERIFICADO', 58, PH - 80, 7, MUT)
FASES = [
    ('F0 · HOY', 'HARDWARE V3 VERIFICADO', 'Diseño paramétrico completo: 37 piezas, 138/138 pruebas geométricas, manual de ensamble y BOM auditable.', GRN),
    ('F1', 'PILOTO EN CAMPO', 'Primeras estaciones instaladas; telemetría cruda en la nube y calibración por cultivo con datos reales.', ACC),
    ('F2', 'PLATAFORMA WEB', 'Dashboard multi-parcela, alertas push, recomendación de lámina y reportes — el concepto de la lámina 04.', ACC),
    ('F3', 'FLOTA + ML', 'Pronóstico de secado del perfil, riego prescriptivo por sector y mantenimiento predictivo de la flota.', AMB),
]
tx0, tx1 = 70, PW - 340
c.setStrokeColorRGB(*EDGE)
c.setLineWidth(1)
c.line(tx0, PH - 150, tx1, PH - 150)
for i, (f, t, s, col) in enumerate(FASES):
    x = tx0 + i * (tx1 - tx0) / 3.3
    c.setFillColorRGB(*col)
    c.circle(x, PH - 150, 4 if i else 5.2, stroke=0, fill=1)
    mono(c, f, x - 4, PH - 138, 7, col, bold=True)
    mono(c, t, x - 4, PH - 170, 7.5, FG, bold=True)
    wrap_sans(c, s, x - 4, PH - 184, 118, 7.6, 10.4, MUT)
# cierre
c.setFont('Big', 24)
c.setFillColorRGB(*FG)
c.drawString(56, 160, 'MENOS AGUA. MEJORES DECISIONES.')
c.setFont('Big', 24)
c.setFillColorRGB(*MUT)
c.drawString(56, 132, 'UN POSTE A LA VEZ.')
mono(c, 'CONTACTO · CONTRERAS.SMA@GMAIL.COM', 56, 96, 7.5, ACC, bold=True)
mono(c, 'REPOSITORIO DE DISEÑO AUDITABLE · METODO FOTO3D · CAPA USER', 56, 82, 6, MUT)
xb = 56
for tag in ['EN ISO 1452', 'ISO 3601', 'DIN 912 A4', 'OMM Nº 8', 'IEC 61076', 'LORAWAN']:
    wch = mono_w(tag, 6) + 14
    c.setStrokeColorRGB(*EDGE)
    c.roundRect(xb, 52, wch, 14, 7, stroke=1, fill=0)
    mono(c, tag, xb + 7, 56, 6, MUT)
    xb += wch + 7
foot(c, 6, 'LA RUTA')
c.showPage()

c.save()
print(f'OK {OUT} ({os.path.getsize(OUT) // 1024} KB, 6 láminas)')
