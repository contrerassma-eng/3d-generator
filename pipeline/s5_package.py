"""S5 — Paquete web navegable + INFORME.md auditable (gate G5).

Genera projects/<X>/70_web/ autocontenido: visor Three.js + data (GLB, splat
opcional, provenance, manifest) y el informe final con gates, métricas y fuentes.

uso: python pipeline/s5_package.py projects/<X>
servir: cd projects/<X>/70_web; python -m http.server 8080
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import (REPO_ROOT, audit, load_state, load_thresholds, now_iso,
                       project_dir, set_gate)


def main() -> None:
    proj = project_dir(sys.argv[1])
    th = load_thresholds(proj)["G5_paquete"]
    state = load_state(proj)
    if not str(state.get("stage", "")).startswith(("S4_OK", "S5")):
        sys.exit(f"ERROR: el proyecto está en {state.get('stage')}; ejecuta antes s4_provenance.py")

    prov = json.loads((proj / "out" / "provenance.json").read_text(encoding="utf-8"))
    web = proj / "70_web"
    data = web / "data"
    data.mkdir(parents=True, exist_ok=True)

    shutil.copy2(REPO_ROOT / "viewer" / "index.html", web / "index.html")
    shutil.copy2(proj / "out" / "model.glb", data / "model.glb")
    shutil.copy2(proj / "out" / "provenance.json", data / "provenance.json")
    splat_rel = None
    for cand in ("scene.spz", "scene.ply"):
        src = proj / "out" / cand
        if src.exists():
            shutil.copy2(src, data / cand)
            splat_rel = f"data/{cand}"
            break

    manifest = {"project": proj.name, "generated": now_iso(),
                "model": "data/model.glb", "splat": splat_rel,
                "scale_factor": prov["layers"]["scale"]["factor"],
                "scale_unit": "mm"}
    (data / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    # INFORME.md — el entregable auditable
    gates = state.get("gates", {})
    lines = [f"# INFORME — {proj.name}", "",
             f"Generado: {now_iso()} · Método: foto3d (ver CLAUDE.md / docs/METODO.md)", "",
             "## Veredicto de compuertas", "",
             "| Gate | Resultado | Detalle |", "|---|---|---|"]
    for g in ("G1", "G2", "G3", "G4", "G5"):
        info = gates.get(g)
        if info:
            det = "; ".join(info.get("reasons") or []) or "—"
            lines.append(f"| {g} | {info['verdict']} | {det} |")
    lines += ["", "## Métricas medidas (capa irrefutable)", "",
              "```json", json.dumps(prov["layers"]["measured"], indent=2,
                                    ensure_ascii=False), "```", "",
              "## Escala", "",
              f"- Factor: `{prov['layers']['scale']['factor']}` "
              f"(método: {prov['layers']['scale']['method']})",
              f"- Discrepancia vs. dimensiones declaradas: "
              f"`{prov['layers']['scale']['discrepancia_pct']}` %", "",
              "## Hechos y fuentes", "",
              "| Hecho | Valor | Capa | Fuente |", "|---|---|---|---|"]
    for f in prov["facts"]:
        src = f["source"]
        ref = src.get("url") or src.get("method", "")
        val = f"{f.get('value', '')} {f.get('unit') or ''}".strip()
        lines.append(f"| {f['claim']} | {val} | {f['layer']}"
                     f"{' (solo render)' if f.get('render_only') else ''} | {ref} |")
    lines += ["", "## Integridad", "",
              *[f"- `{k}`: `{v}`" for k, v in prov["hashes"].items()],
              "", "Trazabilidad completa: `audit.log.jsonl` (una línea JSON por acción).",
              "", "## Navegar", "",
              "```powershell", f"cd {proj.name}/70_web; python -m http.server 8080",
              "```", "→ http://localhost:8080 — modo medición y panel de procedencia incluidos.", ""]
    (web / "INFORME.md").write_text("\n".join(lines), encoding="utf-8")

    missing = [f for f in th["archivos_requeridos"] if not (web / f).exists()]
    passed = not missing
    reasons = [f"faltan archivos: {missing}"] if missing else []
    metrics = {"archivos": sorted(str(p.relative_to(web)).replace("\\", "/")
                                  for p in web.rglob("*") if p.is_file()),
               "splat_incluido": splat_rel is not None}
    set_gate(proj, state, "G5", passed, metrics, reasons, "S5_PUBLICADO")
    print(f"G5 {'PASA' if passed else 'FALLA'} — paquete en {web}")
    print(f"Servir: cd {web} ; python -m http.server 8080")
    if reasons:
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
