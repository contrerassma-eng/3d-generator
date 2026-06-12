"""S4 — Procedencia y escala (gate G4).

Funde en out/provenance.json las tres capas: measured (métricas S0–S2 + bbox del
GLB), user (descripcion.md) y web (web_facts.json, con URL/fecha/cita obligatorias).
Aplica factor_escala y calcula discrepancia % entre dimensiones medidas y declaradas.

uso: python pipeline/s4_provenance.py projects/<X>
"""
from __future__ import annotations

import json
import re
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import (audit, load_state, load_thresholds, now_iso,
                       project_dir, set_gate, sha256_file)

DIM_KEYS = ("largo_mm", "ancho_mm", "alto_mm")


def parse_descripcion(path: Path) -> dict:
    """Lee pares `clave: valor` de descripcion.md (líneas simples, no bloques)."""
    fields = {}
    if not path.exists():
        return fields
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([a-z_]+):\s*(.+?)\s*$", line)
        if m and m.group(2) and not m.group(2).startswith("|"):
            fields[m.group(1)] = m.group(2)
    return fields


def glb_bbox(path: Path) -> list[float] | None:
    """Bounding box [dx,dy,dz] desde los min/max de los accessors POSITION del GLB.
    No aplica transformaciones de nodos (suficiente para salidas OpenMVS, nodo único)."""
    with open(path, "rb") as f:
        magic, _ver, _length = struct.unpack("<4sII", f.read(12))
        if magic != b"glTF":
            return None
        chunk_len, chunk_type = struct.unpack("<II", f.read(8))
        if chunk_type != 0x4E4F534A:  # 'JSON'
            return None
        gltf = json.loads(f.read(chunk_len))
    mins, maxs = [], []
    for mesh in gltf.get("meshes", []):
        for prim in mesh.get("primitives", []):
            idx = prim.get("attributes", {}).get("POSITION")
            if idx is None:
                continue
            acc = gltf["accessors"][idx]
            if "min" in acc and "max" in acc:
                mins.append(acc["min"][:3])
                maxs.append(acc["max"][:3])
    if not mins:
        return None
    lo = [min(v[i] for v in mins) for i in range(3)]
    hi = [max(v[i] for v in maxs) for i in range(3)]
    return [hi[i] - lo[i] for i in range(3)]


def main() -> None:
    proj = project_dir(sys.argv[1])
    th = load_thresholds(proj)["G4_procedencia"]
    state = load_state(proj)
    if not str(state.get("stage", "")).startswith(("S2_OK", "S3", "S4")):
        sys.exit(f"ERROR: el proyecto está en {state.get('stage')}; ejecuta antes s2_dense_mesh.py")

    desc = parse_descripcion(proj / "input" / "descripcion.md")
    facts, hashes = [], {}

    # Capa measured: métricas del pipeline
    measured = {}
    for rel, key in (("work/00_intake/intake_report.json", "intake"),
                     ("work/10_sfm/sfm_metrics.json", "sfm")):
        f = proj / rel
        if f.exists():
            measured[key] = json.loads(f.read_text(encoding="utf-8"))["metrics"]
    model = proj / "out" / "model.glb"
    if not model.exists():
        sys.exit("ERROR: falta out/model.glb (ejecuta s2_dense_mesh.py)")
    hashes["model.glb"] = sha256_file(model)

    splat = next((p for p in (proj / "out" / "scene.spz", proj / "out" / "scene.ply")
                  if p.exists()), None)
    if splat:
        hashes[splat.name] = sha256_file(splat)
        facts.append({"id": "splat", "claim": "representación fotorrealista 3DGS",
                      "value": splat.name, "unit": None, "layer": "measured",
                      "render_only": True, "confidence": "alta",
                      "source": {"type": "pipeline",
                                 "method": "3DGS sobre poses COLMAP de S1 (ver audit.log)"}})

    err = (measured.get("sfm") or {}).get("error_reproyeccion_px")
    facts.append({"id": "geometria", "claim": "superficie triangulada multi-vista",
                  "value": err, "unit": "px error reproyección medio",
                  "layer": "measured", "confidence": "alta",
                  "source": {"type": "pipeline", "method": "COLMAP model_analyzer + OpenMVS"}})

    # Capa user: afirmaciones de descripcion.md
    for key in ("objeto", "fabricante", "modelo", "materiales", "referencia_escala"):
        if desc.get(key):
            facts.append({"id": f"user_{key}", "claim": key, "value": desc[key],
                          "unit": None, "layer": "user", "confidence": "media",
                          "source": {"type": "user", "method": "input/descripcion.md"}})
    user_dims = {k: float(desc[k]) for k in DIM_KEYS if desc.get(k, "").replace(".", "", 1).isdigit()}
    for k, v in user_dims.items():
        facts.append({"id": f"user_{k}", "claim": k, "value": v, "unit": "mm",
                      "layer": "user", "confidence": "media",
                      "source": {"type": "user", "method": "input/descripcion.md"}})

    # Capa web: web_facts.json — sin URL+fecha+cita el hecho se rechaza
    web_dims = {}
    wf_path = proj / "input" / "web_facts.json"
    if wf_path.exists():
        for i, wf in enumerate(json.loads(wf_path.read_text(encoding="utf-8"))):
            missing = [k for k in ("url", "accessed", "quote") if not wf.get(k)]
            if missing:
                sys.exit(f"ERROR: web_facts.json[{i}] sin {missing}: todo dato web "
                         "exige URL, fecha de acceso y cita textual.")
            facts.append({"id": wf.get("id", f"web_{i}"), "claim": wf["claim"],
                          "value": wf.get("value"), "unit": wf.get("unit"),
                          "layer": "web", "confidence": wf.get("confidence", "media"),
                          "source": {"type": "web", "url": wf["url"],
                                     "accessed": wf["accessed"], "quote": wf["quote"]}})
            if wf.get("unit") == "mm" and isinstance(wf.get("value"), (int, float)) \
                    and wf["claim"] in DIM_KEYS:
                web_dims[wf["claim"]] = float(wf["value"])

    # Escala: factor declarado + contraste dimensional (web tiene prioridad sobre user)
    factor = None
    try:
        factor = float(desc.get("factor_escala", ""))
    except ValueError:
        pass
    bbox = glb_bbox(model)
    declared = web_dims or user_dims
    discrepancia = None
    if factor and bbox and declared:
        model_dims = sorted((d * factor for d in bbox), reverse=True)
        decl_dims = sorted(declared.values(), reverse=True)
        pairs = list(zip(model_dims, decl_dims))
        discrepancia = round(max(abs(m - d) / d * 100 for m, d in pairs), 2)
        for axis, (m, d) in enumerate(pairs):
            facts.append({"id": f"dim_medida_{axis}", "claim": f"dimensión #{axis+1} (mayor→menor)",
                          "value": round(m, 1), "unit": "mm", "layer": "measured",
                          "confidence": "alta",
                          "source": {"type": "pipeline",
                                     "method": f"bbox GLB × factor_escala {factor}; declarada: {d} mm"}})

    if factor is None or not declared:
        passed, reasons = None, ["sin factor_escala o sin dimensión declarada para contrastar "
                                 "(modelo navegable pero no certificado métrico)"]
    elif discrepancia is not None and discrepancia > th["max_discrepancia_escala_pct"]:
        passed = False
        reasons = [f"discrepancia escala {discrepancia}% > {th['max_discrepancia_escala_pct']}%"]
    else:
        passed, reasons = True, []

    prov = {"project": proj.name, "generated": now_iso(),
            "layers": {"measured": measured,
                       "scale": {"factor": factor,
                                 "method": "referencia_fisica" if factor else "ninguno",
                                 "discrepancia_pct": discrepancia}},
            "facts": facts, "hashes": hashes}
    (proj / "out" / "provenance.json").write_text(
        json.dumps(prov, indent=2, ensure_ascii=False), encoding="utf-8")

    metrics = {"hechos": len(facts), "factor_escala": factor,
               "discrepancia_pct": discrepancia,
               "capas": {l: sum(1 for f in facts if f["layer"] == l)
                         for l in ("measured", "web", "user")}}
    set_gate(proj, state, "G4", passed, metrics, reasons, "S4_OK")
    verdict = "PASA" if passed else ("SIN_CONTRASTE" if passed is None else "FALLA")
    print(f"G4 {verdict} — {json.dumps(metrics, ensure_ascii=False)}")
    if passed is False:
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
