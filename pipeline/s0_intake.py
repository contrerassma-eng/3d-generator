"""S0 — Intake: control de calidad del set de fotos (gate G1).

Por cada foto: SHA-256, resolución, EXIF (focal/ISO/cámara) y nitidez
(varianza del Laplaciano). Rechaza fotos bajo umbral y evalúa G1.

uso: python pipeline/s0_intake.py projects/<X>
"""
from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import audit, load_state, load_thresholds, project_dir, save_state, set_gate, sha256_file

import cv2
import numpy as np
from PIL import Image, ExifTags

EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}


def exif_summary(img: Image.Image) -> dict:
    out = {}
    try:
        exif = img.getexif()
        tagmap = {ExifTags.TAGS.get(k, k): v for k, v in exif.items()}
        out["camara"] = str(tagmap.get("Model", "")) or None
        out["focal_mm"] = float(tagmap["FocalLength"]) if "FocalLength" in tagmap else None
        ifd = exif.get_ifd(0x8769)  # Exif IFD: ISO suele vivir aquí
        out["iso"] = ifd.get(0x8827) or tagmap.get("ISOSpeedRatings")
    except Exception:
        pass
    return out


def blur_score(path: Path) -> float:
    """Varianza del Laplaciano sobre versión reducida (consistente entre resoluciones)."""
    data = np.fromfile(str(path), dtype=np.uint8)  # fromfile evita problemas de rutas no-ASCII en Windows
    img = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    h, w = img.shape
    target = 1600
    if max(h, w) > target:
        s = target / max(h, w)
        img = cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
    return float(cv2.Laplacian(img, cv2.CV_64F).var())


def main() -> None:
    proj = project_dir(sys.argv[1])
    th = load_thresholds()["G1_intake"]
    state = load_state(proj)
    photos_dir = proj / "input" / "photos"
    out_dir = proj / "work" / "00_intake"
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in photos_dir.iterdir() if p.suffix.lower() in EXTS) \
        if photos_dir.is_dir() else []
    audit(proj, "S0", "inicio intake", "OK", n_fotos=len(files))

    rows, rejected = [], []
    for f in files:
        with Image.open(f) as im:
            w, h = im.size
            ex = exif_summary(im)
        mpx = round(w * h / 1e6, 1)
        blur = round(blur_score(f), 1)
        row = {"foto": f.name, "hash": sha256_file(f), "mpx": mpx,
               "ancho": w, "alto": h, "nitidez": blur, **ex, "motivos_rechazo": []}
        if mpx < th["min_resolucion_mpx"]:
            row["motivos_rechazo"].append(f"resolución {mpx} Mpx < {th['min_resolucion_mpx']}")
        if blur < th["blur_laplaciano_min"]:
            row["motivos_rechazo"].append(f"nitidez {blur} < {th['blur_laplaciano_min']}")
        (rejected if row["motivos_rechazo"] else rows).append(row)

    accepted = len(rows)
    total = accepted + len(rejected)
    pct_rej = round(100 * len(rejected) / total, 1) if total else 100.0
    med_mpx = statistics.median(r["mpx"] for r in rows) if rows else 0.0

    reasons = []
    if accepted < th["min_fotos"]:
        reasons.append(f"fotos aceptadas {accepted} < mínimo {th['min_fotos']}")
    if med_mpx < th["min_resolucion_mpx"]:
        reasons.append(f"resolución mediana {med_mpx} Mpx < {th['min_resolucion_mpx']}")
    if pct_rej > th["max_rechazadas_pct"]:
        reasons.append(f"rechazadas {pct_rej}% > máximo {th['max_rechazadas_pct']}%")
    passed = not reasons

    metrics = {"fotos_total": total, "aceptadas": accepted, "rechazadas": len(rejected),
               "rechazadas_pct": pct_rej, "resolucion_mediana_mpx": med_mpx}
    report = {"gate": "G1", "pasa": passed, "metrics": metrics, "motivos": reasons,
              "umbrales": th, "aceptadas": rows, "rechazadas": rejected}
    (out_dir / "intake_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    md = [f"# Intake — {proj.name}", "",
          f"**Gate G1: {'PASA' if passed else 'FALLA'}**", "",
          f"- Fotos: {total} (aceptadas {accepted}, rechazadas {len(rejected)} = {pct_rej}%)",
          f"- Resolución mediana: {med_mpx} Mpx", ""]
    if reasons:
        md += ["## Motivos de fallo", *[f"- {r}" for r in reasons], "",
               "Acción: re-capturar según docs/PROTOCOLO_CAPTURA.md", ""]
    if rejected:
        md += ["## Fotos rechazadas", *[f"- `{r['foto']}`: {'; '.join(r['motivos_rechazo'])}"
                                        for r in rejected], ""]
    (out_dir / "INTAKE.md").write_text("\n".join(md), encoding="utf-8")

    set_gate(proj, state, "G1", passed, metrics, reasons, "S0_OK")
    print(f"G1 {'PASA' if passed else 'FALLA'} — {json.dumps(metrics, ensure_ascii=False)}")
    if reasons:
        print("Motivos: " + " | ".join(reasons))
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
