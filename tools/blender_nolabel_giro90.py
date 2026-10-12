"""Render 3D conceptual de la unidad YOLO-NOLABEL-GIRO90 (Blender por linea de comandos).

blender.exe -b -P tools/blender_nolabel_giro90.py -- <carpeta_salida>
Lee projects/YOLO-NOLABEL-GIRO90/parametros_unidad.json. Escribe unidad_iso.png, unidad_iso2.png y unidad.glb.
Cuerpos envolventes (concepto): el detalle de fabricacion sale despues por Inventor.
"""
import bpy, json, os, sys, math
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = json.load(open(os.path.join(ROOT, "projects", "YOLO-NOLABEL-GIRO90", "parametros_unidad.json"), encoding="utf-8"))
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd()
os.makedirs(OUT, exist_ok=True)
S = 0.001  # mm -> m

bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}


def mat(name, rgba, rough=0.5, metal=0.0, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    m.diffuse_color = (rgba[0], rgba[1], rgba[2], alpha)
    MATS[name] = m
    return m


def box(name, x0, y0, z0, dx, dy, dz, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + dx / 2) * S, (y0 + dy / 2) * S, (z0 + dz / 2) * S))
    o = bpy.context.active_object
    o.scale = (dx * S, dy * S, dz * S)
    o.name = name
    o.data.materials.append(m)
    return o


def cyl(name, x, y, z, r, L, axis, m, verts=20):
    rot = {"x": (0, math.pi / 2, 0), "y": (math.pi / 2, 0, 0), "z": (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r * S, depth=L * S, location=(x * S, y * S, z * S), rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(m)
    return o


ALU = mat("aluminio", (0.78, 0.8, 0.82, 1), 0.35, 0.8)
INOX = mat("inox", (0.72, 0.74, 0.76, 1), 0.25, 0.9)
PANEL = mat("panel_inox", (0.8, 0.82, 0.84, 1), 0.3, 0.6, alpha=0.28)
FRAME = mat("frame_pintado", (0.55, 0.58, 0.6, 1), 0.5, 0.3)
BANDA = mat("banda", (0.1, 0.25, 0.55, 1), 0.7)
NEGRO = mat("negro", (0.03, 0.03, 0.03, 1), 0.6)
CAJA = mat("carton", (0.72, 0.56, 0.36, 1), 0.9)
BLANCO = mat("blanco", (0.93, 0.93, 0.93, 1), 0.4)
ROJO = mat("rojo", (0.8, 0.1, 0.1, 1), 0.4)
UV = mat("uv", (0.2, 0.35, 0.9, 1), 0.3)
VERDE = mat("verde", (0.1, 0.7, 0.2, 1), 0.4)
AMAR = mat("amarillo", (0.95, 0.75, 0.1, 1), 0.4)
PISO = mat("piso", (0.62, 0.63, 0.64, 1), 0.9)

H = P["altura_trabajo"]
box("piso", -600, -1500, -2, 7600, 3200, 2, PISO)

for m in P["modulos"]:
    x0, L, W = m["x0"], m["largo"], m["ancho"]
    if m["id"] in ("M1", "M5"):
        box(m["id"] + "_lat_a", x0, -W / 2, H - 190, L, 38, 190, FRAME)
        box(m["id"] + "_lat_b", x0, W / 2 - 38, H - 190, L, 38, 190, FRAME)
        n = int(L // 76.2)
        for i in range(n):
            x = x0 + 40 + i * 76.2
            cyl("%s_eje%d" % (m["id"], i), x, 0, H - 30, 6, W - 80, "y", ALU, 6)
            for k in range(6):
                y = -W / 2 + 70 + k * (W - 140) / 5
                cyl("%s_rueda%d_%d" % (m["id"], i, k), x, y, H - 30, 32, 26, "y", NEGRO, 14)
    elif m["id"] == "M2":
        box("M2_bastidor", x0, -W / 2, H - 150, L, W, 40, ALU)
        for yb in (-90, 90):
            box("M2_banda%d" % yb, x0, yb - 40, H - 8, L, 80, 8, BANDA)
            cyl("M2_tambor_a%d" % yb, x0 + 20, yb, H - 45, 45, 80, "y", ALU)
            cyl("M2_tambor_b%d" % yb, x0 + L - 20, yb, H - 45, 45, 80, "y", ALU)
        box("M2_guia_UHMW", x0, 262, H, L, 16, 60, BLANCO)
        c = P["camara"]
        box("camara", c["x"] - 45, -45, H - c["z_bajo_banda"] - 140, 90, 90, 140, NEGRO)
    else:
        box(m["id"] + "_lat_a", x0, -W / 2, H - 190, L, 38, 190, FRAME)
        box(m["id"] + "_lat_b", x0, W / 2 - 38, H - 190, L, 38, 190, FRAME)
        box(m["id"] + "_banda", x0 + 10, -W / 2 + 40, H - 8, L - 20, W - 80, 8, BANDA)
    for xp in (x0 + 60, x0 + L - 60):
        for yp in (-(m["ancho"] / 2) + 30, m["ancho"] / 2 - 30):
            box("%s_pata_%d_%d" % (m["id"], xp, yp), xp - 38, yp - 19, 0, 76, 38, H - 190, FRAME)

m3 = next(m for m in P["modulos"] if m["id"] == "M3")
box("M3_guia_UHMW_a", m3["x0"], 262, H, P["nolabel"]["x_cabezal"] - m3["x0"] - 80, 16, 60, BLANCO)
nl = P["nolabel"]
zc = H + 30 + nl["altura_impresion"] / 2
box("nolabel_cabezal", nl["x_cabezal"] - 70, 275, zc - 70, 140, 180, 140, BLANCO)
box("nolabel_boquillas", nl["x_cabezal"] - 70, 268, zc - 55, 140, 10, 110, ROJO)
for i, xs in enumerate(nl["x_secadores"]):
    o = box("secador_%d" % i, xs - 100, 300, zc - 50, 200, 95, 140, UV)
    o.rotation_euler = (0, 0, math.radians(0))
box("nolabel_caja_insumos", nl["x_cabezal"] - 150, 520, H - 100, 300, 250, 350, BLANCO)
box("nolabel_caja_electrica", 3150, 560, H - 250, 400, 200, 500, AMAR)

cj = P["caja_ref"]
yj = P["frame_estandar"]["ancho_util"] / 2
for i, xc in enumerate((300, 1500, 2700, 4000)):
    box("caja_%d" % i, xc, yj - cj["ancho"], H, cj["largo"], cj["ancho"], cj["alto"], CAJA)
box("caja_girando", 4700, -cj["largo"] / 2 - 250, H, cj["ancho"], cj["largo"], cj["alto"], CAJA)

for s in P["sensores"]:
    cyl("foto_" + s["id"], s["x"], -330, H + 60, 9, 60, "y", AMAR, 12)

g = P["gabinete"]
gx, gy, gL, gW, gH = g["x0"], g["y0"], g["largo"], g["ancho"], g["alto"]
pw, pd = g["perfil"]
for xx in (gx, gx + gL / 2 - pw / 2, gx + gL - pw):
    for yy in (gy, gy + gW - pd):
        box("pg40_montante_%d_%d" % (xx, yy), xx, yy, 0, pw, pd, gH, ALU)
for zz in (90, 780, gH - 40):
    box("pg40_anillo_a_%d" % zz, gx, gy, zz, gL, pd, pw, ALU)
    box("pg40_anillo_b_%d" % zz, gx, gy + gW - pd, zz, gL, pd, pw, ALU)
box("capota", gx, gy, gH, gL, gW, 20, PANEL)
box("panel_trasero", gx, gy + gW - 2, 90, gL, 2, gH - 90, PANEL)
box("panel_operador", gx, gy, 90, gL, 2, gH - 90, PANEL)
pr = g["protuberancia"]
box("protuberancia", gx + (gL - pr["largo"]) / 2, gy - pr["ancho"], pr["z_centro"] - pr["alto"] / 2, pr["largo"], pr["ancho"], pr["alto"], INOX)
for i in range(4):
    cyl("pulsador_%d" % i, gx + gL / 2 - 150 + i * 100, gy - pr["ancho"] - 5, pr["z_centro"], 16, 20, "y", (VERDE, ROJO, AMAR, NEGRO)[i])
for i, c in enumerate((ROJO, AMAR, VERDE)):
    cyl("baliza_%d" % i, gx + gL / 2, gy + gW / 2, gH + 40 + i * 60, 35, 60, "z", c)

# camara y luz
scn = bpy.context.scene
bpy.ops.object.light_add(type="SUN", location=(0, 0, 10))
bpy.context.active_object.data.energy = 3.5
bpy.context.active_object.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
world = bpy.data.worlds.new("w"); scn.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.92, 0.94, 0.96, 1)
scn.render.engine = "BLENDER_WORKBENCH"
scn.display.shading.light = "STUDIO"
scn.display.shading.color_type = "MATERIAL"
scn.display.shading.show_shadows = True
scn.display.shading.show_cavity = True
scn.display.shading.show_xray = False
scn.render.resolution_x, scn.render.resolution_y = 1920, 1080
scn.render.film_transparent = False


def shot(name, loc, target):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.active_object
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 28
    scn.camera = cam
    scn.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)


shot("unidad_iso.png", (-2.2, -5.2, 3.4), (3.0, 0.0, 0.7))
shot("unidad_iso2.png", (7.8, 4.2, 3.0), (2.8, 0.0, 0.7))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "unidad.glb"), export_format="GLB", use_selection=False)
print("OK", OUT)
