"""Biblioteca parametrica de componentes electronicos para diseno de carcasas.

Los componentes viven como DATOS en `componentes/catalogo.json` (capa `user`:
son geometria de diseno con dimensiones nominales de datasheet/mercado, NO
geometria medida por el pipeline). Cada registro describe el componente con
solidos primitivos (caja/cilindro), agujeros de montaje, cortes de panel y
despejes. De ese unico registro se derivan:

  - malla 3D (trimesh)          -> GLB/STL para modelar la carcasa alrededor
  - huella 2D (DXF a escala)    -> contorno, agujeros y cortes para taladrar
  - pieza JSON `foto3d-cad`     -> abrible en el CAD del navegador (cad/)

Convencion (ver `convencion` en el catalogo): mm, X = largo, Z = arriba,
origen en el centro de la cara inferior de la PCB/cuerpo; en piezas de panel
el origen es el plano exterior del panel. Agregar un componente = agregar un
registro al JSON (sin tocar codigo). `validar_componente` verifica el esquema.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
CATALOGO = REPO / "componentes" / "catalogo.json"

CATEGORIAS = ("mcu", "alimentacion", "sensor", "boton", "conector", "adaptador",
              "mecanico", "transportador")
COLOR_CATEGORIA = {"mcu": "#6d9ee8", "alimentacion": "#e8a56d", "sensor": "#7fc98a",
                   "boton": "#c98ad0", "conector": "#9a9fe0", "adaptador": "#6bc9c2",
                   "mecanico": "#90a4ae"}
SEGS = 48


# --------------------------------------------------------------------------
# Catalogo
# --------------------------------------------------------------------------

def load_catalogo(path: Path | None = None) -> dict:
    cat = json.loads((path or CATALOGO).read_text(encoding="utf-8"))
    if cat.get("formato") != "foto3d-componentes":
        raise ValueError(f"catalogo invalido: formato={cat.get('formato')!r}")
    return cat


def get_componente(cat: dict, cid: str) -> dict:
    comp = next((c for c in cat["componentes"] if c["id"] == cid), None)
    if comp is None:
        ids = ", ".join(c["id"] for c in cat["componentes"])
        raise KeyError(f"componente '{cid}' no existe. Disponibles: {ids}")
    return comp


def validar_componente(comp: dict) -> list[str]:
    """Errores de esquema del registro (lista vacia = valido)."""
    e = []
    # Ensamble (GLB multi-pieza): entra como varias piezas; valida glb + bbox.
    if "ensamble" in comp:
        for campo in ("id", "nombre", "categoria", "descripcion", "fuente"):
            if campo not in comp:
                e.append(f"falta campo '{campo}'")
        if not comp.get("ensamble", {}).get("glb"):
            e.append("ensamble: falta 'glb'")
        if len(comp.get("bbox_mm", [])) != 3:
            e.append("ensamble: requiere 'bbox_mm' [x,y,z]")
        if comp.get("categoria") not in CATEGORIAS:
            e.append(f"categoria '{comp.get('categoria')}' no esta en {CATEGORIAS}")
        return e
    # Componente de malla real (GLB): geometria fija importada. No lleva
    # 'solidos'; se valida el bloque 'malla' + bbox en su lugar.
    if "malla" in comp:
        for campo in ("id", "nombre", "categoria", "descripcion", "fuente"):
            if campo not in comp:
                e.append(f"falta campo '{campo}'")
        if not comp.get("malla", {}).get("glb"):
            e.append("malla: falta 'glb' (ruta al archivo)")
        if len(comp.get("bbox_mm", [])) != 3:
            e.append("malla: requiere 'bbox_mm' [x,y,z]")
        if comp.get("categoria") not in CATEGORIAS:
            e.append(f"categoria '{comp.get('categoria')}' no esta en {CATEGORIAS}")
        return e
    for campo in ("id", "nombre", "categoria", "descripcion", "fuente", "solidos"):
        if campo not in comp:
            e.append(f"falta campo '{campo}'")
    if not e and comp["categoria"] not in CATEGORIAS:
        e.append(f"categoria '{comp['categoria']}' no esta en {CATEGORIAS}")
    for i, s in enumerate(comp.get("solidos", [])):
        pre = f"solidos[{i}]"
        if s.get("tipo") not in ("caja", "cilindro"):
            e.append(f"{pre}: tipo '{s.get('tipo')}' desconocido (caja|cilindro)")
            continue
        if len(s.get("at", [])) != 3:
            e.append(f"{pre}: 'at' debe ser [x,y,z]")
        if s["tipo"] == "caja" and len(s.get("dim", [])) != 3:
            e.append(f"{pre}: caja requiere 'dim' [largo,ancho,alto]")
        if s["tipo"] == "cilindro" and not (s.get("dia", 0) > 0 and s.get("alto", 0) > 0):
            e.append(f"{pre}: cilindro requiere 'dia' y 'alto' > 0")
    for i, a in enumerate(comp.get("agujeros_montaje", [])):
        if len(a.get("pos", [])) != 2 or not a.get("dia", 0) > 0:
            e.append(f"agujeros_montaje[{i}]: requiere 'pos' [x,y] y 'dia' > 0")
    for i, c in enumerate(comp.get("cortes_panel", [])):
        if len(c.get("pos", [])) != 2 or not c.get("dia", 0) > 0:
            e.append(f"cortes_panel[{i}]: requiere 'pos' [x,y] y 'dia' > 0")
    for i, d in enumerate(comp.get("despejes", [])):
        if len(d.get("at", [])) != 3 or len(d.get("dim", [])) != 3:
            e.append(f"despejes[{i}]: requiere 'at' [x,y,z] y 'dim' [l,a,h]")
    return e


# --------------------------------------------------------------------------
# Geometria derivada
# --------------------------------------------------------------------------

def _solid_bounds(s) -> tuple[np.ndarray, np.ndarray]:
    at = np.asarray(s["at"], dtype=float)
    if s["tipo"] == "caja":
        half = np.asarray(s["dim"], dtype=float) / 2
        return (at - [half[0], half[1], 0], at + [half[0], half[1], s["dim"][2]])
    eje = np.asarray(s.get("eje", [0, 0, 1]), dtype=float)
    eje = eje / np.linalg.norm(eje)
    r, tip = s["dia"] / 2, at + eje * s["alto"]
    lo, hi = np.minimum(at, tip), np.maximum(at, tip)
    pad = r * np.sqrt(np.maximum(0, 1 - eje**2))  # extension radial por eje
    return lo - pad, hi + pad


def envolvente(comp: dict) -> tuple[np.ndarray, np.ndarray]:
    """Caja envolvente [min, max] de todos los solidos (sin despejes).

    Los componentes de MALLA real (GLB, sin 'solidos') no tienen primitivas: su
    envolvente sale de 'bbox_mm' (centrada en el origen, como la malla derivada).
    """
    if "malla" in comp and "solidos" not in comp:
        bb = np.array(comp["bbox_mm"], dtype=float) / 2.0
        return (-bb, bb)
    bounds = [_solid_bounds(s) for s in comp["solidos"]]
    return (np.min([b[0] for b in bounds], axis=0),
            np.max([b[1] for b in bounds], axis=0))


def _hex_rgba(color: str):
    c = (color or "#888888").lstrip("#")
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)] + [255]


def _mesh_caja(s, agujeros):
    """Caja como extrusion; si es la PCB, con los agujeros de montaje perforados."""
    import trimesh
    from shapely.geometry import Point, box as sbox
    x, y, z = s["at"]
    w, d, h = s["dim"]
    poly = sbox(x - w / 2, y - d / 2, x + w / 2, y + d / 2)
    if s.get("pcb"):
        for a in agujeros:
            poly = poly.difference(Point(a["pos"]).buffer(a["dia"] / 2, quad_segs=SEGS // 4))
    m = trimesh.creation.extrude_polygon(poly, h)
    m.apply_translation([0, 0, z])
    return m


def _mesh_cilindro(s):
    import trimesh
    eje = np.asarray(s.get("eje", [0, 0, 1]), dtype=float)
    eje = eje / np.linalg.norm(eje)
    m = trimesh.creation.cylinder(radius=s["dia"] / 2, height=s["alto"], sections=SEGS)
    m.apply_translation([0, 0, s["alto"] / 2])  # base en el origen
    if not np.allclose(eje, [0, 0, 1]):
        m.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], eje))
    m.apply_translation(s["at"])
    return m


def build_mesh(comp: dict):
    """Malla 3D del componente (cuerpos concatenados, colores por solido).

    Componente de MALLA real (GLB, sin 'solidos'): se representa por su caja
    envolvente 'bbox_mm' (la geometria fina vive en el GLB referenciado).
    """
    import trimesh
    if "malla" in comp and "solidos" not in comp:
        lo, hi = envolvente(comp)
        box = trimesh.creation.box(extents=(hi - lo))
        box.visual.face_colors = _hex_rgba(COLOR_CATEGORIA.get(comp["categoria"], "#888888"))
        return box
    agujeros = comp.get("agujeros_montaje", [])
    cuerpos = []
    for s in comp["solidos"]:
        m = _mesh_caja(s, agujeros) if s["tipo"] == "caja" else _mesh_cilindro(s)
        m.visual.face_colors = _hex_rgba(s.get("color", COLOR_CATEGORIA[comp["categoria"]]))
        cuerpos.append(m)
    return trimesh.util.concatenate(cuerpos)


# --------------------------------------------------------------------------
# Pieza para el CAD del navegador (formato foto3d-cad, ver cad/js/model.js)
# --------------------------------------------------------------------------

def cad_part(comp: dict, idx: int, pos=(0, 0, 0)) -> dict:
    feats = []
    for i, s in enumerate(comp["solidos"]):
        fid = f"f{idx}_{i}"
        at = [float(v) for v in s["at"]]
        if s["tipo"] == "caja":
            w, d, h = (float(v) for v in s["dim"])
            feats.append({"id": fid, "name": s.get("nombre", "Caja"), "shape": "box",
                          "op": "union", "at": at, "dir": [0, 0, 1],
                          "params": {"w": w, "d": d, "h": h}})
        else:
            feats.append({"id": fid, "name": s.get("nombre", "Cilindro"),
                          "shape": "cylinder", "op": "union", "at": at,
                          "dir": [float(v) for v in s.get("eje", [0, 0, 1])],
                          "params": {"dia": float(s["dia"]), "h": float(s["alto"])}})
    pcb = next((s for s in comp["solidos"] if s.get("pcb")), None)
    if pcb is not None:
        z_top = float(pcb["at"][2]) + float(pcb["dim"][2])
        for j, a in enumerate(comp.get("agujeros_montaje", [])):
            feats.append({"id": f"f{idx}_h{j}", "name": f"Agujero O{a['dia']}",
                          "shape": "hole", "op": "cut",
                          "at": [float(a["pos"][0]), float(a["pos"][1]), z_top],
                          "dir": [0, 0, -1],
                          "params": {"dia": float(a["dia"]), "depth": 0, "through": True}})
    return {"id": f"p_{comp['id']}_{idx}", "name": comp["nombre"],
            "color": COLOR_CATEGORIA[comp["categoria"]], "pos": [float(v) for v in pos],
            "quat": [0, 0, 0, 1], "fixed": False, "visible": True, "features": feats}


def cad_doc(comps: list[dict], separacion: float = 15.0) -> dict:
    """Documento foto3d-cad con los componentes en fila sobre Z=0."""
    parts, x = [], 0.0
    for i, comp in enumerate(comps):
        lo, hi = envolvente(comp)
        parts.append(cad_part(comp, i, pos=(x - lo[0], 0, -lo[2] if lo[2] < 0 else 0)))
        x += (hi[0] - lo[0]) + separacion
    return {"format": "foto3d-cad", "version": 1, "parts": parts, "constraints": []}


# --------------------------------------------------------------------------
# Huella DXF (plano de perforado/corte de la carcasa, escala real en mm)
# --------------------------------------------------------------------------

def footprint_dxf(comp: dict, path: Path) -> dict:
    """DXF con capas: CONTORNO (PCB/cuerpo), COMPONENTES (siluetas), AGUJEROS
    (montaje), CORTE_PANEL (perforaciones de pared) y DESPEJE (zonas libres)."""
    import ezdxf
    dxf = ezdxf.new("R2018", setup=True)
    dxf.header["$INSUNITS"] = 4  # mm
    msp = dxf.modelspace()
    for capa, color in (("CONTORNO", 7), ("COMPONENTES", 8), ("AGUJEROS", 1),
                        ("CORTE_PANEL", 3), ("DESPEJE", 4), ("TEXTO", 7)):
        dxf.layers.add(capa, color=color)

    def rect(cx, cy, w, d, capa):
        msp.add_lwpolyline([(cx - w / 2, cy - d / 2), (cx + w / 2, cy - d / 2),
                            (cx + w / 2, cy + d / 2), (cx - w / 2, cy + d / 2)],
                           close=True, dxfattribs={"layer": capa})

    pcb = next((s for s in comp["solidos"] if s.get("pcb")), None)
    for s in comp["solidos"]:
        capa = "CONTORNO" if s is pcb else "COMPONENTES"
        if s["tipo"] == "cilindro" and list(s.get("eje", [0, 0, 1])) == [0, 0, 1]:
            msp.add_circle(s["at"][:2], s["dia"] / 2, dxfattribs={"layer": capa})
        else:
            lo, hi = _solid_bounds(s)
            rect((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2,
                 hi[0] - lo[0], hi[1] - lo[1], capa)
    n = {"AGUJEROS": 0, "CORTE_PANEL": 0}
    for a in comp.get("agujeros_montaje", []):
        msp.add_circle(a["pos"], a["dia"] / 2, dxfattribs={"layer": "AGUJEROS"})
        n["AGUJEROS"] += 1
    for c in comp.get("cortes_panel", []):
        msp.add_circle(c["pos"], c["dia"] / 2, dxfattribs={"layer": "CORTE_PANEL"})
        n["CORTE_PANEL"] += 1
    for d in comp.get("despejes", []):
        rect(d["at"][0], d["at"][1], d["dim"][0], d["dim"][1], "DESPEJE")

    lo, hi = envolvente(comp)
    dims = " x ".join(f"{v:.1f}" for v in (hi - lo))
    msp.add_text(f"{comp['nombre']}  [{dims} mm]  confianza: "
                 f"{comp.get('confianza', 'verificar')}",
                 dxfattribs={"layer": "TEXTO", "height": 2.5}
                 ).set_placement((lo[0], hi[1] + 4))
    path.parent.mkdir(parents=True, exist_ok=True)
    dxf.saveas(path)
    return n
