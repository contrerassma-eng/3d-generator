# Extrae mallas reales del ZP2026.glb (meshopt + KHR_mesh_quantization):
# motor UniDrive, carrete speed-up y espaciador -> zp_*.stl en mm, coords ZP.
# Requiere: pip install meshoptimizer trimesh
import json, struct, sys, os
import numpy as np, meshoptimizer as mo, trimesh

GLB = sys.argv[1] if len(sys.argv) > 1 else \
    os.path.join(os.path.dirname(__file__), '..', '..', '..',
                 'cad', 'componentes', 'models', 'ZP2026.glb')
f = open(GLB, 'rb')
f.read(12); clen, _ = struct.unpack('<II', f.read(8))
js = json.loads(f.read(clen))
blen, _ = struct.unpack('<II', f.read(8)); bin0 = f.read(blen)
nodes, meshes, accs, bvs = js['nodes'], js['meshes'], js['accessors'], js['bufferViews']
NORM = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}
DT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16,
      5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
_cache = {}

def view_bytes(bvi):
    if bvi not in _cache:
        e = bvs[bvi]['extensions']['EXT_meshopt_compression']
        raw = np.frombuffer(bin0[e['byteOffset']:e['byteOffset'] + e['byteLength']], np.uint8)
        dec = (mo.decode_vertex_buffer if e['mode'] == 'ATTRIBUTES'
               else mo.decode_index_buffer)
        _cache[bvi] = dec(e['count'], e['byteStride'], raw).tobytes()
    return _cache[bvi]

def acc_array(ai):
    a = accs[ai]
    data = np.frombuffer(view_bytes(a['bufferView']), np.uint8)
    n, dt = NC[a['type']], np.dtype(DT[a['componentType']])
    stride = bvs[a['bufferView']].get('byteStride', dt.itemsize * n)
    off, cnt = a.get('byteOffset', 0), a['count']
    if stride != dt.itemsize * n:
        buf = np.lib.stride_tricks.as_strided(
            data[off:], shape=(cnt, dt.itemsize * n), strides=(stride, 1))
        buf = np.ascontiguousarray(buf)
    else:
        buf = data[off:off + cnt * dt.itemsize * n].reshape(cnt, -1)
    v = np.frombuffer(buf.tobytes(), dt).reshape(cnt, n).astype(np.float64)
    return v / NORM[a['componentType']] if a.get('normalized') else v

def M(n):
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
    T = M(nodes[i]); j = i
    while j in parents:
        j = parents[j]; T = M(nodes[j]) @ T
    return T

def node_mesh(i):
    vs, fs, off = [], [], 0
    def rec(j):
        nonlocal off
        nd = nodes[j]
        if 'mesh' in nd:
            Tj = world(j)
            for prim in meshes[nd['mesh']]['primitives']:
                P = acc_array(prim['attributes']['POSITION'])
                idx = acc_array(prim['indices']).astype(np.int64).reshape(-1, 3)
                vs.append(((Tj[:3, :3] @ P.T).T + Tj[:3, 3]) * 1000.0)
                fs.append(idx + off); off += len(P)
        for c in nd.get('children', []): rec(c)
    rec(i)
    return trimesh.Trimesh(np.vstack(vs), np.vstack(fs), process=False) if vs else None

quiero = {'motor': '300986+Std.+UniDrive+motor+D-Shaft:1',
          'spool': 'SPEED UP SPOOL:1', 'espaciador': 'espaciador:1'}
for tag, nm in quiero.items():
    for i, n in enumerate(nodes):
        if n.get('name', '') == nm:
            m = node_mesh(i)
            if m is None: continue
            m.export(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  f'zp_{tag}.stl'))
            print(tag, len(m.faces), 'tris', np.round(m.bounds[1] - m.bounds[0], 1))
            break
