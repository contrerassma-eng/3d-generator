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

## Contraste contra el equipo de catálogo (Hytrol E24EZCT / 190-E24EZC)

La familia de la que desciende esta curva es la **24-volt tapered live roller
zero pressure accumulating curve** de Hytrol. Contrastar el C60 medido contra
su ficha confirma tres cosas y levanta una. Las citas, con URL y fecha, están
en `cad/ensambles/curva_web_facts.json` (capa `web`).

**Confirma:**

- **24" de ancho total ↔ 21" entre bastidores** es un par de catálogo. La
  lectura del C60 (envolvente 609,2 y claro entre almas 533) cae exactamente
  ahí — el estándar no estaba mal leído.
- **30°, 45°, 60° y 90°** son los cuatro ángulos de catálogo. 90° no es una
  variante que estemos inventando: faltaba.
- El **ala de 1½"** es idéntica.

**Fija la motorización.** El catálogo dice *«one in each zone of conveyor»*.
Cruzado con el C60 —2 soportes de motor y 14 polines— sale la regla completa:

| | 60° | 90° |
|---|---|---|
| Conjuntos de motor 24 V | 2 | **2** |
| Polines por conjunto | 7 | 10,5 |

**Ojo con la aritmética.** La regla «un motor por zona» del catálogo, cruzada
con el C60 (2 soportes de motor, 14 polines), da 7 polines por zona y una zona
de 30° ≈ 24" — el largo de zona del sistema E24. Extendida a 90° esa cuenta
pide **3** motores.

**El equipo real lleva 2.** Lo corrigió Sergio: el diseño nativo de la curva
tiene dos conjuntos de motor, no tres. Manda el equipo, no la aritmética. La
compuerta verifica 2 en ambas curvas.

**El polín cónico — RESUELTO con el desarrollo real.**

Estuvo abierto un rato: el polín de catálogo Hytrol (2½" → 1 11⁄16", Δ radio
10,3) no cuadraba con las alturas de eje medidas en el C60, que piden Δ 17,7.
Sergio entregó el desarrollo 3D real (`ensambles/rodillo_conico.glb`) y cierra
el asunto: **el de catálogo no era la referencia**.

| | Valor |
|---|---|
| Ø extremo chico | **48,26 = 1,9"** (el diámetro estándar de polín) |
| Ø sobre la cara de 533 | **79,0** |
| Pendiente del cono | 0,05769 mm de Ø por mm de cara |
| Δ radio sobre la cara | 15,4 |
| Eje | Ø12 |
| Extremo grande | 3 anillos + polea de arrastre Ø87,5 |

Y confirma el principio de diseño: **razón de diámetros 79,0/48,26 = 1,637**
contra la **razón de radios de la curva 1397/864 = 1,617** — 1,2 % de
diferencia. El ápice del cono apunta al centro de la curva, que es lo que hace
que la velocidad tangencial sea proporcional al radio y la caja no patine.

El GLB se instancia tal cual en las 21 posiciones, con el extremo chico contra
el alma del lateral interno. No hay polín paramétrico: manda la pieza real.

**No se adopta:** el bastidor de catálogo es 6½" × 1½" × 12 ga; el del C60 es
**7½" × 1½" × 3 mm** — más alto y más grueso. Es una decisión deliberada de
Kofmelk y se conserva.

## Render y GLB

```bash
cd cad
# 1. LOD de render: el modelo sin los barrenos (invisibles a escala de render y
#    carísimos en CSG — 218 cortes booleanos en la de 90°)
python3 -c "
import json
for A in (60, 90):
    d = json.load(open(f'ensambles/curva{A}_24.json'))
    for p in d['parts']:
        p['features'] = [x for x in p['features'] if x['shape'] != 'hole']
        p.pop('flat', None)
    json.dump(d, open(f'ensambles/curva{A}_24_render.json', 'w'), indent=1)
"

# 2. GLB (una malla por pieza, color por material)
npx esbuild ensambles/nbt90/export_glb.mjs --bundle --format=esm --platform=node \
  --alias:three=./vendor/three.module.min.js --outfile=/tmp/glb.mjs
node /tmp/glb.mjs ensambles/curva90_24_render.json ensambles/curva_vistas/curva90_24.glb

# 3. vistas PNG
python3 ensambles/render_glb.py ensambles/curva_vistas/curva90_24.glb \
  ensambles/curva_vistas --prefijo curva90
```

Sale en `cad/ensambles/curva_vistas/`: `curva90_24.glb` y las cuatro vistas
(`iso`, `frente`, `lado`, `planta`), más las mismas de 60°.

**`ensambles/render_glb.py`** es un renderer por software: lee el GLB, proyecta
los triángulos y los pinta con z-buffer y sombreado plano. No necesita GPU ni
navegador. `nbt90/render.mjs` (que captura el visor real en Chromium) es lo
correcto cuando hay GPU; en este contenedor WebGL cae en swiftshader y una sola
vista tarda más que generar el modelo entero. El de software entra en segundos
y es determinista, que para documentar un ensamble es lo que se quiere.

El GLB usa la convención glTF (Y arriba) aunque el modelo es Z arriba; el
renderer deshace ese giro antes de aplicar las vistas de ingeniería.

**Nivel del modelo.** No es un STEP de fabricante como el ZP2026 del simulador.
El bastidor —laterales, alas, guías, polines y sus posiciones— sale de los
planos medidos y es fiel. Los accesorios —travesaño, tirante, soporte frontal,
pata y motor— están modelados por su envolvente para que el conjunto se lea
completo: **su POSICIÓN es la de los patrones medidos, su FORMA es POR
CONFIRMAR**. Van marcados así en el nombre de cada pieza.

## Los accesorios son los del recto, no versiones parecidas

El bastidor de la curva es propio: laterales, alas, guías y polines cónicos
salen de los planos Kofmelk. Los **accesorios no**. El travesaño, el motor, el
soporte de motor y la estación de patas son **exactamente los del transportador
recto 24V (ZP2026)**, y por eso se instancian desde el STEP del fabricante en
vez de re-modelarse.

Modelarlos "parecidos" era justamente lo que dejaba la curva por debajo del
nivel del recto: mismo aire, otra pieza. Ahora es la misma pieza.

| Componente | De dónde sale | En la curva |
|---|---|---|
| Travesaño `TR_S` | ZP2026 (C 88×40×3, 533 = 21") | 1 por patrón usado |
| Motor `UniDrive` 24 VDC | ZP2026 | 1 por zona |
| Soporte de motor `BR_3002` | ZP2026 | 1 por zona |
| Estación de patas (`RAL7035_leg`) | ZP2026 (columna 588, ranurada) | 2 columnas por posición de soporte, en las mismas líneas del recto (±286 del eje) |
| Lateral, alas, guías | planos Kofmelk C60 | paramétrico |
| Polín cónico 21" | planos Kofmelk C60 (Ø POR CONFIRMAR) | 7 por zona |

Un contraste que salió de aquí y vale la pena anotar: el lateral del recto mide
**191 mm de alto y 38 de ala** — la misma sección que el C60 (190,5 × 38,1). El
bastidor de la curva y el del recto son el mismo perfil.

```bash
cd cad
node ensambles/zp_componentes.mjs --inventario        # qué hay en el ZP2026
node ensambles/zp_componentes.mjs --extraer ensambles/zp_piezas.json
python3 ensambles/curva_ensamble.py 90 ensambles/curva_vistas/curva90_24.glb
```

`gen_curva.mjs` emite en `meta.montaje` **dónde** va cada componente (R, ángulo,
z), así que la posición sigue saliendo de los patrones medidos y hay una sola
fuente de verdad. `zp_componentes.mjs` sólo aporta la **geometría**.

El GLB del ZP2026 viene con `EXT_meshopt_compression`; se carga con el mismo
decodificador que usa el simulador.

## Todo de una pasada

```bash
cd cad && bash ensambles/regenerar_curva.sh
```


## Límites declarados

- El **polín cónico 21"** se modela por su envolvente (Ø deducido de las
  alturas de eje medidas). Sus dimensiones reales son **POR CONFIRMAR**: falta
  la ficha del proveedor.
- El **travesaño, el motor, el soporte de motor y la estación de patas** son la
  geometría real del ZP2026. Lo que sigue siendo diseño nuestro es **dónde** se
  atornillan en la curva: la posición sale de los patrones medidos, pero la
  interfaz fina (largo del travesaño contra el claro de 533, altura de la
  ménsula del motor) se cierra contra la primera curva armada.
- **Soporte de piso: pendiente contra el despiece MS05** (Sergio corrigió: es
  **MS05**, no MC05). Falta la placa base, la sección transversal y la
  regulación angular. Hoy va la estación de patas del ZP2026, que no trae esas
  piezas. **No se compra ni se fabrica el soporte hasta tener ese despiece.**
- El **soporte frontal** y el **tirante interno** del C60 siguen sin lámina y
  sin equivalente en el recto: no se modelan. Sus patrones sí están medidos.
- **Las guías superiores salen con CERO barrenos.** En el C60 la guía se suelda
  a su refuerzo («soldar arista interna, cordón completo») y los barrenos de
  apriete viven en el refuerzo, no en la tira — pero la vista desplegada del
  C60 muestra además **separaciones en los extremos** («no soldar separaciones
  de los extremos») que hoy no se emiten. Falta modelarlas como recortes del
  desarrollo. **Pendiente de corte láser.**
- El refuerzo emite 12 barrenos a 90° (8 a 60°); la lámina C60 muestra del
  orden de 9–10. La regla de reparto está puesta por posición de travesaño y de
  soporte, no leída del plano: **verificar contra la lámina antes de cortar.**
- La lámina de ensamblaje trae despiece y notas, no vistas de detalle
  (los cortes A/B del C60). Se agregan cuando haya geometría confirmada de los
  accesorios.
- Todo esto es **capa `user`**: diseño derivado de un plano, no medición del
  equipo físico. Verificar contra la primera curva construida antes de repetir.
