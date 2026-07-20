# Módulo desviador Omniwheel (CV-OMW) — ejes perpendiculares con tangente común

Diseño del módulo desviador omnidireccional del `conveyone-simulator`
(`docs/omniwheel.md` de ese repo: CV-OMW, 24"×24", filas de avance +
filas transversales, motores UniDrive 60 W, correa síncrona interior)
resuelto como conjunto paramétrico `foto3d-cad`.

- Generador: `cad/ensambles/gen_omniwheel.mjs` → `cad/ensambles/omni_modulo.json`
- Componentes: `rueda_omni_70_doble` (rueda del usuario) y `rueda_omni_120_doble`
  (rueda mayor derivada), en `componentes/catalogo.json`
- Ensamble en biblioteca: `ens_omni_modulo` (se abre con 🔌 Comp. en el CAD)

## La rueda base (capa `user`, del snapshot del usuario)

Origen: `omniwheel10.snapshot.1.zip` (Autodesk Inventor: `Omni-Wheel.iam`,
`Base Wheel.iam`, `Roller assembly.iam` + piezas). Los `.ipt/.iam` son binarios;
del **caché gráfico OGS** de los `.iam` se midieron dos cotas exactas
(platos **Ø55.0**, rodillo barril **Ø20.0**) y el resto se derivó
geométricamente. Todo queda declarado `confianza: verificar` — medir con
calibre antes de fabricar.

| Cota | Valor | Procedencia |
|---|---|---|
| Platos/arañas | Ø55 × 3 | medido (caché OGS, exacto) |
| Rodillo (barril) | Ø20 máx × 18 | medido Ø / largo derivado |
| Radio de centros de rodillos | rc = 25 | derivado: rc = R − r_rodillo |
| **Rodadura** | **Ø70** (R35 = 25 + 10) | derivado |
| Rodillos por corona | 8 × 2 coronas, desfase 22.5° (refinado s/ referencias web) | Nexus 14073 |
| Ancho total | 38 (refinado; ancho/Ø = 0.54) | referencias web |
| Pasador de rodillo | Ø3 + rodamiento 719/3-2Z, remaches 3×6 | archivos del snapshot |
| Bore | Ø15 (adaptado al módulo; el original es hobby) | diseño |

Los rodillos reales son **abombados** (perfil torneado al radio de rodadura
para envolvente continua Ø70); en el catálogo se modelan como cilindros.

## La rueda mayor derivada (el truco del diseño)

Pedido: *crear otra rueda de mayor diámetro para tener ejes perpendiculares
con la misma tangente de transporte, sin interferencia de centros ni ejes.*

Si todas las ruedas tocan el plano de transporte `Z = TANG`, el centro de una
rueda de radio `R` queda en `z = TANG − R`. Usando **diámetros distintos por
familia**, los ejes quedan a **alturas distintas** y pueden cruzarse en planta:

```
ΔZ = R₂ − R₁  ≥  r_ejeA + r_ejeB + luz_mín
R₂ ≥ 35 + 7.5 + 7.5 + 5 = 55   →  se adopta R₂ = 60 (Ø120)
luz real en el cruce = 25 − 7.5 − 7.5 = 10 mm
```

| Cota | rueda_omni_120_doble |
|---|---|
| Rodadura | Ø120 (R60), centro 25 mm más bajo que la Ø70 |
| Rodillos | 2 coronas × 12, Ø18 máx × 22, desfase 15°, rc = 51 |
| Placas | Ø94 de aluminio, festoneadas en el ensamble |
| Ancho | 46 · bore Ø15, chaveta 5×5 (misma que la Ø70) |

## Referencias web del diseño (consultadas 2026-07-20)

El proporcionado de las ruedas se refinó contra omniwheels comerciales:

- **Nexus 14073** — Ø127 doble de aluminio: *"22 rollers Ø19 de goma con
  rodamiento, 2 placas de aluminio, ancho 29 mm, 480 g, 30 kg"* →
  [nexusrobot.com](http://www.nexusrobot.com/product/5inch127mm-double-aluminum-omni-wheel-wbearing-rollers-14073.html).
  Regla adoptada: **muchos rodillos delgados** (11/corona en Ø127) y **rueda
  angosta** (ancho ≈ 0.23·Ø).
- **Rotacaster** — cuerpo araña inyectado con ejes de rodillo integrados,
  rodillos de PU sobremoldeados, dobles/triples soldadas sónicamente →
  [rotacaster.com.au](https://www.rotacaster.com.au/),
  [materialshandling.com.au](https://www.materialshandling.com.au/products/rotacaster-omnidirectional-wheels/).
  Regla adoptada: **placas festoneadas** (el rodillo asoma por la escotadura),
  no discos llenos.

Aplicado: Ø70 pasa de 2×6 rodillos Ø20 (ancho 50) a **2×8 rodillos Ø14
(ancho 38)**; Ø120 de 2×8 Ø26 (ancho 62) a **2×12 Ø18 (ancho 46)**; placas
exteriores de **aluminio festoneadas** con pernos pasantes entre rodillos
(boceto extruido con escotaduras de arco) y agujero central. Las cotas del
snapshot que eran medidas (platos Ø55, rodadura Ø70) se conservan.

## El módulo (24"×24", tangente Z=170)

- **Ejes A — AVANCE**: 4 ejes Ø15 **transversales** (Y) en X = ±76.2, ±228.6,
  z = 135, con 4 ruedas **Ø70** cada uno (Y = ±76.2, ±228.6) → 16 contactos 4×4.
- **Ejes B — EYECCIÓN**: 3 ejes Ø15 **longitudinales** (X) en Y = 0, ±152.4,
  z = 110, con 3 ruedas **Ø120** cada uno (X = 0, ±152.4) → 9 contactos 3×3.
- Retícula de contactos a **tresbolillo paso 6"** (contacto más próximo 107.8):
  cualquier caja ≥ 300×200 apoya siempre en ≥ 4 ruedas, todas a la misma tangente.
- Fotocélula a 0.82·L para el modo `stop` (90°).

## Transmisión (motor de biblioteca + polea ad-hoc + bracket estilo ZP2026)

Un accionamiento por eje (7 en total, + 1 motor adicional de BOM):

- **Motor**: `cv_ZP2026__300986_std_unidrive_motor_d_shaft` — el UniDrive con
  eje D **de la biblioteca** (malla real extraída de `ZP2026.glb`). Perfil
  medido del GLB por rebanadas: es un motorreductor **pancake** (cuerpo plano
  152.7×118.1×37) con **eje D Ø12×60** saliendo perpendicular a la cara y boza
  Ø36. Los 7 cuelgan **bajo la bandeja en posición pancake vertical** (eje D
  horizontal según su eje conducido) con el eje a Z = −47.5; el eje D real del
  motor llega hasta la polea, sin eje intermedio.
- **Polea síncrona ad-hoc**: `polea_sincrona_htd5m_28t` — HTD 5M 28T
  (Øp 44.563, corona 18 para correa de 15, pestañas Ø52, cubo Ø30×12), una en
  el eje (bore Ø15 + chaveta 5×5) y otra en el eje D del motor, **relación 1:1**.
  Ancho total 33: dimensionada para caber en las **ventanas libres de 37.7 mm**
  que dejan ruedas y ejes perpendiculares.
- **Bracket**: `bracket_motor_unidrive_omni` — mordaza colgante de chapa 4 mm,
  **similar al soporte del motor del ZP2026**: ala superior 56×140 apernada
  bajo la bandeja con 4 colisas Ø9×20 (tensado ±10) y 2 mejillas que toman el
  cuerpo pancake por sus caras (interior 45 = 37 + calzas) con los pernos
  frontales del motor; fleje inferior de seguridad.
- **Correas**: la distancia entre centros la fija la geometría
  (C = z_eje − z_motor con z_motor = −47.5, elegido justamente para esto) y da
  **dientes enteros exactos**: ejes A: C = 182.5 → **HTD 5M-505-15 (101T)** ·
  ejes B: C = 157.5 → **HTD 5M-455-15 (91T)**. Cada correa pasa por una
  **ranura de 56×19 en la bandeja** (cortes en el modelo).
- Estaciones elegidas para no chocar con nada: ejes A en Y = ±38; ejes B
  laterales en X = ±44; el eje B central usa la **ventana exterior** X = 260
  (entre el último eje A y la placa). Los cuerpos de motor se reparten en
  planta sin solaparse (luz mínima 12.4, verificada).

El perfil del motor (eje D Ø12×60 en z-local 0..60, boza Ø36 en 60..79,
cuerpo 82..119) está **medido del caché del GLB** por rebanadas; verificar
igualmente contra la pieza física — las colisas del bracket absorben
diferencias.

### Verificaciones (gates del generador — abortan si fallan)

`gen_omniwheel.mjs` calcula y exige `luz ≥ 5 mm` en todo par crítico:

| Verificación | Valor |
|---|---|
| Tangente común | zA+R1 = zB+R2 = 170 |
| Luz vertical entre ejes cruzados (12 cruces) | **10.0** |
| Eje A ↔ disco rueda Ø120 (axial X) | 37.7 |
| Eje B ↔ cara rueda Ø70 (axial Y) | 43.7 |
| Rueda Ø70 ↔ rueda Ø120 en planta (X) | 10.2 |
| Rueda Ø120 ↔ rueda Ø120 vecina | 32.4 |
| Rueda Ø120 ↔ bandeja de fondo | 10.0 |
| Correas con dientes enteros (1:1) | 101T / 91T exactos |
| Ventanas de polea (33 de ancho, mín 2) | 2.7 (A) · 2.2 (B lat.) · 13.4 (B centro) |
| Disco polea A ↔ rueda Ø120 | 19.2 |
| Motor ↔ bandeja / entre motores en planta | 6.2 / 12.4 |
| Tapa ↔ polea A / ↔ tangente | 2.0 / 2.0 |

## Nivel de detalle del 3D

- **Ruedas**: en el ensamble van **torneadas por revolución de boceto**
  (features `revolve` del CAD): rodillos = revolución del **arco exacto de la
  envolvente** (`r(t)=√(R²−t²)−rc`, barril continuo, rodadura perfectamente
  circular), cubo y platos con **chaflanes torneados**, pasadores Ø5. En el
  catálogo la versión primitiva (3 escalones) se mantiene para GLB/STL
  (trimesh no revoluciona).
- **Tapa portante** negra 609.6×609.6×5 sobre las placas (top 2 bajo la
  tangente): 25 aberturas con holgura 4 por donde **solo asoman las coronas**,
  como el CV-OMW del simulador.
- **Ejes**: calibrados Ø15 h6 con chaveta 5×5 (nota), **chumaceras de brida**
  (placa + boza Ø35) en las placas perimetrales con **pasadas Ø16**, y
  **separadores tubulares Ø22** que fijan la posición axial de ruedas y polea.
- **Motor**: malla real del GLB. El visor (`ver.html`) renderiza con tone
  mapping ACES, sombras suaves y materiales metal/pintura según color.
  Simplificaciones restantes: poleas sin dentado (cilindro liso), correa como
  lazo prismático, sin tornillería.

## Cómo regenerar / ver

```bash
node cad/ensambles/gen_omniwheel.mjs                      # ensamble + gates
python pipeline/componentes_cli.py generar rueda_omni_70_doble   # GLB/STL
python pipeline/componentes_cli.py generar rueda_omni_120_doble
cd cad && python -m http.server 8080                      # 📂 Abrir omni_modulo.json
```
