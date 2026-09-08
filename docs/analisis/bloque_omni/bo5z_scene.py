# Escena v3.2: el ZP2026 COMPLETO (todos los nodos del GLB real, meshopt
# decodificado) con el bloque OMNI ocupando la ZONA CENTRAL en lugar de sus
# 8 rodillos. Se retiran SOLO las piezas de accionamiento/rodillos de esa
# zona; la escalerilla se corta |x|<310 (se reencamina); el controlador 'c'
# se corre a x+330 y la fuente a x-450 (siguen en el transportador).
import os, glob, json, struct
import numpy as np, trimesh, meshoptimizer as mo
from math import radians

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)
GLB = '/home/user/3d-generator/cad/componentes/models/ZP2026.glb'

# ---------- decodificador ZP ----------
f = open(GLB, 'rb')
f.read(12); clen, _ = struct.unpack('<II', f.read(8))
js = json.loads(f.read(clen))
blen, _ = struct.unpack('<II', f.read(8)); bin0 = f.read(blen)
nodes, meshes, accs, bvs = js['nodes'], js['meshes'], js['accessors'], js['bufferViews']
NORM = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}
DT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16,
      5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
_vc = {}

def view_bytes(bvi):
    if bvi not in _vc:
        e = bvs[bvi]['extensions']['EXT_meshopt_compression']
        raw = np.frombuffer(bin0[e['byteOffset']:e['byteOffset'] + e['byteLength']], np.uint8)
        dec = mo.decode_vertex_buffer if e['mode'] == 'ATTRIBUTES' else mo.decode_index_buffer
        _vc[bvi] = dec(e['count'], e['byteStride'], raw).tobytes()
    return _vc[bvi]

def acc_array(ai):
    a = accs[ai]
    n0, dt0 = NC[a['type']], np.dtype(DT[a['componentType']])
    if 'bufferView' not in a:      # accessor sin datos = ceros (spec glTF)
        return np.zeros((a['count'], n0), np.float64)
    data = np.frombuffer(view_bytes(a['bufferView']), np.uint8)
    n, dt = NC[a['type']], np.dtype(DT[a['componentType']])
    stride = bvs[a['bufferView']].get('byteStride', dt.itemsize * n)
    off, cnt = a.get('byteOffset', 0), a['count']
    if stride != dt.itemsize * n:
        buf = np.ascontiguousarray(np.lib.stride_tricks.as_strided(
            data[off:], shape=(cnt, dt.itemsize * n), strides=(stride, 1)))
    else:
        buf = data[off:off + cnt * dt.itemsize * n].reshape(cnt, -1)
    v = np.frombuffer(buf.tobytes(), dt).reshape(cnt, n).astype(np.float64)
    return v / NORM[a['componentType']] if a.get('normalized') else v

def Mn(n):
    if 'matrix' in n: return np.array(n['matrix']).reshape(4, 4).T
    T = np.eye(4)
    if 'translation' in n: T[:3, 3] = n['translation']
    if 'rotation' in n:
        x, y, z, w = n['rotation']
        T[:3, :3] = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    if 'scale' in n: T[:3, :3] = T[:3, :3] @ np.diag(n['scale'])
    return T

parents = {}
for i, n in enumerate(nodes):
    for c in n.get('children', []): parents[c] = i

def world(i):
    T = Mn(nodes[i]); j = i
    while j in parents:
        j = parents[j]; T = Mn(nodes[j]) @ T
    return T

_geo = {}
def mesh_of(mi):
    """malla LOCAL del mesh mi (mm NO aplicado: coords del glTF en metros)"""
    if mi not in _geo:
        vs, fs, off = [], [], 0
        for prim in meshes[mi]['primitives']:
            if prim.get('mode', 4) != 4 or 'indices' not in prim:
                continue                     # solo TRIANGLES indexados
            P = acc_array(prim['attributes']['POSITION'])
            idx = acc_array(prim['indices']).astype(np.int64)
            if idx.size < 3:
                continue
            idx = idx.reshape(-1)[:(idx.size // 3) * 3].reshape(-1, 3)
            vs.append(P); fs.append(idx + off); off += len(P)
        if not vs:
            vs, fs = [np.zeros((3, 3))], [np.array([[0, 1, 2]])]
        _geo[mi] = trimesh.Trimesh(np.vstack(vs), np.vstack(fs), process=False)
    return _geo[mi]

# ---------- reglas de ocupacion de la zona central ----------
ZONA = 299.0
QUITAR = ('pos', 'pale blue', 'oring', 'SPEED UP SPOOL', 'UniDrive',
          'espaciador', 'AS ', 'BS ', 'Arandel', '=>[')
REUBICA = {'c': 330.0, 'Power Supply': -450.0}   # dx en mm (siguen instalados)

MM = np.diag([1000.0, 1000.0, 1000.0, 1.0])      # m -> mm
RZP = np.eye(4)                                   # zp(x,y,z) -> blk(x,-z,y)
RZP[:3, :3] = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)

esc = trimesh.Scene()
COLZP = {'LT_G': [122, 126, 132, 255], 'GUARDA': [140, 144, 150, 255],
         'TR_S': [110, 114, 120, 255], 'pos': [205, 205, 208, 255],
         'UniDrive': [52, 110, 62, 255], 'SPEED': [150, 130, 90, 255],
         'escaleri': [95, 95, 100, 255], 'Power': [60, 60, 66, 255],
         'Sensor': [180, 60, 40, 255], 'defecto': [150, 150, 152, 255],
         'pale': [70, 130, 200, 255], 'oring': [30, 120, 90, 255]}

def colzp(nm):
    for k, c in COLZP.items():
        if nm.startswith(k) or k in nm: return c
    return COLZP['defecto']

def T_from(R=np.eye(3), t=(0, 0, 0)):
    T = np.eye(4); T[:3, :3] = R; T[:3, 3] = t
    return T

geom_reg = set()
n_zp = n_out = 0
for i, n in enumerate(nodes):
    if 'mesh' not in n: continue
    nm = n.get('name', f'n{i}')
    Tw = MM @ world(i)                    # mundo ZP en mm
    m = mesh_of(n['mesh'])
    c = trimesh.transform_points(trimesh.bounds.corners(m.bounds), Tw)
    x0, x1 = c[:, 0].min(), c[:, 0].max()
    xc = (x0 + x1) / 2
    dx = 0.0
    if any(nm.startswith(q) for q in QUITAR) and abs(xc) < ZONA:
        n_out += 1
        continue
    if nm.startswith('Sensor') and abs(xc) < ZONA:
        n_out += 1
        continue
    if nm.startswith('soporte sensor') and abs(xc) < ZONA:
        n_out += 1
        continue
    for k, v in REUBICA.items():
        if nm.startswith(k) and abs(xc) < ZONA:
            dx = v
    T = RZP @ T_from(t=(dx, 0, 0)) @ Tw
    gname = f'zpg_{n["mesh"]}'
    node_name = f'ZP_{nm}_{i}'
    if nm.startswith('escaleri'):
        mm2 = m.copy(); mm2.apply_transform(T)
        keep = np.abs(mm2.triangles_center[:, 0]) > 310.0
        mm2.update_faces(keep); mm2.remove_unreferenced_vertices()
        mm2.visual = trimesh.visual.ColorVisuals(mm2, face_colors=colzp(nm))
        esc.add_geometry(mm2, geom_name='zp_escalerilla_cortada', node_name=node_name)
        n_zp += 1
        continue
    if gname not in geom_reg:
        mg = m.copy()
        mg.visual = trimesh.visual.ColorVisuals(mg, face_colors=colzp(nm))
        esc.add_geometry(mg, geom_name=gname, node_name=node_name, transform=T)
        geom_reg.add(gname)
    else:
        esc.graph.update(frame_to=node_name, frame_from=esc.graph.base_frame,
                         matrix=T, geometry=gname)
    n_zp += 1
print(f'ZP: {n_zp} nodos instalados, {n_out} retirados de la zona central')

# ---------- el bloque v4 (modulo angosto) ----------
NEJES, PASO = 8, 74.75
Z_EJE, W2 = 83.1, 18.3
Y_RUEDAS = [-39.0, 39.0, 117.0, 195.0]
POLEA_D = 40.0
G = {'der': (-69.0, -79.0), 'izq': (-95.0, -105.0)}
SPOOL_Z = Z_EJE - 87.7
MZ = SPOOL_Z - 4.0
X_MOTOR = {'der': -90.0, 'izq': +90.0}
X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
KS = {h: [k for k in range(8) if ('der' if k % 2 == 0 else 'izq') == h] for h in ('der','izq')}
KS = {h: [k for k in range(NEJES) if mano(k) == h] for h in ('der', 'izq')}
COL = {'placa': [140, 148, 158, 255], 'tapa': [188, 192, 198, 255],
       'base': [120, 128, 138, 255], 'eje': [90, 90, 96, 255],
       'buje': [222, 222, 214, 255], 'polea': [150, 130, 90, 255],
       'sep': [120, 124, 132, 255], 'correa': [40, 40, 44, 255],
       'der': [45, 90, 150, 255], 'izq': [160, 85, 35, 255]}

def add(name, mesh, color, T=None):
    m = mesh.copy() if T is not None else mesh
    if T is not None: m.apply_transform(T)
    m.visual = trimesh.visual.ColorVisuals(m, face_colors=color)
    esc.add_geometry(m, node_name=name, geom_name=name)

tipo = lambda nm: ('polea' if nm.startswith('nema24') or nm.startswith('polea') or nm.startswith('idler') else
                   'eje' if nm.startswith('F6801') else 'polea' if nm.startswith('bujeadap') else 'base' if nm.startswith('placa_base') or nm.startswith('travesano') else
                   'placa' if nm.startswith('rail') or nm.startswith('placa_motor') else
                   'tapa' if nm.startswith('tapa') else
                   'eje' if nm.startswith('eje') or nm.startswith('collarin') else
                   'buje' if nm.startswith('buje') else
                   'polea' if nm.startswith('polea') else 'sep')
for fn in sorted(glob.glob(p('bo5_*.stl'))):
    nm = os.path.basename(fn)[4:-4]
    m = trimesh.load(fn); m.merge_vertices()
    add(nm, m, COL[tipo(nm)])

from math import radians as _rad
Rx90 = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
for h in ('izq', 'der'):
    tm2 = trimesh.load(p(f'm64v9_{h}.glb'))
    partes = []
    for node in tm2.graph.nodes_geometry:
        T, g = tm2.graph[node]
        mm = tm2.geometry[g].copy(); mm.apply_transform(T)
        partes.append(mm)
    w = trimesh.util.concatenate(partes)
    w.apply_scale(1000.0)
    w.visual = trimesh.visual.ColorVisuals(w, face_colors=COL[h])
    puestos = []
    for k in range(NEJES):
        if mano(k) != h: continue
        for j, y in enumerate(Y_RUEDAS):
            giro = trimesh.transformations.rotation_matrix(_rad(90 * j + 15 * k), [0, 0, 1])
            puestos.append((f'rueda_{h}_{k}_{j}',
                            T_from(t=(X_EJES[k], y, Z_EJE)) @ T_from(Rx90) @ giro))
    nm0, T0 = puestos[0]
    esc.add_geometry(w, geom_name=f'rueda_{h}_geom', node_name=nm0, transform=T0)
    for nm, T in puestos[1:]:
        esc.graph.update(frame_to=nm, frame_from=esc.graph.base_frame,
                         matrix=T, geometry=f'rueda_{h}_geom')

def cinta(name, pts, y):
    for i, ((x0, z0), (x1, z1)) in enumerate(zip(pts[:-1], pts[1:])):
        L = float(np.hypot(x1 - x0, z1 - z0))
        c = trimesh.creation.box(extents=(L, 9.0, 3.0))
        ang = np.arctan2(z1 - z0, x1 - x0)
        R = np.array([[np.cos(ang), 0, -np.sin(ang)], [0, 1, 0],
                      [np.sin(ang), 0, np.cos(ang)]])
        add(f'{name}_{i}', c, COL['correa'], T_from(R, ((x0 + x1) / 2, y, (z0 + z1) / 2)))

r_p = 16.4
G1 = {'der': -72.0, 'izq': -97.0}
MZ5 = Z_EJE - 87.7 - 4.0
XM = {'der': -90.0, 'izq': 90.0}
for h in ('der', 'izq'):
    y = G1[h]
    xs = [X_EJES[k] for k in KS[h]]
    xi = [(xs[i] + xs[i+1]) / 2 for i in range(3)]
    pts = [(XM[h] - r_p, MZ5), (xs[0], Z_EJE - r_p - 1.5)]
    for a2, b2 in zip(xi, xs[1:]):
        pts.append((a2, 50.0 + 12 + 1.5))
        pts.append((b2, Z_EJE - r_p - 1.5))
    pts.append((XM[h] + r_p, MZ5))
    cinta(f'correa_{h}', pts, y)

esc.export(p('bloque_omni_zp_v5.glb'))
print('nodos totales:', len(esc.graph.nodes_geometry), '-> bloque_omni_zp_v5.glb')
