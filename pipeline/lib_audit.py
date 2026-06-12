"""Librería común del pipeline foto3d: estado, auditoría y umbrales.

Toda etapa del pipeline usa estas funciones para que el resultado sea auditable:
- state.json: estado de la máquina S0..S5 y resultado de cada gate.
- audit.log.jsonl: registro inmutable (solo-append) de cada acción con hashes.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Consola Windows: emitir UTF-8 para que acentos no se corrompan al capturar salida
for _stream in (sys.stdout, sys.stderr):
    if _stream and hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def load_thresholds(proj: Path | None = None) -> dict:
    """Umbrales globales, con override POR PROYECTO si existe
    <proyecto>/thresholds_override.json (requiere campo 'justificacion';
    la desviación del estándar queda auditada)."""
    th = json.loads((REPO_ROOT / "config" / "thresholds.json").read_text(encoding="utf-8"))
    if proj:
        ov_file = proj / "thresholds_override.json"
        if ov_file.exists():
            ov = json.loads(ov_file.read_text(encoding="utf-8"))
            if not ov.get("justificacion"):
                sys.exit("ERROR: thresholds_override.json sin campo 'justificacion'")
            for gate, values in ov.items():
                if isinstance(values, dict):
                    th.setdefault(gate, {}).update(values)
            audit(proj, "CONFIG", "override de umbrales aplicado", "OK",
                  override={k: v for k, v in ov.items() if k != "_comentario"})
    return th


def project_dir(arg: str) -> Path:
    """Resuelve la ruta del proyecto (absoluta, relativa al cwd o al repo) y valida que exista."""
    p = Path(arg)
    candidates = [p] if p.is_absolute() else [Path.cwd() / p, REPO_ROOT / p]
    for c in candidates:
        if c.is_dir():
            return c.resolve()
    sys.exit(f"ERROR: proyecto no encontrado: {arg}")


def load_state(proj: Path) -> dict:
    f = proj / "state.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    return {"project": proj.name, "stage": "S0_PENDIENTE", "gates": {}}


def save_state(proj: Path, state: dict) -> None:
    state["project"] = proj.name
    state["updated"] = now_iso()
    (proj / "state.json").write_text(
        json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def audit(proj: Path, stage: str, action: str, result: str, **payload) -> None:
    entry = {"ts": now_iso(), "stage": stage, "action": action, "result": result}
    entry.update(payload)
    with open(proj / "audit.log.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def set_gate(proj: Path, state: dict, gate: str, passed: bool | None,
             metrics: dict, reasons: list[str], next_stage: str) -> None:
    """Registra el resultado de un gate. passed=None => SIN_CONTRASTE (advertencia)."""
    verdict = "PASA" if passed else ("SIN_CONTRASTE" if passed is None else "FALLA")
    state["gates"][gate] = {"verdict": verdict, "metrics": metrics,
                            "reasons": reasons, "ts": now_iso()}
    if passed or passed is None:
        state["stage"] = next_stage
    else:
        state["stage"] = next_stage.replace("_OK", "_FALLIDO")
    save_state(proj, state)
    audit(proj, gate, "evaluacion gate", verdict, metrics=metrics, reasons=reasons)


def run_logged(proj: Path, stage: str, cmd: list[str], cwd: Path | None = None,
               log_name: str | None = None) -> subprocess.CompletedProcess:
    """Ejecuta un binario externo, mide duración, guarda log completo y audita."""
    t0 = time.time()
    cp = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True,
                        encoding="utf-8", errors="replace")
    dur = round(time.time() - t0, 1)
    if log_name:
        log_dir = proj / "work" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        (log_dir / log_name).write_text(
            f"$ {' '.join(cmd)}\n\n--- stdout ---\n{cp.stdout}\n--- stderr ---\n{cp.stderr}",
            encoding="utf-8")
    audit(proj, stage, " ".join(cmd[:2]), "OK" if cp.returncode == 0 else f"EXIT_{cp.returncode}",
          duracion_s=dur)
    return cp


def require_tools(names: list[str]) -> None:
    """Aborta con guía de instalación si falta algún binario. Nunca se simulan salidas."""
    import shutil
    missing = [n for n in names if shutil.which(n) is None]
    if missing:
        sys.exit(
            f"ERROR: herramientas no encontradas en PATH: {', '.join(missing)}\n"
            f"Instrucciones: docs/INSTALACION.md (verifica con tools/check_env.ps1)."
        )


if __name__ == "__main__":
    # CLI: registrar una acción manual en el log de auditoría.
    # uso: python pipeline/lib_audit.py log <proyecto> "<descripción>"
    if len(sys.argv) >= 4 and sys.argv[1] == "log":
        p = project_dir(sys.argv[2])
        audit(p, "MANUAL", " ".join(sys.argv[3:]), "REGISTRADO")
        print(f"Registrado en {p / 'audit.log.jsonl'}")
    else:
        print(__doc__)
