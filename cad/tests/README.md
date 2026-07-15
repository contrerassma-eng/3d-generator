# Pruebas del motor CAD

Suite numérica del motor (CSG por BSP, regeneración paramétrica, detección de
caras/ejes y solver de restricciones). Verifica volúmenes exactos de booleanas,
casos límite (caras coplanares, agujeros solapados/cruzados, piezas sin
material) y convergencia del solver (incluido el caso singular de 180°).

```bash
cd cad
npx esbuild tests/test_engine.mjs --bundle --format=esm --platform=node \
  --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_engine.bundle.mjs
node /tmp/test_engine.bundle.mjs
```

Otras suites (mismo comando cambiando el archivo):

- `test_sketch2d.mjs` — croquizador 2D.
- `test_componentes.mjs` — biblioteca de componentes (requiere generar antes
  `componentes/out/componentes_cad.json` con `pipeline/componentes_cli.py`).
- `test_drawing2d.mjs` — exportador de planos DXF/PDF del navegador
  (escala real, cajetín ISO 7200, estructura del PDF y del R12).
- `test_sheetmetal.mjs` — chapa plegada: BA con factor K, volumen del plegado
  con radio real, desahogos, cadenas de pestañas y desarrollo.
