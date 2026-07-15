"""Carcasa parametrica para el ESP32 + adaptador de borneras (medidas reales).

Genera la GEOMETRIA DE CARCASA (base + tapa) y el ENSAMBLE alrededor del
registro `adaptador_borneras_esp32_70x80` del catalogo de componentes. Las
dimensiones de la placa (PCB, taladros, alturas, ventanas USB-C) se leen del
catalogo — capa `user`, medidas reales del usuario (case_esp32_v3.py) — y la
carcasa se deriva de ellas: una sola fuente de verdad.

Diseno (igual al script CadQuery original del usuario, rotado al convenio del
catalogo: largo en X):
  - Base con cavidad (holgura 6.5 por lado), 4 postes O6.5 para la PCB y
    4 torres O7 con piloto O2.7 x 12 para tornillos de tapa M3x16 avellanados
    DIN 965 (90 grados).
  - 2 ventanas USB-C de 10.5 x 5.2 en la pared X+ (centro a +1.8 sobre la PCB).
  - 3 muescas en U por pared larga (X = -30/0/+30, ancho 7, prof. 9.5 desde la
    costura, fondo redondeado) para sacar cables de las borneras; la tapa las
    cierra por arriba con su faldon.
  - Bridas laterales en los extremos X con ranura 5.4 x 11 (M5).
  - Tapa con faldon de 7, costillas de alineacion solo en extremos X (los
    lados largos quedan libres para cables), 2 ranuras superiores de acceso a
    borneras 72 x 12 (--tapa-ciega las quita), rebaje de etiqueta 0.8 y
    avellanados 90 grados (O3.4 pasante / O6.6).

Sin chaflan superior de 1 mm de la tapa (cosmetico, no soportado por el motor
de malla); el resto de la geometria es 1:1 con el original.

salidas (capa `user`, se regeneran de este script + catalogo):
  carcasa_base.glb/.stl        base imprimible
  carcasa_tapa.glb/.stl        tapa imprimible
  carcasa_ensamble.glb         base + placa + tapa montadas
  carcasa_ensamble_explotado.glb  tapa levantada para ver el interior
  carcasa_cad.json             documento foto3d-cad (3 piezas editables en cad/)

uso: python pipeline/carcasa_esp32.py [--salida <dir>] [--proyecto <X>] [--tapa-ciega]
  --proyecto <X>: escribe en projects/<X>/out/carcasa/ y registra en audit.log.
  Sin el: componentes/out/carcasa_esp32/ (fuera de git).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import trimesh
from shapely.geometry import LineString, box as sbox

sys.path.insert(0, str(Path(__file__).parent))
import lib_componentes as C
from lib_audit import audit, project_dir, sha256_file

COMP_ID = "adaptador_borneras_esp32_70x80"
ENGINE = "manifold"
SEGS = 48

# ---- Parametros de carcasa (reales, de case_esp32_v3.py del usuario) -------
WALL, FLOOR, LID_T = 2.4, 2.4, 2.4
PCB_GAP, SKIRT_H = 6.5, 7.0
BOSS_D, PILOT_D, PILOT_DEPTH = 7.0, 2.7, 12.0
CSK_THRU, CSK_D = 3.4, 6.6                       # M3 avellanado DIN 965 (90 grados)
FLG_OUT, FLG_W, FLG_T = 14.0, 28.0, 4.0          # bridas laterales
SLOT_W5, SLOT_L5 = 5.4, 11.0                     # ranura M5 de la brida
FILLET_V = 2.0                                   # radio aristas verticales
NOTCH_W, NOTCH_DEPTH = 7.0, 9.5                  # muescas de cable (paredes largas)
NOTCH_XS = (-30.0, 0.0, 30.0)
TERM_SLOT_W, TERM_SLOT_L = 12.0, 72.0            # ranuras superiores a borneras
RIB_T, RIB_DROP, RIB_L = 1.6, 2.5, 46.0          # costillas de alineacion de la tapa
LBL_MARGIN = 8.0                                 # rebaje de etiqueta en la tapa


class Dim:
    """Dimensiones derivadas del registro del catalogo + parametros de carcasa."""

    def __init__(self, comp: dict):
        pcb = next(s for s in comp["solidos"] if s.get("pcb"))
        car = comp["carcasa"]
        self.pcb_x, self.pcb_y, self.pcb_t = (float(v) for v in pcb["dim"])
        self.holes = [(float(a["pos"][0]), float(a["pos"][1]))
                      for a in comp["agujeros_montaje"]]
        self.board_screw = float(comp["agujeros_montaje"][0]["dia"])
        self.below, self.comp_h, self.top_clear = \
            car["below_pcb"], car["comp_h"], car["top_clear"]
        self.standoff_d, self.term_depth = car["standoff_d"], car["term_depth"]
        self.usb = car["usb"]

        self.cav_x, self.cav_y = self.pcb_x + 2 * PCB_GAP, self.pcb_y + 2 * PCB_GAP
        self.out_x, self.out_y = self.cav_x + 2 * WALL, self.cav_y + 2 * WALL
        self.int_h = self.below + self.pcb_t + self.comp_h + self.top_clear
        self.total = FLOOR + self.int_h + LID_T
        self.seam_z = self.total - LID_T - SKIRT_H
        self.boss_top = self.total - LID_T
        self.pcb_top = FLOOR + self.below + self.pcb_t
        bx = self.cav_x / 2 - BOSS_D / 2 + 0.3
        by = self.cav_y / 2 - BOSS_D / 2 + 0.3
        self.bosses = [(sx * bx, sy * by) for sx in (1, -1) for sy in (1, -1)]
        self.term_y = self.pcb_y / 2 - self.term_depth / 2   # eje de las borneras
        self.notch_bot = self.seam_z - NOTCH_DEPTH
        usb_tot = self.usb["n"] * self.usb["w"] + (self.usb["n"] - 1) * self.usb["gap"]
        self.usb_ys = [-usb_tot / 2 + self.usb["w"] / 2 + i * (self.usb["w"] + self.usb["gap"])
                       for i in range(self.usb["n"])]
        self.usb_zc = self.pcb_top + self.usb["zc"]


# ---- Primitivas de malla ----------------------------------------------------

def _caja(cx, cy, z0, wx, wy, h):
    m = trimesh.creation.box((wx, wy, h))
    m.apply_translation((cx, cy, z0 + h / 2))
    return m


def _cil(x, y, z0, dia, h):
    m = trimesh.creation.cylinder(radius=dia / 2, height=h, sections=SEGS)
    m.apply_translation((x, y, z0 + h / 2))
    return m


def _cil_y(x, z, dia, largo):
    """Cilindro horizontal con eje Y, centrado en Y=0."""
    m = trimesh.creation.cylinder(radius=dia / 2, height=largo, sections=SEGS)
    m.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, (1, 0, 0)))
    m.apply_translation((x, 0, z))
    return m


def _prisma_redondeado(wx, wy, h, r, z0=0.0):
    """Prisma de planta rectangular con esquinas redondeadas (fillet vertical)."""
    poly = sbox(-(wx / 2 - r), -(wy / 2 - r), wx / 2 - r, wy / 2 - r) \
        .buffer(r, quad_segs=SEGS // 4)
    m = trimesh.creation.extrude_polygon(poly, h)
    m.apply_translation((0, 0, z0))
    return m


def _capsula(cx, cy, z0, largo_x, ancho, h):
    """Ranura (slot) con extremos redondeados, eje largo en X."""
    li = LineString([(-(largo_x - ancho) / 2, 0), ((largo_x - ancho) / 2, 0)])
    m = trimesh.creation.extrude_polygon(li.buffer(ancho / 2, quad_segs=SEGS // 4), h)
    m.apply_translation((cx, cy, z0))
    return m


def _cono_avellanado(x, y, z_cara, dia):
    """Corte de avellanado 90 grados: cono con la boca O`dia` en `z_cara`
    (apex hacia abajo) + cilindro de escape por encima de la cara."""
    r = dia / 2
    cono = trimesh.creation.cone(radius=r, height=r, sections=SEGS)  # apex arriba
    cono.apply_transform(trimesh.transformations.rotation_matrix(np.pi, (1, 0, 0)))
    cono.apply_translation((x, y, z_cara))          # base en z_cara, apex z_cara - r
    escape = _cil(x, y, z_cara - 0.01, dia, 1.5)
    return trimesh.boolean.union([cono, escape], engine=ENGINE)


def _u(a, b):
    return trimesh.boolean.union([a, b], engine=ENGINE)


def _d(a, b):
    return trimesh.boolean.difference([a, b], engine=ENGINE)


# ---- Base -------------------------------------------------------------------

def build_base(d: Dim) -> trimesh.Trimesh:
    base = _prisma_redondeado(d.out_x, d.out_y, d.seam_z, FILLET_V)
    base = _d(base, _caja(0, 0, FLOOR, d.cav_x, d.cav_y, d.seam_z))

    # torres de tornillo de tapa (suben hasta el plano inferior de la tapa)
    for (x, y) in d.bosses:
        base = _u(base, _cil(x, y, FLOOR, BOSS_D, d.boss_top - FLOOR))
        base = _d(base, _cil(x, y, d.boss_top - PILOT_DEPTH, PILOT_D, PILOT_DEPTH + 0.5))
    # postes de la PCB con piloto para tornillo de placa
    for (x, y) in d.holes:
        base = _u(base, _cil(x, y, FLOOR, d.standoff_d, d.below))
        base = _d(base, _cil(x, y, FLOOR - 0.5, d.board_screw, d.below + 1.0))

    # ventanas USB-C en la pared X+
    for y in d.usb_ys:
        base = _d(base, _caja(d.out_x / 2 - (WALL + 3) / 2 + 1, y,
                              d.usb_zc - d.usb["h"] / 2, WALL + 3, d.usb["w"], d.usb["h"]))

    # bridas laterales con ranura M5 (extremos X)
    for sgn in (1, -1):
        fl = _prisma_redondeado(FLG_OUT + 0.2, FLG_W, FLG_T, 3.0)
        fl.apply_translation((sgn * (d.out_x / 2 + FLG_OUT / 2 - 0.1), 0, 0))
        base = _u(base, fl)
        base = _d(base, _capsula(sgn * (d.out_x / 2 + FLG_OUT * 0.55), 0, -0.5,
                                 SLOT_L5, SLOT_W5, FLG_T + 1.0))

    # muescas de cable en U (abiertas hacia la costura; cortan ambas paredes Y)
    r = NOTCH_W / 2
    for x in NOTCH_XS:
        base = _d(base, _caja(x, 0, d.notch_bot + r, NOTCH_W, d.out_y + 4,
                              d.seam_z + 2 - (d.notch_bot + r)))
        base = _d(base, _cil_y(x, d.notch_bot + r, NOTCH_W, d.out_y + 4))
    return base


# ---- Tapa -------------------------------------------------------------------

def build_tapa(d: Dim, top_slots: bool = True) -> trimesh.Trimesh:
    tapa = _prisma_redondeado(d.out_x, d.out_y, LID_T + SKIRT_H, FILLET_V, z0=d.seam_z)
    tapa = _d(tapa, _caja(0, 0, d.seam_z - 0.1, d.out_x - 2 * WALL,
                          d.out_y - 2 * WALL, SKIRT_H + 0.1))

    # costillas de alineacion SOLO en extremos X (lados largos libres p/ cables)
    for sgn in (1, -1):
        tapa = _u(tapa, _caja(sgn * (d.cav_x / 2 - 0.2 - RIB_T / 2), 0,
                              d.seam_z - RIB_DROP, RIB_T, RIB_L, SKIRT_H + RIB_DROP))

    if top_slots:  # ranuras superiores de acceso a las borneras
        for sgn in (1, -1):
            tapa = _d(tapa, _capsula(0, sgn * d.term_y, d.seam_z + SKIRT_H - 0.1,
                                     TERM_SLOT_L, TERM_SLOT_W, LID_T + 1.2))

    # rebaje de etiqueta entre las ranuras
    lbl_y = 2 * (d.term_y - TERM_SLOT_W / 2) - LBL_MARGIN
    rebaje = _prisma_redondeado(58.0, lbl_y, 1.3, 3.0, z0=d.total - 0.8)
    tapa = _d(tapa, rebaje)

    # pasantes avellanados M3 sobre las torres
    for (x, y) in d.bosses:
        tapa = _d(tapa, _cil(x, y, d.seam_z - 1, CSK_THRU, LID_T + SKIRT_H + 2))
        tapa = _d(tapa, _cono_avellanado(x, y, d.total, CSK_D))
    return tapa


# ---- Documento foto3d-cad (editable en cad/) --------------------------------

def _pts_redondeados(wx, wy, r, n=8):
    """Contorno de rectangulo redondeado para features de boceto."""
    cx, cy = wx / 2 - r, wy / 2 - r
    pts = []
    for k, (sx, sy) in enumerate([(1, 1), (-1, 1), (-1, -1), (1, -1)]):
        a0 = k * np.pi / 2
        for i in range(n + 1):
            a = a0 + i * (np.pi / 2) / n
            pts.append([round(sx * cx + r * np.cos(a), 3),
                        round(sy * cy + r * np.sin(a), 3)])
    return pts


def build_cad_doc(d: Dim, comp: dict, top_slots: bool = True) -> dict:
    """Documento foto3d-cad: base (fija) + placa + tapa, con features editables.
    El avellanado se aproxima con contracilindro O6.6 (el motor no hace conos)."""
    k = iter(range(1000))

    def F(shape, op, at, params, name, dirv=(0, 0, 1)):
        return {"id": f"fc{next(k)}", "name": name, "shape": shape, "op": op,
                "at": [float(v) for v in at], "dir": [float(v) for v in dirv],
                "params": params}

    def slot_feats(cx, cy, z0, largo, ancho, h, name, op="cut"):
        recto = largo - ancho
        fs = [F("box", op, [cx, cy, z0], {"w": recto, "d": ancho, "h": h}, name)]
        for s in (1, -1):
            fs.append(F("cylinder", op, [cx + s * recto / 2, cy, z0],
                        {"dia": ancho, "h": h}, name))
        return fs

    base = [F("sketch", "union", [0, 0, 0],
              {"pts": _pts_redondeados(d.out_x, d.out_y, FILLET_V),
               "h": d.seam_z, "u": [1, 0, 0]}, "Cuerpo base")]
    base.append(F("box", "cut", [0, 0, FLOOR],
                  {"w": d.cav_x, "d": d.cav_y, "h": d.seam_z}, "Cavidad"))
    for (x, y) in d.bosses:
        base.append(F("cylinder", "union", [x, y, FLOOR],
                      {"dia": BOSS_D, "h": d.boss_top - FLOOR}, "Torre M3"))
        base.append(F("hole", "cut", [x, y, d.boss_top],
                      {"dia": PILOT_D, "depth": PILOT_DEPTH, "through": False},
                      f"Piloto O{PILOT_D}", dirv=(0, 0, -1)))
    for (x, y) in d.holes:
        base.append(F("cylinder", "union", [x, y, FLOOR],
                      {"dia": d.standoff_d, "h": d.below}, "Poste PCB"))
        base.append(F("hole", "cut", [x, y, FLOOR + d.below],
                      {"dia": d.board_screw, "depth": d.below + 0.5, "through": False},
                      f"Piloto placa O{d.board_screw}", dirv=(0, 0, -1)))
    for y in d.usb_ys:
        base.append(F("box", "cut",
                      [d.out_x / 2 - (WALL + 3) / 2 + 1, y, d.usb_zc - d.usb["h"] / 2],
                      {"w": WALL + 3, "d": d.usb["w"], "h": d.usb["h"]}, "Ventana USB-C"))
    for sgn in (1, -1):
        base.append(F("box", "union", [sgn * (d.out_x / 2 + FLG_OUT / 2 - 0.1), 0, 0],
                      {"w": FLG_OUT + 0.2, "d": FLG_W, "h": FLG_T}, "Brida"))
        base += slot_feats(sgn * (d.out_x / 2 + FLG_OUT * 0.55), 0, -0.5,
                           SLOT_L5, SLOT_W5, FLG_T + 1.0, "Ranura M5")
    r = NOTCH_W / 2
    for x in NOTCH_XS:
        base.append(F("box", "cut", [x, 0, d.notch_bot + r],
                      {"w": NOTCH_W, "d": d.out_y + 4,
                       "h": d.seam_z + 2 - (d.notch_bot + r)}, "Muesca cable"))
        base.append(F("cylinder", "cut", [x, -(d.out_y / 2 + 2), d.notch_bot + r],
                      {"dia": NOTCH_W, "h": d.out_y + 4}, "Fondo muesca",
                      dirv=(0, 1, 0)))

    # tapa en coordenadas locales (origen en la costura), pos z = seam_z
    tapa = [F("sketch", "union", [0, 0, 0],
              {"pts": _pts_redondeados(d.out_x, d.out_y, FILLET_V),
               "h": LID_T + SKIRT_H, "u": [1, 0, 0]}, "Cuerpo tapa")]
    tapa.append(F("box", "cut", [0, 0, -0.1],
                  {"w": d.out_x - 2 * WALL, "d": d.out_y - 2 * WALL,
                   "h": SKIRT_H + 0.1}, "Hueco faldon"))
    for sgn in (1, -1):
        tapa.append(F("box", "union",
                      [sgn * (d.cav_x / 2 - 0.2 - RIB_T / 2), 0, -RIB_DROP],
                      {"w": RIB_T, "d": RIB_L, "h": SKIRT_H + RIB_DROP}, "Costilla"))
    if top_slots:
        for sgn in (1, -1):
            tapa += slot_feats(0, sgn * d.term_y, SKIRT_H - 0.1,
                               TERM_SLOT_L, TERM_SLOT_W, LID_T + 1.2, "Ranura borneras")
    lbl_y = 2 * (d.term_y - TERM_SLOT_W / 2) - LBL_MARGIN
    tapa.append(F("box", "cut", [0, 0, LID_T + SKIRT_H - 0.8],
                  {"w": 58.0, "d": lbl_y, "h": 1.3}, "Rebaje etiqueta"))
    for (x, y) in d.bosses:
        tapa.append(F("hole", "cut", [x, y, LID_T + SKIRT_H],
                      {"dia": CSK_THRU, "depth": 0, "through": True},
                      f"Pasante O{CSK_THRU}", dirv=(0, 0, -1)))
        tapa.append(F("cylinder", "cut",
                      [x, y, LID_T + SKIRT_H - (CSK_D - CSK_THRU) / 2],
                      {"dia": CSK_D, "h": 2.0}, "Avellanado (aprox)"))

    placa = C.cad_part(comp, 0, pos=(0, 0, FLOOR + d.below))
    placa["name"] = comp["nombre"]
    return {"format": "foto3d-cad", "version": 1, "parts": [
        {"id": "p_carcasa_base", "name": "Carcasa base", "color": "#3a3d45",
         "pos": [0, 0, 0], "quat": [0, 0, 0, 1], "fixed": True, "visible": True,
         "features": base},
        placa,
        {"id": "p_carcasa_tapa", "name": "Carcasa tapa", "color": "#4a4e59",
         "pos": [0, 0, d.seam_z], "quat": [0, 0, 0, 1], "fixed": False,
         "visible": True, "features": tapa},
    ], "constraints": []}


# ---- CLI --------------------------------------------------------------------

def _color(mesh, rgba):
    mesh.visual.face_colors = rgba
    return mesh


def main(argv: list[str]) -> None:
    proy = None
    if "--proyecto" in argv:
        proy = argv[argv.index("--proyecto") + 1]
        salida = project_dir(proy) / "out" / "carcasa"
    elif "--salida" in argv:
        salida = Path(argv[argv.index("--salida") + 1])
    else:
        salida = C.REPO / "componentes" / "out" / "carcasa_esp32"
    top_slots = "--tapa-ciega" not in argv
    salida.mkdir(parents=True, exist_ok=True)

    comp = C.get_componente(C.load_catalogo(), COMP_ID)
    d = Dim(comp)
    print(f"Placa {d.pcb_x:g} x {d.pcb_y:g} (registro {COMP_ID}, "
          f"confianza {comp.get('confianza')})")
    print(f"Cuerpo {d.out_x:.1f} x {d.out_y:.1f} x {d.total:.1f} | "
          f"costura z={d.seam_z:.1f} | muesca z {d.notch_bot:.1f}-{d.seam_z:.1f}")

    base = _color(build_base(d), (60, 62, 70, 255))
    tapa = _color(build_tapa(d, top_slots), (76, 80, 92, 255))
    placa = C.build_mesh(comp)
    placa.apply_translation((0, 0, FLOOR + d.below))

    files = []
    for nombre, mesh in (("carcasa_base", base), ("carcasa_tapa", tapa)):
        for ext in ("glb", "stl"):
            p = salida / f"{nombre}.{ext}"
            mesh.export(p)
            files.append(p)
        print(f"  {nombre}: {len(mesh.faces)} caras, "
              f"estanca={mesh.is_watertight}, vol={mesh.volume / 1000:.1f} cm3")

    for nombre, dz in (("carcasa_ensamble", 0.0), ("carcasa_ensamble_explotado", 45.0)):
        esc = trimesh.Scene()
        esc.add_geometry(base, node_name="base")
        esc.add_geometry(placa.copy(), node_name="placa")
        t = tapa.copy()
        t.apply_translation((0, 0, dz))
        esc.add_geometry(t, node_name="tapa")
        p = salida / f"{nombre}.glb"
        esc.export(p)
        files.append(p)

    doc = build_cad_doc(d, comp, top_slots)
    p = salida / "carcasa_cad.json"
    p.write_text(json.dumps(doc, indent=1, ensure_ascii=False), encoding="utf-8")
    files.append(p)

    if proy:
        audit(project_dir(proy), "CARCASA",
              f"carcasa_esp32 ({COMP_ID}) → out/carcasa/", "OK",
              hash=sha256_file(salida / "carcasa_ensamble.glb"),
              capa="user", confianza=comp.get("confianza"))
    print(f"  → {salida}  ({len(files)} archivos)")
    print("  Tornilleria: 4x M3x16 avellanado DIN 965 (tapa) + 4x tornillo "
          f"O{d.board_screw:g} (placa). Capa user: verificar con calibre.")
    print("  CAD navegador: cd cad && python -m http.server 8080 → Abrir "
          "carcasa_cad.json")


if __name__ == "__main__":
    main(sys.argv[1:])
