"""Pruebas de la vista de frente de rueda omni (pipeline/rueda_omni.py).

No usa la foto real: sintetiza una rueda de parámetros CONOCIDOS (misma
identidad de corona que asume el pipeline) y verifica que `medir` los recupera
y que `vista` emite un DXF a escala real. Así la prueba mide el error del
método, no la calidad de una foto concreta.

uso: python tests/test_rueda_omni.py
"""
from __future__ import annotations

import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "pipeline"))
import rueda_omni as RO  # noqa: E402

PY = sys.executable
CLI = str(REPO / "pipeline" / "rueda_omni.py")
CHECKS = []

# --- verdad de referencia (mm) ---------------------------------------------
R_VERD, A_VERD, L_VERD = 29.0, 22.9, 20.0
D_ROD_VERD = 2 * (R_VERD - A_VERD)          # corona continua: rho(0) = R - a
D_TORN_VERD, D_CAB_VERD, D_CUBO_VERD = 42.0, 3.2, 13.0
PXMM = 8.0                                   # resolución de la foto sintética


def check(name, cond):
    CHECKS.append((name, bool(cond)))
    print(f"  {'OK  ' if cond else 'FALLA'} {name}")


def cerca(valor, verdad, tol_pct, nombre):
    ok = valor is not None and abs(valor - verdad) <= tol_pct / 100 * verdad
    check(f"{nombre}: {valor} ≈ {verdad} (±{tol_pct}%)", ok)


def foto_sintetica(path: Path) -> None:
    """Rueda de una hilera sobre fondo blanco, con los parámetros de referencia.

    Una sola hilera: en la proyección frontal las dos hileras se solapan y se
    fundirían en una sola mancha negra, lo que no permitiría conocer la verdad
    de cada rodillo. El método sólo necesita rodillos aislados."""
    import cv2
    lado = int(2 * R_VERD * PXMM * 1.15)
    img = np.full((lado, lado, 3), 255, np.uint8)
    c = lado / 2
    px = lambda p: (int(round(c + p[0] * PXMM)), int(round(c - p[1] * PXMM)))

    # placa clara: llega a 20, justo bajo la cara interior del rodillo (16.84),
    # de modo que placa y rodillos forman una sola silueta conexa
    cv2.circle(img, (int(c), int(c)), int(20 * PXMM), (230, 230, 230), -1)
    perfil = RO.perfil_rodillo(R_VERD, A_VERD, L_VERD)
    for k in range(5):
        pts = np.array([px(p) for p in RO.rota(perfil, k * 72)], np.int32)
        cv2.fillPoly(img, [pts], (30, 30, 30))
    for k in range(5):
        ang = math.radians(36 + k * 72)
        p = px((D_TORN_VERD / 2 * math.cos(ang), D_TORN_VERD / 2 * math.sin(ang)))
        cv2.circle(img, p, int(D_CAB_VERD / 2 * PXMM), (150, 150, 150), -1)
    cv2.circle(img, (int(c), int(c)), int(D_CUBO_VERD / 2 * PXMM), (165, 165, 165), -1)
    cv2.imwrite(str(path), img)


def main():
    tmp = Path(tempfile.mkdtemp(prefix="foto3d_omni_"))
    proj = tmp / "TEST-OMNI"
    (proj / "input" / "photos").mkdir(parents=True)
    (proj / "input" / "descripcion.md").write_text(
        "objeto: rueda omni sintética\n", encoding="utf-8")
    (proj / "state.json").write_text(json.dumps(
        {"project": "TEST-OMNI", "stage": "S0_PENDIENTE", "gates": {}}),
        encoding="utf-8")
    foto_sintetica(proj / "input" / "photos" / "sintetica.png")

    # --- geometría del perfil (independiente de la imagen) ------------------
    perfil = RO.perfil_rodillo(R_VERD, A_VERD, L_VERD)
    radios = [math.hypot(*p) for p in perfil]
    corona = [p for p in perfil if abs(math.hypot(*p) - R_VERD) < 1e-9]
    check(f"perfil: corona sobre el Ø exterior ({len(corona)} puntos)",
          len(corona) == (len(perfil) // 2) and abs(max(radios) - R_VERD) < 1e-9)
    check("perfil: cara interior a 2a-R en el centro",
          abs(min(radios) - (2 * A_VERD - R_VERD)) < 1e-9)
    axial = max(p[1] for p in perfil) - min(p[1] for p in perfil)
    check(f"perfil: longitud axial exacta ({axial:.3f})",
          abs(axial - L_VERD) < 1e-9)
    espesor = max(x for x, y in perfil if abs(y) < 1e-9) - \
        min(x for x, y in perfil if abs(y) < 1e-9)
    check(f"perfil: espesor máximo = 2(R-a) ({espesor:.3f})",
          abs(espesor - D_ROD_VERD) < 1e-9)

    # --- medición sobre la foto sintética ------------------------------------
    cp = subprocess.run([PY, CLI, "medir", str(proj), "--diametro", str(2 * R_VERD)],
                        capture_output=True, text=True)
    check("medir termina OK", cp.returncode == 0)
    if cp.returncode != 0:
        print(cp.stdout, cp.stderr)
        sys.exit(1)
    par = json.loads((proj / "work" / "00_medicion" / "parametros.json")
                     .read_text(encoding="utf-8"))
    cot = par["cotas"]
    cerca(par["escala_mm_por_px"], 1 / PXMM, 2, "escala mm/px")
    cerca(cot["radio_eje_rodillo"]["mm"], A_VERD, 3, "radio eje rodillo")
    cerca(cot["diametro_rodillo_max"]["mm"], D_ROD_VERD, 8, "Ø máx. rodillo")
    cerca(cot["longitud_rodillo"]["mm"], L_VERD, 8, "largo rodillo")
    cerca(cot["circunferencia_tornillos"]["mm"], D_TORN_VERD, 5, "Ø tornillos")
    cerca(cot["diametro_cabeza_tornillo"]["mm"], D_CAB_VERD, 20, "Ø cabeza")
    cerca(cot["diametro_cubo_central"]["mm"], D_CUBO_VERD, 8, "Ø cubo")
    check("residuo de corona pequeño",
          abs(par["coherencia"]["residuo_corona_mm"]) < 0.5)
    check("Ø exterior declarado intacto",
          cot["diametro_exterior"]["mm"] == 2 * R_VERD and
          cot["diametro_exterior"]["fuente"] == "declarado")
    check("lo no medible no se inventa",
          cot["barreno_eje"]["mm"] is None and cot["ancho_rueda"]["mm"] is None and
          all(c["fuente"] in ("declarado", "medido_foto", "derivado",
                              "no_determinable") for c in cot.values()))

    # --- lámina ---------------------------------------------------------------
    cp = subprocess.run([PY, CLI, "vista", str(proj)], capture_output=True, text=True)
    check("vista termina OK", cp.returncode == 0)
    if cp.returncode != 0:
        print(cp.stdout, cp.stderr)
    out = proj / "out" / "drawings"
    for ext in ("dxf", "pdf", "png"):
        f = out / f"rueda_omni_alzado.{ext}"
        check(f"{ext} generado y no vacío", f.exists() and f.stat().st_size > 1000)

    import ezdxf
    doc = ezdxf.readfile(out / "rueda_omni_alzado.dxf")
    msp = doc.modelspace()
    check("DXF en milímetros ($INSUNITS=4)", doc.header["$INSUNITS"] == 4)
    contornos = [e for e in msp if e.dxftype() == "LWPOLYLINE"
                 and e.dxf.layer in ("VISIBLE", "OCULTA")]
    check(f"10 rodillos dibujados (2 hileras x 5) — hay {len(contornos)}",
          len(contornos) == 10)
    pts = np.array([p for e in contornos for p in e.get_points("xy")])
    centro = pts.mean(axis=0)
    r = np.hypot(*(pts - centro).T)
    check(f"DXF a escala real: Ø exterior = {2*r.max():.3f} mm",
          abs(2 * r.max() - 2 * R_VERD) < 0.02)

    n_ocultas = sum(1 for e in contornos if e.dxf.layer == "OCULTA")
    check("hilera posterior en capa OCULTA", n_ocultas == 5)

    lineas = (proj / "audit.log.jsonl").read_text(encoding="utf-8").splitlines()
    check("medición y lámina auditadas", len(lineas) == 2)

    # --- piezas del sándwich --------------------------------------------------
    hexmm, d_eje, esp = 12.85, 3.0, 3.0
    cp = subprocess.run([PY, str(REPO / "pipeline" / "rueda_omni_piezas.py"), str(proj),
                         "--hex", str(hexmm), "--eje", str(d_eje),
                         "--espesor", str(esp)], capture_output=True, text=True)
    check("piezas termina OK", cp.returncode == 0)
    if cp.returncode != 0:
        print(cp.stdout, cp.stderr)
        fails = [n for n, ok in CHECKS if not ok]
        sys.exit("FALLAN: " + ", ".join(fails))
    pz = json.loads((proj / "out" / "piezas" / "piezas.json").read_text(encoding="utf-8"))
    g = pz["derivado"]

    # invariantes de diseño: si alguno cae, la rueda no se puede montar
    check(f"hileras separadas lo exigido ({g['separacion_planos_eje']} ≥ "
          f"{g['separacion_minima_exigida']})",
          g["separacion_planos_eje"] >= g["separacion_minima_exigida"])
    check("tornillos libres de los dos juegos de rodillos",
          g["circunferencia_tornillos"] / 2 + g["taladro_paso"] / 2
          <= g["radio_libre_de_rodillos"])
    check("la placa no llega a la banda de rodadura",
          g["diametro_placa"] / 2 <= R_VERD - 1.0)
    check("el barreno del rodillo deja juego sobre el eje",
          g["barreno_rodillo"] > d_eje)
    check("sin interferencias entre sólidos montados",
          pz["verificacion_interferencias"]["resultado"] == "SIN INTERFERENCIAS")
    check("las islas desprendidas quedan registradas, no silenciadas",
          all(i["islas"] > 0 for i in pz["islas_descartadas"]))
    check("todos los STL cerrados",
          all(v["estanco"] for v in pz["estanqueidad_stl"].values()))

    import trimesh
    piezas_dir = proj / "out" / "piezas"
    rod = trimesh.load(piezas_dir / "rodillo.stl")
    r_rod = np.hypot(*rod.vertices[:, :2].T).max()
    check(f"rodillo: Ø máx {2*r_rod:.2f} y largo {rod.extents[2]:.2f}",
          abs(2 * r_rod - g["diametro_max_rodillo"]) < 0.15 and
          abs(rod.extents[2] - pz["heredado_de_la_foto"]["longitud_rodillo"]) < 0.05)
    eje = trimesh.load(piezas_dir / "eje_rodillo.stl")
    check(f"eje Ø{d_eje} x {g['largo_eje_rodillo']}",
          abs(eje.extents[0] - d_eje) < 0.05 and
          abs(eje.extents[2] - g["largo_eje_rodillo"]) < 0.05)

    # el material más próximo al eje son las 6 aristas del hexágono: su radio
    # es la entrecaras / raíz(3), y hay 6 posiciones angulares distintas
    placa = trimesh.load(piezas_dir / "placa_ext_avellanada.stl")
    r_v = np.hypot(*placa.vertices[:, :2].T)
    r_min = r_v.min()
    esquinas = placa.vertices[r_v < r_min * 1.001]
    angs = sorted({round(math.degrees(math.atan2(y, x)) % 60, 1)
                   for x, y, _ in esquinas})
    check(f"barreno hexagonal {hexmm} entrecaras (vértices a {r_min:.3f})",
          abs(r_min - hexmm / math.sqrt(3)) < 0.01 and len(angs) == 1
          and len(esquinas) == 12)
    ranurada = trimesh.load(piezas_dir / "placa_ranurada_A.stl")
    check("la placa ranurada tiene menos material que la lisa (la ranura)",
          ranurada.volume < trimesh.load(piezas_dir / "placa_ext_roscada.stl").volume)

    lineas = (proj / "audit.log.jsonl").read_text(encoding="utf-8").splitlines()
    check("las piezas también quedan auditadas", len(lineas) == 3)

    fails = [n for n, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(fails)}/{len(CHECKS)} pruebas OK")
    if fails:
        sys.exit("FALLAN: " + ", ".join(fails))


if __name__ == "__main__":
    main()
