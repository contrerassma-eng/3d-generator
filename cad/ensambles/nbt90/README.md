# NBT90 — Transferencia 90° de rodillos emergentes para clasificador de bandas angostas

Modelo 3D paramétrico, **fabricable y funcional**, del módulo de transferencia a
90° de un clasificador de bandas angostas: seis rodillos vulcanizados emergen
entre las bandas del transportador anfitrión, giran arrastrados por un serpentín
de banda plana y expulsan el bulto de costado.

Levantado a partir de las **dos vistas aportadas por el usuario**
(`ref/fig8a_vistas.png` y `ref/iso_despiece.jpeg`), escaladas por píxeles. Cómo
se fijó la escala y por qué se corrigió: **[ESCALA.md](ESCALA.md)**.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `params.mjs` | **tabla única de cotas**, cada una con su procedencia (`med` medido / `cat` catálogo / `txt` texto del manual / `dis` decisión de diseño) |
| `lib.mjs` | primitivas: chapa plegada con desarrollo por factor K, bandas por tangentes, poleas y rodamientos por revolución, tornillería |
| `bastidor.mjs` | estructura de chapa: placas peine, canales, guardas, ménsulas |
| `rodillos.mjs` | los 6 rodillos vulcanizados (goma negra sólo en el tramo de carga) con eje de hilo interior + perno por fuera, rodamientos, el rodillo de retorno B-20760 Ø1.9" y las bandas del anfitrión (contexto) |
| `transmision.mjs` | serpentín de banda plana, poleas locas, tensor, rueda motriz y motorreductor |
| `elevacion.mjs` | cilindro compacto con guías SMC MGPM80-10Z, canal de montaje, jack bolts, horquilla de empuje, válvula y tubería |
| `tolerancias.mjs` | **esquema de tolerancias, ajustes y encajes**: las clases generales con sus tablas de norma, la tabla de ajustes ISO 286 con su criterio, la cadena de cotas de la holgura lengüeta↔ranura y el cordón de soldadura |
| `normalizado.mjs` | **designación de los componentes comprados**: cada perno, tuerca, golilla, anillo, rodamiento, racor o buje con su norma o su referencia de catálogo, en un solo sitio |
| `gen_nbt90.mjs` | integrador + **compuerta de verificación**; emite `narrow_belt_transfer_90.json` |
| `_check.mjs` | banco de pruebas de un módulo suelto (construye la malla real de cada pieza) |
| `export_glb.mjs` | exporta el ensamble a GLB (una malla y un material por pieza) |
| `CONTRATO.md` | ejes, firma de los módulos, nombres, colores y reglas del gate |
| `REVISION_ESTRUCTURAL.md` | revisión de **resistencia y dinámica** ordenada por gravedad: qué no cumple, qué cumple justo y qué no se puede saber. Sus 21 comprobaciones viven en `gen_nbt90.mjs` §9 |
| `analisis/` | el levantamiento: mediciones por píxeles de cada vista, lectura del despiece y hechos de catálogo con procedencia |

## Cómo se usa

```bash
cd cad
npm install                                   # three, para node
node ensambles/nbt90/gen_nbt90.mjs            # genera el ensamble (falla si no pasa el gate)
                                              # + out/nbt90_retraido.json (mismo ensamble, bajado)
python3 ensambles/nbt90/interferencias_brep.py --tol 0.05      # interferencia exacta, ELEVADO
python3 ensambles/nbt90/interferencias_brep.py --tol 0.05 \
        --doc ensambles/nbt90/out/nbt90_retraido.json \
        --informe interferencias_brep_retraido.json            # … y RETRAÍDO
node tests/test_nbt90.mjs                     # invariantes de función, fabricación y armado
node ensambles/nbt90/export_glb.mjs ensambles/nbt90/narrow_belt_transfer_90.json out.glb
node ensambles/nbt90/_check.mjs bastidor --v  # probar un módulo suelto
```

Verlo en 3D, sirviendo `cad/` por HTTP:

```
ensambles/ver.html?doc=nbt90/narrow_belt_transfer_90.json&view=iso
ensambles/ver.html?doc=nbt90/narrow_belt_transfer_90.json&view=iso&material=real
```

o abrir el JSON en `cad/index.html` con **📂 Abrir** para editarlo.

### Dos modos de material

El visor pinta el mismo ensamble de dos maneras y ninguna sustituye a la otra:

| | `&material=plano` (por defecto) | `&material=real` |
|---|---|---|
| De dónde sale el color | el campo `color` de cada pieza | de **qué está hecha** la pieza |
| Para qué sirve | ENTENDER el montaje: azul = MÓVIL, gris pizarra = FIJO, dorado = tornillería, morado = rodamientos | MIRAR el equipo: se distingue el aluminio extruido del acero rectificado, la chapa galvanizada de la pintada y el uretano del caucho |
| Coste (cuadro, 1600×1100, swiftshader) | ≈0.3 s | ≈0.9 s |

El material de fabricación NO se decide dos veces: `materiales.mjs` reutiliza la
misma función `materialDe()` con la que `planos_nbt90.mjs` rellena el despiece y
el cajetín, y solo la traduce a una familia PBR. Si una pieza comprada declara su
`material` en el documento, ese dato manda sobre cualquier regla de nombres. Lo
que no encaja se pinta de un gris neutro y **el visor lo denuncia** en la barra de
información y por consola (`⚠ N sin clasificar`) en vez de inventarle un acabado.

Las cuatro vistas de `vistas/` se capturan en modo real:

```bash
node ensambles/nbt90/render.mjs nbt90/narrow_belt_transfer_90.json           # real
node ensambles/nbt90/render.mjs nbt90/narrow_belt_transfer_90.json --plano   # color de capa
```

Los **cortes** (`ver_corte.html`) van al revés: por defecto en color de capa,
porque en una sección el código de color es lo que la hace legible. `&material=real`
también existe allí. La iluminación de estudio, el mapa de entorno y las texturas
procedurales viven en `../estudio.mjs` (compartido con `ver.html`).

## Cómo funciona el equipo

1. El clasificador anfitrión mueve el bulto sobre **5 bandas angostas de 1"** a
   paso 3", que corren en **X** apoyadas en regletas de desgaste UHMW.
2. Para desviar a 90°, un **cilindro compacto con guías SMC MGPM80-10Z** (Ø80,
   carrera de catálogo 10 mm) eleva **10 mm** —la cota `0.394—MOVEMENT` del
   manual— todo el conjunto de rodillos. El manual lista para ese puesto una
   *guide table* de Ø100 y 20 mm de carrera; el modelo monta el Ø80 real y
   comprable, que da la carrera exacta sin topes postizos (ver `MESA_GUIA.md`).
   Los seis
   rodillos Ø1-3/8", que estaban por debajo del plano de bandas, emergen
   **1/4"** por encima y levantan el bulto de las bandas.
3. Los rodillos giran arrastrados por un **serpentín de una sola banda plana de
   1"** que pasa por encima de cada rodillo y por debajo de las poleas locas
   intercaladas, de modo que un solo motorreductor de 1/2 HP mueve las seis
   líneas. La banda se tensa bajando el **take-up idler** en su colisa.
4. El bulto sale en **Y** (90° respecto al flujo). Al desactivar la válvula, el
   conjunto baja y las bandas vuelven a mandar.
5. La altura fina se calibra con los **4 jack bolts** del canal de montaje del
   cilindro: se aflojan los tornillos de 3/8", se ajusta y se vuelven a apretar.

## Reglas que cumple el modelo (las verifica el gate)

- Emergencia de 1/4" arriba y retracción por debajo del plano de bandas, con
  carrera de 10 mm: `emergencia + retracción = carrera`.
- **La máquina puede bajar**: el modelo se dibuja ELEVADO, así que el gate baja
  además las piezas `MÓVIL` los 10 mm de carrera y exige que ninguna gane solape
  con una `FIJA`. Como las cajas envolventes no distinguen el hueco de un perfil
  en U, la lista de perfiles huecos tolerados está escrita en
  `RETRAIDO_CAJA_ABIERTA` (`gen_nbt90.mjs`) y quien decide de verdad es
  `interferencias_brep.py`, que se corre sobre `out/nbt90_retraido.json` —el
  mismo ensamble bajado, que emite el propio integrador.
- Holgura real entre cada rodillo y la regleta de la banda vecina.
- La banda del serpentín **cierra geométricamente** (tangentes calculadas, no
  dibujadas) y abraza cada rodillo lo suficiente para arrastrarlo por fricción.
- Toda pieza declara si **sube** (`MÓVIL`) o **queda fija** (`FIJO`).
- Toda unión atornillada tiene su perno, su tuerca, sus golillas y el agujero
  correspondiente en las dos piezas.
- Toda chapa tiene espesor de calibre, radio de plegado ≥ espesor y su
  **desarrollo** calculado con la misma fibra media con que se construyó.
- El actuador se dimensiona contra la masa que sube, con factor de seguridad.

## Fabricación: encajes, tolerancias y componentes

Tres cosas que hacen la diferencia entre un modelo y algo que un taller puede
cortar, situar y comprar sin interpretar el plano a ojo. Las tres se verifican
en el §10 de la compuerta.

### Encajes de posicionamiento

Los conjuntos soldados llevan rasgos que los sitúan solos: **lengüeta y ranura**,
**agujeros de pasador** (redondo + colisa) y **topes de testa**. Cada rasgo declara
qué grados de libertad fija, y la compuerta exige que **ninguno esté fijado dos
veces en la misma junta** — una lengüeta ajustada en las dos direcciones y además
redundante con otra es un conjunto que no entra.

| Junta | Encaje | Qué fija |
|---|---|---|
| Transfer cross channel ↔ Placa peine | 1 lengüeta de posición por extremo, en el **ala superior** (el alma queda a 0.67 mm del canto: ahí no cabe ranura) + testa a tope | Y, Z (lengüeta) · X (testa) |
| Notched brace channel ↔ Spacer plate | 1 lengüeta de posición en el alma + 1 **de paso** en el ala interior | Y, Z · la de paso NO sitúa |
| Cross angle ↔ Notched brace channel | 2 agujeros Ø8: uno **redondo** y otro en **colisa** (chapas paralelas: no cabe lengüeta) | X, Z · la colisa absorbe la tolerancia entre taladros |
| Canal base ↔ Tapas de extremo | 1 lengüeta de posición + 1 de paso, en las dos alas del canal | X, Z |
| Pestaña de apoyo ↔ Placa soporte de transmisión | lengüeta **pasante** por una muesca abierta hacia abajo | Y, Z |
| Canal de montaje del cilindro ↔ Placa colgante | **a tope, sin encaje** — y se declara por qué y con qué utillaje se posiciona | — |

La holgura no se elige, se calcula: `ranura = espesor nominal + tolerancia de
laminación (ASTM/AISI) + tolerancia de corte (ISO 2768-m) + holgura de montaje`.
Para 12 GA: 2.657 + 0.152 + 0.10 + 0.20 = **3.11 mm**, o sea 0.10…0.35 mm de
holgura por lado. La compuerta recalcula la cadena y falla si alguien retoca una
holgura a mano.

### Tolerancias

| Familia | Clase | Norma |
|---|---|---|
| Chapa cortada y plegada | **ISO 2768-mK** | ISO 2768-1 clase m + ISO 2768-2 clase K |
| Pieza mecanizada | **ISO 2768-fH** | ISO 2768-1 clase f + ISO 2768-2 clase H |
| Conjunto soldado | **ISO 13920-BF** | ISO 13920:2023 clase B (longitudes) + F (forma) |

Las cotas donde el ajuste manda llevan su designación ISO 286 propia (tabla
`AJUSTES` de `tolerancias.mjs`). El criterio de rodamientos es el que ya usaba el
repositorio y ahora está citado: **el aro que gira respecto de la dirección de la
carga va apretado** (alojamientos N7) y el que está quieto respecto de ella, con
juego (ejes g6/h6).

Todo esto llega al plano: cajetín de cada pieza, dos láminas de tolerancias, una
lámina por cada 40 encajes y seis columnas nuevas en `despiece.csv`.

## Procedencia

- **Medido**: `analisis/vista_izquierda.json` y `analisis/vista_derecha.json` —
  cada cota cita la fila o columna de píxeles de donde sale.
- **Web**: `analisis/web_facts.json` — cada hecho con URL, fecha de acceso y
  cita textual; `analisis/catalogo_componentes.md` los ordena por subconjunto.
- **Usuario**: las decisiones de diseño, marcadas `dis` en `params.mjs` y en el
  bloque `L` de cada módulo.

Las vistas de referencia provienen del manual de instalación del fabricante del
equipo original. Se usan como **referencia dimensional y de nomenclatura de
componentes comprables**; la geometría de este repositorio es un diseño
paramétrico propio y los planos del fabricante no se redistribuyen.
