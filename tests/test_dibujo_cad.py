"""Pruebas de S6 (dibujo técnico) y CAD con geometría sintética.

No usan proyectos reales ni simulan salidas de COLMAP/OpenMVS: crean mallas
sintéticas conocidas (caja, chapa en U) en un directorio temporal y verifican
las derivaciones geométricas y los artefactos DXF/PDF.

uso: python tests/test_dibujo_cad.py
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
import lib_geometry as G  # noqa: E402

PY = sys.executable
CHECKS = []


def check(name, cond):
    CHECKS.append((name, bool(cond)))
    print(("OK   " if cond else "FALLA") + " " + name)


def make_project(root: Path, name: str, mesh, desc: str) -> Path:
    proj = root / name
    (proj / "input").mkdir(parents=True)
    (proj / "out").mkdir(parents=True)
    mesh.export(proj / "out" / "model.glb")
    (proj / "input" / "descripcion.md").write_text(desc, encoding="utf-8")
    (proj / "state.json").write_text(json.dumps(
        {"project": name, "stage": "S2_OK", "gates": {}}), encoding="utf-8")
    return proj


def u_sheet():
    """Chapa en U abierta: base 100×60 + dos alas de 30 (desarrollo 100×120)."""
    import trimesh
    v = np.array([[0, 0, 30], [0, 0, 0], [100, 0, 0], [100, 0, 30],
                  [0, 60, 0], [100, 60, 0], [0, 60, 30], [100, 60, 30]], float)
    f = [[0, 1, 2], [0, 2, 3], [1, 4, 5], [1, 5, 2], [4, 6, 7], [4, 7, 5]]
    return trimesh.Trimesh(vertices=v, faces=np.array(f))


def main():
    import trimesh
    tmp = Path(tempfile.mkdtemp(prefix="foto3d_test_"))

    # --- lib_geometry --------------------------------------------------------
    box = trimesh.creation.box(extents=[100, 60, 40])
    regs = G.planar_regions(box)
    check("caja: 6 regiones planas", len(regs) == 6)
    check("caja: mayor región = 100×60", abs(regs[0]["area"] - 6000) < 1)

    mv = G.mesh_in_view(box, "alzado")
    out = G.view_outline(mv)
    check("alzado caja: contorno 100×40",
          np.allclose(out[0].bounds, (-50, -20, 50, 20), atol=1e-6))

    flat = G.unfold_sheet(u_sheet(), G.planar_regions(u_sheet(), min_area_pct=0))
    pts = flat["contorno"].reshape(-1, 2)
    size = np.sort(pts.max(0) - pts.min(0))
    check("chapa U: desarrollo 100×120", np.allclose(size, [100, 120], atol=1e-6))
    check("chapa U: 2 líneas de pliegue", len(flat["pliegues"]) == 2)

    # --- S6: láminas ----------------------------------------------------------
    proj = make_project(tmp, "TEST-U", u_sheet(),
                        "objeto: chapa U\nfactor_escala: 1.0\n")
    cp = subprocess.run([PY, str(REPO / "pipeline" / "s6_drawings.py"),
                         str(proj), "--chapa", "auto"],
                        capture_output=True, text=True)
    check("S6 termina OK", cp.returncode == 0)
    dxf_p = proj / "out" / "drawings" / "plano.dxf"
    pdf_p = proj / "out" / "drawings" / "plano.pdf"
    check("S6 genera DXF y PDF", dxf_p.exists() and pdf_p.exists()
          and pdf_p.stat().st_size > 1000)
    state = json.loads((proj / "state.json").read_text(encoding="utf-8"))
    check("G6 = PASA con escala certificada",
          state["gates"]["G6"]["verdict"] == "PASA")
    check("G6 no muta la etapa S0–S5", state["stage"] == "S2_OK")
    check("PDF con lámina de despliegue (2 páginas)",
          pdf_p.read_bytes().count(b"/Type /Page ") == 2 or
          pdf_p.read_bytes().count(b"/Type/Page") >= 2)

    import ezdxf
    doc = ezdxf.readfile(dxf_p)
    msp = doc.modelspace()
    xs = np.array([[e.dxf.start.x, e.dxf.start.y] for e in
                   msp.query('LINE[layer=="VISIBLE"]')])
    check("DXF en mm ($INSUNITS=4)", doc.header["$INSUNITS"] == 4)
    dims = [round(d.get_measurement(), 3) for d in msp.query("DIMENSION")]
    check("DXF acotado con medidas REALES (100/30/60 y desarrollo 120/100)",
          all(v in dims for v in (100.0, 30.0, 60.0, 120.0)))
    check("DXF tiene capa PLIEGUE con líneas",
          len(msp.query('LINE[layer=="PLIEGUE"]')) == 2)

    # escala no certificada → SIN_CONTRASTE
    proj2 = make_project(tmp, "TEST-SIN", box, "objeto: caja\n")
    subprocess.run([PY, str(REPO / "pipeline" / "s6_drawings.py"), str(proj2)],
                   capture_output=True, text=True)
    st2 = json.loads((proj2 / "state.json").read_text(encoding="utf-8"))
    check("G6 = SIN_CONTRASTE sin factor_escala",
          st2["gates"]["G6"]["verdict"] == "SIN_CONTRASTE")

    # --- CAD ------------------------------------------------------------------
    cad = lambda *a: subprocess.run([PY, str(REPO / "pipeline" / "cad_cli.py"),
                                     str(proj2), *a], capture_output=True, text=True)
    check("cad caras lista 6", "6 caras planas" in cad("caras").stdout)
    check("cad plano-cara", cad("plano-cara", "0").returncode == 0)
    check("cad plano-desfasado", cad("plano-desfasado", "PL1", "25").returncode == 0)
    check("cad refs", "@r1" in cad("refs", "PL1").stdout)

    import re
    m = re.search(r"@r1\s+\(\s*(-?[\d.]+),\s*(-?[\d.]+)\)", cad("refs", "PL1").stdout)
    r1 = np.array([float(m.group(1)), float(m.group(2))])
    sk = tmp / "b.json"
    sk.write_text(json.dumps({"entidades": [
        {"tipo": "rect", "esquina": "@r1", "ancho": 40, "alto": 20},
        {"tipo": "circulo", "centro": (r1 + [20, 10]).tolist(), "radio": 5}]}),
        encoding="utf-8")
    check("cad boceto con referencias",
          cad("boceto", "B1", "--plano", "PL1", "--json", str(sk)).returncode == 0)
    bad = tmp / "bad.json"
    bad.write_text(json.dumps({"entidades": [
        {"tipo": "linea", "de": [0, 0], "a": "@r99"}]}), encoding="utf-8")
    r = cad("boceto", "MAL", "--plano", "PL1", "--json", str(bad))
    check("cad pide referencias si no existen",
          r.returncode == 1 and "@r1" in r.stdout)

    check("cad extruir", cad("extruir", "B1", "30").returncode == 0)
    solid = trimesh.load(proj2 / "out" / "cad" / "B1_extrusion.glb", force="mesh")
    vol_esp = 40 * 20 * 30 - np.pi * 25 * 30
    check("extrusión: volumen 40×20×30 − cilindro (±1%)",
          solid.is_watertight and abs(abs(solid.volume) - vol_esp) / vol_esp < 0.01)

    pr = tmp / "perfil.json"
    pr.write_text(json.dumps({"entidades": [
        {"tipo": "rect", "esquina": [10, 0], "ancho": 10, "alto": 40}]}), encoding="utf-8")
    cad("boceto", "PERF", "--plano", "PL2", "--json", str(pr))
    check("cad revolucionar",
          cad("revolucionar", "PERF", "--eje", "0,0;0,50").returncode == 0)
    rev = trimesh.load(proj2 / "out" / "cad" / "PERF_revolucion.glb", force="mesh")
    vol_rev = np.pi * (20**2 - 10**2) * 40      # anillo r 10→20, alto 40
    check("revolución: volumen anular (±2%)",
          rev.is_watertight and abs(abs(rev.volume) - vol_rev) / vol_rev < 0.02)

    cm = tmp / "camino.json"
    cm.write_text(json.dumps({"entidades": [
        {"tipo": "poli", "puntos": [[0, 0], [60, 0], [60, 40]], "cerrada": False}]}),
        encoding="utf-8")
    cad("boceto", "CAM", "--plano", "PL2", "--json", str(cm))
    r = cad("barrer", "B1", "--camino", "CAM", "--nombre", "tubo")
    check("cad barrer", r.returncode == 0 and
          (proj2 / "out" / "cad" / "tubo.glb").exists())

    check("cad exportar-dxf boceto",
          cad("exportar-dxf", "B1").returncode == 0 and
          (proj2 / "out" / "cad" / "B1.dxf").exists())

    # dibujo normalizado de un sólido CAD
    cp = subprocess.run([PY, str(REPO / "pipeline" / "s6_drawings.py"), str(proj2),
                         "--fuente", "out/cad/B1_extrusion.glb"],
                        capture_output=True, text=True)
    check("S6 dibuja sólido CAD (G6 PASA)", cp.returncode == 0 and
          "PASA" in cp.stdout)

    audit_lines = (proj2 / "audit.log.jsonl").read_text(encoding="utf-8").splitlines()
    check("todas las acciones CAD/S6 auditadas", len(audit_lines) >= 12)

    fails = [n for n, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(fails)}/{len(CHECKS)} pruebas OK")
    if fails:
        sys.exit("FALLAN: " + ", ".join(fails))


if __name__ == "__main__":
    main()
