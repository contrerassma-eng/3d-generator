"""S1 — Structure from Motion con COLMAP (gate G2).

feature_extractor → matcher (exhaustive ≤150 fotos, sequential si más) → mapper
(GLOMAP si está en PATH: misma precisión, mucho más rápido) → model_analyzer
(métricas del gate) → image_undistorter (insumo de S2/OpenMVS).

uso: python pipeline/s1_sfm.py projects/<X>
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import (audit, load_state, load_thresholds, project_dir,
                       require_tools, run_logged, set_gate)


def parse_analyzer(text: str) -> dict:
    """Extrae métricas del stdout/stderr de `colmap model_analyzer`."""
    def grab(pattern, cast=float):
        m = re.search(pattern, text)
        return cast(m.group(1)) if m else None
    return {
        "imagenes_registradas": grab(r"Registered images:\s*(\d+)", int),
        "puntos_3d": grab(r"Points:\s*(\d+)", int),
        "observaciones": grab(r"Observations:\s*(\d+)", int),
        "track_length_medio": grab(r"Mean track length:\s*([\d.]+)"),
        "error_reproyeccion_px": grab(r"Mean reprojection error:\s*([\d.]+)"),
    }


def colmap_env() -> dict:
    """Entorno Qt para COLMAP headless en Windows: plugin path del release zip
    (como hace COLMAP.bat) + plataforma offscreen para que no abra diálogos.
    Solo para el subproceso; NUNCA global (rompería otras apps Qt)."""
    env = os.environ.copy()
    exe = shutil.which("colmap")
    if exe:
        plugins = Path(exe).parent.parent / "plugins"
        if plugins.is_dir():
            env["QT_PLUGIN_PATH"] = str(plugins) + os.pathsep + env.get("QT_PLUGIN_PATH", "")
            if (plugins / "platforms" / "qoffscreen.dll").exists():
                env.setdefault("QT_QPA_PLATFORM", "offscreen")
    return env


def main() -> None:
    proj = project_dir(sys.argv[1])
    th = load_thresholds(proj)["G2_sfm"]
    state = load_state(proj)
    if state.get("stage") not in ("S0_OK", "S1_OK", "S1_FALLIDO"):
        sys.exit(f"ERROR: el proyecto está en {state.get('stage')}; ejecuta antes s0_intake.py")
    require_tools(["colmap"])
    env = colmap_env()

    photos = proj / "input" / "photos"
    work = proj / "work" / "10_sfm"
    sparse = work / "sparse"
    undist = work / "undistorted"
    for d in (work, sparse, undist):
        d.mkdir(parents=True, exist_ok=True)
    db = work / "database.db"
    if db.exists():
        db.unlink()  # corrida limpia y reproducible

    intake = json.loads((proj / "work" / "00_intake" / "intake_report.json")
                        .read_text(encoding="utf-8"))
    n_fotos = intake["metrics"]["aceptadas"]
    audit(proj, "S1", "inicio sfm", "OK", fotos_aceptadas=n_fotos)

    # Protocolo exige focal fija => una sola cámara compartida (mejora robustez)
    cp = run_logged(proj, "S1", [
        "colmap", "feature_extractor", "--database_path", str(db),
        "--image_path", str(photos),
        "--ImageReader.camera_model", "SIMPLE_RADIAL",
        "--ImageReader.single_camera", "1"], log_name="s1_features.log", env=env)
    if cp.returncode != 0:
        sys.exit("ERROR en feature_extractor — ver work/logs/s1_features.log")

    matcher = "exhaustive_matcher" if n_fotos <= 150 else "sequential_matcher"
    cp = run_logged(proj, "S1", ["colmap", matcher, "--database_path", str(db)],
                    log_name="s1_matching.log", env=env)
    if cp.returncode != 0:
        sys.exit(f"ERROR en {matcher} — ver work/logs/s1_matching.log")

    # Mapper global (GLOMAP: igual precisión, mucho más rápido); fallback al incremental
    mapper_args = ["--database_path", str(db), "--image_path", str(photos),
                   "--output_path", str(sparse)]
    attempts = []
    if shutil.which("glomap"):
        attempts.append(["glomap", "mapper"])
    attempts += [["colmap", "global_mapper"], ["colmap", "mapper"]]
    cp = None
    for i, head in enumerate(attempts):
        cp = run_logged(proj, "S1", head + mapper_args, log_name=f"s1_mapper_{i}.log",
                        env=env)
        if cp.returncode == 0:
            break
        print(f"AVISO: {' '.join(head)} falló (ver work/logs/s1_mapper_{i}.log); "
              f"{'probando siguiente mapper' if i + 1 < len(attempts) else 'sin más opciones'}")
    if cp is None or cp.returncode != 0:
        sys.exit("ERROR: ningún mapper produjo modelo — ver work/logs/")

    model = sparse / "0" if (sparse / "0").is_dir() else sparse
    if not (model / "cameras.bin").exists() and not (model / "cameras.txt").exists():
        sys.exit("ERROR: el mapper no produjo un modelo (¿solape insuficiente entre fotos?)")

    cp = run_logged(proj, "S1", ["colmap", "model_analyzer", "--path", str(model)],
                    log_name="s1_analyzer.log", env=env)
    metrics = parse_analyzer(cp.stdout + "\n" + cp.stderr)
    reg = metrics.get("imagenes_registradas") or 0
    metrics["registradas_pct"] = round(100 * reg / n_fotos, 1) if n_fotos else 0.0

    cp = run_logged(proj, "S1", [
        "colmap", "image_undistorter", "--image_path", str(photos),
        "--input_path", str(model), "--output_path", str(undist),
        "--output_type", "COLMAP"], log_name="s1_undistort.log", env=env)
    if cp.returncode != 0:
        sys.exit("ERROR en image_undistorter — ver work/logs/s1_undistort.log")

    reasons = []
    if metrics["registradas_pct"] < th["min_registradas_pct"]:
        reasons.append(f"registradas {metrics['registradas_pct']}% < {th['min_registradas_pct']}%")
    err = metrics.get("error_reproyeccion_px")
    if err is None or err > th["max_error_reproyeccion_px"]:
        reasons.append(f"error reproyección {err} px > {th['max_error_reproyeccion_px']} px")
    tl = metrics.get("track_length_medio")
    if tl is not None and tl < th["min_track_length"]:
        reasons.append(f"track length {tl} < {th['min_track_length']}")
    passed = not reasons

    (work / "sfm_metrics.json").write_text(
        json.dumps({"gate": "G2", "pasa": passed, "metrics": metrics,
                    "motivos": reasons, "umbrales": th}, indent=2, ensure_ascii=False),
        encoding="utf-8")
    set_gate(proj, state, "G2", passed, metrics, reasons, "S1_OK")
    print(f"G2 {'PASA' if passed else 'FALLA'} — {json.dumps(metrics, ensure_ascii=False)}")
    if reasons:
        print("Motivos: " + " | ".join(reasons))
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
