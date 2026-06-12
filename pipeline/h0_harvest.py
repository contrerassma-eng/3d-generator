"""H0 — Cosecha de fotogramas desde video (pre-etapa opcional, antes de S0).

Extrae fotogramas con ffmpeg, mide nitidez (varianza del Laplaciano) y conserva
el mejor fotograma por ventana de tiempo → input/photos/ del proyecto, en orden
temporal (apto para sequential_matcher). Audita origen del video con hash.

uso: python pipeline/h0_harvest.py projects/<X> <video> [fps=2] [ventana_s=2.0]
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import audit, project_dir, sha256_file

import cv2
import numpy as np


def blur_score(path: Path) -> float:
    data = np.fromfile(str(path), dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)
    return float(cv2.Laplacian(img, cv2.CV_64F).var()) if img is not None else 0.0


def main() -> None:
    proj = project_dir(sys.argv[1])
    video = Path(sys.argv[2]).resolve()
    fps = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
    ventana = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
    if not video.exists():
        sys.exit(f"ERROR: video no encontrado: {video}")
    if shutil.which("ffmpeg") is None:
        sys.exit("ERROR: ffmpeg no está en PATH")

    tmp = proj / "work" / "h0_frames"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    photos = proj / "input" / "photos"
    photos.mkdir(parents=True, exist_ok=True)

    audit(proj, "H0", f"cosecha de fotogramas de {video.name}", "INICIO",
          video_hash=sha256_file(video), fps_extraccion=fps, ventana_s=ventana)

    cp = subprocess.run(
        ["ffmpeg", "-i", str(video), "-vf", f"fps={fps}", "-qmin", "1", "-qscale:v", "1",
         str(tmp / "f_%05d.jpg")],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    if cp.returncode != 0:
        sys.exit(f"ERROR ffmpeg: {cp.stderr[-800:]}")

    frames = sorted(tmp.glob("f_*.jpg"))
    if not frames:
        sys.exit("ERROR: ffmpeg no extrajo fotogramas")

    # mejor fotograma (más nítido) por ventana de tiempo
    por_ventana = max(1, int(round(fps * ventana)))
    elegidos = []
    for i in range(0, len(frames), por_ventana):
        bucket = frames[i:i + por_ventana]
        elegidos.append(max(bucket, key=blur_score))

    for n, f in enumerate(elegidos):
        shutil.copy2(f, photos / f"frame_{n:04d}.jpg")
    shutil.rmtree(tmp)

    audit(proj, "H0", "cosecha completada", "OK",
          extraidos=len(frames), seleccionados=len(elegidos))
    print(f"H0 OK — {len(frames)} fotogramas extraídos, {len(elegidos)} seleccionados "
          f"(mejor por ventana de {ventana}s) → input/photos/")
    print("Siguiente: python pipeline/s0_intake.py", sys.argv[1])


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main()
