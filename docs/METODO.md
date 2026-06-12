# Método: máquina de estados y gates

Pipeline determinista. Cada etapa lee el estado del proyecto, valida precondiciones,
produce artefactos, evalúa su gate contra `config/thresholds.json` y escribe en
`state.json` + `audit.log.jsonl`. Un gate fallido detiene el avance.

## Estados

```
S0_PENDIENTE → S0_OK → S1_OK → S2_OK → [S3_OK] → S4_OK → S5_PUBLICADO
                 │        │       │                 │
                 └─G1✗    └─G2✗   └─G3✗             └─G4✗   (estado *_FALLIDO + motivo)
```

## S0 — Intake (gate G1: calidad de fotos)

Entrada: `input/photos/*.jpg|png|tif`. Por cada foto:
- SHA-256 (ancla de auditoría: el set de entrada queda criptográficamente fijado)
- Resolución (Mpx), EXIF (focal, ISO, fecha, cámara)
- Nitidez: varianza del Laplaciano (OpenCV). Bajo umbral ⇒ foto rechazada.

G1 pasa si: nº fotos aceptadas ≥ `min_fotos`, resolución mediana ≥ `min_resolucion_mpx`,
% rechazadas ≤ `max_rechazadas_pct`. Falla ⇒ informe indica QUÉ recapturar.

Salida: `work/00_intake/intake_report.json` + `INTAKE.md` (tabla legible).

## S1 — Structure from Motion (gate G2: consistencia geométrica)

COLMAP: `feature_extractor` → matcher (`exhaustive` ≤150 fotos, `sequential` si más)
→ `mapper` → `model_analyzer` → `image_undistorter` (prepara S2).

G2 pasa si: % imágenes registradas ≥ `min_registradas_pct`, error medio de
reproyección ≤ `max_error_reproyeccion_px`, track length medio ≥ `min_track_length`.

**Esta es la compuerta de "irrefutabilidad"**: cada punto 3D aceptado fue visto por
múltiples cámaras con error sub-píxel. Métricas en `work/10_sfm/sfm_metrics.json`.

## S2 — Densificación + malla (gate G3: malla válida)

OpenMVS: `InterfaceCOLMAP` → `DensifyPointCloud` → `ReconstructMesh` →
`TextureMesh --export-type glb`. Si `gltfpack` está disponible, compresión
meshopt + KTX2 → `out/model.glb`.

G3 pasa si: GLB existe, tamaño ≥ `min_tamano_glb_kb`, log sin errores fatales.

## S3 — Gaussian Splatting (opcional, sin gate)

Fotorrealismo para el visor. Requiere GPU; flujo manual documentado en
`pipeline/s3_splat.md`. Salida esperada: `out/scene.spz` (o `.ply`).
Su procedencia es `measured` (usa las mismas poses de S1) pero se etiqueta
`render_only`: los splats NO son superficie medible, solo apariencia.

## S4 — Procedencia y escala (gate G4: coherencia dimensional)

Funde en `out/provenance.json` (esquema: `schemas/provenance.schema.json`):
1. Métricas `measured` de S0–S2.
2. Afirmaciones `user` parseadas de `input/descripcion.md`.
3. Datos `web` de `input/web_facts.json` (URL + fecha + cita obligatorias).
4. Escala: aplica `factor_escala` de descripcion.md y calcula la discrepancia %
   entre dimensiones medidas y declaradas/web.

G4 pasa si discrepancia ≤ `max_discrepancia_escala_pct`. Si no hay dimensión de
contraste, G4 queda `SIN_CONTRASTE` (advertencia visible, no bloqueo).

### Flujo de escala v1
COLMAP entrega escala arbitraria. Procedimiento:
1. Captura con objeto de dimensión conocida en escena (`referencia_escala` en descripcion.md).
2. Tras S5, medir esa distancia en el visor (modo medición, sin escala aún).
3. Anotar `factor_escala = dimension_real / dimension_medida` en descripcion.md.
4. Re-ejecutar S4 + S5: el visor aplica el factor y las mediciones quedan métricas.

## S5 — Paquete navegable + informe (gate G5: completitud)

Genera `70_web/` autocontenido: `index.html` (visor Three.js), `data/model.glb`,
`data/scene.spz` (si existe), `data/provenance.json`, `data/manifest.json`.
Genera `INFORME.md`: hashes de entrada, métricas por etapa, resultado de cada gate,
tabla de hechos con capa y fuente, versiones de herramientas. Ese informe ES el
resultado auditable.

G5 pasa si todos los `archivos_requeridos` existen.

## Auditoría

`audit.log.jsonl` — una línea JSON por acción:
```json
{"ts":"2026-06-12T10:00:00Z","stage":"S1","action":"colmap mapper","inputs":{"db":"sha256:..."},"outputs":{"sparse":"sha256:..."},"result":"OK","metrics":{...}}
```
Nunca se edita ni se trunca. Cualquier acción manual se registra con
`python pipeline/lib_audit.py log <proyecto> "<descripción>"`.

## Límites declarados (lo que el método NO garantiza)

- Geometría no vista por ninguna foto (interiores, base de apoyo): no existe en el modelo.
- Superficies transparentes/espejadas: ruido o huecos; se mitigan en captura
  (spray/polarizador) o se declaran, jamás se rellenan inventando.
- La escala depende de la referencia física; sin ella el modelo es correcto en
  forma pero no métrico (y el informe lo dice).
