# foto3d

Método algorítmico y auditable para convertir **fotos de objetos semi-complejos**
en **modelos 3D navegables en HTML (Three.js)**, con trazabilidad total de cada dato.

## Idea central

Cada dato del resultado pertenece a una de tres capas, y nunca se mezclan sin marca:

| Capa | Origen | Estatus |
|---|---|---|
| `measured` | Triangulación multi-vista de las fotos (COLMAP + OpenMVS) | Irrefutable (matemática, con error de reproyección reportado) |
| `web` | Búsqueda web (fichas técnicas, fabricante) | Citado: URL + fecha + cita textual |
| `user` | Descripción entregada por el usuario | Afirmación registrada, no verificada |

El pipeline es una máquina de estados S0→S5 con compuertas de calidad (G1–G5) que
no se pueden saltar. El resultado final es una carpeta `70_web/` autocontenida con
visor Three.js (malla GLB + splats Gaussian opcionales vía Spark) más un `INFORME.md`
auditable con métricas, hashes y fuentes.

## Inicio rápido

```powershell
# 1. Verificar entorno (Python, COLMAP, OpenMVS, gltfpack)
powershell tools/check_env.ps1

# 2. Crear proyecto
Copy-Item -Recurse projects/_template projects/MI-OBJETO

# 3. Poner fotos en projects/MI-OBJETO/input/photos/ y llenar input/descripcion.md
#    (protocolo de captura: docs/PROTOCOLO_CAPTURA.md)

# 4. Pipeline
python pipeline/s0_intake.py projects/MI-OBJETO      # calidad de fotos
python pipeline/s1_sfm.py projects/MI-OBJETO         # poses + nube de puntos
python pipeline/s2_dense_mesh.py projects/MI-OBJETO  # malla texturizada GLB
python pipeline/s4_provenance.py projects/MI-OBJETO  # capas de confianza
python pipeline/s5_package.py projects/MI-OBJETO     # visor web + informe

# 5. Navegar
cd projects/MI-OBJETO/70_web; python -m http.server 8080
# → http://localhost:8080
```

Con Claude Code basta decir: `nuevo proyecto X` / `procesa X` / `investiga X` /
`publica X` — el método completo está codificado en [CLAUDE.md](CLAUDE.md).

## Estructura

```
foto3d/
├── CLAUDE.md            ← método algorítmico para IA (instrucciones persistentes)
├── config/thresholds.json  ← umbrales de los gates (editables, auditables)
├── docs/                ← método, protocolo de captura, instalación
├── schemas/             ← JSON Schema de provenance
├── pipeline/            ← scripts S0–S5 + librería de auditoría
├── viewer/index.html    ← plantilla visor Three.js + Spark
├── tools/check_env.ps1  ← diagnóstico de entorno
└── projects/            ← un objeto físico = una carpeta
    └── _template/
```

## Requisitos

- Python 3.12+ (`pip install -r requirements.txt`)
- [COLMAP](https://colmap.github.io/) y [OpenMVS](https://github.com/cdcseacave/openMVS) en PATH — ver `docs/INSTALACION.md`
- Opcional: `gltfpack` (compresión), herramienta 3DGS (ver `pipeline/s3_splat.md`)
