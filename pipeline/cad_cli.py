"""CAD sobre el modelo medido: planos, bocetos con referencias, sólidos.

Herramienta conversacional (no es etapa de la máquina S0–S5): permite crear
geometría de diseño ANCLADA al modelo medido, siempre auditada y separada de
la capa `measured` (los sólidos CAD son capa `user`, diseño del usuario).

Flujo típico:
  1. `caras`            → lista las caras planas detectadas en el modelo (ids)
  2. `plano-cara 0`     → crea plano de referencia sobre la cara 0
  3. `plano-desfasado PL1 25` → plano paralelo desfasado +25 mm
  4. `refs PL1`         → referencias geométricas del modelo proyectadas al
                          plano (esquinas, centro, bbox) con ids @r1, @r2, …
  5. `boceto B1 --plano PL1 --json b1.json` → boceto 2D; las coordenadas
                          pueden citar referencias ("@r3"). Sin referencias
                          válidas el comando LAS PIDE (lista y aborta).
  6. `extruir B1 30` | `revolucionar B1 --eje "0,0;0,50"` | `barrer B1 --camino B2`
                          → sólido en out/cad/<nombre>.glb (+ .stl)
  7. `exportar-dxf B1`  → el boceto como DXF 2D a escala real

Todo queda en projects/<X>/cad/cad.json (documento paramétrico) y en el
audit.log. Los sólidos se dibujan con norma vía:
  python pipeline/s6_drawings.py projects/<X> --fuente out/cad/<nombre>.glb

uso: python pipeline/cad_cli.py <proyecto> <comando> [args] [--fuente out/model.glb]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import audit, project_dir, sha256_file
import lib_geometry as G

ARC_SEGS = 64


# --------------------------------------------------------------------------
# Documento CAD del proyecto
# --------------------------------------------------------------------------

def doc_path(proj: Path) -> Path:
    return proj / "cad" / "cad.json"


def load_doc(proj: Path) -> dict:
    f = doc_path(proj)
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    return {"planos": {}, "referencias": {}, "bocetos": {}, "operaciones": []}


def save_doc(proj: Path, doc: dict) -> None:
    f = doc_path(proj)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8")


def plane_as_region(p: dict) -> dict:
    return {"origin": np.asarray(p["origen"]), "normal": np.asarray(p["normal"]),
            "u": np.asarray(p["u"]), "v": np.asarray(p["v"])}


def next_name(existing, prefix):
    i = 1
    while f"{prefix}{i}" in existing:
        i += 1
    return f"{prefix}{i}"


# --------------------------------------------------------------------------
# Comandos: planos de referencia
# --------------------------------------------------------------------------

def cmd_caras(proj, mesh, args):
    regs = G.planar_regions(mesh)
    if not regs:
        print("No se detectaron caras planas (malla orgánica o muy ruidosa).")
        return
    print(f"{len(regs)} caras planas (ordenadas por área):")
    print(f"{'id':>3}  {'área cm²':>9}  {'normal':<22} centro (mm)")
    for r in regs:
        n = ", ".join(f"{x:+.2f}" for x in r["normal"])
        c = ", ".join(f"{x:.1f}" for x in r["origin"])
        print(f"{r['id']:>3}  {r['area'] / 100:>9.1f}  [{n}]  ({c})")
    print("\nCrear plano sobre una cara:  plano-cara <id>")


def _store_plane(proj, doc, plane, creado, nombre):
    name = nombre or next_name(doc["planos"], "PL")
    doc["planos"][name] = {k: np.asarray(v).round(6).tolist()
                           for k, v in plane.items() if k != "creado"} | {"creado": creado}
    save_doc(proj, doc)
    audit(proj, "CAD", f"plano {name}: {creado}", "OK")
    print(f"Plano {name} creado ({creado}).")
    print(f"Siguiente: refs {name}  →  referencias para bocetar")
    return name


def cmd_plano_cara(proj, mesh, args):
    rid = int(args[0])
    regs = G.planar_regions(mesh)
    reg = next((r for r in regs if r["id"] == rid), None)
    if reg is None:
        sys.exit(f"ERROR: cara {rid} no existe; ejecuta `caras` para ver ids (0..{len(regs)-1})")
    doc = load_doc(proj)
    plane = {"origen": reg["origin"], "normal": reg["normal"], "u": reg["u"],
             "v": reg["v"], "cara": rid}
    _store_plane(proj, doc, plane, f"cara {rid} del modelo", opt(args, "--nombre"))


def cmd_plano_desfasado(proj, mesh, args):
    doc = load_doc(proj)
    base, dist = args[0], float(args[1])
    if base not in doc["planos"]:
        sys.exit(f"ERROR: plano {base} no existe. Disponibles: {list(doc['planos'])}")
    p = dict(doc["planos"][base])
    origen = np.asarray(p["origen"]) + dist * np.asarray(p["normal"])
    plane = {"origen": origen, "normal": p["normal"], "u": p["u"], "v": p["v"]}
    _store_plane(proj, doc, plane, f"desfasado de {base} {dist:+g} mm",
                 opt(args, "--nombre"))


def cmd_plano_3p(proj, mesh, args):
    pts = np.array([[float(x) for x in a.split(",")] for a in args[:3]])
    n = np.cross(pts[1] - pts[0], pts[2] - pts[0])
    ln = np.linalg.norm(n)
    if ln < 1e-9:
        sys.exit("ERROR: los 3 puntos son colineales")
    u = pts[1] - pts[0]
    u /= np.linalg.norm(u)
    n /= ln
    plane = {"origen": pts[0], "normal": n, "u": u, "v": np.cross(n, u)}
    _store_plane(proj, load_doc(proj), plane, "3 puntos", opt(args, "--nombre"))


# --------------------------------------------------------------------------
# Referencias geométricas del modelo proyectadas a un plano
# --------------------------------------------------------------------------

def build_refs(mesh, plane_name, plane) -> list[dict]:
    import shapely
    reg = plane_as_region(plane)
    refs = []

    def add(uv, tipo):
        refs.append({"id": f"r{len(refs) + 1}", "uv": [round(float(uv[0]), 3),
                                                       round(float(uv[1]), 3)], "tipo": tipo})

    # esquinas de la cara de origen (si el plano nació de una cara)
    if plane.get("cara") is not None:
        regs = G.planar_regions(mesh)
        src = next((r for r in regs if r["id"] == plane["cara"]), None)
        if src is not None:
            segs = G.region_boundary(mesh, src["faces"])
            uv = G.to_plane_uv(segs.reshape(-1, 3), reg)
            ring = shapely.MultiPoint(uv).convex_hull
            simp = ring.simplify(max(np.ptp(uv, axis=0)) * 0.01)
            for c in list(simp.exterior.coords)[:-1]:
                add(c, "esquina de la cara")
            add(np.asarray(simp.centroid.coords[0]), "centro de la cara")

    # bbox de la silueta del modelo completo proyectada al plano
    uv_all = G.to_plane_uv(mesh.vertices, reg)
    lo, hi = uv_all.min(axis=0), uv_all.max(axis=0)
    for c, t in (((lo[0], lo[1]), "bbox min"), ((hi[0], lo[1]), "bbox x+"),
                 ((hi[0], hi[1]), "bbox max"), ((lo[0], hi[1]), "bbox y+"),
                 (((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2), "bbox centro")):
        add(c, t + " del modelo proyectado")
    return refs


def cmd_refs(proj, mesh, args):
    doc = load_doc(proj)
    name = args[0]
    if name not in doc["planos"]:
        sys.exit(f"ERROR: plano {name} no existe. Disponibles: {list(doc['planos'])}")
    refs = build_refs(mesh, name, doc["planos"][name])
    doc["referencias"][name] = refs
    save_doc(proj, doc)
    audit(proj, "CAD", f"referencias de {name}", "OK", n=len(refs))
    print_refs(name, refs)
    print("\nÚsalas en el boceto como \"@r<i>\" en lugar de coordenadas.")


def print_refs(plane_name, refs):
    print(f"Referencias geométricas en {plane_name} (UV mm):")
    for r in refs:
        print(f"  @{r['id']:<4} ({r['uv'][0]:>9.2f}, {r['uv'][1]:>9.2f})  {r['tipo']}")


# --------------------------------------------------------------------------
# Bocetos
# --------------------------------------------------------------------------

def resolve_pt(val, refs_by_id, plane_name):
    if isinstance(val, str):
        rid = val.lstrip("@")
        if rid not in refs_by_id:
            print(f"ERROR: referencia '{val}' no existe en el plano {plane_name}.")
            if refs_by_id:
                print_refs(plane_name, list(refs_by_id.values()))
            else:
                print(f"  (aún no hay referencias: ejecuta `refs {plane_name}` primero)")
            sys.exit(1)
        return np.asarray(refs_by_id[rid]["uv"], dtype=float)
    return np.asarray(val, dtype=float)


def sketch_entities_resolved(doc, name):
    sk = doc["bocetos"].get(name)
    if sk is None:
        sys.exit(f"ERROR: boceto {name} no existe. Disponibles: {list(doc['bocetos'])}")
    return sk


def entity_points(e) -> np.ndarray:
    """Puntos 2D (polilínea) de una entidad ya resuelta."""
    t = e["tipo"]
    if t == "linea":
        return np.array([e["de"], e["a"]])
    if t == "poli":
        pts = np.asarray(e["puntos"], dtype=float)
        return np.vstack([pts, pts[:1]]) if e.get("cerrada") else pts
    if t == "rect":
        x, y = e["esquina"]
        w, h = e["ancho"], e["alto"]
        return np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]])
    if t == "circulo":
        a = np.linspace(0, 2 * np.pi, ARC_SEGS + 1)
        return np.asarray(e["centro"]) + np.c_[np.cos(a), np.sin(a)] * e["radio"]
    if t == "arco":
        a = np.radians(np.linspace(e["inicio_deg"], e["fin_deg"], ARC_SEGS + 1))
        return np.asarray(e["centro"]) + np.c_[np.cos(a), np.sin(a)] * e["radio"]
    sys.exit(f"ERROR: tipo de entidad desconocido: {t}")


def cmd_boceto(proj, mesh, args):
    doc = load_doc(proj)
    name = args[0]
    plane_name = opt(args, "--plano")
    src = opt(args, "--json")
    if not plane_name or plane_name not in doc["planos"]:
        sys.exit(f"ERROR: indica --plano. Disponibles: {list(doc['planos'])} "
                 "(crea uno con plano-cara / plano-desfasado / plano-3p)")
    if not src:
        refs = doc["referencias"].get(plane_name, [])
        print("Falta --json <archivo>. Formato de entidades (coordenadas UV en mm,")
        print('o referencias "@rN" del plano):')
        print(json.dumps({"entidades": [
            {"tipo": "linea", "de": [0, 0], "a": "@r1"},
            {"tipo": "rect", "esquina": [0, 0], "ancho": 40, "alto": 20},
            {"tipo": "circulo", "centro": [20, 10], "radio": 5},
            {"tipo": "arco", "centro": [0, 0], "radio": 8, "inicio_deg": 0, "fin_deg": 90},
            {"tipo": "poli", "puntos": [[0, 0], [40, 0], "@r2"], "cerrada": True},
        ]}, indent=2, ensure_ascii=False))
        print()
        if refs:
            print_refs(plane_name, refs)
        else:
            print(f"Referencias: ejecuta antes `refs {plane_name}` y cítalas como @rN.")
        sys.exit(1)
    raw = json.loads(Path(src).read_text(encoding="utf-8") if src != "-" else sys.stdin.read())
    refs_by_id = {r["id"]: r for r in doc["referencias"].get(plane_name, [])}
    ents = []
    for e in raw["entidades"]:
        e = dict(e)
        for key in ("de", "a", "centro", "esquina"):
            if key in e:
                e[key] = resolve_pt(e[key], refs_by_id, plane_name).tolist()
        if e["tipo"] == "poli":
            e["puntos"] = [resolve_pt(p, refs_by_id, plane_name).tolist()
                           for p in e["puntos"]]
        entity_points(e)  # valida
        ents.append(e)
    doc["bocetos"][name] = {"plano": plane_name, "entidades": ents}
    save_doc(proj, doc)
    audit(proj, "CAD", f"boceto {name} en {plane_name}", "OK", entidades=len(ents))
    print(f"Boceto {name} guardado en {plane_name} ({len(ents)} entidades).")
    print(f"Siguiente: extruir {name} <mm> | revolucionar {name} --eje \"x1,y1;x2,y2\" "
          f"| barrer <perfil> --camino {name} | exportar-dxf {name}")


def sketch_profile(sk):
    """Entidades cerradas del boceto → polígono shapely (mayor = exterior,
    interiores = agujeros)."""
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    closed = []
    for e in sk["entidades"]:
        if e["tipo"] in ("circulo", "rect") or (e["tipo"] == "poli" and e.get("cerrada")):
            closed.append(Polygon(entity_points(e)))
    if not closed:
        sys.exit("ERROR: el boceto no tiene ningún contorno cerrado "
                 "(rect, circulo o poli cerrada) para generar un sólido.")
    closed.sort(key=lambda p: -p.area)
    outer = closed[0]
    for hole in closed[1:]:
        if outer.contains(hole):
            outer = outer.difference(hole)
    if not outer.is_valid or outer.is_empty:
        outer = unary_union(closed)
    return outer


def sketch_path(sk) -> np.ndarray:
    """Entidades abiertas del boceto encadenadas → polilínea UV."""
    pts = [entity_points(e) for e in sk["entidades"]
           if not (e["tipo"] in ("circulo", "rect") or
                   (e["tipo"] == "poli" and e.get("cerrada")))]
    if not pts:
        sys.exit("ERROR: el boceto de camino no tiene entidades abiertas (linea/arco/poli).")
    path = [pts[0]]
    for seg in pts[1:]:
        if np.linalg.norm(path[-1][-1] - seg[0]) > np.linalg.norm(path[-1][-1] - seg[-1]):
            seg = seg[::-1]
        path.append(seg[1:] if np.allclose(path[-1][-1], seg[0], atol=1e-6) else seg)
    return np.vstack(path)


def plane_matrix(plane) -> np.ndarray:
    """Matriz 4×4 del sistema local del plano (u, v, normal, origen)."""
    T = np.eye(4)
    T[:3, 0] = plane["u"]
    T[:3, 1] = plane["v"]
    T[:3, 2] = plane["normal"]
    T[:3, 3] = plane["origen"]
    return T


def export_solid(proj, mesh, name, op, detalle):
    out = proj / "out" / "cad"
    out.mkdir(parents=True, exist_ok=True)
    glb, stl = out / f"{name}.glb", out / f"{name}.stl"
    mesh.export(glb)
    mesh.export(stl)
    doc = load_doc(proj)
    doc["operaciones"].append({"op": op, "detalle": detalle, "salida": f"out/cad/{name}.glb",
                               "watertight": bool(mesh.is_watertight),
                               "volumen_mm3": round(float(abs(mesh.volume)), 1)
                               if mesh.is_watertight else None})
    save_doc(proj, doc)
    audit(proj, "CAD", f"{op} → out/cad/{name}.glb", "OK",
          hash=sha256_file(glb), **detalle)
    print(f"Sólido {name}: {len(mesh.faces)} caras, "
          f"{'estanco, ' + format(abs(mesh.volume), '.0f') + ' mm³' if mesh.is_watertight else 'NO estanco'}")
    print(f"  → {glb} (+ .stl)  · capa: user (diseño), NO measured")
    print(f"Dibujo normalizado: python pipeline/s6_drawings.py {proj} "
          f"--fuente out/cad/{name}.glb")


def cmd_extruir(proj, mesh, args):
    import trimesh
    doc = load_doc(proj)
    sk = sketch_entities_resolved(doc, args[0])
    h = float(args[1])
    name = opt(args, "--nombre") or f"{args[0]}_extrusion"
    poly = sketch_profile(sk)
    solid = trimesh.creation.extrude_polygon(poly, abs(h))
    if h < 0:
        solid.apply_translation([0, 0, h])
    solid.apply_transform(plane_matrix(doc["planos"][sk["plano"]]))
    export_solid(proj, solid, name, "extrusion",
                 {"boceto": args[0], "altura_mm": h})


def cmd_revolucionar(proj, mesh, args):
    import trimesh
    doc = load_doc(proj)
    sk = sketch_entities_resolved(doc, args[0])
    eje = opt(args, "--eje")
    if not eje:
        sys.exit('ERROR: indica --eje "x1,y1;x2,y2" (dos puntos UV del plano del boceto)')
    a, b = (np.array([float(x) for x in p.split(",")]) for p in eje.split(";"))
    ang = float(opt(args, "--angulo") or 360)
    name = opt(args, "--nombre") or f"{args[0]}_revolucion"
    poly = sketch_profile(sk)
    d = b - a
    d /= np.linalg.norm(d)
    perp = np.array([d[1], -d[0]])
    ext = np.asarray(poly.exterior.coords)
    rz = np.c_[(ext - a) @ perp, (ext - a) @ d]
    if rz[:, 0].min() < -1e-6 and rz[:, 0].max() > 1e-6:
        sys.exit("ERROR: el perfil cruza el eje de revolución; debe quedar a un solo lado.")
    if rz[:, 0].max() <= 1e-6:
        rz[:, 0] = -rz[:, 0]  # perfil al lado negativo: usar radio positivo
    solid = trimesh.creation.revolve(rz, angle=np.radians(ang))
    plane = doc["planos"][sk["plano"]]
    u, v, n = (np.asarray(plane[k]) for k in ("u", "v", "normal"))
    z3 = d[0] * u + d[1] * v            # eje de revolución en 3D
    x3 = perp[0] * u + perp[1] * v      # dirección radial en el plano
    T = np.eye(4)
    T[:3, 0], T[:3, 1], T[:3, 2] = x3, np.cross(z3, x3), z3
    T[:3, 3] = np.asarray(plane["origen"]) + a[0] * u + a[1] * v
    solid.apply_transform(T)
    export_solid(proj, solid, name, "revolucion",
                 {"boceto": args[0], "eje_uv": eje, "angulo_deg": ang})


def cmd_barrer(proj, mesh, args):
    import trimesh
    doc = load_doc(proj)
    sk_prof = sketch_entities_resolved(doc, args[0])
    cam = opt(args, "--camino")
    if not cam:
        sys.exit("ERROR: indica --camino <boceto> (polilínea/arcos abiertos)")
    sk_path = sketch_entities_resolved(doc, cam)
    name = opt(args, "--nombre") or f"{args[0]}_barrido"
    poly = sketch_profile(sk_prof)
    uv = sketch_path(sk_path)
    reg = plane_as_region(doc["planos"][sk_path["plano"]])
    path3 = G.from_plane_uv(uv, reg)
    solid = trimesh.creation.sweep_polygon(poly, path3)
    export_solid(proj, solid, name, "barrido",
                 {"perfil": args[0], "camino": cam, "puntos_camino": len(path3)})


def cmd_exportar_dxf(proj, mesh, args):
    import ezdxf
    doc = load_doc(proj)
    sk = sketch_entities_resolved(doc, args[0])
    out = proj / "out" / "cad"
    out.mkdir(parents=True, exist_ok=True)
    dxf = ezdxf.new("R2018", setup=True)
    dxf.header["$INSUNITS"] = 4
    msp = dxf.modelspace()
    dxf.layers.add("BOCETO", color=7)
    for e in sk["entidades"]:
        at = {"layer": "BOCETO"}
        if e["tipo"] == "linea":
            msp.add_line(e["de"], e["a"], dxfattribs=at)
        elif e["tipo"] == "circulo":
            msp.add_circle(e["centro"], e["radio"], dxfattribs=at)
        elif e["tipo"] == "arco":
            msp.add_arc(e["centro"], e["radio"], e["inicio_deg"], e["fin_deg"],
                        dxfattribs=at)
        else:
            msp.add_lwpolyline(entity_points(e).tolist(), dxfattribs=at)
    path = out / f"{args[0]}.dxf"
    dxf.saveas(path)
    audit(proj, "CAD", f"boceto {args[0]} → DXF", "OK", hash=sha256_file(path))
    print(f"Boceto a escala real (mm): {path}")


# --------------------------------------------------------------------------

def opt(args, name, default=None):
    return args[args.index(name) + 1] if name in args and \
        args.index(name) + 1 < len(args) else default


COMMANDS = {
    "caras": cmd_caras, "plano-cara": cmd_plano_cara,
    "plano-desfasado": cmd_plano_desfasado, "plano-3p": cmd_plano_3p,
    "refs": cmd_refs, "boceto": cmd_boceto, "extruir": cmd_extruir,
    "revolucionar": cmd_revolucionar, "barrer": cmd_barrer,
    "exportar-dxf": cmd_exportar_dxf,
}

# comandos que no necesitan cargar la malla del modelo
NO_MESH = {"plano-desfasado", "plano-3p", "extruir", "revolucionar",
           "barrer", "exportar-dxf"}


def main() -> None:
    if len(sys.argv) < 3 or sys.argv[2] not in COMMANDS:
        sys.exit(__doc__ + f"\ncomandos: {', '.join(COMMANDS)}")
    proj = project_dir(sys.argv[1])
    cmd, args = sys.argv[2], sys.argv[3:]
    source = opt(args, "--fuente", "out/model.glb")
    mesh = None
    if cmd not in NO_MESH:
        mesh, _, certified = G.load_project_mesh(proj, source)
        if not certified:
            print("AVISO: escala NO certificada (sin factor_escala); las medidas "
                  "están en unidades del modelo, no en mm reales.\n")
    COMMANDS[cmd](proj, mesh, args)


if __name__ == "__main__":
    main()
