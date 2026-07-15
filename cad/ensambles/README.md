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
transportador anfitrión NO se modela (especificación del usuario). 138 piezas,
capa `user`. Ejes: **X = flujo del anfitrión, Y = expulsión a 90°, Z = arriba**,
mm. Estado modelado: **elevado** (carrera aplicada).

### Especificación declarada por el usuario (capa `user`)

| Requisito | Valor en el modelo |
|---|---|
| Solo la transferencia (módulo de desviación) | 40 piezas, sin el transportador anfitrión |
| **6 rodillos** completos, **Ø40 vulcanizado / corazón de tubo Ø30**, desnudos en el extremo de polea | paso 100 → gap tangente **60**; la banda anfitriona de 40 pasa entre líneas y entre los dedos |
| **Transmisión en serpentín** (esquema IMG_3102, NO rodillo a rodillo) | **banda plana 35 × 3 (nitrilo/poliéster)**: rodillos (1ª línea, por fricción) → **tensores Ø50 abombados con colisa vertical** → **tambor motriz Ø90 abombado (llanta + tapas + cubo) con SIT-LOCK** → 2 retornos Ø24 en esquinas |
| **Todo por dentro** | motor embridado a la cara interior de la placa −X, coaxial al tambor; cilindros y palancas entre las placas |
| **Solo 2 cilindros**, **en diagonal con pivote**, subida **vertical de 6 mm** | ISO 6432 Ø25 inclinados 36.7°, basculantes en horquilla; empujan una **palanca con rodillo de leva** que sube el puente en vertical (carrera de cilindro 10.3 → 6 vertical) |
| Estructura fija **no más ancha que la cara que sostiene las poleas** | canal fijo de **306 mm** = ancho exterior de las placas |
| **Identificar módulo móvil vs fijo** (canal lateral de la cinta) | piezas `FIJO ·` (canal + mecanismo de elevación, gris) y `MÓVIL ·` (placas, rodillos, transmisión y motor, azul); pasadores guía Ø8 del móvil corren en colisas verticales del canal |
| Placas con **extensiones delgadas hacia los rodillos** | cuerpo porta-poleas bajo (top 136) + 6 **dedos de 28 mm** con punta redonda hasta el eje de cada rodillo; entre dedos pasan a lo largo las bandas del anfitrión |

### Arquitectura (memoria de diseño)

- **Rodillos**: eje elevado a z = 154 → tangente 174 = plano anfitrión (170) + 4;
  retraído −2. Ejes Ø12 h9 × 330 en agujeros Ø12.2, E-clips DIN 6799.
- **Serpentín** (orden de marcha): retorno izq (−280, 36) → R1 → tensor Ø50
  (−200, 118) → R2 → tensor (−100, 118) → R3 → **tambor M** (0, 78, Ø90,
  envoltura ≈ 200°) → R4 → tensor (100, 118) → R5 → tensor (200, 118) → R6 →
  retorno der (280, 36) → ramal inferior recto. Plano x = 119 (centro del
  tramo desnudo); el lomo queda embutido 2 mm bajo el vulcanizado y avanza
  en el sentido de expulsión. El tambor gira en eje Ø25 fijado con SIT-LOCK,
  apoyado en la placa +X y en la brida del motor (placa −X); acople rígido
  Ø35. Toda la transmisión y el motor son MÓVILES: la tensión no cambia.
- **Elevación (mecánica de palanca)**: por extremo, un cilindro diagonal
  basculante en horquilla de la base empuja el ojo de una palanca pivotada
  (pivote fijo a −118, entrada a +85, leva Ø24 en 0): relación 118/203 →
  con 10.3 mm de carrera del cilindro el rodillo de leva sube el puente
  exactamente 6 mm en vertical. Los puentes 306×20×12 atraviesan ambas
  placas por ranuras láser; los pasadores guía Ø8 en colisas del canal
  mantienen el movimiento vertical.
- **Canal fijo**: base 306×700×6 con 2 alas bajas (top 40) que quedan por
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

## Planos de fabricación (PDF)

`planos_transfer90/planos_fabricacion_transfer90.pdf` — juego de taller
completo, **25 páginas en un solo PDF**:

- **Portada** con el resumen del ensamble (piezas, ítems, normas, tolerancia
  general ISO 2768-mK, unidades).
- **Despiece / lista de materiales** (2 páginas): las **47 posiciones
  distintas** de las 138 piezas, con cantidad, tipo (FABRICADA /
  NORMALIZADA / CONJUNTO), material o norma, y número de plano.
- **22 planos de pieza fabricada** (TR-01 … TR-22): vistas del primer diedro
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
