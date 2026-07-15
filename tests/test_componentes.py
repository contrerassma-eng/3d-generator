"""Pruebas de la biblioteca de componentes electronicos (componentes/ +
pipeline/lib_componentes.py + pipeline/componentes_cli.py).

Verifica el esquema del catalogo, que cada componente derive malla 3D, huella
DXF y pieza foto3d-cad coherentes con sus datos, y el CLI de punta a punta.
La regeneracion en el motor del CAD del navegador se prueba aparte con
cad/tests/test_componentes.mjs (Node).

uso: python tests/test_componentes.py
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "pipeline"))
import lib_componentes as C  # noqa: E402

PY = sys.executable
CLI = str(REPO / "pipeline" / "componentes_cli.py")
CHECKS = []


def check(name, cond):
    CHECKS.append((name, bool(cond)))
    print(("OK   " if cond else "FALLA") + " " + name)


def run(*args):
    return subprocess.run([PY, CLI, *args], capture_output=True, text=True)


def main():
    import ezdxf
    tmp = Path(tempfile.mkdtemp(prefix="foto3d_comp_"))

    # --- catalogo -------------------------------------------------------
    cat = C.load_catalogo()
    comps = cat["componentes"]
    check("catalogo carga y tiene componentes", len(comps) >= 11)
    ids = [c["id"] for c in comps]
    check("ids unicos", len(ids) == len(set(ids)))
    check("esquema valido en todos", all(not C.validar_componente(c) for c in comps))
    check("todos declaran fuente y confianza",
          all(c.get("fuente", {}).get("detalle") and c.get("confianza") for c in comps))
    malo = {"id": "x", "nombre": "x", "categoria": "otra", "descripcion": "x",
            "fuente": {}, "solidos": [{"tipo": "esfera"}]}
    check("validar detecta categoria y tipo invalidos",
          len(C.validar_componente(malo)) >= 2)
    web = REPO / "cad" / "componentes.json"
    check("catalogo web (cad/componentes.json) sincronizado — si falla: "
          "`python pipeline/componentes_cli.py sync-web`",
          web.exists() and web.read_text(encoding="utf-8")
          == C.CATALOGO.read_text(encoding="utf-8"))

    # --- malla 3D por componente ---------------------------------------
    for c in comps:
        mesh = C.build_mesh(c)
        lo, hi = C.envolvente(c)
        cerca = np.allclose(mesh.bounds[0], lo, atol=0.3) and \
            np.allclose(mesh.bounds[1], hi, atol=0.3)
        check(f"malla {c['id']}: {len(mesh.faces)} caras, limites = envolvente",
              len(mesh.faces) > 0 and cerca)

    # --- huella DXF: circulos por capa == datos del catalogo ------------
    hc = C.get_componente(cat, "sensor_hcsr04")
    dxf_path = tmp / "hc.dxf"
    C.footprint_dxf(hc, dxf_path)
    doc = ezdxf.readfile(dxf_path)
    msp = doc.modelspace()
    por_capa = {}
    for e in msp.query("CIRCLE"):
        por_capa[e.dxf.layer] = por_capa.get(e.dxf.layer, 0) + 1
    check("huella HC-SR04: 4 agujeros de montaje",
          por_capa.get("AGUJEROS") == len(hc["agujeros_montaje"]))
    check("huella HC-SR04: 2 cortes de panel + 2 transductores",
          por_capa.get("CORTE_PANEL") == 2 and por_capa.get("COMPONENTES") == 2)
    radios = sorted(e.dxf.radius for e in msp.query("CIRCLE[layer=='CORTE_PANEL']"))
    check("huella HC-SR04: cortes O16.6 a escala real",
          np.allclose(radios, [8.3, 8.3]))

    # --- documento foto3d-cad -------------------------------------------
    dos = [C.get_componente(cat, "esp32_devkitc_38"), C.get_componente(cat, "buck_lm2596")]
    cdoc = C.cad_doc(dos, separacion=20)
    check("cad_doc: formato y 2 piezas",
          cdoc["format"] == "foto3d-cad" and len(cdoc["parts"]) == 2)
    fids = [f["id"] for p in cdoc["parts"] for f in p["features"]]
    check("cad_doc: ids de features unicos", len(fids) == len(set(fids)))
    check("cad_doc: agujeros como features hole pasantes",
          sum(1 for p in cdoc["parts"] for f in p["features"]
              if f["shape"] == "hole" and f["params"]["through"]) == 2)
    check("cad_doc: piezas separadas en X sin solape",
          cdoc["parts"][1]["pos"][0] - cdoc["parts"][0]["pos"][0] > 55)
    check("cad_doc: nada bajo Z=0 (apoyado en el piso)",
          all(p["pos"][2] + min(f["at"][2] for f in p["features"]
              if f["shape"] != "hole") >= -1e-6 for p in cdoc["parts"]))

    # --- CLI de punta a punta -------------------------------------------
    r = run("validar")
    check("CLI validar", r.returncode == 0 and "valido" in r.stdout)
    r = run("listar", "--categoria", "mcu")
    check("CLI listar --categoria mcu", r.returncode == 0
          and "esp32_devkitc_38" in r.stdout and "buck_lm2596" not in r.stdout)
    r = run("info", "conector_m8_panel")
    check("CLI info: reporta corte de panel y confianza",
          r.returncode == 0 and "8.2" in r.stdout and "medir la unidad real" in r.stdout)
    r = run("generar", "esp32_c3_supermini", "--salida", str(tmp))
    check("CLI generar: GLB + STL", r.returncode == 0
          and (tmp / "esp32_c3_supermini.glb").exists()
          and (tmp / "esp32_c3_supermini.stl").exists())
    r = run("huella", "buck_lm2596", "--salida", str(tmp))
    check("CLI huella: DXF", r.returncode == 0
          and (tmp / "buck_lm2596_huella.dxf").exists())
    r = run("cad-json", "sensor_hcsr04", "pulsador_panel_12mm",
            "--salida", str(tmp / "doc.json"))
    ok = r.returncode == 0
    if ok:
        d = json.loads((tmp / "doc.json").read_text(encoding="utf-8"))
        ok = d["format"] == "foto3d-cad" and len(d["parts"]) == 2
    check("CLI cad-json: documento valido", ok)
    r = run("info", "no_existe")
    check("CLI info de id inexistente falla con lista de ids", r.returncode != 0)

    fallas = [n for n, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(fallas)} OK, {len(fallas)} fallas")
    if fallas:
        sys.exit(1)


if __name__ == "__main__":
    main()
