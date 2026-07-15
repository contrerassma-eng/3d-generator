"""Geometría común para dibujo técnico (S6) y CAD.

Todo opera en milímetros reales: la malla del proyecto se carga aplicando el
`factor_escala` declarado en input/descripcion.md. Si no hay factor, se trabaja
en unidades del modelo y la escala queda marcada como NO certificada (la lámina
lo dice en el cajetín; nunca se oculta).

Capas de información: la malla es `measured`; nada de lo que se calcula aquí
inventa geometría — proyecciones, contornos y desplegados son derivaciones
deterministas de los triángulos medidos.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from s4_provenance import parse_descripcion  # noqa: E402


# ---------------------------------------------------------------------------
# Carga de mallas a escala real
# ---------------------------------------------------------------------------

def get_scale_factor(proj: Path) -> float | None:
    """factor_escala declarado por el usuario en descripcion.md (o None)."""
    desc = parse_descripcion(proj / "input" / "descripcion.md")
    try:
        return float(desc.get("factor_escala", ""))
    except ValueError:
        return None


def load_mesh_file(path: Path, factor: float | None = None):
    """Carga un GLB/STL/OBJ como malla única, escalada a mm si hay factor."""
    import trimesh
    mesh = trimesh.load(str(path), force="mesh")
    if not isinstance(mesh, trimesh.Trimesh) or len(mesh.faces) == 0:
        sys.exit(f"ERROR: {path} no contiene una malla triangulada válida")
    if factor and factor != 1.0:
        mesh.apply_scale(factor)
    return mesh


def load_project_mesh(proj: Path, source: str = "out/model.glb"):
    """Malla del proyecto en mm reales.

    Devuelve (mesh, factor, certificada). `source` permite dibujar también un
    sólido CAD (`out/cad/*.glb`, ya en mm ⇒ factor 1) además del modelo medido.
    """
    path = proj / source
    if not path.exists():
        sys.exit(f"ERROR: falta {path} — ejecuta la etapa que lo produce")
    is_cad = "out/cad/" in source.replace("\\", "/")
    factor = 1.0 if is_cad else get_scale_factor(proj)
    certified = bool(factor) or is_cad
    return load_mesh_file(path, factor or 1.0), factor or 1.0, certified


# ---------------------------------------------------------------------------
# Vistas normalizadas (sistema europeo, primer diedro — ISO 5456-2)
# Cada vista define ejes (derecha, arriba, dirección de mirada hacia la escena)
# ---------------------------------------------------------------------------

def _axes(direction, up_hint=(0.0, 0.0, 1.0)):
    d = np.asarray(direction, dtype=float)
    d /= np.linalg.norm(d)
    up = np.asarray(up_hint, dtype=float)
    right = np.cross(d, up)
    right /= np.linalg.norm(right)
    up = np.cross(right, d)
    return right, up, d

VIEWS = {
    # alzado: observador delante (−Y) mirando +Y; X a la derecha, Z arriba
    "alzado": _axes((0, 1, 0)),
    # perfil: vista lateral izquierda (se coloca a la DERECHA en primer diedro)
    "perfil": _axes((1, 0, 0)),
    # planta: vista superior (se coloca DEBAJO del alzado en primer diedro,
    # con correspondencia de proyección: X compartida con el alzado)
    "planta": _axes((0, 0, -1), up_hint=(0, 1, 0)),
    # isométrica: observador en (1,1,1)
    "isometrica": _axes((-1, -1, -1)),
}


def mesh_in_view(mesh, view: str):
    """Copia de la malla en coordenadas de vista: x=derecha, y=arriba,
    z hacia el observador (z>0 = más cerca)."""
    right, up, d = VIEWS[view]
    m = mesh.copy()
    rot = np.eye(4)
    rot[:3, :3] = np.vstack([right, up, -d])
    m.apply_transform(rot)
    return m


def view_edges(mesh_v, angle_deg: float = 25.0):
    """Aristas características de una malla YA en coordenadas de vista.

    Devuelve {"visible": (n,2,2), "oculta": (m,2,2)} — segmentos 2D.
    Una arista es característica si su ángulo diedro supera `angle_deg` o si es
    borde de malla abierta. Visibilidad aproximada por orientación de caras
    (sin oclusión completa; el contorno exterior sí es exacto, ver outline).
    """
    segs = {"visible": [], "oculta": []}
    v2 = mesh_v.vertices[:, :2]
    nz = mesh_v.face_normals[:, 2]

    if len(mesh_v.face_adjacency):
        feat = mesh_v.face_adjacency_angles > np.radians(angle_deg)
        edges = mesh_v.face_adjacency_edges[feat]
        pairs = mesh_v.face_adjacency[feat]
        if len(edges):
            front = np.maximum(nz[pairs[:, 0]], nz[pairs[:, 1]]) > 1e-9
            segs["visible"].append(v2[edges[front]])
            segs["oculta"].append(v2[edges[~front]])

    es = mesh_v.edges_sorted
    uniq, counts = np.unique(es, axis=0, return_counts=True)
    boundary = uniq[counts == 1]
    if len(boundary):
        segs["visible"].append(v2[boundary])

    return {k: (np.concatenate(v) if v else np.zeros((0, 2, 2))) for k, v in segs.items()}


def view_outline(mesh_v, tol: float | None = None):
    """Contorno exterior exacto de la proyección (unión de triángulos
    proyectados). Devuelve lista de shapely.Polygon (con huecos = agujeros
    pasantes reales)."""
    import shapely
    from shapely.geometry import Polygon

    tris = mesh_v.vertices[:, :2][mesh_v.faces]
    # descarta triángulos degenerados en proyección
    a = np.abs(np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])) * 0.5
    tris = tris[a > a.max() * 1e-9] if len(a) and a.max() > 0 else tris
    polys = shapely.polygons(np.asarray(tris, dtype=float))
    merged = shapely.union_all(polys)
    eps = (tol if tol else float(np.ptp(mesh_v.vertices[:, :2])) * 1e-6) or 1e-6
    merged = merged.buffer(eps).buffer(-eps)
    if merged.is_empty:
        return []
    if isinstance(merged, Polygon):
        return [merged]
    return [g for g in merged.geoms if isinstance(g, Polygon)]


def polygon_segments(polys) -> np.ndarray:
    """Convierte polígonos shapely (exterior + huecos) en segmentos (n,2,2)."""
    segs = []
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            pts = np.asarray(ring.coords)
            segs.append(np.stack([pts[:-1], pts[1:]], axis=1))
    return np.concatenate(segs) if segs else np.zeros((0, 2, 2))


# ---------------------------------------------------------------------------
# Regiones planas (caras) — base de bocetos, planos de referencia y chapa
# ---------------------------------------------------------------------------

def _plane_frame(normal):
    n = np.asarray(normal, dtype=float)
    n /= np.linalg.norm(n)
    k = np.eye(3)[int(np.argmin(np.abs(n)))]
    u = np.cross(n, k)
    u /= np.linalg.norm(u)
    v = np.cross(n, u)
    return u, v, n


def planar_regions(mesh, tol_deg: float = 6.0, min_area_pct: float = 0.1):
    """Agrupa caras adyacentes casi coplanares en regiones planas.

    Devuelve lista ordenada por área desc:
    [{"id", "faces", "area", "normal", "origin", "u", "v"}, ...]
    `min_area_pct`: descarta regiones menores a ese % del área total.
    """
    import trimesh
    ok = mesh.face_adjacency[mesh.face_adjacency_angles < np.radians(tol_deg)]
    comps = trimesh.graph.connected_components(ok, nodes=np.arange(len(mesh.faces)))
    total = mesh.area
    out = []
    for faces in comps:
        faces = np.asarray(faces)
        area = mesh.area_faces[faces].sum()
        if area < total * min_area_pct / 100.0:
            continue
        w = mesh.area_faces[faces]
        normal = (mesh.face_normals[faces] * w[:, None]).sum(axis=0)
        nl = np.linalg.norm(normal)
        if nl < 1e-12:            # región curva cerrada, no es plana
            continue
        normal /= nl
        # planitud real: descartar agrupaciones que solo son "suaves"
        centroid = (mesh.triangles_center[faces] * w[:, None]).sum(axis=0) / w.sum()
        verts = mesh.vertices[np.unique(mesh.faces[faces])]
        dev = np.abs((verts - centroid) @ normal)
        span = float(np.ptp(verts @ _plane_frame(normal)[0])) or 1.0
        if dev.max() > max(span * 0.02, 1e-6):
            continue
        u, v, n = _plane_frame(normal)
        out.append({"faces": faces, "area": float(area), "normal": n,
                    "origin": centroid, "u": u, "v": v})
    out.sort(key=lambda r: -r["area"])
    for i, r in enumerate(out):
        r["id"] = i
    return out


def region_boundary(mesh, faces) -> np.ndarray:
    """Segmentos 3D (n,2,3) del borde de una región (aristas usadas una vez)."""
    tri = mesh.faces[faces]
    edges = np.sort(np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1)
    uniq, counts = np.unique(edges, axis=0, return_counts=True)
    return mesh.vertices[uniq[counts == 1]]


def to_plane_uv(points3d, region) -> np.ndarray:
    """Proyecta puntos 3D al plano de una región → coordenadas UV en mm."""
    rel = np.asarray(points3d) - region["origin"]
    return np.stack([rel @ region["u"], rel @ region["v"]], axis=-1)


def from_plane_uv(uv, region, w: float = 0.0) -> np.ndarray:
    """UV del plano (+ altura w sobre la normal) → puntos 3D."""
    uv = np.asarray(uv, dtype=float)
    return (region["origin"] + np.outer(uv[..., 0].ravel(), region["u"]).reshape(*uv.shape[:-1], 3)
            + np.outer(uv[..., 1].ravel(), region["v"]).reshape(*uv.shape[:-1], 3)
            + w * region["normal"])


# ---------------------------------------------------------------------------
# Desplegado de chapa (flat pattern)
# ---------------------------------------------------------------------------

def _region_adjacency(mesh, regions, min_bend_deg: float, max_bend_deg: float):
    """Bisagras entre regiones: pares (ri, rj, punto, eje, largo) por pliegue."""
    face_region = np.full(len(mesh.faces), -1)
    for r in regions:
        face_region[r["faces"]] = r["id"]
    hinges = {}
    ang = mesh.face_adjacency_angles
    sel = (ang > np.radians(min_bend_deg)) & (ang < np.radians(max_bend_deg))
    for (f1, f2), (a, b) in zip(mesh.face_adjacency[sel], mesh.face_adjacency_edges[sel]):
        r1, r2 = face_region[f1], face_region[f2]
        if r1 < 0 or r2 < 0 or r1 == r2:
            continue
        hinges.setdefault(tuple(sorted((int(r1), int(r2)))), []).append((a, b))
    out = []
    for (r1, r2), edges in hinges.items():
        pts = mesh.vertices[np.unique(np.asarray(edges))]
        center = pts.mean(axis=0)
        _, _, vt = np.linalg.svd(pts - center)
        axis = vt[0]
        t = (pts - center) @ axis
        out.append({"regions": (r1, r2), "point": center, "axis": axis,
                    "ends": (center + t.min() * axis, center + t.max() * axis),
                    "length": float(t.max() - t.min())})
    return out


def unfold_sheet(mesh, regions=None, root_id: int | None = None,
                 min_bend_deg: float = 15.0, max_bend_deg: float = 175.0):
    """Despliega la cadena de regiones planas conectadas por pliegues.

    Desplegado rígido (sin compensación de curvado / factor K: la longitud
    desarrollada es la geometría exterior medida, se declara en la lámina).
    Devuelve {"contorno": (n,2,2), "pliegues": (m,2,2), "regiones": [ids]} en
    coordenadas UV del plano de la región raíz, o None si no hay cadena.
    """
    import trimesh.transformations as tf
    regions = regions if regions is not None else planar_regions(mesh)
    if not regions:
        return None
    by_id = {r["id"]: r for r in regions}
    root = by_id[root_id if root_id is not None else regions[0]["id"]]
    hinges = _region_adjacency(mesh, regions, min_bend_deg, max_bend_deg)
    graph = {}
    for h in hinges:
        a, b = h["regions"]
        graph.setdefault(a, []).append((b, h))
        graph.setdefault(b, []).append((a, h))

    transforms = {root["id"]: np.eye(4)}
    order, queue = [root["id"]], [root["id"]]
    bend_lines = []
    n0 = root["normal"]
    while queue:
        cur = queue.pop(0)
        for nxt, h in graph.get(cur, []):
            if nxt in transforms:
                continue
            T = transforms[cur]
            R3 = T[:3, :3]
            axis = R3 @ h["axis"]
            point = R3 @ h["point"] + T[:3, 3]
            n_cur = R3 @ by_id[nxt]["normal"]
            # alinear la normal del vecino con la del plano raíz girando en la bisagra
            u1 = n_cur - (n_cur @ axis) * axis
            u2 = n0 - (n0 @ axis) * axis
            if np.linalg.norm(u1) < 1e-9 or np.linalg.norm(u2) < 1e-9:
                theta = 0.0
            else:
                theta = np.arctan2(np.cross(u1, u2) @ axis, u1 @ u2)
            transforms[nxt] = tf.rotation_matrix(theta, axis, point) @ T
            ends = [R3 @ e + T[:3, 3] for e in h["ends"]]
            bend_lines.append(np.asarray(ends))
            order.append(nxt)
            queue.append(nxt)

    if len(order) < 2:
        return None
    contour = []
    for rid in order:
        segs = region_boundary(mesh, by_id[rid]["faces"])
        if not len(segs):
            continue
        T = transforms[rid]
        flat = segs @ T[:3, :3].T + T[:3, 3]
        contour.append(to_plane_uv(flat, root))
    return {"contorno": np.concatenate(contour) if contour else np.zeros((0, 2, 2)),
            "pliegues": np.asarray([to_plane_uv(b, root) for b in bend_lines])
            if bend_lines else np.zeros((0, 2, 2)),
            "regiones": order}
