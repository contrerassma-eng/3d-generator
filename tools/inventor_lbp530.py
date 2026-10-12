#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
inventor_lbp530.py — Lleva los ensambles paramétricos foto3d-cad del proyecto
LBP530-18 (cad/ensambles/lbp530_5m.json y lbp530_gt<L>.json) a Autodesk
Inventor por COM: piezas .ipt (una por pieza distinta, con la nomenclatura
Conveyone), ensambles .iam y planos .idw (arreglo general + corte
longitudinal A-A + isométrica + lista de piezas; y láminas de fabricación con
tres vistas por pieza FAB), más la exportación a PDF.

Uso (Windows, Inventor 2027 instalado; usa la instancia activa o inicia una
oculta):
    python tools/inventor_lbp530.py [--out <carpeta>] [--solo LBP|GT] [--sin-planos]

Salida por defecto: C:\\Users\\scont\\OneDrive\\Documentos\\Inventor\\Bandas Modulares\\CV-LBP530-18\\
Unidades: el JSON está en mm; la API de Inventor trabaja en cm.
"""
import os, sys, re, json, math, time, argparse, traceback, shutil
import pythoncom
import win32com.client as w
from win32com.client import gencache, CastTo

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ENS = os.path.join(ROOT, 'cad', 'ensambles')
OUT_DEFAULT = r"C:\Users\scont\OneDrive\Documentos\Inventor\Bandas Modulares\CV-LBP530-18"

# ---------------------------------------------------------------------------
# Inventor
# ---------------------------------------------------------------------------
def conectar(propia=False):
    """Instancia de Inventor para la automatización.
    - `propia=True` (--instancia-propia): arranca una instancia NUEVA con DispatchEx y
      trabaja ahí; así se puede automatizar aunque el usuario tenga Inventor abierto con
      sus documentos. Se cierra al terminar.
    - Si hay una instancia activa OCULTA (Visible=False) es una de automatización: se usa.
    - Si la instancia activa es VISIBLE es la sesión interactiva del usuario: NO se toca
      (las pruebas en la sesión del usuario provocaron caídas); se aborta con aviso.
    - Si no hay ninguna, se inicia una oculta (CoCreateInstance puede vencer su
      timeout mientras Inventor arranca: se reintenta con GetActiveObject)."""
    if propia:
        print('iniciando una instancia PROPIA de Inventor (la sesión del usuario no se toca)...')
        crudo = w.DispatchEx('Inventor.Application')
        app = gencache.EnsureDispatch(crudo._oleobj_.QueryInterface(pythoncom.IID_IDispatch))
        for _ in range(120):
            try:
                if app.Ready: break
            except Exception: pass
            time.sleep(2)
        app.Visible = False
        app.SilentOperation = True
        print('Inventor (instancia propia):', app.SoftwareVersion.DisplayName)
        return app, True
    try:
        disp = pythoncom.GetActiveObject('Inventor.Application').QueryInterface(pythoncom.IID_IDispatch)
        app = gencache.EnsureDispatch(disp)
        base = os.path.normcase(os.path.abspath(OUT_DEFAULT))
        ajenos = []
        for i in range(1, app.Documents.Count + 1):
            d = app.Documents.Item(i)
            f = os.path.normcase(os.path.abspath(str(d.FullFileName))) if d.FullFileName else ''
            if not f.startswith(base): ajenos.append(d.DisplayName)
        if ajenos and not PERMITIR_SESION_USUARIO:
            raise SystemExit('La instancia activa de Inventor tiene documentos del usuario abiertos (' + ', '.join(ajenos[:5]) + '): ciérralos o cierra Inventor y vuelve a correr; la automatización no trabaja sobre documentos del usuario.')
        print('Inventor (instancia activa sin documentos):', app.SoftwareVersion.DisplayName)
        return app, False
    except SystemExit:
        raise
    except Exception:
        pass
    print('iniciando Inventor oculto para automatización...')
    try:
        app = gencache.EnsureDispatch('Inventor.Application')
    except Exception:
        app = None
    t0 = time.time()
    while app is None and time.time() - t0 < 240:
        time.sleep(5)
        try:
            disp = pythoncom.GetActiveObject('Inventor.Application').QueryInterface(pythoncom.IID_IDispatch)
            app = gencache.EnsureDispatch(disp)
        except Exception:
            app = None
    if app is None:
        raise SystemExit('no se pudo iniciar Inventor')
    for _ in range(90):
        try:
            if app.Ready: break
        except Exception: pass
        time.sleep(2)
    app.Visible = False
    print('Inventor (instancia propia):', app.SoftwareVersion.DisplayName)
    return app, True

from win32com.client import constants as K   # se llena tras EnsureDispatch

PERMITIR_SESION_USUARIO = False

BR = chr(10)

def cm(v): return v / 10.0

def cerrar_mios(app, out):
    """Cierra (sin guardar) únicamente documentos cuya ruta está bajo la carpeta de
    salida del script — nunca los del usuario."""
    base = os.path.normcase(os.path.abspath(out))
    n = 0
    for i in range(app.Documents.Count, 0, -1):
        try:
            d = app.Documents.Item(i)
            f = os.path.normcase(os.path.abspath(str(d.FullFileName))) if d.FullFileName else ''
            if f.startswith(base):
                d.Close(True); n += 1
        except Exception:
            pass
    if n: print(f'   ({n} documentos propios de una corrida anterior cerrados)')

# ---------------------------------------------------------------------------
# Nomenclatura Conveyone (archivo Inventor y carpeta por pieza del generador)
# ---------------------------------------------------------------------------
MAPA = [
  (r'Placa lateral libre',            lambda L: f'PL_LatLib_LBP530_L{L}',        r'Estructura\Planchas'),
  (r'Placa lateral motriz',           lambda L: f'PL_LatMot_LBP530_L{L}',        r'Estructura\Planchas'),
  (r'Guarda inferior motriz',         lambda L: 'PL_GuardaU_MOT_LBP530',         r'Estructura\Guardas'),
  (r'Guarda inferior tensor',         lambda L: 'PL_GuardaU_TEN_LBP530',         r'Estructura\Guardas'),
  (r'Guarda inferior unica',          lambda L: f'PL_GuardaU_GT_LBP530_L{L}',    r'Estructura\Guardas'),
  (r'Mecha porta-chumacera PL8 motriz',   lambda L: f'PL_Mecha_MOT_LBP530_L{L}',  r'Estructura\Planchas'),   # difiere entre LBP (320×422) y GT (320×242)
  (r'Mecha porta-chumacera PL8 tensor',   lambda L: 'PL_Mecha_TEN_LBP530',       r'Estructura\Planchas'),
  (r'Mecha porta-chumacera PL8 combinada',lambda L: 'PL_Mecha_COMB_LBP530_GT',   r'Estructura\Planchas'),
  (r'Travesaño de patas',             lambda L: 'PE_TravPatas_B002A_LBP530',     r'Estructura\Soportes'),
  (r'Travesaño BAJO',                 lambda L: 'PE_TravBajo_B002A_LBP530',      r'Estructura\Planchas'),
  (r'Travesaño tipo ZP2026',          lambda L: 'PE_Trav_B002A_LBP530',          r'Estructura\Planchas'),
  (r'Frente porta-nosebar entrada',   lambda L: 'PL_Frente_Nose_ENT_LBP530',     r'Estructura\Planchas'),
  (r'Frente porta-nosebar descarga',  lambda L: 'PL_Frente_Nose_DES_LBP530',     r'Estructura\Planchas'),
  (r'Acople de laterales',            lambda L: 'PL_Acople_LBP530',              r'Estructura\Planchas'),
  (r'Suple de descanso',              lambda L: 'PL_SupleDescanso_LBP530',       r'Estructura\Planchas'),
  (r'Guía lateral de desgaste',       lambda L: f'PL_GuiaDesgaste_LBP530_L{L}',  r'Guias'),
  (r'Chaveta DIN 6885',               lambda L: 'DIN6885A_8x7x90',               r'Componentes Estandar'),
  (r'Arandela de retención',          lambda L: 'Retencion_D40x6_M10',           r'Componentes Estandar'),
  (r'Rodillo de COLA',                lambda L: 'RET-D63_COLA_LBP530',           r'Estructura\Torno'),
  (r'Rodillo retorno',                lambda L: 'RET-D63_LBP530',                r'Estructura\Torno'),
  (r'EJE MOTRIZ',                     lambda L: 'TO_EjeMotriz_LBP530_18',        r'Estructura\Torno'),
  (r'EJE TENSOR',                     lambda L: 'TO_EjeTensor_LBP530_18',        r'Estructura\Torno'),
  (r'Guía de apoyo',                  lambda L: f'GUI-APO_LBP530_L{L}',          r'Guias'),
  (r'Guía lateral|Guía de cajas conical rail', lambda L: f'GUI-LAT_LBP530_L{L}',  r'Guias'),
  (r'Nosebar .*P22868',               lambda L: 'P22868_nosebar_LBP_18in',       r'Elementos Movex\Nosebar'),
  (r'Nosebar .*P22862',               lambda L: 'P22862_nosebar_530_18in',       r'Elementos Movex\Nosebar'),
  (r'Sprocket P158808YF',             lambda L: 'P158808YF_sprocket_Z32',        r'Elementos Movex\Sprocket'),
  (r'Sprocket Z32 loco',              lambda L: 'P158808YF_sprocket_Z32_loco',   r'Elementos Movex\Sprocket'),
  (r'Collarín',                       lambda L: 'P21703Y_collarin',              r'Elementos Movex\Collarin'),
  (r'Chumacera UCF206',               lambda L: 'UCF206',                        r'Componentes Estandar\Descansos'),
  (r'Motorreductor',                  lambda L: 'NMRV-P075_FA_030_80A4',         r'Componentes Estandar\Motorreductor'),
  (r'Banda Movex 530 LBP',            lambda L: f'P5324010018A_banda_LBP_L{L}',  r'Elementos Movex\Bandas'),
  (r'Banda Movex 530 GT',             lambda L: f'P5323010018A_banda_GT_L{L}',   r'Elementos Movex\Bandas'),
  (r'Rodillos LBP',                   lambda L: f'P5324010018A_rodillos_LBP_L{L}', r'Elementos Movex\Bandas'),
  (r'Goma Grip Top',                  lambda L: f'P5323010018A_goma_GT_L{L}',    r'Elementos Movex\Bandas'),
]
def nombre_inventor(nombre, L):
    # laterales: chapa plegada por tramos (LBP: 2 × 2500 A/B; GT: 1 × 600)
    m2 = re.search(r'Guía lateral de desgaste.*?L=(\d+)(?: tramo (\w))?', nombre)
    if m2:
        return f"PL_GuiaDesgaste_LBP530_L{m2.group(1)}{'_' + m2.group(2) if m2.group(2) else ''}", r'Guias'
    m = re.search(r'Placa lateral (libre|motriz).*?L=(\d+)(?: tramo (\w))?', nombre)
    if m:
        return f"PL_Lat{'Lib' if m.group(1) == 'libre' else 'Mot'}_LBP530_L{m.group(2)}{'_' + m.group(3) if m.group(3) else ''}", r'Estructura\Planchas'
    for re_, fn, carpeta in MAPA:
        if re.search(re_, nombre): return fn(L), carpeta
    base = re.sub(r'[^A-Za-z0-9]+', '_', nombre.split('·', 1)[-1]).strip('_')[:40]
    return f'X_{base}', r'Estructura\Varios'

def firma(part):
    """Piezas idénticas (mismas features relativas) comparten archivo .ipt."""
    return json.dumps([part['name']] + [[f['shape'], f['op'], [round(v, 3) for v in f['at']], f.get('dir'), f['params']] for f in part['features']], sort_keys=True, ensure_ascii=False)

# ---------------------------------------------------------------------------
# Construcción de piezas
# ---------------------------------------------------------------------------
class Constructor:
    def __init__(self, app, out):
        self.app, self.out, self.tg = app, out, app.TransientGeometry
        self.tpl_part = app.FileManager.GetTemplateFile(K.kPartDocumentObject)
        self.tpl_asm = app.FileManager.GetTemplateFile(K.kAssemblyDocumentObject)
        tp = app.DesignProjectManager.ActiveDesignProject.TemplatesPath
        self.tpl_drw = os.path.join(tp, 'Standard.idw')
        self.tpl_sm = os.path.join(tp, 'Sheet Metal.ipt')     # piezas de chapa, como el BRP/Merge
        self.chapas = {}                                      # ruta .ipt → datos del desarrollo
        self.cache = {}    # firma → ruta .ipt
        self.subs = {}     # ruta .iam de subensamble → nº de piezas
        self.con_rodillos = False
        self.log = []

    # --- planos de trabajo y bocetos --------------------------------------
    def plano(self, cd, eje, offset_mm):
        """Plano de trabajo perpendicular al eje ('x','y','z') a la cota dada (mm)."""
        base = {'x': cd.WorkPlanes.Item(1), 'y': cd.WorkPlanes.Item(2), 'z': cd.WorkPlanes.Item(3)}[eje]
        wp = cd.WorkPlanes.AddByPlaneAndOffset(base, cm(offset_mm))
        wp.Visible = False
        return wp

    def sentido(self, sk, dir3):
        # Verificado en Inventor 2027 (tools test 2026-09-08): los planos base YZ/XZ/XY
        # tienen normales +X/+Y/+Z, los planos desfasados las conservan y
        # kPositiveExtentDirection extruye hacia +eje. `dir3` es unitario axial.
        return K.kPositiveExtentDirection if (dir3[0] + dir3[1] + dir3[2]) >= 0 else K.kNegativeExtentDirection

    def pt2(self, sk, x, y, z):
        return sk.ModelToSketchSpace(self.tg.CreatePoint(cm(x), cm(y), cm(z)))

    def extruir(self, cd, sk, op, wp, dir3, dist_mm=None, through=False):
        prof = sk.Profiles.AddForSolid()
        # primera feature de la pieza: siempre cuerpo nuevo
        if cd.SurfaceBodies.Count == 0 and op == K.kJoinOperation:
            op = K.kNewBodyOperation
        ed = cd.Features.ExtrudeFeatures.CreateExtrudeDefinition(prof, op)
        if through:
            ed.SetThroughAllExtent(K.kSymmetricExtentDirection)
        else:
            ed.SetDistanceExtent(cm(dist_mm), self.sentido(sk, dir3))
        feat = cd.Features.ExtrudeFeatures.Add(ed)
        if cd.SurfaceBodies.Count > 1:
            self.log.append(f'{cd.Document.DisplayName}: la feature dejó {cd.SurfaceBodies.Count} cuerpos (sentido/posición)')
        return feat

    def feature(self, cd, f, esBanda):
        sh = f['shape']
        op = K.kCutOperation if (f['op'] == 'cut' or sh == 'hole') else K.kJoinOperation
        at = f['at']; p = f['params']
        if sh == 'box':
            wp = self.plano(cd, 'z', at[2])
            sk = cd.Sketches.Add(wp)
            a = self.pt2(sk, at[0] - p['w'] / 2, at[1] - p['d'] / 2, at[2])
            b = self.pt2(sk, at[0] + p['w'] / 2, at[1] + p['d'] / 2, at[2])
            sk.SketchLines.AddAsTwoPointRectangle(a, b)
            self.extruir(cd, sk, op, wp, [0, 0, 1], p['h'])
        elif sh in ('cylinder', 'hole'):
            d = f.get('dir') or [0, 0, 1]
            eje = 'x' if abs(d[0]) == 1 else ('y' if abs(d[1]) == 1 else 'z')
            off = {'x': at[0], 'y': at[1], 'z': at[2]}[eje]
            wp = self.plano(cd, eje, off)
            sk = cd.Sketches.Add(wp)
            c = self.pt2(sk, at[0], at[1], at[2])
            sk.SketchCircles.AddByCenterRadius(c, cm(p['dia'] / 2))
            if sh == 'hole':
                through = p.get('through', True) or not p.get('depth')
                if through: self.extruir(cd, sk, K.kCutOperation, wp, d, through=True)
                else: self.extruir(cd, sk, K.kCutOperation, wp, d, p['depth'])
            else:
                self.extruir(cd, sk, op, wp, d, p['h'])
        elif sh == 'sketch':
            # polígono en el plano XZ a la cota Y = at[1], extruido h según dir (±Y)
            d = f.get('dir') or [0, -1, 0]
            wp = self.plano(cd, 'y', at[1])
            sk = cd.Sketches.Add(wp)
            # puntos depurados (sin segmentos menores a 0,05 mm) y lazo cerrado
            # encadenando los SketchPoint reales de cada línea
            raw = [self.pt2(sk, u + at[0], at[1], v + at[2]) for u, v in p['pts']]
            pts2 = []
            TOL = 0.03   # cm (0,3 mm): puntos más cercanos se funden (arcos finos del nosebar y la cola)
            for q in raw:
                if pts2 and abs(q.X - pts2[-1].X) < TOL and abs(q.Y - pts2[-1].Y) < TOL: continue
                pts2.append(q)
            while len(pts2) > 2 and abs(pts2[0].X - pts2[-1].X) < TOL and abs(pts2[0].Y - pts2[-1].Y) < TOL:
                pts2.pop()
            lines = []
            for i in range(len(pts2)):
                a = lines[-1].EndSketchPoint if lines else pts2[0]
                b = lines[0].StartSketchPoint if i == len(pts2) - 1 else pts2[i + 1]
                lines.append(sk.SketchLines.AddByTwoPoints(a, b))
            if esBanda and f['op'] == 'cut':
                self.extruir(cd, sk, K.kCutOperation, wp, d, through=True)
            else:
                self.extruir(cd, sk, op, wp, d, p['h'])
        else:
            raise ValueError('shape desconocido ' + sh)

    def agrupar(self, feats):
        """Devuelve una lista de grupos [(clave, [features])] preservando el orden.
        Solo agrupa cilindros y cajas de UNIÓN con el mismo plano de boceto
        (eje + cota) y la misma altura/dirección; el resto va de a uno."""
        grupos = []
        for f in feats:
            key = None
            if f['op'] != 'cut' and f['shape'] == 'cylinder':
                d = f.get('dir') or [0, 0, 1]
                eje = 'x' if abs(d[0]) == 1 else ('y' if abs(d[1]) == 1 else 'z')
                off = {'x': f['at'][0], 'y': f['at'][1], 'z': f['at'][2]}[eje]
                key = ('cyl', eje, round(off, 3), tuple(d), round(f['params']['h'], 3))
            elif f['op'] != 'cut' and f['shape'] == 'box':
                key = ('box', 'z', round(f['at'][2], 3), (0, 0, 1), round(f['params']['h'], 3))
            if key is not None and grupos and grupos[-1][0] == key:
                grupos[-1][1].append(f)
            else:
                grupos.append((key, [f]))
        return grupos

    def feature_grupo(self, cd, key, feats):
        kind, eje, off, d, h = key
        wp = self.plano(cd, eje, off)
        sk = cd.Sketches.Add(wp)
        for f in feats:
            at, p = f['at'], f['params']
            if kind == 'cyl':
                sk.SketchCircles.AddByCenterRadius(self.pt2(sk, at[0], at[1], at[2]), cm(p['dia'] / 2))
            else:
                a = self.pt2(sk, at[0] - p['w'] / 2, at[1] - p['d'] / 2, at[2])
                b = self.pt2(sk, at[0] + p['w'] / 2, at[1] + p['d'] / 2, at[2])
                sk.SketchLines.AddAsTwoPointRectangle(a, b)
        self.extruir(cd, sk, K.kJoinOperation, wp, list(d), h)

    def pieza(self, part, L, carpeta_base):
        key = firma(part)
        if key in self.cache: return self.cache[key]
        nombre, carpeta = nombre_inventor(part['name'], L)
        folder = os.path.join(carpeta_base, carpeta)
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, nombre + '.ipt')
        # si dos piezas distintas mapean al mismo nombre (p. ej. guardas de distinto largo), sufijo
        k = 2
        while path in self.cache.values():
            path = os.path.join(folder, f'{nombre}_{k}.ipt'); k += 1
        doc = None
        if part.get('chapa'):
            doc = self.pieza_chapa(part, nombre, path, part.get('bbox'))
        if doc is None:
            doc = CastTo(self.app.Documents.Add(K.kPartDocumentObject, self.tpl_part, False), 'PartDocument')
        cd = doc.ComponentDefinition
        esBanda = 'Banda' in part['name']
        ok = 0; fallas = 0
        if part.get('chapa') and cd.SurfaceBodies.Count:
            # la chapa ya está construida (perfil + pliegues + cortes + desplegado)
            self._guardar_pieza(doc, part, nombre, path, key)
            return path
        for gkey, feats in self.agrupar(part['features']):
            try:
                if gkey is not None and len(feats) > 1:
                    self.feature_grupo(cd, gkey, feats); ok += len(feats)
                else:
                    self.feature(cd, feats[0], esBanda); ok += 1
            except Exception as e:
                fallas += len(feats)
                self.log.append(f'{nombre}: feature {feats[0]["shape"]} {feats[0].get("name","")} (x{len(feats)}) → {e}')
        if fallas and cd.SurfaceBodies.Count == 0:
            # documento sin sólido: no se guarda (guardarlo roto ha hecho caer Inventor)
            self.log.append(f'{nombre}: pieza OMITIDA (ninguna feature válida)')
            try: doc.Close(True)
            except Exception: pass
            self.cache[key] = None
            print(f'   ipt {nombre} OMITIDA ({fallas} features fallidas)')
            return None
        self._guardar_pieza(doc, part, nombre, path, key, f'{ok} features' + (f', {fallas} fallidas' if fallas else ''))
        return path

    def _guardar_pieza(self, doc, part, nombre, path, key, detalle=''):
        try:
            dt = doc.PropertySets.Item('Design Tracking Properties')
            dt.Item('Part Number').Value = nombre
            dt.Item('Description').Value = part['name'][:120]
            dt.Item('Stock Number').Value = 'FAB' if part['name'].startswith('FAB') else 'NORM'
            dt.Item('Project').Value = 'LBP530-18 · Conveyone'
            if part.get('chapa'):
                # como en el BRP/Merge: material A36 y espesor en la tabla de la lámina
                try: dt.Item('Material').Value = 'A36'
                except Exception: pass
        except Exception as e:
            self.log.append(f'{nombre}: iProperties → {e}')
        if os.path.exists(path): os.remove(path)
        doc.SaveAs(path, False)
        try: doc.Close(True)
        except Exception as e: self.log.append(f'{nombre}: Close → {e}')
        self.cache[key] = path
        if detalle: print(f'   ipt {os.path.relpath(path, self.out)}  ({detalle})')
        return path

    # --- piezas REALES referenciadas (familia ZP2026) ----------------------
    def referencia(self, ref, carpeta_base):
        """Copia (una vez) la pieza real del ZP2026 a Estructura/Soportes/ZP2026 y devuelve su ruta."""
        folder = os.path.join(carpeta_base, ref.get('carpeta') or os.path.join('Estructura', 'Soportes', ref.get('familia', 'REF')))
        os.makedirs(folder, exist_ok=True)
        dst = os.path.join(folder, ref['archivo'])
        src = os.path.join(ref['origen'], ref['archivo'])
        if not os.path.exists(dst):
            if not os.path.exists(src):
                self.log.append(f"referencia {ref['archivo']}: no existe {src}")
                return None
            shutil.copy2(src, dst)
            print(f'   ref {os.path.relpath(dst, self.out)}  (copiada de {ref["origen"]})')
            try:   # iProperties de la copia: que la lista de piezas diga qué es
                d = self.app.Documents.Open(dst, False)
                dt = d.PropertySets.Item('Design Tracking Properties')
                fam = (ref.get('familia') or 'pieza real').split('(')[0].strip()
                dt.Item('Description').Value = f"{fam} · {ref['archivo'].rsplit('.', 1)[0]}"[:60]
                dt.Item('Project').Value = 'LBP530-18 · Conveyone (pieza de la familia ZP2026)'
                d.Save(); d.Close(True)
            except Exception as e:
                self.log.append(f"referencia {ref['archivo']}: iProperties → {e}")
        return dst

    # --- ensamble ----------------------------------------------------------
    def _colocar(self, acd, path, part, origen=(0, 0, 0)):
        ref = part.get('ref')
        m = self.tg.CreateMatrix()
        q = (ref or {}).get('quat') or part.get('quat') or [0, 0, 0, 1]
        if any(abs(v) > 1e-9 for v in q[:3]):
            x, y, z, s = q
            m.SetToRotation(2 * math.acos(max(-1, min(1, s))), self.tg.CreateVector(x, y, z), self.tg.CreatePoint(0, 0, 0))
        px, py, pz = part['pos']
        m.SetTranslation(self.tg.CreateVector(cm(px - origen[0]), cm(py - origen[1]), cm(pz - origen[2])), False)
        occ = acd.Occurrences.Add(path, m)
        occ.Grounded = True
        return occ

    def subensamble(self, archivo_rel, grupo, L, carpeta_base):
        """Construye (una vez) el .iam de un subensamble con sus piezas relativas al origen del grupo."""
        path = os.path.join(carpeta_base, archivo_rel + '.iam')
        if path in self.subs: return path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        sub = CastTo(self.app.Documents.Add(K.kAssemblyDocumentObject, self.tpl_asm, False), 'AssemblyDocument')
        scd = sub.ComponentDefinition
        origen = grupo[0]['sub']['origen']
        n = 0
        for part in grupo:
            ref = part.get('ref')
            p = self.referencia(ref, carpeta_base) if ref else self.pieza(part, L, carpeta_base)
            if not p: continue
            self._colocar(scd, p, part, origen); n += 1
        try:
            dt = sub.PropertySets.Item('Design Tracking Properties')
            dt.Item('Part Number').Value = os.path.basename(archivo_rel)
            dt.Item('Description').Value = f'Subensamble {os.path.basename(archivo_rel)} ({n} piezas) · LBP530-18'
            dt.Item('Project').Value = 'LBP530-18 · Conveyone'
        except Exception as e:
            self.log.append(f'{archivo_rel}: iProperties → {e}')
        if os.path.exists(path): os.remove(path)
        sub.SaveAs(path, False)
        sub.Close(True)
        self.subs[path] = n
        print(f'   iam {os.path.relpath(path, self.out)}  (subensamble, {n} piezas)')
        return path

    def esqueleto(self, L, nombre_eq, doc_json, carpeta_base):
        """Ref_<equipo>.ipt: parámetros de usuario (parametros_inventor_LBP530.csv) + planos de trabajo
        nombrados (producto, piso, eje motriz, nosebars), como los Ref_ del BRP y del Gapper."""
        import csv
        path = os.path.join(carpeta_base, 'Estructura', f'Ref_{nombre_eq}.ipt')
        doc = CastTo(self.app.Documents.Add(K.kPartDocumentObject, self.tpl_part, False), 'PartDocument')
        cd = doc.ComponentDefinition
        npar = 0
        csvp = os.path.join(ROOT, 'projects', 'LBP530-18', 'out', 'inventor', 'parametros_inventor_LBP530.csv')
        if os.path.exists(csvp):
            for r in csv.DictReader(open(csvp, encoding='utf-8')):
                try:
                    v = float(r['valor'])
                except Exception:
                    continue
                nombre = re.sub(r'[^A-Za-z0-9_]', '_', r['parametro'])[:60]
                try:
                    up = cd.Parameters.UserParameters.AddByValue(nombre, cm(v) if r['unidad'] == 'mm' else v, 'mm' if r['unidad'] == 'mm' else 'ul')
                    if r.get('comentario'): up.Comment = r['comentario'][:200]
                    npar += 1
                except Exception as e:
                    self.log.append(f'Ref {nombre}: {e}')
        meta = doc_json['meta']
        D = json.load(open(os.path.join(ENS, 'lbp530_dims.json'), encoding='utf-8'))['D']
        esLBP = 'LBP' in nombre_eq
        xDrv = L - (D['xMotrizDesdePunta'] if esLBP else D['gtMotDx'])
        zM = D['zMotriz'] if esLBP else D['gtMotZ']
        planos = [('z', 0, 'Plano de producto (z=0)'), ('z', D['pisoZ'], f"Piso NPT {-D['pisoZ']}"), ('z', zM, 'Eje motriz (cota)'), ('x', xDrv, 'Eje motriz (posición)'),
                  ('x', 0, 'Nosebar entrada (punta)'), ('x', L, 'Nosebar descarga (punta)'), ('y', D['innerW'] / 2, 'Alma lateral +Y (cara interior)'), ('y', -D['innerW'] / 2, 'Alma lateral −Y (cara interior)'),
                  ('z', D['plTop'] - D['plAlto'], 'Pestaña inferior del lateral')]
        for eje, off, nombre in planos:
            try:
                wp = self.plano(cd, eje, off); wp.Name = nombre[:60]; wp.Visible = False
            except Exception as e:
                self.log.append(f'Ref plano {nombre}: {e}')
        try:
            dt = doc.PropertySets.Item('Design Tracking Properties')
            dt.Item('Part Number').Value = f'Ref_{nombre_eq}'
            dt.Item('Description').Value = f'Esqueleto de referencia {nombre_eq}: {npar} parámetros del generador + planos de trabajo'
            dt.Item('Project').Value = 'LBP530-18 · Conveyone'
        except Exception as e:
            self.log.append(f'Ref iProperties → {e}')
        if os.path.exists(path): os.remove(path)
        doc.SaveAs(path, False); doc.Close(True)
        print(f'   ipt {os.path.relpath(path, self.out)}  (esqueleto: {npar} parámetros, {len(planos)} planos)')
        return path


    # --- piezas de CHAPA (sheet metal real, con desarrollo) -----------------
    def _sk_perfil(self, smd, eje, coord, pts, cerrado):
        """Boceto del perfil en el plano perpendicular a `eje` a la cota `coord` (mm).
        `pts` son coordenadas de mundo de los otros dos ejes, en orden x→(y,z), y→(x,z), z→(x,y)."""
        wp = self.plano(smd, eje, coord)
        sk = smd.Sketches.Add(wp)
        mundo = []
        for a, b in pts:
            if eje == 'x':   mundo.append((coord, a, b))
            elif eje == 'y': mundo.append((a, coord, b))
            else:            mundo.append((a, b, coord))
        p2 = [self.pt2(sk, *q) for q in mundo]
        lineas = []
        n = len(p2) if cerrado else len(p2) - 1
        for i in range(n):
            a = lineas[-1].EndSketchPoint if lineas else p2[0]
            b = lineas[0].StartSketchPoint if (cerrado and i == n - 1) else p2[(i + 1) % len(p2)]
            lineas.append(sk.SketchLines.AddByTwoPoints(a, b))
        return sk, lineas

    def _bbox(self, cd):
        r = cd.RangeBox
        return [round(v * 10, 2) for v in (r.MinPoint.X, r.MinPoint.Y, r.MinPoint.Z,
                                           r.MaxPoint.X, r.MaxPoint.Y, r.MaxPoint.Z)]

    def _dista_bbox(self, a, b):
        return max(abs(a[i] - b[i]) for i in range(6)) if a and b else 1e9

    def _flange_orejas(self, smd, smf, ch, part):
        """Orejas del travesaño: pestaña de 90° en las aristas de los extremos del alma."""
        hechas = 0
        cuerpo = smd.SurfaceBodies.Item(1)
        for pest in ch.get('pestanas', []):
            eje = pest['borde']['eje']; val = pest['borde']['valor']
            objetivo = {'x': 0, 'y': 1, 'z': 2}[eje]
            cand = []
            for e in cuerpo.Edges:
                try:
                    if e.GeometryType != K.kLineSegmentCurve: continue
                    g = e.Geometry
                    p0 = [g.StartPoint.X * 10, g.StartPoint.Y * 10, g.StartPoint.Z * 10]
                    p1 = [g.EndPoint.X * 10, g.EndPoint.Y * 10, g.EndPoint.Z * 10]
                except Exception:
                    continue
                if abs(p0[objetivo] - val) > 0.6 or abs(p1[objetivo] - val) > 0.6: continue
                largo = math.dist(p0, p1)
                if largo < pest['ancho'] * 0.5: continue
                zmed = (p0[2] + p1[2]) / 2
                cand.append((zmed, largo, e))
            if not cand:
                self.log.append(f"{part['name'][:40]}: sin arista para la oreja en {eje}={val}")
                continue
            # la oreja cuelga del ALMA: se prueban las aristas candidatas (arriba/abajo) y se
            # deja la que acerca la pieza a la envolvente del modelo
            cand.sort(key=lambda q: (-q[0], -q[1]))
            esperado = part.get('bbox')
            puesta = False
            for _, _, arista in cand[:3]:
                antes = self._dista_bbox(self._bbox(smd), esperado) if esperado else 1e9
                col = self.app.TransientObjects.CreateEdgeCollection()
                col.Add(arista)
                try:
                    d = smf.FlangeFeatures.CreateFlangeDefinition(col, '90 deg', f"{pest['alto']} mm")
                    f = smf.FlangeFeatures.Add(d)
                except Exception as e:
                    self.log.append(f"{part['name'][:40]}: oreja → {e}")
                    continue
                if esperado and self._dista_bbox(self._bbox(smd), esperado) > antes + 0.01:
                    try: f.Delete()
                    except Exception: pass
                    continue
                puesta = True; hechas += 1
                break
            if not puesta:
                self.log.append(f"{part['name'][:40]}: oreja en {eje}={val} no colocada")
        return hechas

    def pieza_chapa(self, part, nombre, path, esperado):
        """Construye la pieza como CHAPA de Inventor: pestaña de contorno (o cara, si es
        plana), pliegues, cortes y DESPLEGADO. Devuelve el documento o None."""
        ch = part['chapa']
        tol = 0.8 if not ch.get('pestanas') else max(p['alto'] for p in ch['pestanas']) + 5
        mejor = None
        for intento in range(4):
            invertir = bool(intento & 1)        # voltea el lado del espesor
            negativo = bool(intento & 2)        # voltea el sentido de la extrusión
            doc = CastTo(self.app.Documents.Add(K.kPartDocumentObject, self.tpl_sm, False), 'PartDocument')
            smd = CastTo(doc.ComponentDefinition, 'SheetMetalComponentDefinition')
            smf = CastTo(smd.Features, 'SheetMetalFeatures')
            try:
                smd.UseSheetMetalStyleThickness = False
                smd.Thickness.Expression = f"{ch['t']} mm"
                if ch.get('plana'):
                    # la cara crece hacia un lado: el boceto va en una de las dos caras
                    pts = ch['contorno']
                    off = ch['at'] + (ch['t'] / 2 if invertir else -ch['t'] / 2)
                    sk, _ = self._sk_perfil(smd, ch['eje'], off, pts, True)
                    prof = sk.Profiles.AddForSolid()
                    smf.FaceFeatures.Add(smf.FaceFeatures.CreateFaceFeatureDefinition(prof))
                else:
                    pts = ch['perfil'][::-1] if invertir else ch['perfil']
                    sk, lineas = self._sk_perfil(smd, ch['eje'], ch['a'], pts, False)
                    d = smf.ContourFlangeFeatures.CreateContourFlangeDefinition(smd.Features.CreatePath(lineas[0]))
                    try: d.BendRadius = f"{ch.get('radio', ch['t'])} mm"
                    except Exception as e: self.log.append(f"{nombre}: radio de pliegue → {e}")
                    d.SetDistanceExtent(cm(ch['b'] - ch['a']),
                                        K.kNegativeExtentDirection if negativo else K.kPositiveExtentDirection)
                    smf.ContourFlangeFeatures.Add(d)
                bb = self._bbox(smd)
                dif = self._dista_bbox(bb, esperado)
                if os.environ.get('DBG_CHAPA'):
                    print(f'      [{nombre}] intento {intento} inv={invertir} neg={negativo} bbox={bb} esperado={esperado} dif={round(dif,2)}')
                if mejor is None or dif < mejor[0] - 0.01:
                    if mejor is not None:
                        try: mejor[1].Close(True)
                        except Exception: pass
                    mejor = (dif, doc, smd, smf)
                else:
                    doc.Close(True)
                if dif > tol and intento < 3:
                    continue
                dif, doc, smd, smf = mejor
                if dif > tol:
                    self.log.append(f'{nombre}: chapa con desviación {round(dif, 2)} mm respecto del modelo')
                self._flange_orejas(smd, smf, ch, part)
                # cortes (agujeros y cuadrados del perno coche)
                ok = fallas = 0
                for f in part['features']:
                    if f['op'] != 'cut' and f['shape'] != 'hole': continue
                    try:
                        self.feature(smd, f, False); ok += 1
                    except Exception as e:
                        fallas += 1
                        self.log.append(f'{nombre}: corte {f.get("name", "")[:30]} → {e}')
                try:
                    smd.Unfold()
                    fp = smd.FlatPattern
                    self.chapas[path] = {'largo': round(fp.Length * 10, 1), 'ancho': round(fp.Width * 10, 1),
                                         't': ch['t'], 'nombre': nombre}
                    fp.ExitEdit()
                    # DXF 1:1 del desarrollo, exportado por Inventor (como el Pedido\DXF del ZP2026)
                    dxf = os.path.join(self.out, 'Planos', 'DXF', f'{nombre}_e{ch["t"]:g}.dxf')
                    if self.dxf_desarrollo(doc, dxf):
                        self.chapas[path]['dxf'] = dxf
                except Exception as e:
                    self.log.append(f'{nombre}: desplegado → {e}')
                print(f'   chapa {nombre}  e{ch["t"]}  {ok} cortes' +
                      (f', {fallas} fallidos' if fallas else '') +
                      (f'  desarrollo {self.chapas[path]["largo"]}×{self.chapas[path]["ancho"]}' if path in self.chapas else ''))
                return doc
            except Exception as e:
                self.log.append(f'{nombre}: chapa intento {intento} → {e}')
                try: doc.Close(True)
                except Exception: pass
        return None

    def dxf_desarrollo(self, doc, destino):
        """DXF 1:1 del desarrollo, exportado por Inventor (reemplaza al DXF analítico)."""
        try:
            smd = CastTo(doc.ComponentDefinition, 'SheetMetalComponentDefinition')
            if not smd.HasFlatPattern: smd.Unfold()
            os.makedirs(os.path.dirname(destino), exist_ok=True)
            if os.path.exists(destino): os.remove(destino)
            cfg = ('FLAT PATTERN DXF?AcadVersion=2000&OuterProfileLayer=IV_INTERIOR_PROFILES'
                   '&InvisibleLayers=IV_TANGENT;IV_ARC_CENTERS')
            smd.DataIO.WriteDataToFile(cfg, destino)
            return os.path.exists(destino)
        except Exception as e:
            self.log.append(f'DXF desarrollo {os.path.basename(destino)}: {e}')
            return False

    # --- ensamble ----------------------------------------------------------
    def ensamble(self, doc_json, L, nombre_eq, carpeta_base):
        parts = [q for q in doc_json['parts'] if self.con_rodillos or 'Rodillos LBP' not in q['name']]
        if len(parts) != len(doc_json['parts']):
            self.log.append(f'{nombre_eq}: pieza cosmética «Rodillos LBP» omitida en Inventor (1164 cilindros); usar --con-rodillos para incluirla')
        asm = CastTo(self.app.Documents.Add(K.kAssemblyDocumentObject, self.tpl_asm, False), 'AssemblyDocument')
        acd = asm.ComponentDefinition
        n = 0
        nRef = 0
        # esqueleto de referencia (primera ocurrencia, fijada)
        try:
            ref_path = self.esqueleto(L, nombre_eq, doc_json, carpeta_base)
            occ = acd.Occurrences.Add(ref_path, self.tg.CreateMatrix()); occ.Grounded = True
        except Exception as e:
            self.log.append(f'{nombre_eq}: esqueleto → {e}')
        # subensambles: agrupar por archivo + origen
        grupos = {}
        for part in parts:
            if part.get('sub'):
                key = (part['sub']['archivo'], tuple(part['sub']['origen']))
                grupos.setdefault(key, []).append(part)
        for (archivo, origen), grupo in grupos.items():
            path = self.subensamble(archivo, grupo, L, carpeta_base)
            if self.subs.get(path) != sum(1 for p in grupo if not p.get('ref') or self.referencia(p['ref'], carpeta_base)):
                self.log.append(f'{nombre_eq}: grupo {archivo} en {origen} con distinto número de piezas que el primero')
            m = self.tg.CreateMatrix()
            m.SetTranslation(self.tg.CreateVector(cm(origen[0]), cm(origen[1]), cm(origen[2])), False)
            occ = acd.Occurrences.Add(path, m); occ.Grounded = True
            n += 1; nRef += sum(1 for p in grupo if p.get('ref'))
        for part in parts:
            if part.get('sub'): continue
            ref = part.get('ref')
            path = self.referencia(ref, carpeta_base) if ref else self.pieza(part, L, carpeta_base)
            if not path: continue
            if ref: nRef += 1
            self._colocar(acd, path, part)
            n += 1
        try:
            dt = asm.PropertySets.Item('Design Tracking Properties')
            dt.Item('Part Number').Value = nombre_eq
            dt.Item('Description').Value = doc_json['meta']['nombre'][:120]
            dt.Item('Project').Value = 'LBP530-18 · Conveyone'
        except Exception as e:
            self.log.append(f'{nombre_eq}: iProperties → {e}')
        path = os.path.join(carpeta_base, nombre_eq + '.iam')
        if os.path.exists(path): os.remove(path)
        asm.SaveAs(path, False)
        print(f'   iam {os.path.relpath(path, self.out)}  ({n} ocurrencias, {nRef} piezas reales referenciadas [ZP2026 + Content Center + UCF206], {len(self.cache)} piezas distintas acumuladas)')
        return asm, path


    # --- ayudas de plano (estándar BRP/Merge) ------------------------------
    def _hoja_a3(self, drw, primera, nombre):
        if primera:
            sh = drw.Sheets.Item(1)
            sh.Size = K.kA3DrawingSheetSize
        else:
            sh = drw.Sheets.Add(K.kA3DrawingSheetSize, K.kLandscapePageOrientation, nombre[:60])
            try:
                if sh.Border is None: sh.AddDefaultBorder()
            except Exception as e: self.log.append(f'borde {nombre}: {e}')
            try:
                if sh.TitleBlock is None: sh.AddTitleBlock(drw.TitleBlockDefinitions.Item(1))
            except Exception as e: self.log.append(f'cajetín {nombre}: {e}')
        sh.Name = nombre[:60]
        return sh

    def _titulo(self, sh, texto, x=21.0, y=27.6, alto=0.55):
        """Rótulo de la lámina, como el «Travesaño BRP ( 1 : 3 )» del estándar."""
        try:
            t = sh.DrawingNotes.GeneralNotes.AddFitted(self.tg.CreatePoint2d(x, y),
                f'<StyleOverride Bold="True">{texto}</StyleOverride>')
            return t
        except Exception as e:
            self.log.append(f'rótulo: {e}')
            try: return sh.DrawingNotes.GeneralNotes.AddFitted(self.tg.CreatePoint2d(x, y), texto)
            except Exception: return None

    def _tabla(self, sh, x, y, filas, titulo='TABLA'):
        """Tabla ITEM/DETALLE del estándar (MATERIAL A36, ESPESOR 3 mm, CANTIDAD…).
        CustomTables.Add no acepta los arreglos por COM en esta versión, así que la tabla
        se dibuja en el boceto de la hoja (marco + separadores) con una nota por celda:
        en el PDF se ve igual que la TABLA de las láminas del BRP/Merge."""
        tg = self.tg
        w1, w2, hf = 2.8, 5.4, 0.55
        n = len(filas) + 1
        try:
            try: sh.Parent.Update()
            except Exception: pass
            sk = sh.Sketches.Add()
            sk.Edit()
            def linea(a, b):
                sk.SketchLines.AddByTwoPoints(tg.CreatePoint2d(*a), tg.CreatePoint2d(*b))
            x1, x2, yTop = x + w1, x + w1 + w2, y + n * hf
            linea((x, y), (x2, y)); linea((x, yTop), (x2, yTop))
            linea((x, y), (x, yTop)); linea((x2, y), (x2, yTop)); linea((x1, y), (x1, yTop))
            for i in range(1, n):
                linea((x, y + i * hf), (x2, y + i * hf))
            sk.ExitEdit()
        except Exception as e:
            self.log.append(f'tabla (marco): {e}')
        try:
            gn = sh.DrawingNotes.GeneralNotes
            gn.AddFitted(tg.CreatePoint2d(x + 0.15, y + n * hf - 0.16), f'<StyleOverride Bold="True">{titulo}</StyleOverride>')
            for i, (a, b) in enumerate(filas):
                yy = y + (n - 1 - i) * hf - 0.16
                gn.AddFitted(tg.CreatePoint2d(x + 0.15, yy), str(a))
                gn.AddFitted(tg.CreatePoint2d(x + w1 + 0.15, yy), str(b))
            return True
        except Exception as e:
            self.log.append(f'tabla: {e}')
            return None


    def _cotas_envolventes(self, sh, vista, horizontal=True, vertical=True):
        """Cotas de contorno de una vista: ancho y alto totales (como el estándar)."""
        n = 0
        try:
            curvas = [c for c in vista.DrawingCurves]
            lineas = []
            for c in curvas:
                try:
                    if c.CurveType != K.kLineSegmentCurve: continue
                    p1, p2 = c.StartPoint, c.EndPoint
                    lineas.append((p1, p2, abs(p2.X - p1.X), abs(p2.Y - p1.Y), c))
                except Exception:
                    continue
            gd = sh.DrawingDimensions.GeneralDimensions
            if horizontal:
                vert = [q for q in lineas if q[2] < 0.02 and q[3] > 0.2]
                if len(vert) >= 2:
                    izq = min(vert, key=lambda q: q[0].X); der = max(vert, key=lambda q: q[0].X)
                    if abs(der[0].X - izq[0].X) > 0.3:
                        gd.AddLinear(self.tg.CreatePoint2d((izq[0].X + der[0].X) / 2, vista.Center.Y - vista.Height / 2 - 1.2),
                                     sh.CreateGeometryIntent(izq[4]), sh.CreateGeometryIntent(der[4]), K.kAlignedDimensionType)
                        n += 1
            if vertical:
                hor = [q for q in lineas if q[3] < 0.02 and q[2] > 0.2]
                if len(hor) >= 2:
                    aba = min(hor, key=lambda q: q[0].Y); arr = max(hor, key=lambda q: q[0].Y)
                    if abs(arr[0].Y - aba[0].Y) > 0.3:
                        gd.AddLinear(self.tg.CreatePoint2d(vista.Center.X - vista.Width / 2 - 1.2, (aba[0].Y + arr[0].Y) / 2),
                                     sh.CreateGeometryIntent(aba[4]), sh.CreateGeometryIntent(arr[4]), K.kAlignedDimensionType)
                        n += 1
        except Exception as e:
            self.log.append(f'cotas envolventes: {e}')
        return n

    def _vista_desplegada(self, sh, pdoc, pos, escala):
        """Vista de pieza desplegada (flat pattern), como las láminas «corte y plegado»."""
        opts = self.app.TransientObjects.CreateNameValueMap()
        opts.Add('SheetMetalFoldedModel', False)
        return sh.DrawingViews.AddBaseView(pdoc, pos, escala, K.kFrontViewOrientation,
                                           K.kHiddenLineRemovedDrawingViewStyle, '', None, opts)

    def _marcas(self, sh, vista, asm, pl):
        """Marcas de ítem sobre la vista, numeradas según la LISTA DE PIEZAS (el estándar
        del «Armado de Merge» las lleva con globo; Balloons/LeaderNotes no aceptan la
        llamada por COM en esta versión, así que se rotula el número junto a la pieza)."""
        mapa = {}
        try:
            for i in range(1, pl.PartsListRows.Count + 1):
                fila = pl.PartsListRows.Item(i)
                try:
                    mapa[str(fila.Item(3).Value)] = str(fila.Item(1).Value)
                except Exception:
                    continue
        except Exception as e:
            self.log.append(f'marcas (lista): {e}')
            return 0
        puestas = set()
        n = 0
        for occ in asm.ComponentDefinition.Occurrences:
            try:
                pn = str(occ.Name).split(':')[0]
                if pn in puestas or pn not in mapa: continue
                if re.match(r'^(ANSI|ASTM|AS 2465|Ref_)', pn): continue
                t = occ.Transformation.Translation
                p = vista.ModelToSheetSpace(self.tg.CreatePoint(t.X, t.Y, t.Z))
                if not p: continue
                sh.DrawingNotes.GeneralNotes.AddFitted(p, f'<StyleOverride Bold="True">({mapa[pn]})</StyleOverride>')
                puestas.add(pn); n += 1
                if n >= 14: break
            except Exception as e:
                self.log.append(f'marca {getattr(occ, "Name", "?")[:24]}: {str(e)[:50]}')
        return n

    # --- planos --------------------------------------------------------------
    def pdf(self, drw, path_pdf):
        addin = None
        for i in range(1, self.app.ApplicationAddIns.Count + 1):
            a = self.app.ApplicationAddIns.Item(i)
            if a.ClassIdString.upper() == '{0AC6FD96-2F4D-42CE-8BE0-8AEA580399E4}': addin = CastTo(a, 'TranslatorAddIn')
        if not addin: self.log.append('sin traductor PDF'); return
        if not addin.Activated: addin.Activate()
        ctx = self.app.TransientObjects.CreateTranslationContext(); ctx.Type = K.kFileBrowseIOMechanism
        opts = self.app.TransientObjects.CreateNameValueMap()
        if addin.HasSaveCopyAsOptions(drw, ctx, opts):
            for k, v in (('All_Color_AS_Black', 0), ('Remove_Line_Weights', 0), ('Vector_Resolution', 400), ('Sheet_Range', 14082)):
                try: opts.SetValue(k, v)
                except Exception as e: self.log.append(f'pdf opción {k}: {e}')
        if os.path.exists(path_pdf): os.remove(path_pdf)
        dm = self.app.TransientObjects.CreateDataMedium(); dm.FileName = path_pdf
        addin.SaveCopyAs(drw, ctx, opts, dm)
        print(f'   pdf {os.path.relpath(path_pdf, self.out)}')

    def plano_ga(self, asm, asm_path, L, nombre_eq, numero, carpeta_planos, escala):
        """Lámina A1: PLANTA (Inventor Front = mira desde +Z), ELEVACIÓN (Inventor
        Bottom = mira desde −Y con Z arriba: costado libre), CORTE A-A longitudinal
        (línea a lo largo de X sobre la planta → plano Y=0), isométrica y lista de
        piezas. Orientaciones verificadas en Inventor 2027 el 2026-09-08."""
        tg = self.tg
        drw = CastTo(self.app.Documents.Add(K.kDrawingDocumentObject, self.tpl_drw, False), 'DrawingDocument')
        sheet = drw.Sheets.Item(1)
        sheet.Size = K.kA1DrawingSheetSize      # 841 × 594
        sheet.Name = 'GA y corte A-A'
        W, H = 84.1, 59.4
        colDer = 30.0                           # columna derecha reservada a lista de piezas e iso
        cx = (W - colDer) / 2 + 1.5
        gap = 2.5
        # planta arriba; su altura real decide dónde van la elevación y el corte
        planta = sheet.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(cx, H - 4.0), escala, K.kFrontViewOrientation, K.kHiddenLineRemovedDrawingViewStyle)
        planta.Name = 'PLANTA'
        drw.Update()
        # escala normalizada: la mayor de la serie que deja la vista dentro del ancho útil
        util = W - colDer - 5.0
        if planta.Width > 0.1:
            largoCm = planta.Width / escala
            for e in (1, 0.5, 0.3333, 0.25, 0.2, 0.1667, 0.125, 0.1, 0.0833, 0.0667, 0.05, 0.04, 0.0333, 0.025, 0.02):
                if largoCm * e <= util:
                    escala = e; break
            planta.Scale = escala
            drw.Update()
        planta.Center = tg.CreatePoint2d(3.0 + planta.Width / 2, H - 3.0 - planta.Height / 2)
        cx = planta.Center.X
        yTop = planta.Center.Y - planta.Height / 2
        elev = sheet.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(cx, yTop - gap - 10), escala, K.kBottomViewOrientation, K.kHiddenLineRemovedDrawingViewStyle)
        elev.Name = 'ELEVACION (costado libre)'
        elev.Center = tg.CreatePoint2d(cx, yTop - gap - elev.Height / 2)
        yTop2 = elev.Center.Y - elev.Height / 2
        # corte A-A longitudinal: línea a lo largo de X por el eje Y=0 del modelo,
        # en coordenadas del BOCETO de la vista (SheetToSketchSpace; verificado 2026-09-08)
        a = planta.ModelToSheetSpace(tg.CreatePoint(cm(-60), 0, 0))
        b = planta.ModelToSheetSpace(tg.CreatePoint(cm(L + 60), 0, 0))
        sk = planta.Sketches.Add(); sk.Edit()
        sk.SketchLines.AddByTwoPoints(sk.SheetToSketchSpace(a), sk.SheetToSketchSpace(b))
        sk.ExitEdit()
        try:
            corte = sheet.DrawingViews.AddSectionView(planta, sk, tg.CreatePoint2d(cx, max(6.0, yTop2 - gap - 12)), K.kHiddenLineRemovedDrawingViewStyle, escala, True, 'A', False, True)
            drw.Update()
            corte.Center = tg.CreatePoint2d(cx, max(4.0 + corte.Height / 2, yTop2 - gap - corte.Height / 2))
        except Exception as e:
            self.log.append(f'{nombre_eq}: corte A-A → {e}')
        try:
            iso = sheet.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(W - colDer - 14.0, 12.0), escala * 0.4, K.kIsoTopRightViewOrientation, K.kShadedDrawingViewStyle)
            iso.Name = 'ISO'
            iso.Center = tg.CreatePoint2d(W - colDer - 2.0 - iso.Width / 2, 3.0 + iso.Height / 2)   # esquina inferior derecha del área de dibujo (la lista ocupa toda la columna)
        except Exception as e:
            self.log.append(f'{nombre_eq}: iso → {e}')
        try:
            pl = sheet.PartsLists.Add(planta, tg.CreatePoint2d(W - 1.0, H - 1.0))
            try:
                anchos = {'ELEMENTO': 1.4, 'CTDAD': 1.2, 'Nº DE PIEZA': 8.0, 'DESCRIPCIÓN': 16.0}
                for c in range(1, pl.PartsListColumns.Count + 1):
                    col = pl.PartsListColumns.Item(c)
                    if col.Title in anchos: col.Width = anchos[col.Title]
            except Exception as e:
                self.log.append(f'{nombre_eq}: anchos de lista → {e}')
            # la lámina GA muestra la lista SIN la pernería (Content Center); la lista completa va en la hoja 2
            ocultas = 0
            for i in range(1, pl.PartsListRows.Count + 1):
                row = pl.PartsListRows.Item(i)
                try:
                    pn = str(row.Item(3).Value)
                except Exception:
                    pn = ''
                if re.match(r'^(ANSI|ASTM|AS 2465|DIN6885|Retencion)', pn):
                    try: row.Visible = False; ocultas += 1
                    except Exception: pass
            if ocultas:
                sheet.DrawingNotes.GeneralNotes.AddFitted(tg.CreatePoint2d(W - colDer + 0.5, 1.2), f'Pernería (perno coche 3/8 + golillas + tuerca, {ocultas} ítems) en la lista completa de la hoja 2')
            marcas = self._marcas(sheet, planta, asm, pl)
            if marcas: print(f'   marcas de ítem: {marcas}')
        except Exception as e:
            self.log.append(f'{nombre_eq}: lista de piezas → {e}')
        try:
            sh2 = drw.Sheets.Add(K.kA3DrawingSheetSize, K.kLandscapePageOrientation, 'Lista de piezas completa')
            try:
                if sh2.Border is None: sh2.AddDefaultBorder()
                if sh2.TitleBlock is None: sh2.AddTitleBlock(drw.TitleBlockDefinitions.Item(1))
            except Exception: pass
            v2 = sh2.DrawingViews.AddBaseView(asm, tg.CreatePoint2d(8.0, 8.0), escala * 0.25, K.kIsoTopRightViewOrientation, K.kShadedDrawingViewStyle)
            sh2.PartsLists.Add(v2, tg.CreatePoint2d(41.0, 28.0))
            sh2.DrawingNotes.GeneralNotes.AddFitted(tg.CreatePoint2d(1.5, 2.5), f'{nombre_eq} · lista de piezas completa (incluye pernería Content Center, piezas reales ZP2026 y subensambles)')
            drw.Sheets.Item(1).Activate()
        except Exception as e:
            self.log.append(f'{nombre_eq}: hoja 2 lista completa → {e}')
        try:
            sheet.DrawingNotes.GeneralNotes.AddFitted(tg.CreatePoint2d(2.5, 5.5),
                f'{nombre_eq} · Movex 530 18 in · L nose a nose {L} · bottom head drive según manual Movex p.72 · corte A-A por el plano medio · piezas FAB pintadas RAL 7035 · fuente: gen_lbp530.mjs (capa user) → inventor_lbp530.py')
        except Exception as e:
            self.log.append(f'{nombre_eq}: nota GA → {e}')
        try:
            dt = drw.PropertySets.Item('Design Tracking Properties')
            dt.Item('Part Number').Value = numero
            dt.Item('Description').Value = f'{nombre_eq} — arreglo general y corte longitudinal A-A (Movex 530, 18 in, L={L})'
            dt.Item('Project').Value = 'LBP530-18 · Conveyone'
            drw.PropertySets.Item('Inventor Summary Information').Item('Title').Value = f'{nombre_eq} GA / corte A-A'
        except Exception as e:
            self.log.append(f'{nombre_eq}: iProperties plano → {e}')
        path = os.path.join(carpeta_planos, f'{numero} {nombre_eq} GA-corte.idw')
        if os.path.exists(path): os.remove(path)
        drw.SaveAs(path, False)
        print(f'   idw {os.path.relpath(path, self.out)}  ({sheet.DrawingViews.Count} vistas)')
        self.pdf(drw, os.path.splitext(path)[0] + '.pdf')
        drw.Close(True)
        return path

    def planos_fab(self, doc_json, L, nombre_eq, numero, carpeta_planos):
        """Una lámina A3 por pieza FAB, al estándar de las bandas de referencia
        («corte y plegado» del Merge / BRP): vistas plegadas acotadas, secciones del
        perfil, VISTA DE PIEZA DESPLEGADA, isométrica sombreada y tabla ITEM/DETALLE."""
        tg = self.tg
        vistos = set(); piezas = []
        for part in doc_json['parts']:
            if not part['name'].startswith('FAB') or part.get('ref'): continue
            key = firma(part)
            if key in vistos: continue
            vistos.add(key)
            piezas.append((part, self.cache.get(key), sum(1 for q in doc_json['parts'] if firma(q) == key)))
        if not piezas: return None
        drw = CastTo(self.app.Documents.Add(K.kDrawingDocumentObject, self.tpl_drw, False), 'DrawingDocument')
        W, H = 42.0, 29.7
        primera = True
        for i, (part, path, cant) in enumerate(piezas, 1):
            if not path: continue
            nombre, _ = nombre_inventor(part['name'], L)
            sheet = self._hoja_a3(drw, primera, f'{i:02d} {nombre}')
            primera = False
            pdoc = self.app.Documents.Open(path, False)
            esChapa = bool(part.get('chapa'))
            bb = part.get('bbox') or [0, 0, 0, 100, 100, 100]
            dx, dy, dz = (bb[3] - bb[0]) or 1, (bb[4] - bb[1]) or 1, (bb[5] - bb[2]) or 1
            menor = min(dx, dy, dz)
            if menor == dz:   orient, (wv, hv, prof) = K.kFrontViewOrientation, (dx, dy, dz)
            elif menor == dy: orient, (wv, hv, prof) = K.kBottomViewOrientation, (dx, dz, dy)
            else:             orient, (wv, hv, prof) = K.kRightViewOrientation, (dy, dz, dx)
            # escala normalizada que deja la vista principal y el desplegado en la hoja
            escala = 1.0
            for e in (1, 0.5, 0.3333, 0.25, 0.2, 0.1667, 0.125, 0.1, 0.0833, 0.0667, 0.05, 0.04, 0.0333, 0.025, 0.02):
                alto_total = cm(hv) * e + cm(prof) * e + (cm(max(hv, prof)) * e if esChapa else 0)
                if cm(max(wv, dx)) * e <= 23.0 and alto_total <= 17.0: escala = e; break
            try:
                yTop = 26.6
                v1 = sheet.DrawingViews.AddBaseView(pdoc, tg.CreatePoint2d(12.0, 20.0), escala, orient, K.kHiddenLineRemovedDrawingViewStyle)
                if max(dx, dy, dz) == dy and orient != K.kBottomViewOrientation:
                    try: v1.RotateByAngle(math.pi / 2, True)
                    except Exception as e: self.log.append(f'{nombre}: giro → {e}')
                drw.Update()
                v1.Center = tg.CreatePoint2d(4.5 + v1.Width / 2, yTop - v1.Height / 2)
                self._cotas_envolventes(sheet, v1)
                y = v1.Center.Y - v1.Height / 2 - 2.6
                # sección del perfil, como los cortes A-A del estándar (sólo chapa plegada)
                if esChapa and not part['chapa'].get('plana'):
                    try:
                        eje = part['chapa']['eje']
                        med = [(bb[0] + bb[3]) / 2, (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2]
                        # el plano de corte es perpendicular al eje de extrusión: la línea
                        # corre por uno de los otros dos ejes, de lado a lado de la pieza
                        libre = 1 if eje in ('x', 'z') else 0
                        p0, p1 = list(med), list(med)
                        p0[libre] = bb[libre] - 30; p1[libre] = bb[libre + 3] + 30
                        a = v1.ModelToSheetSpace(tg.CreatePoint(cm(p0[0]), cm(p0[1]), cm(p0[2])))
                        b = v1.ModelToSheetSpace(tg.CreatePoint(cm(p1[0]), cm(p1[1]), cm(p1[2])))
                        sk = v1.Sketches.Add(); sk.Edit()
                        sk.SketchLines.AddByTwoPoints(sk.SheetToSketchSpace(a), sk.SheetToSketchSpace(b))
                        sk.ExitEdit()
                        escSec = min(1.0, max(escala * 2, 0.25))
                        vs = sheet.DrawingViews.AddSectionView(v1, sk, tg.CreatePoint2d(v1.Center.X, y - 3.0),
                                                               K.kHiddenLineRemovedDrawingViewStyle, escSec, True, 'A', False, True)
                        drw.Update()
                        y = min(y, vs.Center.Y - vs.Height / 2) - 2.2
                    except Exception as e:
                        self.log.append(f'{nombre}: sección → {e}')
                else:
                    # piezas sin plegado: planta proyectada
                    try:
                        v2 = sheet.DrawingViews.AddProjectedView(v1, tg.CreatePoint2d(v1.Center.X, y - cm(prof) * escala / 2 - 0.5), K.kHiddenLineRemovedDrawingViewStyle)
                        drw.Update()
                        y = v2.Center.Y - v2.Height / 2 - 2.2
                    except Exception as e:
                        self.log.append(f'{nombre}: proyectada → {e}')
                # desplegado (sólo chapa), abajo a la izquierda
                if esChapa:
                    try:
                        vd = self._vista_desplegada(sheet, pdoc, tg.CreatePoint2d(12.0, 8.0), escala)
                        drw.Update()
                        yd = max(6.4 + vd.Height / 2, min(y - 0.8 - vd.Height / 2, 20.0))
                        vd.Center = tg.CreatePoint2d(4.5 + vd.Width / 2, yd)
                        self._cotas_envolventes(sheet, vd)
                        sheet.DrawingNotes.GeneralNotes.AddFitted(
                            tg.CreatePoint2d(2.4, vd.Center.Y + vd.Height / 2 + 0.5),
                            f'Vista de pieza desplegada ( 1 : {round(1 / escala)} )')
                    except Exception as e:
                        self.log.append(f'{nombre}: desplegado → {e}')
                # isométrica sombreada, esquina inferior derecha
                try:
                    iso = sheet.DrawingViews.AddBaseView(pdoc, tg.CreatePoint2d(W - 9.0, 9.0), escala * 0.7, K.kIsoTopRightViewOrientation, K.kShadedDrawingViewStyle)
                    drw.Update()
                    iso.Center = tg.CreatePoint2d(W - 2.5 - iso.Width / 2, 6.0 + iso.Height / 2)
                except Exception as e:
                    self.log.append(f'{nombre}: iso → {e}')
                # rótulo y tabla del estándar
                titulo = re.sub(r'^FAB\s*[·.-]\s*', '', part['name']).split('—')[0].split('(')[0].strip()
                self._titulo(sheet, f'{titulo} ( 1 : {round(1 / escala)} )', x=W / 2 - 3.0, y=28.4)
                filas = [('MATERIAL', 'A36'),
                         ('ESPESOR', f"{part['chapa']['t']:g} mm" if esChapa else '—'),
                         ('CANTIDAD', f'{cant} por {nombre_eq}'),
                         ('ACABADO', 'PINTADO RAL 7035')]
                if esChapa and path in self.chapas:
                    d = self.chapas[path]
                    filas.append(('DESARROLLO', f"{d['largo']} × {d['ancho']}"))
                self._tabla(sheet, 2.0, 2.9, filas)
                sheet.DrawingNotes.GeneralNotes.AddFitted(tg.CreatePoint2d(12.0, 2.0),
                    nombre + ' · ' + part['name'][:70] + BR +
                    'fuente: gen_lbp530.mjs (capa user) -> inventor_lbp530.py · tolerancia general ISO 2768-mK')
            except Exception as e:
                self.log.append(f'{nombre}: lámina → {e}')
            try:
                dtp = pdoc.PropertySets.Item('Design Tracking Properties')
                dtp.Item('Part Number').Value = nombre
            except Exception: pass
            print(f'   lámina {i:02d} {nombre} 1:{round(1 / escala)}' + ('  (chapa + desplegado)' if esChapa else ''))
            try: pdoc.Close(True)
            except Exception: pass
        try:
            dt = drw.PropertySets.Item('Design Tracking Properties')
            dt.Item('Part Number').Value = numero
            dt.Item('Description').Value = f'{nombre_eq} — láminas de corte y plegado (piezas FAB)'
            dt.Item('Project').Value = 'LBP530-18 · Conveyone'
        except Exception as e:
            self.log.append(f'{nombre_eq}: iProperties láminas → {e}')
        path = os.path.join(carpeta_planos, f'{numero} {nombre_eq} fabricacion.idw')
        if os.path.exists(path): os.remove(path)
        drw.SaveAs(path, False)
        print(f'   idw {os.path.relpath(path, self.out)}  ({drw.Sheets.Count} láminas)')
        self.pdf(drw, os.path.splitext(path)[0] + '.pdf')
        drw.Close(True)
        return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=OUT_DEFAULT)
    ap.add_argument('--solo', choices=['LBP', 'GT'])
    ap.add_argument('--sin-planos', action='store_true')
    ap.add_argument('--con-rodillos', action='store_true', help='modelar también los 1164 rodillos de la banda LBP (pesado)')
    ap.add_argument('--en-sesion-usuario', action='store_true', help='permite correr en una instancia con documentos del usuario abiertos (no se tocan; riesgo si Inventor cae)')
    ap.add_argument('--instancia-propia', action='store_true', help='arranca una instancia nueva de Inventor para la automatización (no toca la sesión del usuario)')
    args = ap.parse_args()
    dims = json.load(open(os.path.join(ENS, 'lbp530_dims.json'), encoding='utf-8'))
    GT_L = dims.get('GT_L', 800)
    equipos = [('LBP', 5000, 'lbp530_5m.json', 'CV-LBP-5000', 'LBP530-GA-01', 'LBP530-CH-01', 1 / 12),
               ('GT', GT_L, f'lbp530_gt{round(GT_L / 100):02d}.json', f'CV-GT-{GT_L}', 'LBP530-GA-02', 'LBP530-CH-02', 1 / 5)]   # 1:5 — con las patas ZP2026 el equipo mide ~1 m de alto
    if args.solo: equipos = [e for e in equipos if e[0] == args.solo]
    global PERMITIR_SESION_USUARIO
    PERMITIR_SESION_USUARIO = args.en_sesion_usuario
    app, iniciado = conectar(propia=args.instancia_propia)
    global K
    from win32com.client import constants as K2
    K = K2
    os.makedirs(args.out, exist_ok=True)
    planos = os.path.join(args.out, 'Planos'); os.makedirs(planos, exist_ok=True)
    cerrar_mios(app, args.out)
    silent_prev = app.SilentOperation
    app.SilentOperation = True
    t0 = time.time()
    ctor = Constructor(app, args.out)
    ctor.con_rodillos = args.con_rodillos
    resumen = []
    try:
        for tipo, L, jf, nombre_eq, numGA, numCH, escala in equipos:
            print(f'== {nombre_eq} ({jf})')
            doc_json = json.load(open(os.path.join(ENS, jf), encoding='utf-8'))
            asm, asm_path = ctor.ensamble(doc_json, L, nombre_eq, args.out)
            if not args.sin_planos:
                ctor.plano_ga(asm, asm_path, L, nombre_eq, numGA, planos, escala)
                ctor.planos_fab(doc_json, L, nombre_eq, numCH, planos)
            asm.Close(True)
            resumen.append((nombre_eq, len(doc_json['parts'])))
    except Exception:
        traceback.print_exc()
    finally:
        app.SilentOperation = silent_prev
    # proyecto de Inventor (.ipj) de la carpeta, como los .ipj del BRP / Merge / Gapper
    ipj = os.path.join(args.out, 'CV-LBP530-18.ipj')
    if not os.path.exists(ipj):
        # el .ipj del BRP es relativo (espacio de trabajo «.», Content Center «.\CC\»): sirve tal cual
        src = os.path.join(os.path.dirname(args.out.rstrip('\/')), 'Bandas de Recepción Pasiva', 'Bandas de Recepción Pasiva.ipj')
        try:
            shutil.copy2(src, ipj)
            print(f'   ipj {os.path.basename(ipj)}  (copiado del proyecto BRP: espacio de trabajo relativo + CC)')
        except Exception as e:
            ctor.log.append(f'proyecto .ipj → {e}')
    try:
        import csv as _csv
        rutaCsv = os.path.join(args.out, 'Planos', 'DXF', '_desarrollos.csv')
        os.makedirs(os.path.dirname(rutaCsv), exist_ok=True)
        with open(rutaCsv, 'w', encoding='utf-8', newline='') as fh:
            wcsv = _csv.writer(fh)
            wcsv.writerow(['pieza', 'espesor_mm', 'desarrollo_largo_mm', 'desarrollo_ancho_mm', 'dxf'])
            for _p, _d in sorted(ctor.chapas.items(), key=lambda q: q[1]['nombre']):
                wcsv.writerow([_d['nombre'], _d['t'], _d['largo'], _d['ancho'], os.path.basename(_d.get('dxf', ''))])
        print('   csv Planos/DXF/_desarrollos.csv  (' + str(len(ctor.chapas)) + ' desarrollos medidos por Inventor)')
    except Exception as e:
        ctor.log.append('csv de desarrollos: ' + str(e))
    print(f'\n{len(ctor.cache)} piezas .ipt distintas · {len(ctor.subs)} subensambles · {len(resumen)} ensambles · {round(time.time() - t0)} s')
    if ctor.log:
        print(f'\nAvisos ({len(ctor.log)}):')
        for l in ctor.log[:60]: print('  -', l)
    with open(os.path.join(args.out, '_inventor_log.txt'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(ctor.log))
    if iniciado:
        app.Quit()

if __name__ == '__main__':
    main()
