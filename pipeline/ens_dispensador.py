"""Ensambles del dispensador canino: monta las piezas en su posición de trabajo.

Cada pieza se genera en su orientación de IMPRESIÓN (lo que se manda al
laminador) y aquí se lleva a su POSE en la máquina. De este archivo salen:

  out/cad/conjunto_alimento.glb   cabezal dosificador montado sobre la estructura
  out/cad/conjunto_agua.glb       bebedero de nivel constante montado
  out/cad/referencia_bidon.glb    envolvente del botellón de 20 L (SOLO referencia)
  out/vistas/*.png                vistas rápidas para revisar el diseño

El botellón NO es geometría medida: es una envolvente reconstruida a partir de
las tres cotas citadas (Ø cuerpo, altura total, Ø boca) y de un perfil de hombro
declarado como supuesto. Va en archivo aparte, con color propio y marcado
`render_only`, para que nadie lo confunda con una pieza a fabricar.

uso: python pipeline/ens_dispensador.py projects/<X> [--sin-render]
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import trimesh

sys.path.insert(0, str(Path(__file__).parent))
import lib_solidos as S
import gen_dispensador as G
from lib_audit import audit, now_iso, project_dir, sha256_file


def _t(mesh, at=(0, 0, 0), rz=0.0, rx=0.0, ry=0.0):
    """Copia la malla girada (grados, orden X→Y→Z) y trasladada."""
    m = mesh.copy()
    for ang, ax in ((rx, [1, 0, 0]), (ry, [0, 1, 0]), (rz, [0, 0, 1])):
        if ang:
            m.apply_transform(trimesh.transformations.rotation_matrix(math.radians(ang), ax))
    m.apply_translation(np.asarray(at, dtype=float))
    return m


def _color(m, hexcol):
    rgba = trimesh.visual.color.hex_to_rgba(hexcol)
    m.visual = trimesh.visual.ColorVisuals(mesh=m, face_colors=np.tile(rgba, (len(m.faces), 1)))
    return m


# ---------------------------------------------------------------------------
# Envolvente de referencia del botellón de 20 L (capa web + supuesto declarado)
# ---------------------------------------------------------------------------

def referencia_bidon(P, C, z_labio: float, cortado: bool = False):
    """Botellón invertido: cuello abajo. `cortado` abre la boca de carga."""
    bi = P["bidon"]
    rb, rc = bi["dia_boca_ext"] / 2.0, bi["dia_cuerpo"] / 2.0
    h_cuello, h_hombro = bi["altura_cuello"], C["hombro_alto"]
    h_cuerpo = bi["altura_total"] - h_cuello - h_hombro
    e = 2.5                                            # espesor supuesto de pared
    perfil = np.array([
        [rb - e, 0], [rb, 0], [rb, h_cuello],
        [rc, h_cuello + h_hombro], [rc, h_cuello + h_hombro + h_cuerpo],
        [rc - e, h_cuello + h_hombro + h_cuerpo], [rc - e, h_cuello + h_hombro],
        [rb - e, h_cuello]])
    b = S.revolucion(perfil, secciones=96)
    tapa_z = h_cuello + h_hombro + h_cuerpo
    if cortado:                                        # boca de carga recortada
        anillo = S.tubo(2 * rc, 150.0, e, at=(0, 0, tapa_z + e / 2))
        b = S.union(b, anillo)
    else:
        b = S.union(b, S.cilindro(2 * rc, e, at=(0, 0, tapa_z + e / 2)))
    b.apply_translation([0, 0, z_labio])
    return _color(b, "#90caf9")


# ---------------------------------------------------------------------------
# Estructura común
# ---------------------------------------------------------------------------

def estructura(P, C, piezas, z_anillo: float, mensulas_z: float | None = None):
    """Trípode: 3 columnas de perfil 20x20 inclinadas 12°, anillo de asiento
    arriba y anillo de arriostre abajo (la MISMA pieza impresa en ambos)."""
    es = P["estructura"]
    partes, perfiles = [], []
    re = es["anillo_dia_ext"] / 2.0
    r_pata = re - 4.0
    incl = math.radians(es["pata_inclinacion_deg"])
    lado = es["pata_seccion"]
    z_bajo = es["anillo_inferior_alto"] if es.get("anillo_inferior") else None
    largo = (z_anillo + 16.0) / math.cos(incl)

    for k in range(es["anillo_segmentos"]):
        a = 360.0 / es["anillo_segmentos"] * k
        partes.append((f"est_anillo_segmento_sup{k}", _t(piezas["est_anillo_segmento"], at=(0, 0, z_anillo), rz=a)))
        if z_bajo and z_anillo - z_bajo > 120:
            partes.append((f"est_anillo_segmento_inf{k}",
                           _t(piezas["est_anillo_segmento"], at=(0, 0, z_bajo), rz=a)))
        # columna: perfil comercial continuo, del pie al anillo de asiento
        zc = largo * math.cos(incl) / 2.0                 # el pie apoya en z=0
        col = S.caja((lado, lado, largo))
        col.apply_transform(trimesh.transformations.rotation_matrix(incl, [1, 0, 0]))
        col.apply_translation([0, r_pata + (z_anillo - zc) * math.tan(incl), zc])
        perfiles.append((f"perfil_columna{k}", _t(col, rz=a)))
        # OJO: primero se lleva la pieza a su radio y altura, y RECIÉN
        # después se gira alrededor del eje del aparato. Al revés quedarían
        # las tres en el mismo sitio.
        r_pie = r_pata + z_anillo * math.tan(incl)
        partes.append((f"est_pie{k}", _t(_t(piezas["est_pie"], at=(0, r_pie, 0)), rz=a)))
        if mensulas_z is not None:               # ménsulas que cuelgan el cabezal
            r_m = r_pata + (z_anillo - mensulas_z) * math.tan(incl)
            partes.append((f"est_soporte_cabezal{k}",
                           _t(_t(piezas["est_soporte_cabezal"], at=(0, r_m, mensulas_z)), rz=a)))
    return partes, perfiles


# ---------------------------------------------------------------------------
# Conjuntos
# ---------------------------------------------------------------------------

def tren_agitador(P, C, piezas, avance: float = 0.0):
    """Agitador, manivela y biela colocados para un avance dado del cajón.

    El cajón hace de corredera del biela-manivela: recorrer la carrera le da al
    agitador una vuelta larga, y volver se la devuelve.
    """
    th = G.angulo_manivela(C, avance)
    r = C["manivela_radio"]
    y_pin = C["y_carga"] + r * math.cos(math.radians(th))
    z_pin = C["z_agitador"] + r * math.sin(math.radians(th))
    y_ear = C["y_pasador_cerrado"] + avance
    psi = math.degrees(math.atan2(C["z_pasador_cajon"] - z_pin, y_ear - y_pin))
    return [
        ("ali_agitador", _color(_t(piezas["ali_agitador"], at=(0, C["y_carga"], C["z_agitador"]),
                                   rx=th), S.COLORES["rotor"])),
        ("ali_manivela", _color(_t(piezas["ali_manivela"],
                                   at=(C["x_biela"], C["y_carga"], C["z_agitador"]), rx=th),
                                S.COLORES["palanca"])),
        ("ali_biela", _color(_t(piezas["ali_biela"], at=(C["x_biela"], y_pin, z_pin), rx=psi),
                             S.COLORES["palanca"])),
    ]


def conjunto_alimento(P, C, piezas):
    do = P["dosificador"]
    z0 = C["z_canal_base"]
    y_cav_local = C["y_cavidad_local"]
    partes = [
        ("ali_canal_base", _color(_t(piezas["ali_canal_base"], at=(0, 0, z0)), S.COLORES["carcasa"])),
        ("ali_canal_tapa", _color(_t(piezas["ali_canal_tapa"], at=(0, 0, C["z_tapa_inf"])), S.COLORES["carcasa"])),
        ("ali_corredera", _color(_t(piezas["ali_corredera"],
                                    at=(0, C["y_carga"] - y_cav_local, C["z_deslizamiento"])), S.COLORES["rotor"])),
        ("ali_adaptador_cuello", _color(_t(piezas["ali_adaptador_cuello"],
                                           at=(0, C["y_carga"], C["z_tapa_sup"])), S.COLORES["carcasa"])),
        ("ali_pinon", _color(_t(piezas["ali_pinon"], at=(-C["x_pinon"], 0, C["z_pinon"])), S.COLORES["engranaje"])),
        ("ali_eje_pinon", _color(_t(piezas["ali_eje_pinon"], at=(-C["x_pinon"], 0, C["z_pinon"] + 10)),
                                 S.COLORES["engranaje"])),
        ("ali_palanca", _color(_t(piezas["ali_palanca"], at=(-C["x_pinon"], 0, C["z_pinon"] + 48),
                                  rz=C["palanca_ang_cerrado"] - 90.0), S.COLORES["palanca"])),
        ("ali_chute", _color(_t(piezas["ali_chute"], at=(0, C["y_descarga"], z0)), S.COLORES["bandeja"])),
        ("est_collar_cuello_a", _color(_t(piezas["est_collar_cuello"], at=(0, 0, C["z_labio_alimento"] + 14)),
                                       S.COLORES["estructura"])),
        ("est_collar_cuello_b", _color(_t(piezas["est_collar_cuello"], at=(0, 0, C["z_labio_alimento"] + 14),
                                          rz=180), S.COLORES["estructura"])),
    ]
    partes += tren_agitador(P, C, piezas, 0.0)
    est, perfiles = estructura(P, C, piezas, C["z_anillo_alimento"],
                               mensulas_z=C["z_canal_base"] + 18.0)
    partes += [(n, _color(m, S.COLORES["estructura"])) for n, m in est]
    partes += [(n, _color(m, "#8d6e63")) for n, m in perfiles]      # perfil comercial 20x20
    return partes


def conjunto_agua(P, C, piezas):
    ag = P["agua"]
    partes = [
        ("agua_bebedero", _color(_t(piezas["agua_bebedero"]), S.COLORES["agua"])),
        ("agua_difusor", _color(_t(piezas["agua_difusor"], at=(0, 0, C["z_difusor"])), S.COLORES["agua"])),
        ("agua_tubo_nivel", _color(_t(piezas["agua_tubo_nivel"], at=(0, 0, C["z_tubo_nivel_inf"])),
                                   S.COLORES["agua"])),
        ("agua_bajante", _color(_t(piezas["agua_bajante"], at=(0, 0, C["z_bajante_inf"])), S.COLORES["agua"])),
        ("agua_boquilla", _color(_t(piezas["agua_boquilla"], at=(0, 0, C["z_labio_agua"])), S.COLORES["agua"])),
        ("est_collar_cuello_a", _color(_t(piezas["est_collar_cuello"], at=(0, 0, C["z_labio_agua"] + 14)),
                                       S.COLORES["estructura"])),
        ("est_collar_cuello_b", _color(_t(piezas["est_collar_cuello"], at=(0, 0, C["z_labio_agua"] + 14), rz=180),
                                       S.COLORES["estructura"])),
    ]
    est, perfiles = estructura(P, C, piezas, C["z_anillo_agua"])
    partes += [(n, _color(m, S.COLORES["estructura"])) for n, m in est]
    partes += [(n, _color(m, "#8d6e63")) for n, m in perfiles]
    # lámina de agua en el bebedero (solo visualización del nivel de equilibrio)
    r = ag["bebedero_dia_ext"] / 2 - ag["bebedero_pared"] - 0.5
    agua = S.cilindro(2 * r, ag["nivel_agua"] - ag["bebedero_fondo"],
                      at=(0, 0, (ag["nivel_agua"] + ag["bebedero_fondo"]) / 2))
    partes.append(("lamina_agua", _color(agua, "#4fc3f7")))
    return partes


# ---------------------------------------------------------------------------
# Render de vistas (matplotlib: proyección de aristas, sin dependencias de GPU)
# ---------------------------------------------------------------------------

def render(escena: list, path: Path, titulo: str, elev=18.0, azim=-62.0) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection

    fig = plt.figure(figsize=(7.5, 10), dpi=110)
    ax = fig.add_subplot(111, projection="3d")
    todo = trimesh.util.concatenate(escena)
    for m in escena:
        col = (m.visual.face_colors[0][:3] / 255.0) if hasattr(m.visual, "face_colors") else (0.6, 0.6, 0.6)
        tri = m.vertices[m.faces]
        # sombreado simple por orientación de la cara (luz cenital adelantada)
        n = m.face_normals @ np.array([0.35, -0.55, 0.76])
        tono = np.clip(0.45 + 0.55 * n, 0.12, 1.0)
        caras = np.clip(np.outer(tono, col), 0, 1)
        pc = Poly3DCollection(tri, facecolors=caras, edgecolors="none")
        ax.add_collection3d(pc)
    b = todo.bounds
    c, r = (b[0] + b[1]) / 2, float(np.max(b[1] - b[0])) / 2
    ax.set_xlim(c[0] - r, c[0] + r)
    ax.set_ylim(c[1] - r, c[1] + r)
    ax.set_zlim(max(0, c[2] - r), c[2] + r)
    ax.set_box_aspect((1, 1, 1))
    ax.view_init(elev=elev, azim=azim)
    ax.set_axis_off()
    ax.set_title(titulo, fontsize=11)
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------------------
# Animación del ciclo de dosificación (la prueba visual de que esto funciona)
# ---------------------------------------------------------------------------

def animacion(P, C, piezas, destino: Path, cuadros: int = 16) -> Path:
    """Un ciclo completo: cargar → llevar la dosis → descargar → volver.

    Se dibuja el cabezal con el cajón en cada posición del recorrido y con la
    palanca girada lo que le corresponde por la relación cremallera-piñón.
    """
    import math as _m
    do = P["dosificador"]
    y_cav = C["y_cavidad_local"]
    fijas = [m for n, m in conjunto_alimento(P, C, piezas)
             if n.startswith("ali_") and n not in ("ali_corredera", "ali_palanca",
                                                   "ali_agitador", "ali_manivela", "ali_biela")]
    imgs = []
    destino.mkdir(parents=True, exist_ok=True)
    ida = list(range(cuadros)) + list(range(cuadros - 2, 0, -1))
    for i, k in enumerate(ida):
        f = k / (cuadros - 1)
        avance = f * C["carrera"]
        cajon = _color(_t(piezas["ali_corredera"],
                          at=(0, C["y_carga"] + avance - y_cav, C["z_deslizamiento"])),
                       S.COLORES["rotor"])
        ang = C["palanca_ang_cerrado"] - 90.0 + f * C["palanca_barrido_deg"]
        palanca = _color(_t(piezas["ali_palanca"], at=(-C["x_pinon"], 0, C["z_pinon"] + 48),
                            rz=ang), S.COLORES["palanca"])
        # la croqueta que va en la cavidad, dibujada como bloque testigo
        dosis = S.caja((do["cavidad_x"] - 6, do["cavidad_y"] - 6, C["cavidad_z"] - 6),
                       at=(0, C["y_carga"] + avance, C["z_deslizamiento"] + C["cavidad_z"] / 2))
        cae = f >= 0.999
        if cae:
            dosis = S.caja((do["cavidad_x"] - 6, do["cavidad_y"] - 6, 30),
                           at=(0, C["y_descarga"] + 20, C["z_canal_base"] - 90))
        tren = [m for _, m in tren_agitador(P, C, piezas, avance)]
        p_img = destino / f"ciclo_{i:02d}.png"
        render(fijas + tren + [cajon, palanca, _color(dosis, "#8d6e3b")], p_img,
               f"Ciclo de dosificación — avance {avance:.0f} mm de {C['carrera']:.0f}"
               + ("  ·  DOSIS ENTREGADA" if cae else ""),
               elev=16.0, azim=-64.0)
        imgs.append(p_img)
    try:
        from PIL import Image
        cuadros_img = [Image.open(x).convert("P", palette=Image.ADAPTIVE) for x in imgs]
        gif = destino / "ciclo_dosificacion.gif"
        cuadros_img[0].save(gif, save_all=True, append_images=cuadros_img[1:],
                            duration=160, loop=0)
        for x in imgs:                           # los cuadros sueltos se regeneran
            x.unlink(missing_ok=True)
        return gif
    except Exception as e:                       # sin PIL: quedan los cuadros sueltos
        print(f"  (sin GIF: {e})")
        return destino


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    proj = project_dir(sys.argv[1])
    render_on = "--sin-render" not in sys.argv[2:]
    P = json.loads((proj / "input" / "params.json").read_text(encoding="utf-8"))
    C = G.calculos(P)

    piezas = {}
    for nombre, fn in G.PIEZAS.items():
        piezas[nombre] = fn(P, C)[0]

    cad = proj / "out" / "cad"
    cad.mkdir(parents=True, exist_ok=True)
    salidas = {}

    conjuntos = {
        "conjunto_alimento": (conjunto_alimento(P, C, piezas),
                              referencia_bidon(P, C, C["z_labio_alimento"], cortado=True),
                              "Dispensador de alimento dosificado (bidón 20 L recortado)"),
        "conjunto_agua": (conjunto_agua(P, C, piezas),
                          referencia_bidon(P, C, C["z_labio_agua"], cortado=False),
                          "Bebedero de nivel constante (bidón 20 L íntegro)"),
    }
    for nombre, (nom_partes, bidon, titulo) in conjuntos.items():
        partes = [m for _, m in nom_partes]
        escena = trimesh.Scene(partes)
        p_glb = cad / f"{nombre}.glb"
        p_glb.write_bytes(trimesh.exchange.gltf.export_glb(escena))
        salidas[nombre] = p_glb
        if render_on:
            render(partes + [bidon], proj / "out" / "vistas" / f"{nombre}.png", titulo)
            render(partes, proj / "out" / "vistas" / f"{nombre}_sin_bidon.png",
                   titulo + " — solo piezas impresas", elev=12.0, azim=-75.0)

    ref = cad / "referencia_bidon.glb"
    ref.write_bytes(trimesh.exchange.gltf.export_glb(
        trimesh.Scene([referencia_bidon(P, C, 0.0, cortado=False)])))
    salidas["referencia_bidon"] = ref

    # detalle del cabezal dosificador, que es donde vive la función
    if render_on:
        det = [m for n, m in conjunto_alimento(P, C, piezas)
               if n.startswith("ali_")]
        render(det, proj / "out" / "vistas" / "detalle_cabezal.png",
               "Cabezal dosificador: cajón, cremallera, piñón y agitador", elev=24.0, azim=-58.0)
        render(det, proj / "out" / "vistas" / "detalle_cabezal_alzado.png",
               "Cabezal dosificador — alzado", elev=2.0, azim=-90.0)
        render(det, proj / "out" / "vistas" / "detalle_cabezal_planta.png",
               "Cabezal dosificador — planta", elev=88.0, azim=-90.0)

    if render_on and "--anim" in sys.argv[2:]:
        gif = animacion(P, C, piezas, proj / "out" / "vistas" / "ciclo")
        print(f"Animación → {gif.relative_to(proj)}")

    audit(proj, "CAD", "ensambles y vistas del dispensador", "OK",
          conjuntos=list(conjuntos), hashes={k: sha256_file(v) for k, v in salidas.items()})
    print("Ensambles:")
    for k, v in salidas.items():
        print(f"  {k:22s} {v.relative_to(proj)}  ({v.stat().st_size / 1024:.0f} KB)")
    if render_on:
        print(f"Vistas → {(proj / 'out' / 'vistas').relative_to(proj)}")


if __name__ == "__main__":
    main()
