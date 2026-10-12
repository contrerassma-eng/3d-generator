#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
inventor_nolabel.py — Modela en Autodesk Inventor el MÓDULO NOLABEL (NOLABEL-01):
cabezal NoLabel, caja de insumos, placa principal, 3 secadores UV Phoseon FireJet
inclinados con sus 3 fuentes externas de 48 V, pantalla y caja eléctrica, montados
sobre una ESTRUCTURA FIJA (reemplaza el soporte regulable de husillo).

Las medidas salen de projects/NOLABEL-01/parametros_nolabel.json (fotos con huincha
del 2026-09-09 y placas de los equipos). Cambiar ese archivo y volver a correr.

Uso (Windows, Inventor 2027):
    python tools/inventor_nolabel.py --instancia-propia [--sin-planos]

Salida: Inventor\\Bandas Modulares\\..\\NOLABEL-01\\ (piezas .ipt, NOLABEL-01.iam,
planos .idw + PDF). Unidades: el JSON está en mm; la API de Inventor trabaja en cm.
"""
import os, sys, json, math, time, argparse, traceback
import pythoncom
import win32com.client as w
from win32com.client import gencache, CastTo
from lib_alu import Alu
from lib_color import Pintor

import sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(HERE)
PARAM = os.path.join(ROOT, 'projects', 'NOLABEL-01', 'parametros_nolabel.json')
OUT_DEFAULT = r"C:\Users\scont\OneDrive\Documentos\Inventor\NOLABEL-01"
K = None


def cm(v):
    return v / 10.0


def conectar(propia=True):
    """Instancia propia de Inventor (no toca la sesión del usuario)."""
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
        raise SystemExit('hay documentos abiertos del usuario: usa --instancia-propia')
    return app, False


class Modelo:
    def __init__(self, app, out, par):
        self.app, self.out, self.par = app, out, par
        self.tg = app.TransientGeometry
        self.tpl = app.FileManager.GetTemplateFile(K.kPartDocumentObject)
        self.tpl_asm = app.FileManager.GetTemplateFile(K.kAssemblyDocumentObject)
        tp = app.DesignProjectManager.ActiveDesignProject.TemplatesPath
        self.tpl_drw = os.path.join(tp, 'Standard.idw')
        self.log = []
        self.piezas = {}
        self.pintor = Pintor(app)
        self._color = None
        self._nuevo = False

    # ---------------- utilidades de modelado ----------------
    def _plano(self, cd, eje, off):
        base = {'x': cd.WorkPlanes.Item(1), 'y': cd.WorkPlanes.Item(2), 'z': cd.WorkPlanes.Item(3)}[eje]
        wp = cd.WorkPlanes.AddByPlaneAndOffset(base, cm(off))
        wp.Visible = False
        return wp

    def _pt(self, sk, x, y, z):
        return sk.ModelToSketchSpace(self.tg.CreatePoint(cm(x), cm(y), cm(z)))

    def color(self, nombre):
        """Cambia el color de lo que se modele a partir de aqui (cuerpo nuevo)."""
        self._color, self._nuevo = nombre, True

    def _oper(self, cd, op):
        if op == 'cut':
            return K.kCutOperation
        if self._nuevo or not cd.SurfaceBodies.Count:
            self._nuevo = False
            return K.kNewBodyOperation
        return K.kJoinOperation

    def _pintar(self, cd, n0):
        if not self._color:
            return
        doc = cd.Document
        for i in range(n0 + 1, cd.SurfaceBodies.Count + 1):
            self.pintor.pintar(doc, cd.SurfaceBodies.Item(i), self._color)

    def _caja(self, cd, c, d, op='join'):
        """Caja centrada en c=[x,y,z] con dimensiones d=[dx,dy,dz] (mm)."""
        wp = self._plano(cd, 'z', c[2] - d[2] / 2)
        sk = cd.Sketches.Add(wp)
        a = self._pt(sk, c[0] - d[0] / 2, c[1] - d[1] / 2, c[2] - d[2] / 2)
        b = self._pt(sk, c[0] + d[0] / 2, c[1] + d[1] / 2, c[2] - d[2] / 2)
        sk.SketchLines.AddAsTwoPointRectangle(a, b)
        prof = sk.Profiles.AddForSolid()
        n0 = cd.SurfaceBodies.Count
        ed = cd.Features.ExtrudeFeatures.CreateExtrudeDefinition(prof, self._oper(cd, op))
        ed.SetDistanceExtent(cm(d[2]), K.kPositiveExtentDirection)
        f = cd.Features.ExtrudeFeatures.Add(ed)
        sk.Visible = False
        self._pintar(cd, n0)
        return f

    def _tubo(self, cd, c, d, t, eje='z'):
        """Tubo rectangular: exterior d=[dx,dy,dz] con pared t (mm), a lo largo de `eje`."""
        self._caja(cd, c, d)
        hueco = list(d)
        i = {'x': 0, 'y': 1, 'z': 2}[eje]
        for j in range(3):
            hueco[j] = d[j] - 2 * t if j != i else d[j] + 4
        self._caja(cd, c, hueco, 'cut')

    def _cil(self, cd, eje, c0, dia, largo, op='join'):
        """Cilindro que arranca en c0 y avanza `largo` (con signo) sobre `eje`."""
        i = {'x': 0, 'y': 1, 'z': 2}[eje]
        wp = self._plano(cd, eje, c0[i])
        sk = cd.Sketches.Add(wp)
        sk.SketchCircles.AddByCenterRadius(self._pt(sk, *c0), cm(dia / 2))
        prof = sk.Profiles.AddForSolid()
        n0 = cd.SurfaceBodies.Count
        ed = cd.Features.ExtrudeFeatures.CreateExtrudeDefinition(prof, self._oper(cd, op))
        ed.SetDistanceExtent(cm(abs(largo)),
                             K.kNegativeExtentDirection if largo < 0 else K.kPositiveExtentDirection)
        f = cd.Features.ExtrudeFeatures.Add(ed)
        sk.Visible = False
        self._pintar(cd, n0)
        return f

    def alu(self, cd):
        """Biblioteca de aluminio y ferreteria enganchada a este documento."""
        return Alu(lambda c, d, op='join': self._caja(cd, c, d, op),
                   lambda eje, c0, dia, largo, op='join': self._cil(cd, eje, c0, dia, largo, op))

    def pieza(self, nombre, carpeta, construir, descripcion, material='Acero'):
        ruta = os.path.join(self.out, carpeta, nombre + '.ipt')
        os.makedirs(os.path.dirname(ruta), exist_ok=True)
        doc = CastTo(self.app.Documents.Add(K.kPartDocumentObject, self.tpl, False), 'PartDocument')
        cd = doc.ComponentDefinition
        self._color, self._nuevo = material, False
        try:
            construir(cd)
        except Exception as e:
            self.log.append(f'{nombre}: {e}')
            traceback.print_exc()
        try:
            dt = doc.PropertySets.Item('Design Tracking Properties')
            dt.Item('Part Number').Value = nombre
            dt.Item('Description').Value = descripcion[:120]
            dt.Item('Project').Value = 'NOLABEL-01 · Conveyone'
        except Exception as e:
            self.log.append(f'{nombre}: iProperties {e}')
        if os.path.exists(ruta):
            os.remove(ruta)
        doc.SaveAs(ruta, False)
        doc.Close(True)
        self.piezas[nombre] = ruta
        print(f'   ipt {os.path.relpath(ruta, self.out)}')
        return ruta


def construir_todo(m, par):
    P = par
    sec, fu = P['secador'], P['fuente_secador']
    cab, ins = P['cabezal_nolabel'], P['caja_insumos']
    pla, pan = P['placa_principal'], P['pantalla']
    cel, est = P['caja_electrica'], P['estructura_fija']
    pro = P['proceso']

    # =================== equipos ===================
    def f_secador(cd):
        """Secador UV: cuerpo mecanizado, disipador de aletas, ventana de emision y conector.
        La ventana emite en -Z de la pieza; en el ensamble se gira para que mire a la caja."""
        col = sec['color']
        c, dis = sec['cuerpo'], sec['disipador']
        m.color(col['cuerpo'])
        m._caja(cd, [0, 0, 0], [c['largo'], c['ancho'], c['alto']])
        m._caja(cd, [0, 0, -c['alto'] / 2 + 4], [c['largo'] - 30, c['ancho'] - 30, 10], 'cut')
        m.color(col['ventana'])
        v = sec['ventana_emision']
        m._caja(cd, [0, 0, -c['alto'] / 2 + 4], [v['largo'], v['ancho'], 6])
        m.color(col['disipador'])
        for i in range(dis['aletas']):
            y = -c['ancho'] / 2 + 12 + i * (c['ancho'] - 24) / (dis['aletas'] - 1)
            m._caja(cd, [0, y, c['alto'] / 2 + dis['alto'] / 2],
                    [c['largo'] - 20, dis['espesor'], dis['alto']])
        m.color(col['conector'])
        m._caja(cd, [c['largo'] / 2 + 15, 0, 10], [30, 50, 30])          # D-sub
        m._cil(cd, 'x', [c['largo'] / 2, -35, -20], 22, 34)              # alimentacion 48 V
    m.pieza('SEC_FireJet_FJ100_150x20', 'Componentes', f_secador,
            "Secador UV %s, ventana %sx%s, 48 V 17 A, con disipador de aletas"
            % (sec['modelo'], sec['ventana_emision']['largo'], sec['ventana_emision']['ancho']),
            'AluminioMecanizado')

    def f_fuente(cd):
        """Fuente 48 V con las orejas de montaje que midio Sergio (85 mm)."""
        col, c, o = fu['color'], fu['cuerpo'], fu['orejas']
        m.color(col['cuerpo'])
        m._caja(cd, [0, 0, 0], [c['largo'], c['ancho'], c['alto']])
        m.color(col['tapa'])
        m._caja(cd, [0, 0, c['alto'] / 2 - 1], [c['largo'] - 8, c['ancho'] - 8, 3])
        m.color(col['cuerpo'])
        for s_ in (-1, 1):                                    # orejas de 85 con su agujero
            m._caja(cd, [s_ * (c['largo'] / 2 + o['largo'] / 2 - 10), 0,
                         -c['alto'] / 2 + o['alto'] / 2 - o['separacion']],
                    [o['largo'], o['alto'], o['espesor']])
            m._cil(cd, 'z', [s_ * (c['largo'] / 2 + o['largo'] / 2 + 15), 0,
                             -c['alto'] / 2 + o['alto'] / 2 - o['separacion'] - 4], 7, 12, 'cut')
        m.color(col['bornes'])
        for i in range(fu['bornes']):                          # regleta de bornes
            x = -c['largo'] / 2 + 25 + i * (c['largo'] - 50) / (fu['bornes'] - 1)
            m._caja(cd, [x, -c['ancho'] / 2 - 5, 0], [12, 12, 22])
        m.color(col['led'])
        m._cil(cd, 'y', [c['largo'] / 2 - 30, -c['ancho'] / 2 - 6, 18], 8, 8)
    m.pieza('FUE_48V_secador', 'Componentes', f_fuente,
            "Fuente 48 V DC 17 A del secador, con orejas de montaje de %s mm y regleta de bornes"
            % fu['orejas']['largo'], 'Galvanizado')

    def f_cabezal(cd):
        """Cabezal NoLabel: cuerpo blanco, porta boquillas rojo, conectores y sensor.
        Las boquillas miran a +Y."""
        col, c = cab['color'], cab['cuerpo']
        m.color(col['cuerpo'])
        m._caja(cd, [0, 0, 0], [c['largo'], c['ancho'], c['alto']])
        m.color(col['porta_boquillas'])
        r = cab['porta_boquillas_rojo']
        m._caja(cd, [0, c['ancho'] / 2 + r['ancho'] / 2, 0], [r['largo'], r['ancho'], r['alto'] + 40])
        m._caja(cd, [0, c['ancho'] / 2 + r['ancho'], 0], [r['largo'] - 30, 8, cab['altura_impresion_mm']])
        m.color(col['conectores'])
        for dx in (-60, 0, 60):                                # M12 arriba
            m._cil(cd, 'z', [dx, -40, c['alto'] / 2], 16, 26)
        m.color(col['manguera'])
        m._cil(cd, 'z', [70, 40, c['alto'] / 2], 26, 90)       # manguera 3/4 in
        m.color(col['sensor'])
        m._caja(cd, [-c['largo'] / 2 - 20, c['ancho'] / 2 - 30, -40], [40, 60, 40])
    m.pieza('CAB_NoLabel', 'Componentes', f_cabezal,
            "Cabezal NoLabel, altura de impresion %s mm, boquillas contra el costado de la caja"
            % cab['altura_impresion_mm'], 'Blanco')

    def f_insumos(cd):
        """Caja de insumos: dos depositos con tapa roja, mirilla y pilotos."""
        col, c = ins['color'], ins['cuerpo']
        m.color(col['cuerpo'])
        m._caja(cd, [0, 0, 0], [c['largo'], c['ancho'], c['alto']])
        m.color(col['zocalo'])
        m._caja(cd, [0, 0, -c['alto'] / 2 - 8], [c['largo'] - 20, c['ancho'] - 20, 16])
        m.color(col['tapas'])
        for s_ in (-1, 1):
            m._cil(cd, 'z', [s_ * 55, 0, c['alto'] / 2], ins['tapas_diametro'], 22)
            m._cil(cd, 'z', [s_ * 55, 0, c['alto'] / 2 + 22], ins['tapas_diametro'] - 24, 10)
        m.color(col['indicadores'])
        for s_ in (-1, 1):                                     # pilotos INK OK / INK LOW
            m._cil(cd, 'y', [s_ * 55, -c['ancho'] / 2 - 4, -25], 14, 8)
        m.color('Policarbonato')
        m._caja(cd, [0, -c['ancho'] / 2 - 3, 10], [40, 8, 70])  # mirilla de nivel
        m.color(col['zocalo'])
        for s_ in (-1, 1):                                      # racores de salida
            m._cil(cd, 'z', [s_ * 55, 60, -c['alto'] / 2 - 16], 18, -40)
    m.pieza('INS_CajaInsumos', 'Componentes', f_insumos,
            'Caja de insumos NoLabel: 2 depositos con tapa, mirilla de nivel y pilotos INK OK / INK LOW',
            'Blanco')

    def f_pantalla(cd):
        col, c = pan['color'], pan['cuerpo']
        m.color(col['marco'])
        m._caja(cd, [0, 0, 0], [c['largo'], c['alto'], c['ancho']])
        m.color(col['vidrio'])
        m._caja(cd, [0, -c['alto'] / 2 - 1, 6], [c['largo'] - 40, 4, c['ancho'] - 50])
        m.color(col['botonera'])
        for dz in (-40, -14, 12, 38):
            m._cil(cd, 'y', [c['largo'] / 2 - 22, -c['alto'] / 2 - 3, dz], 10, 6)
        m.color(col['soporte'])
        v = pan['vesa_mm']
        m._caja(cd, [0, c['alto'] / 2 + 3, 0], [v + 30, 6, v + 30])
    m.pieza('PAN_Operador', 'Componentes', f_pantalla,
            "Pantalla de operador %s in, marco negro, vidrio ahumado y patron VESA %s"
            % (pan['diagonal_in'], pan['vesa_mm']), 'NegroMate')

    def f_celec(cd):
        """Caja electrica amarilla con puerta, herrajes, piloto, seta y prensaestopas."""
        col, c = cel['color'], cel['cuerpo']
        m.color(col['cuerpo'])
        m._caja(cd, [0, 0, 0], [c['largo'], c['ancho'], c['alto']])
        m._caja(cd, [0, -8, 0], [c['largo'] - 8, c['ancho'], c['alto'] - 8], 'cut')
        m.color(col['puerta'])
        m._caja(cd, [0, -c['ancho'] / 2 - 3, 0], [c['largo'], 6, c['alto']])
        m.color(col['herrajes'])
        for dz in (-c['alto'] / 2 + 40, 0, c['alto'] / 2 - 40):        # bisagras
            m._caja(cd, [-c['largo'] / 2 - 6, -c['ancho'] / 2 - 4, dz], [16, 20, 50])
        for dz in (-45, 45):                                            # cierres
            m._cil(cd, 'y', [c['largo'] / 2 - 30, -c['ancho'] / 2 - 12, dz], 20, 16)
        m.color(col['piloto'])
        m._cil(cd, 'y', [-c['largo'] / 2 + 45, -c['ancho'] / 2 - 12, c['alto'] / 2 - 40], 22, 14)
        m.color(col['seta'])
        m._cil(cd, 'y', [-c['largo'] / 2 + 45, -c['ancho'] / 2 - 14, c['alto'] / 2 - 100], 40, 18)
        m.color(col['prensaestopas'])
        a = m.alu(cd)
        for dx in (-140, -80, -20, 40, 100, 160):                       # entradas por abajo
            a.prensaestopa('z', [dx, 20, -c['alto'] / 2 - 24], 24, 24)
    m.pieza('CEL_CajaElectrica', 'Componentes', f_celec,
            'Caja electrica amarilla: puerta con 3 bisagras y 2 cierres, piloto, seta de emergencia y 6 prensaestopas',
            'Amarillo')

    def f_tuberia(cd):
        """Tramo de tuberia corrugada con sus dos racores."""
        t = cel['tuberia']
        m.color('NegroTextura')
        n = 14
        for i in range(n):                                    # corrugado
            m._cil(cd, 'z', [0, 0, -350 + i * 700 / n], t['diametro'] + (3 if i % 2 else 0), 700 / n)
        m.color('Zinc')
        for s_ in (-1, 1):
            m._cil(cd, 'z', [0, 0, s_ * 350], t['diametro'] + 8, s_ * 26)
    m.pieza('ROB_TuberiaCorrugada', 'Robotica', f_tuberia,
            "Tramo de tuberia corrugada de %s mm con racores, del tablero a los equipos"
            % cel['tuberia']['diametro'], 'NegroTextura')

    # =================== estructura fija ===================
    base, per = est['placa_base'], est['perfil_principal']
    por, cha, aju = est['portico'], est['chapas'], est['modulo_ajustable']
    SEC = tuple(per['seccion'])
    H = por['altura']
    sepx = por['separacion_columnas_x']

    def f_base(cd):
        a = m.alu(cd)
        m.color('Acero')
        m._caja(cd, [0, 0, base['espesor'] / 2], [base['largo'], base['ancho'], base['espesor']])
        for dx in (-1, 0, 1):
            for sy in (-1, 1):
                m._caja(cd, [dx * (base['largo'] / 2 - 70), sy * (base['ancho'] / 2 - 55),
                             base['espesor'] / 2], [18, 18, base['espesor'] + 4], 'cut')
        for sx in (-1, 1):
            for sy in (-1, 1):
                a.agujero_avellanado('z', [sx * sepx / 2 + sy * 25, 0, base['espesor']], 8,
                                     base['espesor'] + 4, -1)
    m.pieza('EST_PlacaBase', 'Estructura', f_base,
            "Placa base %sx%sx%s con 6 anclajes M16 y asientos avellanados"
            % (base['largo'], base['ancho'], base['espesor']), 'Acero')

    def f_columna(cd):
        m.color('Aluminio')
        m.alu(cd).pg40('z', [0, 0, 0], H, (SEC[0], SEC[1]))
    m.pieza('EST_ColumnaPG40', 'Estructura', f_columna,
            "Columna PG40 %sx%s (ranura 8), L=%s, cara de 80 en el plano de flexion"
            % (SEC[0], SEC[1], H), 'Aluminio')

    ltrav = sepx - SEC[0]

    def f_traviesa(cd):
        m.color('Aluminio')
        m.alu(cd).pg40('x', [0, 0, 0], ltrav, (SEC[1], SEC[0]))
    m.pieza('EST_TraviesaPG40', 'Estructura', f_traviesa,
            "Traviesa PG40 %sx%s entre columnas, L=%s" % (SEC[0], SEC[1], ltrav), 'Aluminio')

    lb = aju['brazos']['largo']

    def f_brazo(cd):
        m.color('Aluminio')
        m.alu(cd).pg40('y', [0, 0, 0], lb, (SEC[0], SEC[1]))
    m.pieza('EST_BrazoPG40', 'Estructura', f_brazo,
            "Brazo del modulo ajustable, PG40 %sx%s, L=%s" % (SEC[0], SEC[1], lb), 'Aluminio')

    def f_escuadra(cd):
        m.color('Aluminio')
        m.alu(cd).escuadra('xz', [0, 0, 0], 40, 8, 38)
    m.pieza('EST_EscuadraPG40', 'Estructura', f_escuadra,
            'Escuadra de union PG40 de 40 con tornillo avellanado M8 y tuerca martillo', 'Aluminio')

    def f_tapa(cd):
        m.color('NegroMate')
        m.alu(cd).tapa_perfil('z', [0, 0, 0], (SEC[0], SEC[1]), 2.0)
    m.pieza('EST_TapaPerfil', 'Estructura', f_tapa,
            "Tapa de extremo de perfil PG40 %sx%s" % (SEC[0], SEC[1]), 'NegroMate')

    # =================== modulo ajustable ===================
    def f_carro(cd):
        """Carro ajustable: dos placas de mordaza sobre las columnas y un travesano
        PG40 que las une. Solo el material necesario."""
        a = m.alu(cd)
        t = cha['carro']['espesor']
        m.color('Aluminio')
        for sx in (-1, 1):
            x = sx * sepx / 2
            m._caja(cd, [x, 0, 0], [140, t, 260])                       # placa de mordaza
            for sz in (-1, 1):                                          # colisas de acercamiento
                m._caja(cd, [x, 0, sz * 85], [aju['carrera_y'], t + 4, 12], 'cut')
            m.color('AluminioAnod')
            for sz in (-1, 1):                                          # mordaza sobre la ranura 8
                m._caja(cd, [x, -t / 2 - 9, sz * 85], [120, 18, 34])
            m.color('Aluminio')
        m.alu(cd).pg40('x', [0, t / 2 + 20, 0], sepx - 60, (40, 80))    # travesano del carro
        m.color('Acero')
        for sx in (-1, 1):
            for sz in (-1, 1):
                a.avellanado('y', [sx * sepx / 2, t / 2, sz * 85], 8, 32, -1)
    m.pieza('AJU_CarroPlaca', 'Ajustable', f_carro,
            "Carro ajustable: 2 placas de mordaza sobre la ranura 8, travesano PG40 y colisas "
            "de %s mm de acercamiento" % aju['carrera_y'], 'Aluminio')

    def f_husillo(cd):
        """Husillo trapezoidal con volante y contratuerca."""
        m.color('AceroPulido')
        m._cil(cd, 'z', [0, 0, -aju['carrera_z'] / 2], 16, aju['carrera_z'] + 120)
        m.color('Laton')
        m._cil(cd, 'z', [0, 0, -18], 38, 36)                   # tuerca de bronce
        m.color('NegroMate')
        m._cil(cd, 'z', [0, 0, aju['carrera_z'] / 2 + 70], 100, 16)    # volante
        m._cil(cd, 'z', [0, 0, aju['carrera_z'] / 2 + 86], 26, 24)
        m._cil(cd, 'x', [42, 0, aju['carrera_z'] / 2 + 100], 18, 46)   # maneta
    m.pieza('AJU_Husillo', 'Ajustable', f_husillo,
            "Husillo %s: sube y baja el conjunto de impresion %s mm"
            % (aju['accionamiento'], aju['carrera_z']), 'AceroPulido')

    def f_regla(cd):
        m.color('Inox')
        m._caja(cd, [0, 0, 0], [20, 3, aju['carrera_z'] + 80])
        m.color('Negro')
        for i in range(int(aju['carrera_z'] / 20) + 4):
            m._caja(cd, [0, -2.5, -aju['carrera_z'] / 2 - 40 + i * 20], [14, 1.5, 2])
    m.pieza('AJU_ReglaGraduada', 'Ajustable', f_regla,
            'Regla graduada del ajuste de altura, con indice en el carro', 'Inox')

    # =================== chapas ===================
    def f_placa(cd):
        a = m.alu(cd)
        t = cha['placa_principal']['espesor']
        m.color('Aluminio')
        a.chapa_plegada([0, 0, 0], [pla['largo'], pla['ancho']], t, ('x-', 'x+', 'y-'), 30)
        for sx in (-1, 1):
            for sy in (-1, 1):
                a.agujero_avellanado('z', [sx * (pla['largo'] / 2 - 60),
                                           sy * (pla['ancho'] / 2 - 45), 0], 8, t + 6, -1)
    m.pieza('EST_PlacaPrincipal', 'Estructura', f_placa,
            "Placa principal de aluminio plegada %sx%sx%s: cuelga el cabezal y los secadores"
            % (pla['largo'], pla['ancho'], cha['placa_principal']['espesor']), 'Aluminio')

    def f_sop_cab(cd):
        a = m.alu(cd)
        m.color('Aluminio')
        a.chapa_vertical('x', [0, 0, 0], (260, 240), 6, ('-', '+'), 40)
    m.pieza('EST_SoporteCabezal', 'Estructura', f_sop_cab,
            'Soporte de chapa plegada del cabezal, colgado de la placa principal', 'Aluminio')

    def f_sop_sec(cd):
        """Soporte de los 3 secadores: chapa plegada vertical con una ventana por secador."""
        a = m.alu(cd)
        t = cha['soporte_secadores']['espesor']
        L = 3 * sec['cuerpo']['largo'] + 60
        m.color('Aluminio')
        a.chapa_vertical('y', [0, 0, 0], (L, 260), t, ('-', '+'), 60)
        for i in range(3):
            x = -L / 2 + L / 6 + i * L / 3
            m._caja(cd, [x, 0, 0], [sec['cuerpo']['largo'] - 30, t + 8, 150], 'cut')
    m.pieza('EST_SoporteSecadores', 'Estructura', f_sop_sec,
            "Soporte de chapa plegada de los 3 secadores, con ventana por secador y "
            "colisas para el angulo diagonal", 'Aluminio')

    def f_repisa(cd):
        a = m.alu(cd)
        m.color('Aluminio')
        a.chapa_plegada([0, 0, 0], [3 * fu['cuerpo']['largo'] + 120, fu['cuerpo']['ancho'] + 60],
                        cha['repisa_fuentes']['espesor'], ('x-', 'x+', 'y-', 'y+'), 30)
    m.pieza('EST_RepisaFuentes', 'Estructura', f_repisa,
            'Repisa de chapa plegada de las 3 fuentes de 48 V, en la cara trasera del portico', 'Aluminio')

    def f_sop_pan(cd):
        a = m.alu(cd)
        m.color('Aluminio')
        a.chapa_plegada([0, 0, 0], [220, 140], 3, ('y-', 'y+'), 30)
        a.chapa_vertical('y', [0, -70, 70], (220, 140), 3, ('-', '+'), 25)
        v = pan['vesa_mm']
        for sx in (-1, 1):
            for sz in (-1, 1):
                a.cil('y', [sx * v / 2, -72, 70 + sz * v / 2], 7, 8, 'cut')
    m.pieza('EST_SoportePantalla', 'Estructura', f_sop_pan,
            "Soporte fijo de pantalla, patron VESA %s" % pan['vesa_mm'], 'Aluminio')

    def f_sop_cel(cd):
        a = m.alu(cd)
        m.color('Aluminio')
        a.chapa_vertical('y', [0, 0, 0], (460, 300), 3, ('-', '+'), 60)
    m.pieza('EST_SoporteCajaElectrica', 'Estructura', f_sop_cel,
            'Soporte de chapa plegada de la caja electrica en la cara trasera', 'Aluminio')

    # =================== ferreteria y robotica ===================
    def f_tornillo(cd):
        m.color('Zinc')
        m.alu(cd).avellanado('z', [0, 0, 0], 8, 25, -1)
    m.pieza('FER_TornAvellM8x25', 'Ferreteria', f_tornillo,
            'Tornillo avellanado M8 x 25 DIN 7991 con tuerca martillo ranura 8', 'Zinc')

    def f_manilla(cd):
        m.color('Aluminio')
        m.alu(cd).manilla('z', [0, 0, 0], 160, 60, 20, 32)
    m.pieza('FER_Manilla160', 'Ferreteria', f_manilla,
            'Manilla de aluminio tipo U, 160 mm entre centros', 'Aluminio')

    def f_pata(cd):
        m.color('Zinc')
        m.alu(cd).pata_niveladora([0, 0, 0], 80, 12, 16, 80)
    m.pieza('FER_PataNiveladora', 'Ferreteria', f_pata,
            'Pata niveladora M16 con plato de 80', 'Zinc')

    def f_cadena(cd):
        m.color('NegroMate')
        m.alu(cd).cadena_portacables('y', [0, 0, 0], lb - 40, 40, 35, 45)
    m.pieza('ROB_CadenaPortacables', 'Robotica', f_cadena,
            'Cadena portacables del brazo: alimenta cabezal y secadores', 'NegroMate')

    def f_canaleta(cd):
        m.color('GrisClaro')
        m.alu(cd).canaleta('z', [0, 0, 0], 700, 60, 60, 2)
    m.pieza('ROB_Canaleta', 'Robotica', f_canaleta,
            'Canaleta ranurada 60x60 de cableado en la columna', 'GrisClaro')

    def f_foto(cd):
        m.color('NegroMate')
        m.alu(cd).fotocelula('y', [0, 0, 0], (50, 18, 32))
        m.color('Rojo')
        m._cil(cd, 'y', [0, 14, 0], 8, 6)
    m.pieza('ROB_Fotocelula', 'Robotica', f_foto,
            'Fotocelula M18 de disparo de impresion sobre el transportador', 'NegroMate')

    # =================== referencia de proceso ===================
    tr = pro['transportador']

    def f_transp(cd):
        """Twin belt de referencia: no se fabrica aqui, sirve para ver el proceso."""
        A = pro['altura_banda']
        m.color('GrisMedio')
        for s_ in (-1, 1):
            m._caja(cd, [0, s_ * (tr['ancho_bastidor'] / 2 - 19), A - 95],
                    [tr['largo'], 38, 190])
        m.color('Azul')
        yb = tr['luz_central'] / 2 + tr['banda_ancho'] / 2
        for s_ in (-1, 1):
            m._caja(cd, [0, s_ * yb, A - 2.5], [tr['largo'], tr['banda_ancho'], 5])
        m.color('GrisMedio')
        for sx in (-1, 1):
            for s_ in (-1, 1):
                m._caja(cd, [sx * (tr['largo'] / 2 - 150), s_ * (tr['ancho_bastidor'] / 2 - 19),
                             (A - 190) / 2], [77, 38, A - 190])
    m.pieza('REF_Transportador', 'Referencia', f_transp,
            "REFERENCIA (no se fabrica): twin belt de %s mm, banda a %s mm del piso"
            % (tr['largo'], pro['altura_banda']), 'GrisMedio')

    def f_caja(cd):
        cj = pro['caja']
        m.color('Carton')
        m._caja(cd, [0, 0, 0], [cj['largo'], cj['ancho'], cj['alto']])
        m.color('Naranja')
        b = pro['banda_impresa']
        m._caja(cd, [0, -cj['ancho'] / 2 - 1, 0], [cj['largo'] - 60, 3, b['alto']])
    m.pieza('REF_Caja', 'Referencia', f_caja,
            "REFERENCIA: caja de %sx%sx%s con la banda impresa de %s mm en el costado"
            % (pro['caja']['largo'], pro['caja']['ancho'], pro['caja']['alto'],
               pro['banda_impresa']['alto']), 'Marfil')
    return


def ensamblar(m, par):
    """La caja avanza en +X sobre el twin belt. El cabezal imprime en su COSTADO (-Y)
    y los tres secadores, continuos y aguas abajo, curan en diagonal esa misma cara.
    Todo cuelga de un modulo ajustable que sube y baja segun el alto de caja."""
    P = par
    sec, fu = P['secador'], P['fuente_secador']
    cab, ins, pla = P['cabezal_nolabel'], P['caja_insumos'], P['placa_principal']
    pan, cel, est = P['pantalla'], P['caja_electrica'], P['estructura_fija']
    pro = P['proceso']
    base, por, aju = est['placa_base'], est['portico'], est['modulo_ajustable']
    SEC = tuple(est['perfil_principal']['seccion'])
    tb, H, sepx = base['espesor'], por['altura'], por['separacion_columnas_x']
    ycol = por['y_columnas']
    A = pro['altura_banda']
    cj = pro['caja']
    zimp = pro['banda_impresa']['z_centro']                 # eje de impresion
    ycara = -cj['ancho'] / 2                                # cara impresa de la caja
    yboq = ycara - pro['separacion_boquillas_caja']         # plano de boquillas

    tg = m.tg
    asm = CastTo(m.app.Documents.Add(K.kAssemblyDocumentObject, m.tpl_asm, False), 'AssemblyDocument')
    acd = asm.ComponentDefinition
    n = 0

    def poner(nombre, pos, rot=None, base=None):
        """rot = (angulo, eje). base = matriz 3x3 por filas, con los ejes locales
        X, Y, Z de la pieza expresados en columnas del sistema global."""
        nonlocal n
        ruta = m.piezas.get(nombre)
        if not ruta:
            return None
        mat = tg.CreateMatrix()
        if rot:
            ang, eje = rot
            mat.SetToRotation(ang, tg.CreateVector(*eje), tg.CreatePoint(0, 0, 0))
        if base is not None:
            for f in range(3):
                for col in range(3):
                    mat.PutCell(f + 1, col + 1, base[f][col])
        mat.SetTranslation(tg.CreateVector(cm(pos[0]), cm(pos[1]), cm(pos[2])), False)
        occ = acd.Occurrences.Add(ruta, mat)
        occ.Grounded = True
        n += 1
        return occ

    # ---------- referencia de proceso ----------
    poner('REF_Transportador', [400, 0, 0])
    poner('REF_Caja', [-150, 0, A + cj['alto'] / 2])      # entrando
    poner('REF_Caja', [420, 0, A + cj['alto'] / 2])       # ya impresa, bajo los secadores

    # ---------- portico fijo, al costado -Y ----------
    poner('EST_PlacaBase', [sepx / 2, ycol, 0])
    for sx in (-1, 1):
        x = sepx / 2 + sx * sepx / 2
        poner('EST_ColumnaPG40', [x, ycol, tb + H / 2])
        poner('EST_TapaPerfil', [x, ycol, tb + H + 1])
        poner('FER_PataNiveladora', [x, ycol + 110, -80])
    for z in por['traviesas_z']:
        poner('EST_TraviesaPG40', [sepx / 2, ycol, z])
        for sx in (-1, 1):
            poner('EST_EscuadraPG40', [sepx / 2 + sx * (sepx / 2 - SEC[0] / 2), ycol - 30,
                                       z + SEC[1] / 2], (0, [0, 0, 1]) if sx > 0 else (math.pi, [0, 0, 1]))
            poner('FER_TornAvellM8x25', [sepx / 2 + sx * (sepx / 2 - 60), ycol - SEC[1] / 2, z],
                  (math.pi / 2, [1, 0, 0]))

    # ---------- modulo ajustable ----------
    zcarro = zimp + 200                                     # centro del carro
    ycarro = ycol + SEC[1] / 2 + 4.0
    poner('AJU_CarroPlaca', [sepx / 2, ycarro, zcarro])
    poner('AJU_Husillo', [sepx / 2, ycol, zcarro])
    poner('AJU_ReglaGraduada', [sepx / 2 - sepx / 2 + 20, ycol + SEC[1] / 2 + 2, zcarro])

    lb = aju['brazos']['largo']
    ybrazo = ycarro + lb / 2                                # centro de los brazos
    zbrazo = zcarro + 40
    for sx in (-1, 1):
        poner('EST_BrazoPG40', [sepx / 2 + sx * (sepx / 2 - 40), ybrazo, zbrazo])
    poner('ROB_CadenaPortacables', [sepx / 2, ybrazo, zbrazo + 70])

    # ---------- placa principal y equipos ----------
    zplaca = zbrazo - SEC[1] / 2 - 4
    yplaca = ycarro + 60 + pla['ancho'] / 2
    xplaca = sepx / 2 + 60
    poner('EST_PlacaPrincipal', [xplaca, yplaca, zplaca])

    # cabezal: boquillas contra el costado de la caja
    ycab = yboq - cab['porta_boquillas_rojo']['ancho'] - cab['cuerpo']['ancho'] / 2
    xcab = 150
    poner('EST_SoporteCabezal', [xcab - cab['cuerpo']['largo'] / 2 - 30, ycab + 40,
                                 (zplaca - 30 + zimp + cab['cuerpo']['alto'] / 2) / 2])
    poner('CAB_NoLabel', [xcab, ycab, zimp])
    poner('INS_CajaInsumos', [xcab + 60, yplaca, zplaca + 30 + ins['cuerpo']['alto'] / 2])

    # secadores: continuos, aguas abajo, mirando a +Y y girados en diagonal
    ang = math.radians(sec['inclinacion_deg'])
    paso = sec['cuerpo']['largo'] + 10
    x0 = xcab + cab['cuerpo']['largo'] / 2 + 140 + sec['cuerpo']['largo'] / 2
    ysec = ycara - sec['distancia_ventana_a_caja_mm'] - sec['cuerpo']['alto'] / 2
    poner('EST_SoporteSecadores', [x0 + paso, ysec - 100, zimp])
    # la pieza emite en -Z local: se lleva su -Z a +Y (mira a la caja) y se gira la
    # ventana un angulo `ang` dentro de la cara vertical, que es el efecto diagonal
    ca, sa = math.cos(ang), math.sin(ang)
    R = [[ca, -sa, 0.0],
         [0.0, 0.0, -1.0],
         [sa, ca, 0.0]]
    for i in range(sec['cantidad']):
        poner('SEC_FireJet_FJ100_150x20', [x0 + i * paso, ysec, zimp], base=R)

    # fotocelula de disparo, aguas arriba del cabezal
    poner('ROB_Fotocelula', [xcab - 320, ycara - 40, A + 60])

    # ---------- servicios en la cara trasera ----------
    ytras = ycol - SEC[1] / 2 - 20
    poner('EST_RepisaFuentes', [sepx / 2, ytras - fu['cuerpo']['ancho'] / 2 - 30, 420])
    for dx in (-1, 0, 1):
        poner('FUE_48V_secador', [sepx / 2 + dx * (fu['cuerpo']['largo'] + 40),
                                  ytras - fu['cuerpo']['ancho'] / 2 - 30,
                                  424 + fu['cuerpo']['alto'] / 2])
    ycel = ytras - 3 - cel['cuerpo']['ancho'] / 2
    poner('EST_SoporteCajaElectrica', [sepx / 2, ytras - 1.5, 950])
    poner('CEL_CajaElectrica', [sepx / 2, ycel, 950])
    poner('FER_Manilla160', [sepx / 2 + 140, ycel - cel['cuerpo']['ancho'] / 2 - 12, 950],
          (-math.pi / 2, [1, 0, 0]))
    poner('ROB_Canaleta', [sepx / 2 - 120, ycol - 60, 700])

    # tuberia corrugada: del tablero al carro y del carro a los equipos
    poner('ROB_TuberiaCorrugada', [sepx / 2 - 220, ytras - 60, 1180])
    poner('ROB_TuberiaCorrugada', [sepx / 2 - 220, ycarro + 120, zbrazo + 40],
          (math.pi / 2, [1, 0, 0]))

    # ---------- pantalla hacia el operador ----------
    poner('EST_SoportePantalla', [sepx / 2 - 420, ycol - 90, 1400])
    poner('PAN_Operador', [sepx / 2 - 420, ycol - 240, 1470])

    try:
        dt = asm.PropertySets.Item('Design Tracking Properties')
        dt.Item('Part Number').Value = 'NOLABEL-01'
        dt.Item('Description').Value = 'Modulo NoLabel de impresion lateral con 3 secadores UV en diagonal'
        dt.Item('Project').Value = 'NOLABEL-01 · Conveyone'
    except Exception as e:
        m.log.append(f'iProperties ensamble: {e}')
    ruta = os.path.join(m.out, 'NOLABEL-01.iam')
    if os.path.exists(ruta):
        os.remove(ruta)
    asm.SaveAs(ruta, False)
    print(f'   iam NOLABEL-01.iam ({n} ocurrencias)')
    return asm, ruta


def plano_ga(m, asm, par, carpeta):
    tg = m.tg
    drw = CastTo(m.app.Documents.Add(K.kDrawingDocumentObject, m.tpl_drw, False), 'DrawingDocument')
    sh = drw.Sheets.Item(1)
    sh.Size = K.kA2DrawingSheetSize
    sh.Name = 'GA NOLABEL-01'
    W, H = 59.4, 42.0
    esc = 0.1
    try:
        v1 = sh.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(15, 25), esc, K.kBottomViewOrientation, K.kHiddenLineRemovedDrawingViewStyle)
        drw.Update()
        v1.Name = 'ELEVACION'
        v1.Center = tg.CreatePoint2d(4.0 + v1.Width / 2, H - 3.0 - v1.Height / 2)
        v2 = sh.DrawingViews.AddProjectedView(v1, tg.CreatePoint2d(v1.Center.X + v1.Width / 2 + 12, v1.Center.Y), K.kHiddenLineRemovedDrawingViewStyle)
        drw.Update()
        iso = sh.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(W - 14, 12), esc * 0.8, K.kIsoTopRightViewOrientation, K.kShadedDrawingViewStyle)
        drw.Update()
        iso.Center = tg.CreatePoint2d(W - 3.0 - iso.Width / 2, 4.0 + iso.Height / 2)
        sh.PartsLists.Add(v1, tg.CreatePoint2d(W - 1.0, H - 1.0))
        sh.DrawingNotes.GeneralNotes.AddFitted(tg.CreatePoint2d(2.0, 2.0),
            'NOLABEL-01 · modulo NoLabel con 3 secadores UV Phoseon FireJet FJ100 sobre ESTRUCTURA FIJA' +
            chr(10) + 'medidas de projects/NOLABEL-01/parametros_nolabel.json (fotos con huincha 09-09-2026); confirmar los pendientes del archivo')
    except Exception as e:
        m.log.append(f'GA: {e}')
    ruta = os.path.join(carpeta, 'NOLABEL-GA-01.idw')
    os.makedirs(carpeta, exist_ok=True)
    if os.path.exists(ruta):
        os.remove(ruta)
    drw.SaveAs(ruta, False)
    print(f'   idw {os.path.basename(ruta)}')
    return drw, ruta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=OUT_DEFAULT)
    ap.add_argument('--instancia-propia', action='store_true')
    ap.add_argument('--sin-planos', action='store_true')
    args = ap.parse_args()
    par = json.load(open(PARAM, encoding='utf-8'))
    app, propia = conectar(args.instancia_propia)
    global K
    from win32com.client import constants as K2
    K = K2
    os.makedirs(args.out, exist_ok=True)
    t0 = time.time()
    m = Modelo(app, args.out, par)
    try:
        construir_todo(m, par)
        asm, ruta = ensamblar(m, par)
        if not args.sin_planos:
            drw, rdrw = plano_ga(m, asm, par, os.path.join(args.out, 'Planos'))
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
                    print('   pdf NOLABEL-GA-01.pdf')
            except Exception as e:
                m.log.append(f'pdf: {e}')
            drw.Close(True)
        asm.Close(True)
    except Exception:
        traceback.print_exc()
    print(f'\n{len(m.piezas)} piezas · {round(time.time() - t0)} s')
    if m.log:
        print('Avisos:')
        for l in m.log[:30]:
            print('  -', l)
    if propia:
        app.Quit()


if __name__ == '__main__':
    main()
