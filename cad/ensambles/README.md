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

## `integracion_modulo_base.json` — Interfaz módulo ↔ transportador base

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
