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
