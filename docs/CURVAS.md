# Curvas de polines cónicos 24" — generador y juego de planos

Extensión del estándar Kofmelk de la **curva de 60°** a cualquier ángulo, con
90° como el caso que motivó el trabajo. La regla del encargo es dura: *la de 90°
es la de 60° con más arco, nada más*. Por eso el generador no dibuja una curva
nueva — reproduce la de 60° real y después la estira.

El estándar escrito (radios, sección, filas de barrenos, qué cambia y qué no)
vive en el repo del simulador: `conveyone-simulator/docs/curvas.md`. Aquí está
la herramienta.

## Cómo se corre

```bash
cd cad

# 1. modelo paramétrico -> curva60_24.json · curva90_24.json · curva_dims.json
node ensambles/gen_curva.mjs

# 2. compuertas (calibra contra el C60 medido ANTES de aceptar el 90°)
node tests/test_curva.mjs

# 3. láminas PDF en la disposición Kofmelk (ensamblaje + una por pieza)
npx esbuild ensambles/planos_curva.mjs --bundle --format=esm --platform=node \
  --alias:three=./vendor/three.module.min.js --outfile=/tmp/pc.mjs
ANG=90 node /tmp/pc.mjs 2026-08-13      # ANG=60 para el juego de 60°

# 4. DXF de corte láser 1:1 + CSV de barrenos y de cotización
npx esbuild ensambles/dxf_flat.mjs --bundle --format=esm --platform=node \
  --alias:three=./vendor/three.module.min.js --outfile=/tmp/dxf_curva.mjs
DOC=ensambles/curva90_24.json OUTDIR=ensambles/planos_curva PREFIJO=CU \
  node /tmp/dxf_curva.mjs
```

## Qué sale

| Archivo | Contenido |
|---|---|
| `ensambles/curva90_24.json` | Ensamble paramétrico (29 piezas: 8 fabricadas + 21 polines), formato `foto3d-cad`. Se abre en el CAD del navegador |
| `ensambles/planos_curva/planos_fabricacion_curva90.pdf` | **9 láminas A3/A2**: ensamblaje con despiece y notas + 8 de pieza. Cada una con vista en planta acotada (R y ángulo), vista de pieza desplegada con sus barrenos, TABLA material/espesor/cantidad y cajetín ISO 7200 |
| `ensambles/planos_curva/dxf_curva90_24/CUD-*.dxf` | Desarrollo **a escala real** por pieza, listo para láser (capa `VISIBLE` = corte) |
| `…/_agujeros.csv` · `…/_corte.csv` | Coordenadas de todos los barrenos y resumen por pieza para cotizar el corte |
| `ensambles/_despiece_curva90.json` | Lista de materiales (fabricadas + componentes con cantidad) |

## Cómo está armado

- **`ensambles/gen_curva.mjs`** — `STD` (la sección y los radios, constantes) +
  `REGLAS` (cómo se reparten polines, tirantes, travesaños y soportes en
  función del ángulo). Cada cifra lleva su capa: `measured` lo que se leyó del
  C60, `user` lo que se decidió para extenderlo. Exporta `curva(A)`, así que
  60°, 45° y 30° salen del mismo código.
- **`ensambles/curva_patron_c60.json`** — el **patrón de perforación medido**
  del C60 (capa `measured`), extraído de la geometría vectorial de los PDF de
  fabricación originales: 54 barrenos del lateral externo y 62 del interno,
  con su fila, diámetro y posición sobre el desarrollo. Es la calibración.
- **`tests/test_curva.mjs`** — 92 compuertas en tres bloques: calibración
  contra el C60 medido, invariantes del estándar, y extensión a 90°.
- **`ensambles/planos_curva.mjs`** — láminas **analíticas**: dibuja arcos y
  barrenos desde los parámetros, no desde la malla. Por eso una pieza de 87
  perforaciones sale en milisegundos, donde el generador genérico
  (`planos_fab.mjs`, que teselaba y hacía CSG) no terminaba.

## Por qué las compuertas están así

El riesgo del encargo no es que la curva de 90° salga mal: es que salga
**distinta**. Un radio corrido, un paso de polín redondeado o una fila de
barrenos a 2 mm de donde iba, y la curva ya no comparte bodega ni maestranza
con la de 60° — que es justamente lo que se pidió conservar.

Por eso `test_curva.mjs` empieza reconstruyendo el C60 y comparándolo contra
sus propios planos. Si el generador ya no sabe hacer la curva que existe, no
tiene ninguna autoridad para proponer la que no existe.

Las decisiones de extensión (`user`) se tomaron todas con el mismo criterio:
**ningún vano crece**. El vano máximo entre travesaños del C60 es 18,85° y a
90° sigue siendo 18,85°; el arco máximo entre posiciones de soporte es 732,3 mm
y a 90° sigue siendo 732,3 mm. La curva se alarga, no se debilita.

## Límites declarados

- El **polín cónico 21"** se modela por su envolvente (Ø deducido de las
  alturas de eje medidas). Sus dimensiones reales son **POR CONFIRMAR**: falta
  la ficha del proveedor.
- **Travesaño 21", soporte frontal, tirante interno y soporte de motor** no
  venían en el juego de fabricación entregado (sólo aparecen en la lámina de
  ensamblaje). Los **patrones que los reciben sí están medidos**, así que el
  bastidor es fabricable; las láminas de esos accesorios faltan.
- La lámina de ensamblaje trae despiece y notas, no vistas de detalle
  (los cortes A/B del C60). Se agregan cuando haya geometría confirmada de los
  accesorios.
- Todo esto es **capa `user`**: diseño derivado de un plano, no medición del
  equipo físico. Verificar contra la primera curva construida antes de repetir.
