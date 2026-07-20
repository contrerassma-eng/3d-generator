# Ensambles paramétricos (formato `foto3d-cad`)

Ensambles completos generados por script, listos para abrir en el CAD del
navegador (`cad/index.html` → 📂 Abrir) o para ver de inmediato con el visor
de solo lectura de esta carpeta:

```
# servir cad/ (p. ej. python -m http.server) y abrir:
cad/ensambles/ver.html?doc=transfer_rodillos_90.json&view=iso|frente|lado|planta
```

Regenerar tras cambiar parámetros: `node cad/ensambles/gen_transfer90.mjs`.
Prueba del ensamble (motor CSG real + invariantes): `cad/tests/test_transfer90.mjs`
(ver `cad/tests/README.md`).

---

## `transfer_rodillos_90.json` — Transferencia 90° (módulo de desviación)

**Solo el módulo de desvío pop-up** — el módulo principal de bandas del
transportador anfitrión NO se modela (especificación del usuario). 116 piezas,
capa `user`. Ejes: **X = eje/largo de rodillo (= flujo del anfitrión), Y =
expulsión a 90°, Z = arriba**, mm. Estado modelado: **elevado** (carrera aplicada).

> **Transfer de rodillos estilo MRT sobre base twin-belt (STEP `sorter_CO`),
> funcional / fabricable / simple.** El STEP traía una transferencia de
> **rodillos delgados**; se elimina y se calza esta. El base tiene **4 bandas
> pasantes a X = 0/139/277/416** (paso **139**, hueco libre ≈ 99): los rodillos
> son **5 × Ø63 de 800 mm de cara a paso 139** (uno por hueco + los 2 bordes),
> de **eje muerto macizo** con rodamientos internos y **perno hexagonal**, y el
> accionamiento es una banda plana al extremo con **motorreductor de eje
> hueco**. La colocación en el hueco real se ve en `ver_integracion_real.html`.

### Especificación (capa `user`) — transfer MRT ajustado al base

| Requisito | Valor en el modelo |
|---|---|
| Solo la transferencia (módulo de desviación) | 116 piezas, sin el transportador anfitrión |
| **5 rodillos** Ø63 vulcanizados (tubo de acero Ø51) de **800 mm de cara**, a **paso 139** = 1 por hueco entre las 4 bandas del base | gap tangente **76**; emergen limpios ENTRE las bandas reales (X base = 208 − línea) |
| **Rodillo de EJE MUERTO MACIZO** (Hytrol MRT): el eje no gira, el tubo gira sobre 2 **rodamientos 6004** entre eje y tubo | eje macizo Ø20 **perforado Ø8.5 + roscado M10 interior**; desde fuera de la chapa un **perno HEXAGONAL M10 DIN 933 + golilla** lo sujeta a cada placa; **tapa de extremo** por lado |
| **Accionamiento por banda plana** (serpentín) al extremo, NO rodillo a rodillo | **banda plana 35 × 3 (nitrilo/poliéster)** sobre el **tubo desnudo Ø51** de cada rodillo → **3 tensores Ø80 BAJOS (z=58) con colisa vertical** (mayores y más bajos → bajan el ramal y dan la compliancia del pop-up) → **tambor motriz Ø90 con SIT-LOCK** (hueco R3–R4) → 2 retornos Ø24 en esquinas |
| **Motor por dentro, simple y confiable** | **motorreductor de EJE HUECO** montado directo sobre el eje del tambor (sin acople ni alineación), con **brazo de torque** a la placa +X; cuelga en la ventana del base. Cilindros y palancas entre las placas |
| **Solo 2 cilindros**, **en diagonal con pivote**, subida **vertical de 6 mm** | ISO 6432 Ø25 inclinados 36.7°, basculantes en horquilla; empujan una **palanca con rodillo de leva** que sube el puente en vertical (carrera de cilindro 10 → 6 vertical) |
| Estructura fija **no más ancha que las placas laterales** | canal fijo de **836 mm** = ancho exterior de las placas (separadas 830 = largo del rodillo + acoples) |
| **Identificar módulo móvil vs fijo** (canal lateral de la cinta) | piezas `FIJO ·` (canal + mecanismo de elevación, gris) y `MÓVIL ·` (placas, rodillos, transmisión y motor, azul); pasadores guía Ø8 del móvil corren en colisas verticales del canal |
| Placas con **extensiones delgadas hacia los rodillos** | cuerpo porta-poleas bajo + 5 **dedos de 28 mm** con punta redonda hasta cada rodillo; entre dedos pasan a lo largo las bandas del anfitrión |

### Arquitectura (memoria de diseño)

- **Rodillos (eje muerto macizo, 800 mm)**: 5 líneas a paso 139, eje **z = 142.5**
  → tangente 174 = plano anfitrión (170) + 4; retraído −2. El **eje muerto macizo
  Ø20 × 830** se atornilla a ambas placas (alojamiento Ø20.5) — **no gira**; sus
  extremos se **taladran Ø8.5 y se roscan M10** y un **perno HEXAGONAL M10 DIN 933
  + golilla** los sujeta desde fuera. El **tubo de acero Ø51 × 800** (bore Ø42)
  gira sobre **2 rodamientos 6004 2RS** (20×42×12), uno por extremo, con **tapa
  de extremo**; vulcanizado a Ø63 salvo el extremo +X desnudo (x = 355..400),
  donde la banda del serpentín lo arrastra por fricción.
- **Serpentín** (orden de marcha, 5 rodillos, en el extremo +X): retorno izq
  (−312, 36) → R1 → tensor Ø50 (−208.5, 98) → R2 → tensor (−69.5, 98) → R3 →
  **tambor M** (69.5, 78, Ø90) → R4 → tensor (208.5, 58) → R5 → retorno der
  (312, 36). La banda gira sobre el **tubo desnudo Ø51** de cada rodillo (plano
  x = 378). El tambor gira en eje Ø20 con SIT-LOCK, apoyado en 1 UCFL204 (placa
  +X) y accionado por un **MOTORREDUCTOR DE EJE HUECO** montado directo sobre él
  (sin acople), que reacciona con un **brazo de torque** a la placa +X y cuelga
  en una ventana del canal. Toda la transmisión y el motor son MÓVILES.
- **Elevación (mecánica de palanca)**: por extremo, un cilindro diagonal
  basculante en horquilla de la base empuja el ojo de una palanca pivotada
  (pivote fijo a −118, entrada a +85, leva Ø24 en 0): relación 118/203 →
  con 10.3 mm de carrera del cilindro el rodillo de leva sube el puente
  exactamente 6 mm en vertical. Los puentes 836×20×12 atraviesan ambas
  placas por ranuras láser; los pasadores guía Ø8 en colisas del canal
  mantienen el movimiento vertical.
- **Canal fijo**: base 836×740×6 con 2 alas bajas (top 40) que quedan por
  dentro de las placas móviles (3 mm de juego); anclajes Ø11 al anfitrión y
  patrones M5 para horquillas y soportes de pivote.

### Reglas de diseño aplicadas

- Holguras del método: M4→Ø4.5, M5→Ø5.5, M6→Ø6.6, M8→Ø9, M10→Ø11; ejes
  deslizantes Ønominal+0.2.
- Patrones de taladrado idénticos entre piezas atornilladas (horquillas y
  soportes de pivote ↔ canal, brida del motor ↔ placa −X); verificados por
  `test_transfer90.mjs`.
- `gen_transfer90.mjs` **se niega a emitir** si el diseño viola la
  especificación: gap < 50, carrera/elevación fuera de rango, serpentín
  fuera del tramo desnudo, tangentes imposibles, banda que sobresale del
  plano de rodillos o toca la estructura, canal más ancho que las placas,
  cilindro fuera del rango diagonal (25..60°), leva que no toca el puente,
  o bandas anfitrionas que no pasan entre los dedos.

Los rodillos completos, poleas de retorno/tensoras, tambor motriz, ruedas y
ejes están en la **biblioteca de componentes** (`componentes/catalogo.json`,
categoría `mecanico`) e insertables desde el botón 🔌 Comp. de la interfaz web.

**Diseño de velocidad** (espec. usuario): v tangencial de rodillos **80 m/min**
→ v de banda 60 m/min (relación de radios 20/15); tambor Ø90 a 212 rpm;
motorreductor i≈6.3 (~0.18 kW); envoltura del tambor ≈200°, μ≥0.7
caucho-nitrilo. **Detalle de fabricación**: tambor construido (llanta rolada
e=8 + 2 tapas y cubo soldados, equilibrado) fijado al eje Ø25 con **buje
cónico autocentrante SIT-LOCK CAL 1 25×34** (sin chaveta ni chavetero); el
**acople rígido lleva 2 chavetas DIN 6885 A 8×7** (lado motor y lado eje,
chaveteros N9); ejes con planos de llave fresados y chaflanes; tensores y
retornos con **descansos de brida** (buje bronce Ø24 con grasera M6) en la placa.

Para la variante de **30°**: girar 60° las líneas de rodillos (placas y
serpentín giran con ellas); elevación y bastidor no cambian.

---

## `base_sorter.json` — Equipo base twin-belt (paramétrico completo)

Modelo **paramétrico** del transportador base (`gen_base.mjs`), entendido del
STEP `sorter_CO` y **mejorado con criterio de diseñador** — ya no es la malla:

- **Bastidor de canal C** (2 largueros con alas) sobre **4 patas niveladoras** +
  riostras diagonales; **ALARGADO a 3 m**.
- **4 bandas planas 40×3** en las calles (Y=±69.5/±208.5), ramal superior + retorno.
- **Tambor de cabeza MOTRIZ** (motorreductor de eje hueco + brazo de torque) y
  **tambor de cola con TAKE-UP** por husillo (tensado/mantenimiento).
- **Travesaños** de trabazón; los de **X=±430 son PESADOS** y enmarcan el
  **hueco de transferencia** (reciben las cargas del módulo).
- **Guardas laterales** de guía del producto.

Marco = el del módulo (flujo X, ancho Y, plano de banda Z=170), para que la
transferencia calce en el hueco **sin rotación ni offset**. Regenerar:
`node cad/ensambles/gen_base.mjs`.

## `integracion_modulo_base.json` — Conjunto completo (base + transferencia)

Ensamble de **integración**: el módulo (`transfer_rodillos_90.json`, sin
cambios) montado sobre una **representación simplificada del equipo base**
(transportador de bandas), en su posición real, para ver cómo calza. Se genera
con `node cad/ensambles/gen_integracion.mjs` y se abre en el visor
(`ver.html?doc=integracion_modulo_base.json`) o en el CAD (📂 Abrir).

La referencia del base (prefijo `BASE ·`, solo visual — **no se modela ni se
modifica**) incluye: las **bandas de 40 mm a Z=170** corriendo en X (flujo) en
las calles entre las líneas de rodillos, los **rieles T-slot** a los que se
anclan los pies del módulo, los largueros de bastidor y 2 rodillos de banda.
Muestra los dos interfaces: **transporte** (los rodillos emergen +4 mm sobre el
plano de banda, entre las bandas) y **montaje** (pies a los rieles T-slot). El
equipo base real es el STEP `sorter_CO`; esta es una referencia para verificar
el calce (ver `INTEGRACION_BASE.md`).

## `ver_integracion_real.html` — módulo integrado en el STEP base real (a color)

Visor combinado: carga la **teselación del STEP real** (`sorter_CO`, el equipo
base que subió el usuario) **pintada con colores realistas** y le superpone el
**módulo de transferencia** (`transfer_rodillos_90.json`) en su posición, para
ver el módulo integrado en la máquina real —no en una referencia simplificada.

El base se tesela, se colorea y se le marca la transferencia vieja aparte (son
derivados grandes y regenerables del STEP, **no versionados** — ver
`.gitignore`). Regenerar y servir:

```bash
# 1) teselar el STEP a STL binario (gmsh/OpenCASCADE)
python tools/step_to_stl.py sorter_CO.stp cad/ensambles/base.stl 250
# 2) colorear por piezas (paleta industrial: azul bastidor, negro bandas, acero
#    rodamientos/poleas, aluminio perfiles)
python tools/color_step_mesh.py cad/ensambles/base.stl cad/ensambles/base_colors.bin
# 3) marcar la transferencia de rodillos DELGADOS original (se omite en el visor)
python tools/mark_transfer_removal.py cad/ensambles/base.stl cad/ensambles/base_remove.bin
# 4) servir cad/ y abrir el visor combinado (params: px,py = posición del módulo
#    en el frame del base; z = bajada; r = alcance de cámara)
#    ver_integracion_real.html?view=iso   (por defecto px=208, py=-1121, z=-84)
```

El visor **omite** los triángulos marcados en `base_remove.bin` (la transferencia
de rodillos delgados + su transmisión que el STEP ya traía) y en su hueco calza
el módulo Ø63: **rota 90°** el módulo para alinear el eje de los rodillos con el
flujo del base (Y), lo coloca en el **centro del hueco real** (X=208, Y=−1121,
medido en el teselado) y lo **baja** para que los rodillos emerjan +4 sobre el
plano de banda (Z≈86). `px`/`py`/`z` afinan el calce. La geometría del STEP que
se conserva **no se modifica**: `tools/color_step_mesh.py` solo la pinta y
`tools/mark_transfer_removal.py` solo marca qué quitar; **ninguno inventa
geometría**.

## `base_interface.json` — bastidor de integración en la base (modificación)

Con la autorización de **modificar la base** para alojar el transfer, este es el
marco soldado que se **añade a la base twin-belt** (STEP `sorter_CO`) y cierra el
diseño de la interfaz. Se genera con `node cad/ensambles/gen_base_interface.mjs`
y el visor `ver_integracion_real.html` lo posiciona con la **misma
transformación** que el módulo (en el hueco real). 15 piezas, capa `user`.

Contiene:

- **2 largueros** (a lo largo del flujo) + **3 travesaños de trabazón** que
  abren y refuerzan el hueco de la transferencia (perfiles RHS 60×74).
- **4 cartelas de anclaje** al bastidor de la máquina base (M12) + **costura de
  soldadura** (tapón) larguero↔travesaño.
- **Rieles T-slot + tuercas en T M12** sobre cada uno de los 4 pies del módulo
  (ajuste X) y **perforaciones M12** de fijación.
- **Topes de altura elevada M10** regulables.
- **Libertad del pop-up**: 8 mm de holgura entre la cara superior del marco y el
  canal FIJO del módulo → los 6 mm de carrera quedan libres.

La base real es un STEP teselado (malla de visualización); este marco es la
**modificación de diseño propuesta** y sus tie-ins exactos se cierran contra el
modelo nativo. Ver `INTEGRACION_BASE.md`.

## Animación (`ver_anim.html` + `js/animate.js` + `transfer_anim.json`)

Herramienta de **animación de foto3d**: simula el movimiento del ensamble desde
un archivo de datos, sin tocar la geometría.

```
# servir cad/ y abrir:
ver_anim.html?doc=transfer_rodillos_90.json&anim=transfer_anim.json
#   ?t=<seg>  congela un frame (para capturas)
```

- **`js/animate.js`** — motor reusable: dada la spec, entrega la matriz de
  animación de cada pieza en el tiempo. Canales:
  - `spin` — gira las piezas que matchean (rpm constante) alrededor de su eje
    (rodillos, tambor);
  - `pivot` — rota un grupo alrededor de una **línea fija** (el pop-up por
    bisagra); `exagerar` amplifica un movimiento chico (0.41°) para verlo;
  - `slide` — traslada a lo largo de un eje (carreras).
  - Selector `sel`: `{layer, match, not}` (capa FIJO/MÓVIL o regex de nombre).
- **`transfer_anim.json`** — la animación como DATO (capa `user`): rodillos y
  tambor girando + pop-up por bisagra keyframeado, con 3 fases (sube · transfiere ·
  baja) en un loop de 6 s. El visor tiene play/pausa y timeline (scrubbing).

Sobre `integracion_modulo_base.json` la animación incluye además: **scroll de
las bandas** (host + serpentín, `beltScroll`) y el **producto** (una caja que
entra por la banda, se transfiere y sale a 90°, `props`). El HUD muestra la fase.
El pop-up va **exagerado ×5** (el real es 0.41°/6 mm) para que se vea; la nota
va en el nombre del canal. Reusable para cualquier ensamble escribiendo su spec.

**Versión STANDALONE (autocontenida, sin servidor).** `entry_standalone.mjs`
empaqueta three + `model.js` + `animate.js` + los JSON en un solo HTML que se
abre con doble clic:

```bash
npx esbuild ensambles/entry_standalone.mjs --bundle --format=iife \
  --alias:three=./vendor/three.module.min.js --loader:.json=json \
  --outfile=/tmp/standalone.js
#   luego envolver /tmp/standalone.js en un HTML con el HUD (#tit/#fase/#pp/#t/#sl)
#   → transfer_animacion_standalone.html (~1.2 MB, corre en file://)
```

## Planos de fabricación (PDF)

`planos_transfer90/planos_fabricacion_transfer90.pdf` — juego de taller
completo, **27 páginas en un solo PDF**:

- **Portada** con el resumen del ensamble (piezas, ítems, normas, tolerancia
  general ISO 2768-mK, unidades).
- **Despiece / lista de materiales** (2 páginas): las **47 posiciones
  distintas** de las 116 piezas, con cantidad, tipo (FABRICADA /
  NORMALIZADA / CONJUNTO), material o norma, y número de plano. Los
  **rodamientos 6004**, la **UCFL204** y los **pernos hexagonales M10** de los
  rodillos van como NORMALIZADAS (con su norma DIN); el **eje muerto macizo**,
  el **tubo de acero Ø51×800** y el **vulcanizado Ø63** llevan plano de fabricación.
- **24 planos de pieza fabricada** (TR-01 …): vistas del primer diedro
  (alzado, planta, perfil) + isométrica, cotas envolventes y **cajetín
  ISO 7200** con designación, material, cantidad, escala y Nº de plano. Cada
  lámina elige tamaño (A4…A1) y escala normalizada automáticamente. Las
  piezas normalizadas (rodamientos, seegers, chavetas, rótulas, cilindros,
  válvula, motor…) no llevan plano: van en el despiece con su norma.

Regenerar (desde `cad/`, requiere el JSON del ensamble ya generado):

```bash
npx esbuild ensambles/planos_fab.mjs --bundle --format=esm --platform=node \
  --alias:three=./vendor/three.module.min.js --outfile=/tmp/planos.mjs
node /tmp/planos.mjs 2025-01-01        # la fecha va al cajetín/despiece
```

El generador (`planos_fab.mjs`) agrupa las piezas idénticas por firma
geométrica (incluidas las espejo izq/der), reutiliza el motor CAD
(`js/model.js`) para construir la malla de cada pieza y el exportador de
planos del navegador (`js/drawing2d.js`, escritores DXF/PDF propios sin
dependencias) para las láminas. Emite además `planos_transfer90/_despiece.json`
(lista de materiales en JSON). Es **diseño, capa `user`** — verificar las
dimensiones nominales con la unidad real antes de mecanizar.

## Transportadores Movex 530 LBP / GT (proyecto projects/LBP530-18)

Cuatro líneas de packing: por línea 1 × **CV-LBP-5000** (Movex 530 LBP 18 in
× 5.0 m, acumulación) y 1 × **CV-GT-800** (530 GT friction top × 0.8 m).
Nosebar en ambas puntas, tracción abajo en la descarga (wrap 135°), ejes
CUADRADOS 1.5 in con muñones torneados Ø30 (motorreductor de eje hueco Ø30
directo). Datos del fabricante citados en `projects/LBP530-18/input/web_facts.json`.

```bash
node cad/ensambles/gen_lbp530.mjs        # → lbp530_5m.json · lbp530_gt08.json · lbp530_dims.json
# planos (bundlear con esbuild como los demás):
#   planos_ejes_lbp530.mjs      → planos_lbp530/planos_ejes_lbp530.pdf (EJ-01/02/03)
#   planos_conjunto_lbp530.mjs  → planos_lbp530/planos_conjunto_lbp530.pdf (GA-01/02)
#   export_lbp530.mjs           → PLY con color (DOC/OUT/FILTRO/CENTRAR) → GLB con trimesh
# prueba: tests/test_lbp530.mjs (invariantes + CSG de los ejes)
```

Los entregables del proyecto (GLB, planos, memoria de cálculo y lista de
compra de material de ejes) viven en `projects/LBP530-18/out/`.

---

## `sonda_suelo.json` — Sonda de humedad de suelo multiprofundidad (grado industrial)

**Prototipo premium** (31 piezas, capa `user`) derivado del informe paramétrico del
usuario (Truebner SMT100 / Fibox ARCA / Lapp Skintop / ISO 3601 / DIN 912): tubo
PVC-U Ø50×3.7 EN 1452 (portante + elevador, L1550), punta cónica 316L 40° con
tórica FKM 36×3, 3× SMT100 en espiga radial (20/40/60 cm, desfasados 120°, pasamuros
POM-C Ø35 con potting PU), acople de cabezal 316L (espiga+brida 4×M4, Skintop MS-M16
gland-down), gabinete Fibox ARCA PC 150/60 HG con nodo de placa única (ESP32 ind. +
RAK3172-T + buck + THVD1450), 2× LiFePO4 26650 + BMS solar, M12 A-cod de servicio,
válvula Gore, collar antipercolación, panel 5 W a 15° y **antena 868/915 exterior**.
**Cabezal elevado 0.9 m sobre NPT** (estado del arte: CropX exige la antena sobre el
canopy; Sentek PLUS y METER ZL6 montan electrónica y panel en poste — citas con URL
en `sonda_suelo_dims.json → webRef`). Desviaciones de ingeniería respecto del
informe documentadas en `meta.desviaciones`.

Regenerar y validar (desde la raíz / desde `cad/`):

```bash
node cad/ensambles/gen_sonda_suelo.mjs          # → sonda_suelo.json + _dims.json
cd cad && npx esbuild tests/test_sonda.mjs --bundle --format=esm --platform=node \
  --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_sonda.mjs && node /tmp/test_sonda.mjs
```

Entregables:

- **HTML autocontenido** `sonda_suelo_premium.html` (se abre con doble clic):
  corte A-A **por CSG real** con caras de corte destacadas, corte libre por plano,
  despiece animado, 12 pasos de ensamble interactivos (resaltan sus piezas), BOM y
  features. Rebuild: `node ensambles/build_sonda_html.mjs` (desde `cad/`).
- **PDF de 9 láminas** `planos_sonda/sonda_suelo_premium.pdf` (marco ISO 5457 +
  cajetín ISO 7200): GA acotado, vistas normalizadas + isométrica sombreada del
  conjunto y del cabezal (malla CSG), corte A-A con globos→BOM, corte B-B del
  cabezal 1:2, detalles de sellado (garganta Parker 5:1, pasamuro 2:1, aprietes),
  instrucciones de ensamble en 12 viñetas y BOM/consumibles/features. Rebuild
  (desde `cad/`): bundlear `ensambles/planos_sonda.mjs` con esbuild (alias three)
  y ejecutar con node.
- El JSON se abre también en el CAD del navegador (`cad/index.html` → 📂 Abrir).

### Variantes de la sonda (escalera de costos A–E)

- **A premium** — `sonda_suelo.json` (34 pzas): 316L torneado + SMT100 (`node gen_sonda_suelo.mjs`).
- **B fittings estándar** — `sonda_suelo_std.json` (33 pzas): terminal PVC cementado,
  brida roscada comercial, nipple galvanizado, collar HDPE, WisBlock — misma
  confiabilidad, −25 % (`node gen_sonda_suelo.mjs estandar`).
- **D campo directo** — `sonda_campo.json` (19 pzas): sensores MTEC-02A enterrados
  directo + poste SCH40 concretado (`node gen_sonda_campo.mjs`); BOM con costos
  por ítem en `meta.bom`.

Visores autocontenidos: `node build_sonda_html.mjs [doc.json] [salida.html]` →
`sonda_suelo_premium.html` / `sonda_suelo_std.html` / `sonda_campo.html`.
Escalera completa con costos y qué cede cada nivel: §5 de
`planos_sonda/sonda_estado_del_arte_seleccion.pdf`. Test de variantes:
`cad/tests/test_sonda_variantes.mjs`.
