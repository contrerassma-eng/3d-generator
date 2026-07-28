"""Rueda omni de doble hilera: piezas para fabricar (capa `user`, DISEÑO).

Genera los sólidos de una rueda omni construida por SÁNDWICH de placas planas
de espesor constante, a partir de los parámetros medidos en la foto
(`work/00_medicion/parametros.json`) más las decisiones del usuario: barreno
hexagonal, diámetro del eje de rodillos y espesor de placa.

Construcción (de fuera a dentro, un eje de rodillos por INTERFAZ de placas):

    P1  placa exterior SIN ranura, con avellanado para la cabeza del tornillo
    P2  placa CON ranura semicircular: aloja el eje de la hilera frontal
    M1  placa intermedia (separa las dos hileras)
    M2  placa intermedia (espejo de M1)
    P3  placa CON ranura (espejo de P2): eje de la hilera posterior
    P4  placa exterior SIN ranura, taladro de núcleo para roscar

El eje de cada rodillo queda CAZADO entre la ranura de su placa y la cara lisa
de la contigua: no lleva cabeza ni tuerca, lo retiene el sándwich. El paquete
lo cierran 5 tornillos avellanados que atraviesan el cubo.

Nada de esto es medición: es diseño derivado de la medición. Las cotas heredadas
de la foto arrastran su incertidumbre (ver NOTAS del plano) y las decisiones de
diseño se justifican una a una en `out/piezas/piezas.json`.

uso: python pipeline/rueda_omni_piezas.py projects/<X> [opciones]
  --hex <mm>        entrecaras del hexágono central (def: 12.85)
  --eje <mm>        diámetro del eje de rodillos (def: 3.0)
  --espesor <mm>    espesor de placa (def: 3.0)
  --tornillo <M>    métrica de los tornillos de amarre (def: M3)
  --holgura <mm>    juego rodillo/eje y rodillo/placa (def: 0.2 / 0.4)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import audit, now_iso, project_dir, sha256_file
from rueda_omni import opt

# Tornillos avellanados DIN 965 (cabeza 90°): métrica -> (Ø paso, Ø cabeza, Ø núcleo)
TORNILLOS = {"M2.5": (2.7, 4.7, 2.05), "M3": (3.2, 5.6, 2.5), "M4": (4.3, 7.5, 3.3)}
COLORES = {"placa": [214, 219, 224, 255], "rodillo": [48, 48, 54, 255],
           "eje": [150, 158, 165, 255]}


# ---------------------------------------------------------------------------
# Perfiles 2D
# ---------------------------------------------------------------------------

def rho(t: float, R: float, a: float) -> float:
    """Radio del barril del rodillo en la estación axial t (rodadura a R)."""
    return math.sqrt(max(R * R - t * t, 0.0)) - a


def hueco_rodillo(R, a, largo, holgura, dw, n=64):
    """Polígono del hueco que un rodillo exige en una placa.

    `dw` es la distancia del plano del eje del rodillo a la loncha de placa más
    próxima: la sección del barril a esa altura es sqrt(rho² - dw²), así que la
    placa que pasa lejos del eje necesita menos hueco. Devuelve None si el
    rodillo no llega a esa loncha."""
    from shapely.geometry import Polygon
    r0 = rho(0.0, R, a) + holgura
    if dw >= r0:
        return None
    med = largo / 2 + holgura
    ts = np.linspace(-med, med, n)
    sup, inf = [], []
    for t in ts:
        rr = rho(min(abs(t), largo / 2), R, a) + holgura
        semi = math.sqrt(max(rr * rr - dw * dw, 0.0))
        if semi <= 0:
            continue
        sup.append((a + semi, t))
        inf.append((a - semi, t))
    if len(sup) < 3:
        return None
    return Polygon(sup + inf[::-1]).buffer(0)


def hexagono(entrecaras: float):
    """Hexágono regular definido por su ENTRECARAS (llaves), no por vértices."""
    from shapely.geometry import Polygon
    rc = entrecaras / math.sqrt(3)                    # radio a vértice
    return Polygon([(rc * math.cos(math.radians(60 * k + 30)),
                     rc * math.sin(math.radians(60 * k + 30))) for k in range(6)])


def girar(poly, grados):
    from shapely import affinity
    return affinity.rotate(poly, grados, origin=(0, 0))


# ---------------------------------------------------------------------------
# Sólidos
# ---------------------------------------------------------------------------

def extruir(poly, z0, z1):
    import trimesh
    m = trimesh.creation.extrude_polygon(poly, height=z1 - z0)
    m.apply_translation((0, 0, z0))
    return m


def cilindro(diam, largo, centro, eje):
    """Cilindro de eje arbitrario (eje = vector unitario)."""
    import trimesh
    m = trimesh.creation.cylinder(radius=diam / 2, height=largo, sections=48)
    z = np.array([0, 0, 1.0])
    v = np.asarray(eje, float) / np.linalg.norm(eje)
    if np.allclose(v, -z):
        m.apply_transform(trimesh.transformations.rotation_matrix(math.pi, [1, 0, 0]))
    elif not np.allclose(v, z):
        eje_giro = np.cross(z, v)
        ang = math.acos(float(np.clip(np.dot(z, v), -1, 1)))
        m.apply_transform(trimesh.transformations.rotation_matrix(ang, eje_giro))
    m.apply_translation(centro)
    return m


def corte_avellanado(d_paso, d_cabeza, z_cara, z_fondo):
    """Taladro pasante + avellanado 90° como UN solo sólido de revolución.

    Restar dos sólidos que comparten la pared del taladro deja aristas casi
    coincidentes que al reimportar el STL se funden y abren la malla; con un
    único perfil revolucionado el corte es limpio."""
    import trimesh
    prof = (d_cabeza - d_paso) / 2                    # cabeza a 90°
    s = 1.0 if z_fondo > z_cara else -1.0
    reb = 1.0                                         # rebase fuera de la pieza
    perfil = [[0.0, z_fondo + s * reb],
              [d_paso / 2, z_fondo + s * reb],
              [d_paso / 2, z_cara + s * prof],
              [d_cabeza / 2, z_cara],
              [d_cabeza / 2 + reb, z_cara - s * reb],
              [0.0, z_cara - s * reb]]
    if s > 0:                       # el perfil se recorre con z creciente o la
        perfil = perfil[::-1]       # revolución sale con las normales al revés
    return trimesh.creation.revolve(np.array(perfil), sections=48)


def solido_rodillo(R, a, largo, barreno, n=48):
    """Barril de rodadura rho(t) = sqrt(R²-t²) - a, con barreno pasante.

    Se construye en local: eje del rodillo = eje Z, luego se coloca."""
    import trimesh
    ts = np.linspace(-largo / 2, largo / 2, n)
    perfil = [[0.0, ts[0]]] + [[rho(t, R, a), t] for t in ts] + [[0.0, ts[-1]]]
    barril = trimesh.creation.revolve(np.array(perfil), sections=64)
    hueco = trimesh.creation.cylinder(radius=barreno / 2, height=largo * 1.5,
                                      sections=48)
    return trimesh.boolean.difference([barril, hueco])


def colocar_rodillo(m, a, ang_deg, z):
    """Lleva un sólido de eje Z al eje del rodillo: cuerda a radio `a`, altura z."""
    import trimesh
    m = m.copy()
    m.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [1, 0, 0]))
    m.apply_translation((a, 0, z))                    # eje tangencial en x = a
    m.apply_transform(trimesh.transformations.rotation_matrix(
        math.radians(ang_deg), [0, 0, 1]))
    return m


# ---------------------------------------------------------------------------
# Diseño
# ---------------------------------------------------------------------------

def disenar(par: dict, hexmm: float, d_eje: float, esp: float, metrica: str,
            holg_eje: float, holg_placa: float, asiento: float = 3.0) -> dict:
    """Resuelve las cotas del sándwich a partir de la medición y las decisiones.

    Todo lo que se decide aquí queda con su justificación: son los números que
    el usuario tendrá que discutir, no los que midió la foto."""
    c = par["cotas"]
    R = c["diametro_exterior"]["mm"] / 2
    a = c["radio_eje_rodillo"]["mm"]
    largo = c["longitud_rodillo"]["mm"]
    n_rod = par["rodillos_por_hilera"]
    desfase = par["desfase_hileras_deg"]
    d_paso, d_cab, d_nucleo = TORNILLOS[metrica]

    # Separación entre planos de eje: en el solape angular de las dos hileras
    # ambos barriles están al MISMO radio, así que sólo los separa la altura.
    # El caso peor es la bisectriz del solape (mitad del desfase).
    t_peor = a * math.tan(math.radians(desfase / 2))
    sep_min = 2 * rho(t_peor, R, a) + 2 * holg_placa
    n_int = max(0, math.ceil((sep_min - 2 * esp) / esp))   # placas intermedias
    sep = esp * (n_int + 2) / 2 * 2 - esp * 0              # ver z de los planos
    sep = esp + n_int * esp + esp                          # ranura|int...|ranura

    # Circunferencia de tornillos: han de pasar por el CUBO, libres de los dos
    # juegos de rodillos. El radio interior de un rodillo es 2a - R.
    r_libre = 2 * a - R - holg_placa
    r_torn = r_libre - d_paso / 2 - 0.5
    # Diámetro de placa: ha de envolver el asiento del eje en el brazo.
    t_ext = largo / 2 + asiento
    d_placa = 2 * (math.hypot(a, t_ext) + 1.2)
    largo_eje = largo + 2 * asiento

    z_a = esp                                   # plano del eje de la hilera A
    z_b = z_a + sep                             # plano del eje de la hilera B
    espesor_total = z_b + esp
    ancho_total = 2 * (rho(0, R, a) + a) - 2 * a + espesor_total  # tread a tread
    ancho_total = (z_b + rho(0, R, a)) - (z_a - rho(0, R, a))

    return {
        "formato": "foto3d-rueda-omni-piezas", "version": 1, "generado": now_iso(),
        "capa": "user", "origen_medicion": par["foto"]["sha256"],
        "heredado_de_la_foto": {
            "diametro_exterior": 2 * R, "radio_eje_rodillo": a,
            "longitud_rodillo": largo, "rodillos_por_hilera": n_rod,
            "hileras": par["hileras"], "desfase_deg": desfase,
            "incertidumbre_pct": par["incertidumbre_pct"]},
        "decidido_por_el_usuario": {
            "hexagono_entrecaras": hexmm, "diametro_eje_rodillo": d_eje,
            "espesor_placa": esp, "tornillo": metrica},
        "derivado": {
            "diametro_max_rodillo": round(2 * rho(0, R, a), 2),
            "barreno_rodillo": round(d_eje + holg_eje, 2),
            "largo_eje_rodillo": round(largo_eje, 2),
            "asiento_eje_por_lado": round(asiento - holg_placa, 2),
            "separacion_planos_eje": round(sep, 2),
            "separacion_minima_exigida": round(sep_min, 2),
            "placas_intermedias": n_int,
            "placas_totales": 4 + n_int,
            "diametro_placa": round(d_placa, 2),
            "circunferencia_tornillos": round(2 * r_torn, 2),
            "radio_libre_de_rodillos": round(r_libre, 2),
            "taladro_paso": d_paso, "cabeza_avellanada": d_cab,
            "taladro_para_roscar": d_nucleo,
            "espesor_paquete_placas": round(espesor_total, 2),
            "ancho_total_rueda": round(ancho_total, 2),
            "z_plano_eje_A": z_a, "z_plano_eje_B": round(z_b, 2)},
        "justificacion": {
            "separacion_planos_eje":
                f"en la bisectriz del solape ({desfase/2:g}°) los dos barriles "
                f"están al mismo radio y sólo los separa la altura: exigen "
                f"{sep_min:.2f} mm; con placas de {esp:g} se toma {sep:.2f} "
                f"({n_int} placas intermedias)",
            "circunferencia_tornillos":
                f"el radio interior de los rodillos es 2a-R = {2*a-R:.2f}; el "
                f"tornillo {metrica} pasa por el cubo a Ø{2*r_torn:.2f}, libre de "
                f"las dos hileras. La Ø{c['circunferencia_tornillos']['mm']} de la "
                f"foto NO sirve aquí: chocaría con los rodillos de la hilera opuesta",
            "diametro_placa":
                f"envuelve el asiento del eje ({asiento:g} mm por lado, de los que "
                f"{asiento - holg_placa:.1f} son ranura útil) y se queda "
                f"{R - d_placa/2:.1f} mm por debajo de la banda de rodadura",
            "hexagono": "entrecaras (llaves), no entre vértices; sin holgura "
                        "añadida: el valor dado se toma como cota final",
            "eje": f"Ø{d_eje:g} liso, sin cabeza: lo retiene el sándwich. El "
                   f"barreno del rodillo lleva {holg_eje:g} de juego",
        },
    }


def construir(d: dict, holg_placa: float):
    """Devuelve {nombre: (malla, tipo)} con todas las piezas colocadas."""
    import trimesh
    from shapely.ops import unary_union

    h = d["heredado_de_la_foto"]
    u = d["decidido_por_el_usuario"]
    g = d["derivado"]
    R, a, largo = h["diametro_exterior"] / 2, h["radio_eje_rodillo"], h["longitud_rodillo"]
    n_rod, desfase, esp = h["rodillos_por_hilera"], h["desfase_deg"], u["espesor_placa"]
    paso = 360 / n_rod
    z_a, z_b = g["z_plano_eje_A"], g["z_plano_eje_B"]
    r_torn = g["circunferencia_tornillos"] / 2
    ang_torn = [desfase + k * paso for k in range(n_rod)]     # ventanas de la hilera A
    ejes = [(k * paso, z_a) for k in range(n_rod)] + \
           [(desfase + k * paso, z_b) for k in range(n_rod)]

    # --- perfil 2D común de placa -------------------------------------------
    from shapely.geometry import Point
    disco = Point(0, 0).buffer(g["diametro_placa"] / 2, quad_segs=96)
    hexa = hexagono(u["hexagono_entrecaras"])

    sueltas = []

    def perfil_placa(z0, z1, nombre):
        """Perfil de una placa: disco - hexágono - huecos de los rodillos que
        atraviesan su loncha. Los recortes pueden desprender la punta de un
        brazo (pasa en las intermedias, donde el rodillo de la hilera opuesta
        la cruza): esas islas no sujetan nada y se descartan, dejando registro."""
        p = disco.difference(hexa)
        huecos = []
        for ang, zr in ejes:
            dw = 0.0 if z0 <= zr <= z1 else min(abs(zr - z0), abs(zr - z1))
            hu = hueco_rodillo(R, a, largo, holg_placa, dw)
            if hu is not None:
                huecos.append(girar(hu, ang))
        p = p.difference(unary_union(huecos)) if huecos else p
        trozos = list(getattr(p, "geoms", [p]))
        if len(trozos) > 1:
            cubo = hexa.buffer(0.2).boundary
            unidos = [t for t in trozos if t.intersects(cubo)]
            perdidas = [round(t.area, 1) for t in trozos if not t.intersects(cubo)]
            sueltas.append({"placa": nombre, "islas": len(perdidas),
                            "area_mm2": perdidas})
            p = unary_union(unidos)
        return p

    piezas, perfiles, z = {}, {}, 0.0
    n_int = g["placas_intermedias"]
    plan = ([("placa_ext_avellanada", "ext_csk"), ("placa_ranurada_A", "ranura_sup")] +
            [(f"placa_intermedia_{i+1}", "lisa") for i in range(n_int)] +
            [("placa_ranurada_B", "ranura_inf"), ("placa_ext_roscada", "ext_rosca")])
    for nombre, tipo in plan:
        z0, z1 = z, z + esp
        perfil = perfil_placa(z0, z1, nombre)
        placa = extruir(perfil, z0, z1)
        # taladros de amarre
        cortes, extras = [], []
        d_tal = g["taladro_para_roscar"] if tipo == "ext_rosca" else g["taladro_paso"]
        for ang in ang_torn:
            c = (r_torn * math.cos(math.radians(ang)), r_torn * math.sin(math.radians(ang)))
            if tipo == "ext_csk":                     # boca en la cara exterior z0
                tal = corte_avellanado(d_tal, g["cabeza_avellanada"], z0, z1)
            else:
                tal = cilindro(d_tal, esp * 3, (0, 0, (z0 + z1) / 2), (0, 0, 1))
            tal.apply_translation((c[0], c[1], 0))
            cortes.append(tal)
            extras.append(("c", c, d_tal / 2, "CORTE"))
            if tipo == "ext_csk":
                extras.append(("c", c, g["cabeza_avellanada"] / 2, "AVELLANADO"))
        # ranura semicircular del eje, en la cara que mira a la hilera
        if tipo.startswith("ranura"):
            zr = z0 if tipo == "ranura_sup" else z1
            angs = [k * paso for k in range(n_rod)] if tipo == "ranura_sup" else \
                   [desfase + k * paso for k in range(n_rod)]
            for ang in angs:
                ej = cilindro(u["diametro_eje_rodillo"] + 0.1, g["largo_eje_rodillo"],
                              (a, 0, zr), (0, 1, 0))
                ej.apply_transform(trimesh.transformations.rotation_matrix(
                    math.radians(ang), [0, 0, 1]))
                cortes.append(ej)
                m2 = g["largo_eje_rodillo"] / 2
                ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
                p1 = (a * ca + m2 * sa, a * sa - m2 * ca)
                p2 = (a * ca - m2 * sa, a * sa + m2 * ca)
                extras.append(("l", p1, p2, "RANURA"))
        placa = trimesh.boolean.difference([placa] + cortes)
        placa.visual.face_colors = COLORES["placa"]
        piezas[nombre] = (placa, "placa")
        perfiles[nombre] = (perfil, extras)
        z = z1

    # --- rodillos y ejes ------------------------------------------------------
    rod = solido_rodillo(R, a, largo, g["barreno_rodillo"])
    rod.visual.face_colors = COLORES["rodillo"]
    eje = trimesh.creation.cylinder(radius=u["diametro_eje_rodillo"] / 2,
                                    height=g["largo_eje_rodillo"], sections=32)
    eje.visual.face_colors = COLORES["eje"]
    piezas["rodillo"] = (rod, "rodillo")
    piezas["eje_rodillo"] = (eje, "eje")
    for i, (ang, zr) in enumerate(ejes, start=1):
        piezas[f"_montado_rodillo_{i}"] = (colocar_rodillo(rod, a, ang, zr), "montaje")
        piezas[f"_montado_eje_{i}"] = (colocar_rodillo(eje, a, ang, zr), "montaje")
    return piezas, perfiles, sueltas


def verificar(piezas: dict) -> list[dict]:
    """Interferencias entre sólidos montados: volumen de intersección por par."""
    import trimesh
    montados = [(n, m) for n, (m, t) in piezas.items() if t == "montaje"]
    placas = [(n, m) for n, (m, t) in piezas.items() if t == "placa"]
    choques = []
    for n1, m1 in montados:
        if "_eje_" in n1:                       # el eje va dentro del rodillo
            continue
        for n2, m2 in montados:
            if n1 >= n2 or "_eje_" in n2:
                continue
            if not _cajas_tocan(m1, m2):
                continue
            v = trimesh.boolean.intersection([m1, m2]).volume
            if v > 1e-3:
                choques.append({"a": n1, "b": n2, "volumen_mm3": round(v, 3)})
        for n2, m2 in placas:
            if not _cajas_tocan(m1, m2):
                continue
            v = trimesh.boolean.intersection([m1, m2]).volume
            if v > 1e-3:
                choques.append({"a": n1, "b": n2, "volumen_mm3": round(v, 3)})
    return choques


def pintar(ax, mallas, az=35.0, el=58.0, escala_comun=None) -> float:
    """Pinta mallas sobre unos ejes por el algoritmo del pintor (caras ordenadas
    en profundidad). Devuelve el semilado usado, para poder encuadrar varias
    vistas a la MISMA escala y que las piezas se puedan comparar entre páginas."""
    from matplotlib.collections import PolyCollection

    a, e = math.radians(az), math.radians(el)
    giro = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0],
                     [0, 0, 1.0]])
    incl = np.array([[1.0, 0, 0], [0, math.cos(e), -math.sin(e)],
                     [0, math.sin(e), math.cos(e)]])
    luz = np.array([-0.40, -0.50, 0.62])
    luz /= np.linalg.norm(luz)
    caras, colores, hondo = [], [], []
    for malla in mallas:
        V = malla.vertices @ giro.T @ incl.T
        N = malla.face_normals @ giro.T @ incl.T
        # Sin descartar las caras traseras el algoritmo del pintor deja ver el
        # interior: los triángulos largos de la tapa extruida no se ordenan bien.
        vista = N[:, 2] > 1e-9
        difusa = np.clip(N @ luz, 0, 1)
        base = np.asarray(malla.visual.face_colors[:, :3]) / 255.0
        for t, s, c, v in zip(V[malla.faces], difusa, base, vista):
            if not v:
                continue
            caras.append(t[:, :2])
            colores.append(np.clip(c * (0.30 + 0.78 * s), 0, 1))
            hondo.append(t[:, 2].mean())
    orden = np.argsort(hondo)
    # el borde del mismo color que la cara tapa las costuras de antialias que
    # deja el mallado entre triángulos contiguos
    col = [colores[i] for i in orden]
    ax.add_collection(PolyCollection([caras[i] for i in orden], facecolors=col,
                                     edgecolors=col, linewidths=0.3))
    pts = np.concatenate(caras)
    cx, cy = pts[:, 0].mean(), pts[:, 1].mean()
    semi = escala_comun or max(np.ptp(pts[:, 0]), np.ptp(pts[:, 1])) / 2 * 1.08
    ax.set_xlim(cx - semi, cx + semi)
    ax.set_ylim(cy - semi, cy + semi)
    ax.set_aspect("equal")
    ax.axis("off")
    return semi


def render(piezas: dict, path: Path) -> None:
    """Render isométrico del conjunto montado."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    mallas = [m for m, t in piezas.values() if t in ("montaje", "placa")]
    fig, ax = plt.subplots(figsize=(7, 7))
    pintar(ax, mallas)
    fig.savefig(path, dpi=110, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def _bloque(fig, y: float, titulo: str, lineas, vinetas=False) -> float:
    """Escribe un bloque de texto plegando las líneas largas; devuelve la y final
    para que el siguiente bloque no se le monte encima."""
    import textwrap
    fig.text(0.08, y, titulo, size=10, weight="bold")
    y -= 0.008
    for linea in lineas:
        color = "#b00000" if linea.startswith("AVISO") else "black"
        for i, trozo in enumerate(textwrap.wrap(linea, 108)):
            y -= 0.0165
            fig.text(0.09 if vinetas else 0.08, y,
                     ("· " if vinetas and i == 0 else "  " if vinetas else "") + trozo,
                     size=7.5, color=color)
    return y - 0.014


def catalogo_pdf(piezas: dict, d: dict, path: Path) -> None:
    """Catálogo A4: portada con el conjunto y la lista, y una página por pieza
    con tres vistas renderizadas, sus cotas y qué hay que mecanizar en ella."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_pdf import PdfPages

    A4 = (8.27, 11.69)
    g, u, h = d["derivado"], d["decidido_por_el_usuario"], d["heredado_de_la_foto"]
    cant = {p["pieza"]: p["cant"] for p in d["lista_de_piezas"]}
    nota = {p["pieza"]: p["nota"] for p in d["lista_de_piezas"]}
    mecanizado = {
        "placa_ext_avellanada":
            [f"5 taladros Ø{g['taladro_paso']} con avellanado Ø{g['cabeza_avellanada']} "
             f"a 90° en la cara EXTERIOR",
             "cara interior lisa: es la que cierra la ranura de la placa siguiente"],
        "placa_ranurada_A":
            [f"5 medias cañas Ø{u['diametro_eje_rodillo'] + 0.1:g} en la cara que mira "
             f"a la hilera A, sobre la cuerda a R{h['radio_eje_rodillo']:.2f}",
             f"5 taladros Ø{g['taladro_paso']} pasantes"],
        "placa_ranurada_B":
            [f"idéntica a la A pero con las cañas en la cara OPUESTA y giradas "
             f"{h['desfase_deg']:g}°: no es la misma pieza volteada",
             f"5 taladros Ø{g['taladro_paso']} pasantes"],
        "placa_intermedia_1": [f"5 taladros Ø{g['taladro_paso']} pasantes",
                               "sin ranura ni avellanado: sólo separa las hileras"],
        "placa_intermedia_2": [f"5 taladros Ø{g['taladro_paso']} pasantes",
                               "espejo de la intermedia 1"],
        "placa_ext_roscada":
            [f"5 taladros Ø{g['taladro_para_roscar']} para roscar {u['tornillo']}",
             f"rosca útil {u['espesor_placa']:g} mm: en plástico o aluminio blando, "
             f"tuerca o inserto"],
        "rodillo": [f"barreno Ø{g['barreno_rodillo']} pasante",
                    "perfil de rodadura rho(t) = sqrt(R² - t²) - a: la corona "
                    "describe el Ø exterior de la rueda"],
        "eje_rodillo": [f"varilla lisa Ø{u['diametro_eje_rodillo']:g}, sin cabeza ni "
                        f"rosca: lo retiene el sándwich",
                        f"asiento {g['asiento_eje_por_lado']} mm por lado en la ranura"],
    }

    def cabecera(fig, titulo, sub):
        fig.text(0.08, 0.955, titulo, size=15, weight="bold")
        fig.text(0.08, 0.935, sub, size=8.5, color="#444444")
        fig.lines.append(plt.Line2D([0.08, 0.92], [0.928, 0.928],
                                    transform=fig.transFigure, color="#999999", lw=0.8))
        fig.text(0.08, 0.035, "foto3d · rueda omni · capa `user` (diseño) — "
                 f"cotas heredadas de la foto con ±{h['incertidumbre_pct']:g}% "
                 "de incertidumbre", size=7, color="#666666")

    with PdfPages(path) as pp:
        # --- portada ---------------------------------------------------------
        fig = plt.figure(figsize=A4)
        cabecera(fig, f"Rueda omnidireccional doble Ø{h['diametro_exterior']:g}",
                 f"Sándwich de {g['placas_totales']} placas de "
                 f"{u['espesor_placa']:g} mm · ancho total {g['ancho_total_rueda']:g} mm "
                 f"· {h['hileras']}x{h['rodillos_por_hilera']} rodillos a "
                 f"{h['desfase_deg']:g}° · {d['generado'][:10]}")
        ax = fig.add_axes([0.06, 0.545, 0.88, 0.37])
        pintar(ax, [m for m, t in piezas.values() if t in ("montaje", "placa")])
        filas = [[p["pieza"].replace("_", " "), str(p["cant"]),
                  ("comprado" if p.get("comprado") else "fabricar"), p["nota"]]
                 for p in d["lista_de_piezas"]]
        tab = fig.add_axes([0.06, 0.30, 0.88, 0.22])
        tab.axis("off")
        t = tab.table(cellText=filas, colLabels=["Pieza", "Cant.", "Origen", "Nota"],
                      colWidths=[0.26, 0.06, 0.10, 0.58], loc="upper center",
                      cellLoc="left")
        t.auto_set_font_size(False)
        t.set_fontsize(7)
        t.scale(1, 1.32)
        for (fi, _), celda in t.get_celld().items():
            celda.set_linewidth(0.4)
            celda.set_edgecolor("#bbbbbb")
            if fi == 0:
                celda.set_facecolor("#eeeeee")
                celda.set_text_props(weight="bold")
        y = 0.275
        y = _bloque(fig, y, "Montaje", d["montaje"])
        y = _bloque(fig, y - 0.012, "Verificado", (
            f"interferencias entre sólidos montados: "
            f"{d['verificacion_interferencias']['resultado'].lower()}",
            f"estanqueidad de los STL, releídos del disco: "
            f"{sum(1 for v in d['estanqueidad_stl'].values() if v['estanco'])}"
            f"/{len(d['estanqueidad_stl'])}",
            f"separación entre planos de eje {g['separacion_planos_eje']:g} mm "
            f"(la geometría exige {g['separacion_minima_exigida']:g})",
            f"tornillos a Ø{g['circunferencia_tornillos']:g}, dentro del radio libre "
            f"de las dos hileras (Ø{2*g['radio_libre_de_rodillos']:.2f})",
        ), vinetas=True)
        pp.savefig(fig)
        plt.close(fig)

        # --- una página por pieza ---------------------------------------------
        for nombre, (malla, tipo) in piezas.items():
            if tipo == "montaje":
                continue
            fig = plt.figure(figsize=A4)
            ext = malla.extents
            cabecera(fig, nombre.replace("_", " "),
                     f"{cant.get(nombre, 1)} ud · {nota.get(nombre, '')}")
            semi = max(ext) / 2 * 1.15
            for i, (tit, az, el) in enumerate((("isométrica", 35, 58),
                                               ("planta (cara)", 0, 0),
                                               ("alzado (canto)", 0, 90))):
                ax = fig.add_axes([0.06 + 0.31 * i, 0.62, 0.29, 0.27])
                pintar(ax, [malla], az=az, el=el, escala_comun=semi)
                ax.set_title(tit, size=8, color="#444444")
            cotas = [["envolvente", f"{ext[0]:.2f} x {ext[1]:.2f} x {ext[2]:.2f} mm"],
                     ["volumen", f"{malla.volume:.1f} mm³"],
                     ["estanco (STL)",
                      "sí" if d["estanqueidad_stl"][nombre]["estanco"] else "NO"]]
            if tipo == "placa":
                cotas += [["espesor", f"{u['espesor_placa']:g} mm"],
                          ["hexágono central", f"{u['hexagono_entrecaras']:g} entrecaras"],
                          ["circunferencia de tornillos",
                           f"Ø{g['circunferencia_tornillos']:g} — 5 x {u['tornillo']}"]]
            elif nombre == "rodillo":
                cotas += [["Ø máximo", f"{g['diametro_max_rodillo']:g} mm"],
                          ["longitud", f"{h['longitud_rodillo']:g} mm"],
                          ["barreno", f"Ø{g['barreno_rodillo']:g} (juego sobre el eje)"]]
            else:
                cotas += [["Ø", f"{u['diametro_eje_rodillo']:g} mm"],
                          ["longitud", f"{g['largo_eje_rodillo']:g} mm"]]
            tab = fig.add_axes([0.06, 0.40, 0.88, 0.20])
            tab.axis("off")
            t = tab.table(cellText=cotas, colLabels=["Cota", "Valor"],
                          colWidths=[0.34, 0.56], loc="upper left", cellLoc="left")
            t.auto_set_font_size(False)
            t.set_fontsize(8)
            t.scale(1, 1.35)
            for (fi, _), celda in t.get_celld().items():
                celda.set_linewidth(0.4)
                celda.set_edgecolor("#bbbbbb")
                if fi == 0:
                    celda.set_facecolor("#eeeeee")
                    celda.set_text_props(weight="bold")
            _bloque(fig, 0.385, "Mecanizado", mecanizado.get(nombre, []), vinetas=True)
            pp.savefig(fig)
            plt.close(fig)


def dxf_placas(perfiles: dict, d: dict, path: Path) -> None:
    """Contornos de las placas a escala real (1 unidad = 1 mm) para corte.

    Sólo geometría PASANTE: la ranura del eje y el avellanado son mecanizados
    posteriores y se dibujan como referencia en capas aparte."""
    import ezdxf
    from shapely.geometry import Polygon
    doc = ezdxf.new("R2018", setup=True)
    doc.header["$INSUNITS"] = 4
    for capa, color, tipo in (("CORTE", 7, "CONTINUOUS"), ("RANURA", 1, "DASHED"),
                              ("AVELLANADO", 3, "DASHED"), ("TEXTO", 7, "CONTINUOUS")):
        if capa not in doc.layers:
            doc.layers.add(capa, color=color, linetype=tipo)
    msp = doc.modelspace()
    paso = d["derivado"]["diametro_placa"] + 8
    for i, (nombre, (perfil, extras)) in enumerate(perfiles.items()):
        dx = i * paso
        anillos = [perfil.exterior] + list(perfil.interiors) \
            if isinstance(perfil, Polygon) else \
            [r for g in perfil.geoms for r in [g.exterior] + list(g.interiors)]
        for anillo in anillos:
            msp.add_lwpolyline([(x + dx, y) for x, y in anillo.coords], close=True,
                               dxfattribs={"layer": "CORTE"})
        for ent in extras:
            if ent[0] == "c":
                _, (px, py), r, capa = ent
                msp.add_circle((px + dx, py), r, dxfattribs={"layer": capa})
            else:
                _, p, q, capa = ent
                msp.add_line((p[0] + dx, p[1]), (q[0] + dx, q[1]),
                             dxfattribs={"layer": capa})
        msp.add_text(nombre, height=2.5, dxfattribs={"layer": "TEXTO"}
                     ).set_placement((dx, -d["derivado"]["diametro_placa"] / 2 - 6))
    doc.saveas(path)


def _cajas_tocan(m1, m2) -> bool:
    a, b = m1.bounds, m2.bounds
    return bool(np.all(a[0] <= b[1]) and np.all(b[0] <= a[1]))


# ---------------------------------------------------------------------------

def main() -> None:
    import trimesh
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    proj = project_dir(args[0])
    par_file = proj / "work" / "00_medicion" / "parametros.json"
    if not par_file.exists():
        sys.exit("ERROR: falta work/00_medicion/parametros.json — ejecute antes "
                 f"`python pipeline/rueda_omni.py medir {proj.name}`")
    par = json.loads(par_file.read_text(encoding="utf-8"))

    metrica = opt(args, "--tornillo", "M3").upper()
    if metrica not in TORNILLOS:
        sys.exit(f"ERROR: tornillo {metrica} fuera de tabla ({', '.join(TORNILLOS)})")
    holg_eje = float(opt(args, "--holgura", "0.2"))
    d = disenar(par, float(opt(args, "--hex", "12.85")),
                float(opt(args, "--eje", "3.0")),
                float(opt(args, "--espesor", "3.0")), metrica,
                holg_eje, holg_eje * 2, float(opt(args, "--asiento", "3.0")))
    holgura_banda = d["heredado_de_la_foto"]["diametro_exterior"] / 2 - \
        d["derivado"]["diametro_placa"] / 2
    if holgura_banda < 1.5:
        print(f"AVISO: la placa se queda a {holgura_banda:.2f} mm de la banda de "
              f"rodadura; reduzca --asiento o la rueda apoyará en la placa.")

    piezas, perfiles, sueltas = construir(d, holg_eje * 2)
    choques = verificar(piezas)
    d["islas_descartadas"] = sueltas
    n_rod_tot = d["heredado_de_la_foto"]["rodillos_por_hilera"] * \
        d["heredado_de_la_foto"]["hileras"]
    esp_tot = d["derivado"]["espesor_paquete_placas"]
    d["lista_de_piezas"] = [
        {"pieza": "placa_ext_avellanada", "cant": 1, "nota": "cara exterior frontal"},
        {"pieza": "placa_ranurada_A", "cant": 1, "nota": "aloja los ejes de la hilera A"},
        {"pieza": "placa_intermedia_1", "cant": 1, "nota": "separador"},
        {"pieza": "placa_intermedia_2", "cant": 1, "nota": "separador (espejo)"},
        {"pieza": "placa_ranurada_B", "cant": 1, "nota": "aloja los ejes de la hilera B"},
        {"pieza": "placa_ext_roscada", "cant": 1, "nota": "cara exterior trasera, a roscar"},
        {"pieza": "rodillo", "cant": n_rod_tot, "nota": "barril de rodadura"},
        {"pieza": "eje_rodillo", "cant": n_rod_tot,
         "nota": f"varilla Ø{d['decidido_por_el_usuario']['diametro_eje_rodillo']:g} "
                 f"x {d['derivado']['largo_eje_rodillo']:g}, lisa"},
        {"pieza": f"tornillo {metrica} avellanado", "cant": 5, "comprado": True,
         "nota": f"largo {esp_tot:.0f}-{esp_tot+4:.0f} mm (agarre {esp_tot:.0f})"},
    ]
    d["montaje"] = [
        "1. Meter cada eje en su rodillo y apoyarlo en la ranura de su placa.",
        "2. Cerrar cada hilera con la placa contigua: el eje queda cazado, sin "
        "cabeza ni tuerca; gira el rodillo, no el eje.",
        "3. Apilar en el orden de la lista y apretar los 5 tornillos.",
        f"AVISO: la rosca útil en la placa trasera es sólo el espesor de placa "
        f"({d['decidido_por_el_usuario']['espesor_placa']:g} mm ~ 1 diámetro). En "
        f"plástico o aluminio blando, use tuerca, inserto roscado o aumente el "
        f"espesor de esa placa.",
    ]
    d["verificacion_interferencias"] = {
        "pares_con_choque": choques,
        "resultado": "SIN INTERFERENCIAS" if not choques else "REVISAR"}

    out = proj / "out" / "piezas"
    out.mkdir(parents=True, exist_ok=True)
    escritos, estanqueidad = [], {}
    for nombre, (malla, tipo) in piezas.items():
        if tipo == "montaje":
            continue
        f = out / f"{nombre}.stl"
        malla.export(f)
        escritos.append(f)
        # el STL se relee: una malla estanca en memoria puede abrirse al
        # exportarla (float32 + fusión de vértices), y eso rompe el laminado
        vuelta = trimesh.load(f)
        estanqueidad[nombre] = {"estanco": bool(vuelta.is_watertight),
                                "volumen_mm3": round(float(vuelta.volume), 2)}
    d["estanqueidad_stl"] = estanqueidad
    conjunto = trimesh.Scene()
    for nombre, (malla, tipo) in piezas.items():
        if tipo == "montaje" or tipo == "placa":
            conjunto.add_geometry(malla, node_name=nombre)
    f = out / "conjunto.glb"
    conjunto.export(f)
    escritos.append(f)
    png = out / "conjunto.png"
    render(piezas, png)
    escritos.append(png)
    dxf = out / "placas.dxf"
    dxf_placas(perfiles, d, dxf)
    escritos.append(dxf)
    pdf = out / "catalogo_piezas.pdf"
    catalogo_pdf(piezas, d, pdf)
    escritos.append(pdf)
    pj = out / "piezas.json"
    pj.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding="utf-8")

    g = d["derivado"]
    print(f"Rueda omni Ø{d['heredado_de_la_foto']['diametro_exterior']:g} — "
          f"sándwich de {g['placas_totales']} placas de "
          f"{d['decidido_por_el_usuario']['espesor_placa']:g} mm")
    print(f"  hexágono {d['decidido_por_el_usuario']['hexagono_entrecaras']:g} "
          f"entrecaras · eje rodillo Ø{d['decidido_por_el_usuario']['diametro_eje_rodillo']:g} "
          f"(barreno Ø{g['barreno_rodillo']:g}, largo {g['largo_eje_rodillo']:g})")
    print(f"  separación de planos de eje {g['separacion_planos_eje']:g} "
          f"(exigida {g['separacion_minima_exigida']:g}) · "
          f"paquete {g['espesor_paquete_placas']:g} · ancho total {g['ancho_total_rueda']:g}")
    print(f"  tornillos {metrica} avellanados en Ø{g['circunferencia_tornillos']:g} "
          f"(paso Ø{g['taladro_paso']}, cabeza Ø{g['cabeza_avellanada']}, "
          f"roscar Ø{g['taladro_para_roscar']})")
    abiertas = [n for n, v in d["estanqueidad_stl"].items() if not v["estanco"]]
    print(f"  interferencias: {d['verificacion_interferencias']['resultado']}"
          f" · STL estancos: {len(d['estanqueidad_stl']) - len(abiertas)}"
          f"/{len(d['estanqueidad_stl'])}"
          + (f" (ABIERTOS: {', '.join(abiertas)})" if abiertas else ""))
    for f in escritos + [pj]:
        print(f"  → {f.relative_to(proj)}")
    audit(proj, "RUEDA_OMNI", "piezas del sándwich (STL + conjunto)", "OK",
          metrics={k: v for k, v in g.items()},
          interferencias=d["verificacion_interferencias"]["resultado"],
          hash_piezas=sha256_file(pj))


if __name__ == "__main__":
    main()
