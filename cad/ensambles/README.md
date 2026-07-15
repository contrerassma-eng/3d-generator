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
transportador anfitrión NO se modela (especificación del usuario). 37 piezas,
capa `user`. Ejes: **X = flujo del anfitrión, Y = expulsión a 90°, Z = arriba**,
mm. Estado modelado: **elevado** (carrera aplicada).

### Especificación declarada por el usuario (capa `user`)

| Requisito | Valor en el modelo |
|---|---|
| Solo la transferencia (módulo de desviación) | 37 piezas, sin el transportador anfitrión |
| **6 rodillos** (misma cantidad que la unidad de 90° de la foto) | líneas en y = ±50, ±150, ±250 |
| Rodillos **completos y vulcanizados menos en un extremo** | una pieza por línea: núcleo Ø44×290 + vulcanizado Ø50 hasta x=93; tramo de polea desnudo 93..145 |
| **Transmisión desde abajo con poleas de retorno** (esquema IMG_3102 — NO rodillo a rodillo) | **una sola banda 25×3 en serpentín**: sobre el tramo desnudo de cada rodillo → tensor Ø24 entre cada par → tambor motriz M Ø90 al centro abajo → cierre inferior con 2 poleas de retorno Ø24 en las esquinas |
| Los rodillos son las **poleas de la primera línea** | la banda envuelve directamente los núcleos desnudos; su lomo queda **al ras del Ø50** (22+3=25) |
| 2 cilindros estándar actuando **en diagonal**, subiendo **solo 6 mm** | ISO 6432 Ø25 en (−180,−295) y (+180,+295), carrera 6: elevado = plano anfitrión **+4**, retraído = **−2**; pines guía Ø16 en la diagonal contraria |
| Rodillos Ø50 con ≥ 50 mm entre tangentes, emergen entre bandas de 40 | paso 100 − Ø50 = **50 mm** de gap; la banda anfitriona de 40 pasa con 5 mm por lado |
| Placa lateral portarodillos con la forma de la foto | peine de 6 lóbulos R16 + faldón profundo que porta toda la transmisión (como la placa frontal de la foto) |

### Arquitectura (memoria de diseño)

- **Rodillos**: 6 líneas con eje elevado a z = 149 → tangente 174 = plano
  anfitrión (170) + 4. Ejes Ø12 h9 × 330 en agujeros Ø12.2 (ajuste
  deslizante), retenidos con E-clip DIN 6799.
- **Serpentín** (recorrido, en orden de marcha): retorno izq (−280, 36) →
  R1 → tensor (−200, 118) → R2 → tensor (−100, 118) → R3 → **tambor M**
  (0, 78, Ø90, envoltura ≈ 200°) → R4 → tensor (100, 118) → R5 → tensor
  (200, 118) → R6 → retorno der (280, 36) → ramal inferior recto. La banda
  pasa por el plano x = 119 (centro del tramo desnudo); sobre cada rodillo
  el lomo va al ras del vulcanizado y avanza en el sentido de expulsión.
  El eje del tambor Ø25 apoya en **ambas** placas y sale por +X al
  motorreductor (acople rígido Ø35). Tensores y retornos giran locos sobre
  ejes Ø12 cantiléver empotrados en la placa de transmisión. Toda la
  transmisión va sobre el marco elevador: la tensión no cambia con la carrera.
- **Elevación**: 2 cilindros neumáticos estándar en **esquinas diagonales**
  + 2 pines guía rectificados Ø16 en casquillos Ø16.2 en la diagonal
  contraria (rigidez a vuelco). Vástagos M8 a 2 puentes 380×20×12 que
  atraviesan ambas placas por ranuras láser (pestaña-ranura).
- **Bastidor fijo**: placa base 480×700×6 con ranuras de encaje, 2 placas
  laterales con el contorno de la foto (chaflanes, ventanas 100×30 R10,
  pestañas) **bajas (top 140)** para no invadir la expulsión sobre el plano
  170, y 2 travesaños 40×40×2 atornillados (2×Ø9 por extremo).

### Reglas de diseño aplicadas

- Holguras del método: M4→Ø4.5, M5→Ø5.5, M6→Ø6.6, M8→Ø9, M10→Ø11; ejes
  deslizantes Ønominal+0.2.
- Patrones de taladrado idénticos entre piezas atornilladas (brida neumática
  ↔ base, pin guía ↔ base, ménsula ↔ placa de transmisión, travesaños ↔
  laterales); verificados por `test_transfer90.mjs`.
- `gen_transfer90.mjs` **se niega a emitir** si el diseño viola la
  especificación: gap < 50, carrera/elevación fuera de rango, serpentín
  fuera del tramo desnudo, tangentes imposibles entre poleas, banda que
  sobresale del plano de rodillos, raspa la base o toca los puentes,
  cilindros no diagonales.

Los rodillos completos, poleas de retorno/tensoras, tambor motriz, ruedas y
ejes están en la **biblioteca de componentes** (`componentes/catalogo.json`,
categoría `mecanico`) e insertables desde el botón 🔌 Comp. de la interfaz web.

Para la variante de **30°**: girar 60° las líneas de rodillos (placas y
serpentín giran con ellas); elevación y bastidor no cambian.
