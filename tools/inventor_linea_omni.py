#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
inventor_linea_omni.py — Modelo GENERAL en Inventor de la linea LINEA-OMNI-01:

  mesa de omniwheels (justifica al costado derecho) -> twin belt con camara inferior
  -> acelerador -> omniwheel de esquina (giro 90 grados) -> cinta plana -> cinta de
  elevacion, todo dentro de un gabinete al estilo de la Selladora UNITEC.

Convencion igual a la del modelo de la Selladora UNITEC: X = flujo, Y = transversal
(0 = eje de linea, operador en -Y), Z = arriba (piso 0); piezas por grupo en Piezas\\,
subensambles en Subensambles\\ y lista en LISTA_DE_ELEMENTOS.md.

Medidas en projects/LINEA-OMNI-01/parametros_linea.json.

Uso:  python tools/inventor_linea_omni.py --instancia-propia [--sin-planos]
"""
import os, json, math, time, argparse, traceback
import pythoncom
import win32com.client as w
from win32com.client import gencache, CastTo
from lib_alu import Alu
from lib_color import Pintor

import sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(HERE)
PARAM = os.path.join(ROOT, 'projects', 'LINEA-OMNI-01', 'parametros_linea.json')
OUT_DEFAULT = r"C:\Users\scont\Documents\Inventor\LINEA-OMNI-01"
K = None


def cm(v):
    return v / 10.0


def conectar(propia=True):
    if propia:
        print('iniciando instancia propia de Inventor...')
        crudo = w.DispatchEx('Inventor.Application')
        app = gencache.EnsureDispatch(crudo._oleobj_.QueryInterface(pythoncom.IID_IDispatch))
        for _ in range(120):
            try:
                if app.Ready:
                    break
            except Exception:
                pass
            time.sleep(2)
        app.Visible = False
        app.SilentOperation = True
        print('Inventor:', app.SoftwareVersion.DisplayName)
        return app, True
    disp = pythoncom.GetActiveObject('Inventor.Application').QueryInterface(pythoncom.IID_IDispatch)
    app = gencache.EnsureDispatch(disp)
    if app.Documents.VisibleDocuments.Count:
        raise SystemExit('hay documentos del usuario abiertos: usa --instancia-propia')
    return app, False


class Constructor:
    """Mismas primitivas que el script de la Selladora UNITEC (Caja, Cil, CajaRedonda)."""

    def __init__(self, app, out):
        self.app, self.out = app, out
        self.tg = app.TransientGeometry
        self.tpl = app.FileManager.GetTemplateFile(K.kPartDocumentObject)
        self.tpl_asm = app.FileManager.GetTemplateFile(K.kAssemblyDocumentObject)
        tp = app.DesignProjectManager.ActiveDesignProject.TemplatesPath
        self.tpl_drw = os.path.join(tp, 'Standard.idw')
        self.piezas = {}
        self.grupos = {}
        self.log = []
        self.doc = None
        self.cd = None
        self.pintor = Pintor(app)
        self._color = None
        self._nuevo = False

    # ---- primitivas -------------------------------------------------------
    def _plano(self, eje, off):
        i = {'x': 1, 'y': 2, 'z': 3}[eje]
        wp = self.cd.WorkPlanes.AddByPlaneAndOffset(self.cd.WorkPlanes.Item(i), cm(off))
        wp.Visible = False
        return wp

    def _pt(self, sk, x, y, z):
        return sk.ModelToSketchSpace(self.tg.CreatePoint(cm(x), cm(y), cm(z)))

    def color(self, nombre):
        """Cambia el color de lo que se modele a partir de aqui (cuerpo nuevo)."""
        self._color, self._nuevo = nombre, True

    def _extruir(self, sk, largo, op='join'):
        prof = sk.Profiles.AddForSolid()
        if op == 'cut':
            oper = K.kCutOperation
        elif self._nuevo or not self.cd.SurfaceBodies.Count:
            oper, self._nuevo = K.kNewBodyOperation, False
        else:
            oper = K.kJoinOperation
        n0 = self.cd.SurfaceBodies.Count
        ed = self.cd.Features.ExtrudeFeatures.CreateExtrudeDefinition(prof, oper)
        ed.SetDistanceExtent(cm(abs(largo)),
                             K.kNegativeExtentDirection if largo < 0 else K.kPositiveExtentDirection)
        f = self.cd.Features.ExtrudeFeatures.Add(ed)
        sk.Visible = False
        if self._color:
            for i in range(n0 + 1, self.cd.SurfaceBodies.Count + 1):
                self.pintor.pintar(self.doc, self.cd.SurfaceBodies.Item(i), self._color)
        return f

    def caja(self, x0, y0, z0, dx, dy, dz, op='join'):
        sk = self.cd.Sketches.Add(self._plano('z', z0))
        sk.SketchLines.AddAsTwoPointRectangle(self._pt(sk, x0, y0, z0), self._pt(sk, x0 + dx, y0 + dy, z0))
        return self._extruir(sk, dz, op)

    def cil(self, eje, c, dia, largo, op='join'):
        sk = self.cd.Sketches.Add(self._plano(eje, c[{'x': 0, 'y': 1, 'z': 2}[eje]]))
        sk.SketchCircles.AddByCenterRadius(self._pt(sk, *c), cm(dia / 2))
        return self._extruir(sk, largo, op)

    def caja_redonda(self, x0, y0, z0, dx, dy, dz, r, op='join'):
        """Prisma con las 4 aristas verticales redondeadas (capotas y esquinas curvas)."""
        sk = self.cd.Sketches.Add(self._plano('z', z0))
        P = lambda x, y: self._pt(sk, x, y, z0)
        x1, y1 = x0 + dx, y0 + dy
        c = 0.29289 * r
        l1 = sk.SketchLines.AddByTwoPoints(P(x0 + r, y0), P(x1 - r, y0))
        a1 = sk.SketchArcs.AddByThreePoints(l1.EndSketchPoint, P(x1 - c, y0 + c), P(x1, y0 + r))
        l2 = sk.SketchLines.AddByTwoPoints(a1.EndSketchPoint, P(x1, y1 - r))
        a2 = sk.SketchArcs.AddByThreePoints(l2.EndSketchPoint, P(x1 - c, y1 - c), P(x1 - r, y1))
        l3 = sk.SketchLines.AddByTwoPoints(a2.EndSketchPoint, P(x0 + r, y1))
        a3 = sk.SketchArcs.AddByThreePoints(l3.EndSketchPoint, P(x0 + c, y1 - c), P(x0, y1 - r))
        l4 = sk.SketchLines.AddByTwoPoints(a3.EndSketchPoint, P(x0, y0 + r))
        sk.SketchArcs.AddByThreePoints(l4.EndSketchPoint, P(x0 + c, y0 + c), l1.StartSketchPoint)
        return self._extruir(sk, dz, op)

    def alu(self):
        """Biblioteca de aluminio y ferreteria (lib_alu) sobre estas primitivas."""
        return Alu(lambda c, d, op='join': self.caja(c[0] - d[0] / 2, c[1] - d[1] / 2,
                                                     c[2] - d[2] / 2, d[0], d[1], d[2], op),
                   lambda eje, c0, dia, largo, op='join': self.cil(eje, c0, dia, largo, op))

    # ---- piezas -----------------------------------------------------------
    def nueva(self, nombre, grupo, color=None):
        self.doc = CastTo(self.app.Documents.Add(K.kPartDocumentObject, self.tpl, False), 'PartDocument')
        self.cd = self.doc.ComponentDefinition
        self._nombre, self._grupo = nombre, grupo
        self._color, self._nuevo = color, False

    def guardar(self, descripcion=''):
        nombre, grupo = self._nombre, self._grupo
        try:
            dt = self.doc.PropertySets.Item('Design Tracking Properties')
            dt.Item('Part Number').Value = nombre
            dt.Item('Description').Value = (descripcion or grupo)[:120]
            dt.Item('Project').Value = 'LINEA-OMNI-01 · Conveyone'
        except Exception as e:
            self.log.append(f'{nombre}: iProperties {e}')
        carpeta = os.path.join(self.out, 'Piezas')
        os.makedirs(carpeta, exist_ok=True)
        ruta = os.path.join(carpeta, nombre + '.ipt')
        if os.path.exists(ruta):
            os.remove(ruta)
        self.doc.SaveAs(ruta, False)
        self.doc.Close(True)
        self.piezas[nombre] = ruta
        self.grupos.setdefault(grupo, []).append((nombre, descripcion))
        return ruta


# =====================================================================
# Modulos de la linea
# =====================================================================
def bastidor(c, x0, largo, ancho, ztop, nombre, grupo, patas=True, color='GrisMedio', frame=None):
    """Bastidor con la seccion del ZP2026: laterales de 190 x 38 (LT_G), travesanos en
    C 71x38 (B_002A) y patas de columna 77x38 (SOLID_06). El ancho exterior estandar es
    24 in (609,6) y el util 21 in (533,4)."""
    f = frame or {'lateral': {'alto': 190, 'espesor': 38}, 'travesano': {'seccion': [71, 38]},
                  'columna_pata': {'seccion': [77, 38]}}
    la, le = f['lateral']['alto'], f['lateral']['espesor']
    c.nueva(nombre, grupo, color)
    c.color(color)
    # laterales (cara interior a ancho_util/2)
    for s in (-1, 1):
        y = s * (ancho / 2 - le)
        c.caja(x0, min(y, y + s * le), ztop - la, largo, le, la)
    # travesanos en C bajo el plano de trabajo
    tv = f['travesano']['seccion']
    for i in range(3):
        xt = x0 + 80 + i * (largo - 160) / 2
        c.caja(xt - tv[0] / 2, -(ancho / 2 - le), ztop - la + 20, tv[0], 2 * (ancho / 2 - le), tv[1])
    if patas:
        cp = f['columna_pata']['seccion']
        for sx in (0, 1):
            for s in (-1, 1):
                x = x0 + 120 + sx * (largo - 240)
                y = s * (ancho / 2 - le / 2)
                c.caja(x - cp[0] / 2, y - cp[1] / 2, 0, cp[0], cp[1], ztop - la)
                c.caja(x - 80, y - 40, 0, 160, 80, 10)
    return c.guardar(f'Bastidor {nombre}: laterales {la}x{le}, travesanos C {tv[0]}x{tv[1]} y patas (frame ZP2026)')


def modulo_banda(c, x0, largo, ancho, ztop, nombre, grupo, esp=5):
    c.nueva(nombre, grupo, 'Azul')
    c.color('Azul')
    c.caja(x0, -ancho / 2, ztop - esp, largo, ancho, esp)
    return c.guardar(f'Banda {ancho} x {largo}')


def tambores(c, x0, largo, ancho, ztop, nombre, grupo, dia=80):
    c.nueva(nombre, grupo, 'AceroPulido')
    c.color('AceroPulido')
    for x in (x0 + dia / 2, x0 + largo - dia / 2):
        c.cil('y', [x, -ancho / 2, ztop - dia / 2], dia, ancho)
    return c.guardar('Tambores de entrada y salida')


def construir(c, P):
    A = P['altura_trabajo']
    F = P.get('frame_estandar')
    mesa, twin, ace = P['mesa_omni'], P['twin_belt'], P['acelerador']
    esq, plana, elev = P['omni_esquina'], P['cinta_plana'], P['cinta_elevacion']
    gab = P['gabinete']

    # --------- 1) mesa de omniwheels (justifica al costado derecho) ---------
    x0 = 0
    bastidor(c, x0, mesa['largo'], mesa['ancho'], A, 'MESA_OMNI_bastidor', 'Mesa de omniwheels', frame=F)
    c.nueva('MESA_OMNI_tapa_inox', 'Mesa de omniwheels', 'Inox')
    c.caja(x0, -mesa['ancho'] / 2, A - 8, mesa['largo'], mesa['ancho'], 3)
    c.guardar('Tapa inox 3 mm con colisas para las ruedas')
    n = int(mesa['largo'] / mesa['paso_ejes'])
    c.nueva('MESA_OMNI_ruedas', 'Mesa de omniwheels', 'Caucho')
    for i in range(n):
        x = x0 + 60 + i * mesa['paso_ejes']
        for j in range(5):
            y = -mesa['ancho'] / 2 + 90 + j * (mesa['ancho'] - 180) / 4
            c.cil('y', [x, y - 25, A - mesa['rueda_dia'] / 2 + mesa['rueda_asoma']],
                  mesa['rueda_dia'], 50)
    c.guardar(f"Ruedas omni a {mesa['angulo_ruedas_deg']} grados ({n} filas x 5) que empujan la caja al costado derecho")
    c.nueva('MESA_OMNI_guia_justificado', 'Mesa de omniwheels', 'Inox')
    c.caja(x0, mesa['ancho'] / 2 - 20, A, mesa['largo'], 12, 120)
    c.guardar('Guia de justificado (tope del costado derecho)')

    # --------- 2) twin belt con camara inferior ---------
    x1 = x0 + mesa['largo'] + 40
    bastidor(c, x1, twin['largo'], twin['ancho_bastidor'], A, 'TWIN_bastidor', 'Twin belt M-Haste')
    yb = twin['luz_central'] / 2 + twin['banda_ancho'] / 2
    c.nueva('TWIN_bandas', 'Twin belt M-Haste', 'Azul')
    for s in (-1, 1):
        c.caja(x1, s * yb - twin['banda_ancho'] / 2, A - twin['banda_espesor'],
               twin['largo'], twin['banda_ancho'], twin['banda_espesor'])
    c.guardar(f"Dos bandas de {twin['banda_ancho']} mm con luz central de {twin['luz_central']} mm")
    tambores(c, x1, twin['largo'], twin['ancho_bastidor'] - 60, A, 'TWIN_tambores', 'Twin belt M-Haste')
    cam = twin['camara']
    c.nueva('TWIN_camara_inferior', 'Twin belt M-Haste', 'NegroMate')
    zc = A - cam['z_bajo_banda']
    c.caja(x1 + twin['largo'] / 2 - cam['cuerpo'][0] / 2, -cam['cuerpo'][1] / 2, zc,
           cam['cuerpo'][0], cam['cuerpo'][1], cam['cuerpo'][2])
    c.cil('z', [x1 + twin['largo'] / 2, 0, zc + cam['cuerpo'][2]], cam['lente'][0], cam['lente'][2])
    c.guardar('Camara bajo la luz central del twin belt, mirando hacia arriba')
    c.nueva('TWIN_soporte_camara', 'Twin belt M-Haste', 'Aluminio')
    c.caja(x1 + twin['largo'] / 2 - 150, -150, zc - 12, 300, 300, 12)
    for s in (-1, 1):
        c.caja(x1 + twin['largo'] / 2 - 150, s * 140 - 6, zc - 12, 20, 12, A - 120 - zc)
    c.guardar('Soporte regulable de la camara')

    # --------- 3) acelerador ---------
    x2 = x1 + twin['largo'] + 40
    bastidor(c, x2, ace['largo'], ace['ancho'], A, 'ACEL_bastidor', 'Acelerador')
    modulo_banda(c, x2, ace['largo'], ace['ancho'] - 40, A, 'ACEL_banda', 'Acelerador')
    tambores(c, x2, ace['largo'], ace['ancho'] - 60, A, 'ACEL_tambores', 'Acelerador')
    c.nueva('ACEL_motorreductor', 'Acelerador', 'GrisOscuro')
    c.caja(x2 + ace['largo'] - 120, ace['ancho'] / 2, A - 200, 200, 160, 160)
    c.guardar('Motorreductor del acelerador')

    # --------- 4) omniwheel de esquina (giro 90 grados) ---------
    x3 = x2 + ace['largo'] + 40
    bastidor(c, x3, esq['largo'], esq['ancho'], A, 'ESQ_bastidor', 'Omni de esquina', frame=F)
    c.nueva('ESQ_tapa_inox', 'Omni de esquina', 'Inox')
    c.caja(x3, -esq['ancho'] / 2, A - 8, esq['largo'], esq['ancho'], 3)
    c.guardar('Tapa inox con colisas del modulo de giro')
    c.nueva('ESQ_ruedas', 'Omni de esquina', 'Caucho')
    nf = int(esq['largo'] / esq['paso_ejes'])
    for i in range(nf):
        x = x3 + 50 + i * esq['paso_ejes']
        for j in range(6):
            y = -esq['ancho'] / 2 + 60 + j * (esq['ancho'] - 120) / 5
            c.cil('y', [x, y - 25, A - esq['rueda_dia'] / 2 + 5], esq['rueda_dia'], 50)
    c.guardar('Ruedas omni del modulo de esquina: giran la caja 90 grados y la sacan hacia +Y')

    # --------- 5) cinta plana (sale hacia +Y) ---------
    yc = esq['ancho'] / 2 + 40
    c.nueva('PLANA_bastidor', 'Cinta plana', 'GrisMedio')
    esp, alto = (F['lateral']['espesor'], F['lateral']['alto']) if F else (6, 120)
    for s in (-1, 1):
        x = x3 + esq['largo'] / 2 + s * (plana['ancho'] / 2 - esp / 2)
        c.caja(x - esp / 2, yc, A - alto, esp, plana['largo'], alto)
    for sy in (0, 1):
        for s in (-1, 1):
            xx = x3 + esq['largo'] / 2 + s * (plana['ancho'] / 2 - 40)
            yy = yc + 80 + sy * (plana['largo'] - 160)
            c.caja(xx - 38, yy - 19, 0, 77, 38, A - alto)
            c.caja(xx - 60, yy - 60, 0, 120, 120, 10)
    c.guardar('Bastidor de la cinta plana (flujo transversal, hacia +Y)')
    c.nueva('PLANA_banda', 'Cinta plana', 'Azul')
    c.caja(x3 + esq['largo'] / 2 - (plana['ancho'] - 40) / 2, yc, A - 5, plana['ancho'] - 40, plana['largo'], 5)
    c.guardar(f"Banda plana {plana['ancho']} x {plana['largo']}")

    # --------- 6) cinta de elevacion ---------
    y2 = yc + plana['largo'] + 40
    ang = math.radians(elev['angulo_deg'])
    c.nueva('ELEV_bastidor', 'Cinta de elevacion', 'GrisMedio')
    le = F['lateral']['espesor'] if F else 6
    la = F['lateral']['alto'] if F else 120
    for s in (-1, 1):
        x = x3 + esq['largo'] / 2 + s * (elev['ancho'] / 2 - le / 2)
        c.caja(x - le / 2, y2, A - la, le, elev['largo'], la)
    for sy in (0, 1):
        for s in (-1, 1):
            xx = x3 + esq['largo'] / 2 + s * (elev['ancho'] / 2 - 40)
            yy = y2 + 100 + sy * (elev['largo'] - 200)
            h = A - la + sy * (elev['altura_salida'] - A)
            c.caja(xx - 30, yy - 30, 0, 60, 60, h)
            c.caja(xx - 60, yy - 60, 0, 120, 120, 10)
    c.guardar('Bastidor inclinado de la cinta de elevacion')
    c.nueva('ELEV_banda', 'Cinta de elevacion', 'Azul')
    c.caja(x3 + esq['largo'] / 2 - (elev['ancho'] - 40) / 2, y2, A - 5, elev['ancho'] - 40, elev['largo'], 5)
    c.guardar(f"Banda de elevacion {elev['ancho']} x {elev['largo']} (sube a {elev['altura_salida']})")

    # --------- 7) gabinete de vision estilo Selladora UNITEC ---------
    a = c.alu()
    SEC = tuple(gab['perfil']['seccion'])          # PG40 40x80
    L, W, H = gab['largo'], gab['ancho'], gab['alto']
    gx = x1 - 150 + L / 2
    paso, prot = gab['paso_transportador'], gab['protuberancia']
    pu, ch = gab['puertas'], gab['chapa']
    tp = ch['paneles']
    xm = [gx - L / 2 + SEC[1] / 2, gx, gx + L / 2 - SEC[1] / 2]
    yl = W / 2 - SEC[0] / 2                        # eje de los montantes en Y

    # --- portico de perfil PG40 ---
    c.nueva('GAB_montantes_PG40', 'Gabinete', 'Aluminio')
    for x in xm:
        for sy in (-1, 1):
            a.pg40('z', [x, sy * yl, H / 2], H, (SEC[1], SEC[0]))
    c.guardar(f"6 montantes de perfil PG40 {SEC[0]}x{SEC[1]} (ranura 8), H={H}")

    c.nueva('GAB_anillos_PG40', 'Gabinete', 'Aluminio')
    for z in gab['anillos_z']:
        for sy in (-1, 1):
            a.pg40('x', [gx, sy * yl, z], L - 2 * SEC[1], (SEC[0], SEC[1]))
        for x in (xm[0], xm[2]):
            a.pg40('y', [x, 0, z], W - 2 * SEC[0], (SEC[1], SEC[0]))
    c.guardar(f"Anillos de PG40 en 3 niveles ({', '.join(str(z) for z in gab['anillos_z'])})")

    c.nueva('GAB_escuadras', 'Gabinete', 'AluminioAnod')
    for x in xm:
        for sy in (-1, 1):
            for z in gab['anillos_z']:
                a.escuadra('xz', [x + SEC[1] / 2, sy * yl, z - SEC[1] / 2], 40, 8, 38, (1, -1))
    c.guardar('Escuadras de union PG40 con tornillo avellanado M8 y tuerca martillo')

    c.nueva('GAB_tornilleria', 'Gabinete', 'Zinc')
    for x in xm:
        for sy in (-1, 1):
            for z in gab['anillos_z']:
                for dz in (-20, 20):
                    a.avellanado('x', [x + SEC[1] / 2 + 9, sy * yl, z + dz], 8, 22, -1)
    c.guardar('Tornillos avellanados M8 x 22 DIN 7991 de los nudos del portico')

    c.nueva('GAB_patas', 'Gabinete', 'Zinc')
    for x in (xm[0], xm[2]):
        for sy in (-1, 1):
            a.pata_niveladora([x, sy * yl, 0], 80, 12, 16, 80)
    c.guardar('4 patas niveladoras M16 con plato de 80')

    # --- paneles de inox plegado ---
    c.nueva('GAB_panel_trasero', 'Gabinete', 'Inox')
    a.chapa_vertical('y', [gx, W / 2 - tp / 2, H / 2 + 45], (L - 40, H - 130), tp, ('-', '+'), 30)
    c.color('InoxSatinado')
    for i in range(6):                                     # rejillas de ventilacion
        for j in range(10):
            c.caja(gx - 420 + i * 150, W / 2 - tp - 1, 300 + j * 26, 110, tp + 3, 12, 'cut')
    c.guardar(f"Panel trasero de inox {tp} plegado, con rejillas de ventilacion")

    for lado, sx in (('entrada', -1), ('salida', 1)):
        c.nueva(f'GAB_panel_{lado}', 'Gabinete', 'Inox')
        a.chapa_vertical('x', [gx + sx * (L / 2 - tp / 2), 0, H / 2 + 45], (W - 40, H - 130), tp,
                         ('-', '+'), 30)
        c.caja(gx + sx * (L / 2) - 20, -paso['ancho'] / 2,
               paso['z_centro'] - paso['alto'] / 2, 40, paso['ancho'], paso['alto'], 'cut')
        c.guardar(f"Panel de {lado} de inox {tp} con el paso del transportador "
                  f"({paso['ancho']} x {paso['alto']})")

    # --- puertas con ventana, bisagras, manilla y cierre ---
    for i in range(pu['cantidad']):
        xd = gx - L / 2 + 120 + i * (pu['ancho'] + 80) + pu['ancho'] / 2
        zd = pu['z_centro']
        ven = pu['ventana']
        c.nueva(f'GAB_puerta_{i + 1}', 'Gabinete', 'Inox')
        a.chapa_vertical('y', [xd, -W / 2 + ch['puertas'] / 2, zd], (pu['ancho'], pu['alto']),
                         ch['puertas'], ('-', '+'), 25)
        c.caja(xd - ven['ancho'] / 2, -W / 2 - 4, zd - ven['alto'] / 2,
               ven['ancho'], ch['puertas'] + 8, ven['alto'], 'cut')
        c.color('Policarbonato')
        c.caja(xd - ven['ancho'] / 2 - 20, -W / 2 + ch['puertas'], zd - ven['alto'] / 2 - 20,
               ven['ancho'] + 40, 6, ven['alto'] + 40)
        c.guardar(f"Puerta {i + 1} de inox {ch['puertas']} plegado, {pu['ancho']} x {pu['alto']}, "
                  f"con ventana de policarbonato de {ven['ancho']} x {ven['alto']}")
        c.nueva(f'GAB_puerta_{i + 1}_herrajes', 'Gabinete', 'Inox')
        for dz in (-pu['alto'] / 2 + 110, 0, pu['alto'] / 2 - 110):
            c.caja(xd - pu['ancho'] / 2 - 10, -W / 2 - 12, zd + dz - 40, 30, 14, 80)
        c.color('Aluminio')
        a.manilla('y', [xd + pu['ancho'] / 2 - 140, -W / 2 - 6, zd], 160, 55, 18, 30)
        c.color('Zinc')
        c.cil('y', [xd + pu['ancho'] / 2 - 45, -W / 2 - 14, zd], 22, 20)
        c.guardar(f"Herrajes de la puerta {i + 1}: 3 bisagras, manilla de 160 y cierre de llave")

    # --- protuberancia: banda alta del lado operador ---
    c.nueva('GAB_protuberancia', 'Gabinete', 'Inox')
    px, pz = gx, prot['z_centro']
    py0 = -W / 2 - prot['ancho']
    lp = L - 2 * SEC[1] - 80
    c.caja(px - lp / 2, py0, pz - prot['alto'] / 2, lp, tp, prot['alto'])
    for sx in (-1, 1):
        c.caja(px + sx * (lp / 2 - tp), py0, pz - prot['alto'] / 2, tp, prot['ancho'], prot['alto'])
    c.caja_redonda(px - lp / 2, py0, pz + prot['alto'] / 2, lp, prot['ancho'], 25, 50)
    c.caja(px - lp / 2, py0, pz - prot['alto'] / 2 - 25, lp, prot['ancho'], 25)
    c.guardar(f"Protuberancia de {lp} x {prot['ancho']} x {prot['alto']} en la franja alta del "
              f"lado operador: aloja {prot['para']}")

    c.nueva('GAB_botonera', 'Gabinete', 'Negro')
    c.caja(px - 260, py0 - 6, pz - 90, 520, 8, 180)
    c.color('Verde')
    c.cil('y', [px - 180, py0 - 24, pz], 34, 20)
    c.color('Rojo')
    c.cil('y', [px - 90, py0 - 26, pz], 44, 22)
    c.color('Amarillo')
    c.cil('y', [px, py0 - 24, pz], 34, 20)
    c.color('NegroMate')
    c.cil('y', [px + 120, py0 - 24, pz], 60, 22)
    c.guardar('Botonera de la protuberancia: marcha, seta de emergencia, rearme e interruptor general')

    # --- capota curva ---
    c.nueva('GAB_capota', 'Gabinete', 'Inox')
    c.caja_redonda(gx - L / 2 - 20, -W / 2 - 20, H - 40, L + 40, W + 40, 40, gab['radio_esquina'])
    c.guardar(f"Capota superior de inox {ch['capota']} con esquinas de radio {gab['radio_esquina']}")

    # --- accesorios ---
    c.nueva('GAB_baliza', 'Gabinete', 'GrisOscuro')
    c.cil('z', [gx - L / 2 + 220, W / 2 - 180, H], 80, 40)
    for col_, dz in (('Rojo', 40), ('Amarillo', 110), ('Verde', 180)):
        c.color(col_)
        c.cil('z', [gx - L / 2 + 220, W / 2 - 180, H + dz], 70, 70)
    c.guardar('Baliza luminosa de 3 colores sobre la capota')

    c.nueva('GAB_instalacion', 'Gabinete', 'GrisClaro')
    a.canaleta('x', [gx, W / 2 - 130, 200], L - 320, 60, 60, 2)
    c.color('NegroMate')
    for dx in (-150, -60, 60, 150):
        a.prensaestopa('y', [gx + dx, W / 2 - tp, 260], 25, 26)
    c.color('BlancoMate')
    for sy in (-1, 1):                                     # tira LED sobre la zona de vision
        c.caja(gx - (L - 400) / 2, sy * (W / 2 - 90) - 15, H - 120, L - 400, 30, 16)
    c.guardar('Canaleta interior, prensaestopas del panel trasero y dos tiras LED sobre la zona de vision')


def ensamblar(c, P, ref):
    tg = c.tg
    asm = CastTo(c.app.Documents.Add(K.kAssemblyDocumentObject, c.tpl_asm, False), 'AssemblyDocument')
    acd = asm.ComponentDefinition
    n = 0
    for nombre, ruta in c.piezas.items():
        m = tg.CreateMatrix()
        occ = acd.Occurrences.Add(ruta, m)
        occ.Grounded = True
        n += 1
    try:
        dt = asm.PropertySets.Item('Design Tracking Properties')
        dt.Item('Part Number').Value = 'LINEA-OMNI-01'
        dt.Item('Description').Value = 'Linea: mesa omni, twin belt con camara, acelerador, giro 90, plana y elevacion'
        dt.Item('Project').Value = 'LINEA-OMNI-01 · Conveyone'
    except Exception as e:
        c.log.append(f'iProperties ensamble: {e}')
    ruta = os.path.join(c.out, 'LINEA-OMNI-01.iam')
    if os.path.exists(ruta):
        os.remove(ruta)
    asm.SaveAs(ruta, False)
    print(f'   iam LINEA-OMNI-01.iam ({n} piezas)')
    return asm, ruta


def plano_ga(c, asm, carpeta):
    tg = c.tg
    drw = CastTo(c.app.Documents.Add(K.kDrawingDocumentObject, c.tpl_drw, False), 'DrawingDocument')
    sh = drw.Sheets.Item(1)
    sh.Size = K.kA1DrawingSheetSize
    sh.Name = 'GA LINEA-OMNI-01'
    W, H = 84.1, 59.4
    try:
        planta = sh.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(30, 40), 0.05,
                                             K.kFrontViewOrientation, K.kHiddenLineRemovedDrawingViewStyle)
        drw.Update()
        planta.Name = 'PLANTA'
        planta.Center = tg.CreatePoint2d(4.0 + planta.Width / 2, H - 4.0 - planta.Height / 2)
        elev = sh.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(30, 18), 0.05,
                                           K.kBottomViewOrientation, K.kHiddenLineRemovedDrawingViewStyle)
        drw.Update()
        elev.Center = tg.CreatePoint2d(4.0 + elev.Width / 2, H - 8.0 - planta.Height - elev.Height / 2)
        iso = sh.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(W - 20, 14), 0.035,
                                          K.kIsoTopRightViewOrientation, K.kShadedDrawingViewStyle)
        drw.Update()
        iso.Center = tg.CreatePoint2d(W - 3.0 - iso.Width / 2, 4.0 + iso.Height / 2)
        sh.PartsLists.Add(planta, tg.CreatePoint2d(W - 1.0, H - 1.0))
        sh.DrawingNotes.GeneralNotes.AddFitted(tg.CreatePoint2d(2.0, 2.0),
            'LINEA-OMNI-01 · mesa de omniwheels (justifica a la derecha) · twin belt con camara inferior · '
            'acelerador · omni de esquina (giro 90) · cinta plana · cinta de elevacion · gabinete estilo Selladora UNITEC'
            + chr(10) + 'modelo GENERAL: cuerpos con las cotas de projects/LINEA-OMNI-01/parametros_linea.json')
    except Exception as e:
        c.log.append(f'GA: {e}')
    os.makedirs(carpeta, exist_ok=True)
    ruta = os.path.join(carpeta, 'LINEA-OMNI-GA-01.idw')
    if os.path.exists(ruta):
        os.remove(ruta)
    drw.SaveAs(ruta, False)
    print(f'   idw {os.path.basename(ruta)}')
    return drw, ruta


def lista_md(c, out, P):
    lin = ['# LINEA-OMNI-01 — lista de elementos', '',
           P['descripcion'], '',
           f"Convencion: {P['convencion']}", '',
           f"Total: {len(c.piezas)} piezas en {len(c.grupos)} grupos.", '']
    for g in sorted(c.grupos):
        lin.append(f'## {g} ({len(c.grupos[g])})')
        for nombre, desc in c.grupos[g]:
            lin.append(f'- **{nombre}** — {desc}')
        lin.append('')
    lin += ['## Pendientes de confirmar', '']
    lin += [f'{i+1}. {q}' for i, q in enumerate(P['pendientes_confirmar'])]
    open(os.path.join(out, 'LISTA_DE_ELEMENTOS.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lin) + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=OUT_DEFAULT)
    ap.add_argument('--instancia-propia', action='store_true')
    ap.add_argument('--sin-planos', action='store_true')
    ap.add_argument('--param', default=PARAM, help='JSON de parametros (por defecto LINEA-OMNI-01)')
    args = ap.parse_args()
    P = json.load(open(args.param, encoding='utf-8'))
    app, propia = conectar(args.instancia_propia)
    global K
    from win32com.client import constants as K2
    K = K2
    os.makedirs(args.out, exist_ok=True)
    t0 = time.time()
    c = Constructor(app, args.out)
    try:
        ref = construir(c, P)
        print(f'   {len(c.piezas)} piezas')
        asm, _ = ensamblar(c, P, ref)
        if not args.sin_planos:
            drw, rdrw = plano_ga(c, asm, os.path.join(args.out, 'Planos'))
            try:
                addin = None
                for i in range(1, app.ApplicationAddIns.Count + 1):
                    a = app.ApplicationAddIns.Item(i)
                    if a.ClassIdString.upper() == '{0AC6FD96-2F4D-42CE-8BE0-8AEA580399E4}':
                        addin = CastTo(a, 'TranslatorAddIn')
                if addin:
                    if not addin.Activated:
                        addin.Activate()
                    ctx = app.TransientObjects.CreateTranslationContext(); ctx.Type = K.kFileBrowseIOMechanism
                    opts = app.TransientObjects.CreateNameValueMap()
                    if addin.HasSaveCopyAsOptions(drw, ctx, opts):
                        opts.SetValue('Vector_Resolution', 400)
                        opts.SetValue('Sheet_Range', 14082)
                    dm = app.TransientObjects.CreateDataMedium()
                    dm.FileName = os.path.splitext(rdrw)[0] + '.pdf'
                    if os.path.exists(dm.FileName):
                        os.remove(dm.FileName)
                    addin.SaveCopyAs(drw, ctx, opts, dm)
                    print('   pdf LINEA-OMNI-GA-01.pdf')
            except Exception as e:
                c.log.append(f'pdf: {e}')
            drw.Close(True)
        asm.Close(True)
        lista_md(c, args.out, P)
    except Exception:
        traceback.print_exc()
    print(f'\n{len(c.piezas)} piezas · {round(time.time() - t0)} s')
    if c.log:
        print('Avisos:')
        for l in c.log[:25]:
            print('  -', l)
    if propia:
        app.Quit()


if __name__ == '__main__':
    main()
