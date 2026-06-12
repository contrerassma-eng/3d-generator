"""S2 — Densificación, malla y textura con OpenMVS (gate G3).

InterfaceCOLMAP → DensifyPointCloud → ReconstructMesh → TextureMesh (GLB).
Si gltfpack está disponible, comprime (meshopt + KTX2) → out/model.glb.

uso: python pipeline/s2_dense_mesh.py projects/<X>
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import (audit, load_state, load_thresholds, project_dir,
                       require_tools, run_logged, set_gate, sha256_file)


def main() -> None:
    proj = project_dir(sys.argv[1])
    th = load_thresholds()["G3_malla"]
    state = load_state(proj)
    if state.get("stage") not in ("S1_OK", "S2_OK", "S2_FALLIDO"):
        sys.exit(f"ERROR: el proyecto está en {state.get('stage')}; ejecuta antes s1_sfm.py")
    require_tools(["InterfaceCOLMAP", "DensifyPointCloud", "ReconstructMesh", "TextureMesh"])

    undist = proj / "work" / "10_sfm" / "undistorted"
    work = proj / "work" / "20_dense"
    out = proj / "out"
    work.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    audit(proj, "S2", "inicio densificacion", "OK")

    steps = [
        (["InterfaceCOLMAP", "-i", str(undist), "-o", str(work / "scene.mvs"),
          "--image-folder", str(undist / "images")], "s2_interface.log"),
        (["DensifyPointCloud", str(work / "scene.mvs"),
          "-w", str(work), "-o", str(work / "scene_dense.mvs")], "s2_densify.log"),
        (["ReconstructMesh", str(work / "scene_dense.mvs"),
          "-w", str(work), "-o", str(work / "scene_mesh.mvs")], "s2_mesh.log"),
        (["TextureMesh", str(work / "scene_dense.mvs"),
          "--mesh-file", str(work / "scene_mesh.ply"),
          "-w", str(work), "-o", str(work / "textured.glb"),
          "--export-type", "glb"], "s2_texture.log"),
    ]
    for cmd, log in steps:
        cp = run_logged(proj, "S2", cmd, cwd=work, log_name=log)
        if cp.returncode != 0:
            sys.exit(f"ERROR en {cmd[0]} — ver work/logs/{log}")

    textured = work / "textured.glb"
    if not textured.exists():
        sys.exit("ERROR: TextureMesh no produjo textured.glb — ver work/logs/s2_texture.log")

    model = out / "model.glb"
    if shutil.which("gltfpack"):
        cp = run_logged(proj, "S2", ["gltfpack", "-i", str(textured), "-o", str(model),
                                     "-cc", "-tc"], log_name="s2_gltfpack.log")
        if cp.returncode != 0 or not model.exists():
            print("AVISO: gltfpack falló; se usa el GLB sin comprimir")
            shutil.copy2(textured, model)
    else:
        print("AVISO: gltfpack no instalado; GLB sin comprimir (ver docs/INSTALACION.md)")
        shutil.copy2(textured, model)

    size_kb = round(model.stat().st_size / 1024, 1)
    reasons = []
    if size_kb < th["min_tamano_glb_kb"]:
        reasons.append(f"GLB de {size_kb} KB < mínimo {th['min_tamano_glb_kb']} KB "
                       "(malla probablemente vacía o degenerada)")
    passed = not reasons
    metrics = {"glb_kb": size_kb, "glb_hash": sha256_file(model),
               "comprimido": shutil.which("gltfpack") is not None}
    set_gate(proj, state, "G3", passed, metrics, reasons, "S2_OK")
    print(f"G3 {'PASA' if passed else 'FALLA'} — out/model.glb ({size_kb} KB)")
    if reasons:
        print("Motivos: " + " | ".join(reasons))
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
