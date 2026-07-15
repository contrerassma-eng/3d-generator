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
transportador anfitrión NO se modela (especificación del usuario). 136 piezas,
capa `user`. Ejes: **X = flujo del anfitrión, Y = expulsión a 90°, Z = arriba**,
mm. Estado modelado: **elevado** (carrera aplicada).

### Especificación declarada por el usuario (capa `user`)

| Requisito | Valor en el modelo |
|---|---|
| Solo la transferencia (módulo de desviación) | 40 piezas, sin el transportador anfitrión |
| **6 rodillos** completos, **Ø40 vulcanizado / corazón de tubo Ø30**, desnudos en el extremo de polea | paso 100 → gap tangente **60**; la banda anfitriona de 40 pasa entre líneas y entre los dedos |
| **Transmisión en serpentín** (esquema IMG_3102, NO rodillo a rodillo) | **correa sincrónica T10 × 35 × 4.5** (dientes hacia afuera): rodillos (1ª línea, dorso liso por fricción) → **tensores Ø50 abombados con colisa vertical** → **tambor dentado T10 z28 con SIT-LOCK** → 2 retornos Ø24 en esquinas |
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
  en el sentido de expulsión. El tambor gira en eje Ø25 con chaveta,
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
→ v de correa 60 m/min (relación de radios 20/15); tambor z28 (dp 89.13) a
214 rpm; motorreductor i≈6.3 (~0.18 kW). Tambor fijado con **buje cónico
autocentrante SIT-LOCK CAL 1 25×34** (sin chaveta) y acople de mordaza;
tensores y retornos con **descansos de brida** (buje bronce Ø24) en la placa.

Para la variante de **30°**: girar 60° las líneas de rodillos (placas y
serpentín giran con ellas); elevación y bastidor no cambian.
