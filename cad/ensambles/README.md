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
transportador anfitrión NO se modela (especificación del usuario). 25 piezas,
capa `user`. Ejes: **X = flujo del anfitrión, Y = expulsión a 90°, Z = arriba**,
mm. Estado modelado: **elevado** (carrera aplicada).

### Especificación declarada por el usuario (capa `user`)

| Requisito | Valor en el modelo |
|---|---|
| Solo la transferencia (módulo de desviación) | 25 piezas, sin poleas de carril ni deslizaderas del anfitrión |
| 2 cilindros estándar actuando **en diagonal** | ISO 6432 Ø25 en (−105,−130) y (+105,+130); pines guía Ø16 en la diagonal contraria |
| Subiendo **solo 6 mm** | carrera 6: elevado = plano anfitrión **+4**, retraído = **−2** |
| Rodillos **completos y vulcanizados menos en un extremo** | una pieza por línea: núcleo Ø44×290 + vulcanizado Ø50 hasta x=93; extremo desnudo 93..145 |
| Ahí **sube el sistema de bandas**: los rodillos son las **poleas de la primera línea** | bandas de transmisión 15×3 que envuelven los núcleos desnudos: R1↔R2 (x=106), R2↔R3 (x=134) y motriz motor→R1 (x=134) |
| Rodillos Ø50 con ≥ 50 mm entre tangentes, emergen entre bandas de 40 | paso 100 − Ø50 = **50 mm** de gap; la banda anfitriona de 40 pasa con 5 mm por lado |
| Placa lateral portarodillos con la forma de la foto | peine: 3 lóbulos R16 sobre los ejes, valles, chaflanes y pies-pestaña |

### Arquitectura (memoria de diseño)

- **Rodillos**: 3 líneas en y = 0, ±100 con eje elevado a z = 149 → tangente
  174 = plano anfitrión (170) + 4. Sobre el núcleo desnudo Ø44, una banda de
  3 mm queda **al ras del vulcanizado Ø50** (22 + 3 = 25): el producto no
  siente el escalón y la banda ayuda a expulsar. Ejes Ø12 h9 × 330 en
  agujeros Ø12.2 (ajuste deslizante), retenidos con E-clip DIN 6799.
- **Transmisión** (rodillo = polea de primera línea): el motorreductor cuelga
  de una ménsula bajo el larguero del marco elevador (la tensión de las
  bandas no cambia con la carrera); banda motriz a R1 y bandas escalonadas
  R1↔R2 y R2↔R3 — los 3 rodillos giran en el mismo sentido a la misma
  velocidad.
- **Elevación**: 2 cilindros neumáticos estándar en **esquinas diagonales**
  (carga centrada estáticamente) + 2 pines guía rectificados Ø16 en
  casquillos Ø16.2 en la diagonal contraria (rigidez a vuelco). Vástagos M8
  al larguero.
- **Marco elevador**: 2 largueros 340×40×12 con ranuras láser donde encajan
  los pies-pestaña de las 2 placas peine (autoposicionante).
- **Bastidor fijo**: placa base 480×400×6 con ranuras de encaje, 2 placas
  laterales con el contorno de la foto (chaflanes, ventanas 100×30 R10,
  pestañas) **bajas (top 140)** para no invadir la expulsión sobre el plano
  170, y 2 travesaños 40×40×2 atornillados (2×Ø9 por extremo).

### Reglas de diseño aplicadas

- Holguras del método: M4→Ø4.5, M5→Ø5.5, M6→Ø6.6, M8→Ø9, M10→Ø11; ejes
  deslizantes Ønominal+0.2.
- Patrones de taladrado idénticos entre piezas atornilladas (brida neumática
  ↔ base, pin guía ↔ base, ménsula ↔ larguero, travesaños ↔ laterales);
  verificados por `test_transfer90.mjs`.
- `gen_transfer90.mjs` **se niega a emitir** si el diseño viola la
  especificación (gap < 50, carrera/elevación fuera de rango, bandas fuera
  del tramo desnudo o montadas sobre el vulcanizado, cilindros no diagonales,
  banda que no queda al ras del Ø50).

Los rodillos completos, ruedas, poleas y ejes están en la **biblioteca de
componentes** (`componentes/catalogo.json`, categoría `mecanico`) e
insertables desde el botón 🔌 Comp. de la interfaz web.

Para la variante de **30°**: girar 60° las líneas de rodillos (peines y
largueros giran con ellas); elevación y bastidor no cambian.
