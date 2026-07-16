# Ejemplos de proyectos foto3d-cad

Proyectos `.json` listos para abrir en el CAD con **📂 Abrir** o **📋 Pegar**
(pega el contenido y elige "Reemplazar todo el proyecto").

## `transportador_rodillos.json` — transportador de rodillos (4 rodillos)

Generado por instrucciones (ver el mensaje del usuario) con el motor del CAD.
Un banco de 4 rodillos sobre dos canales tipo C con las pestañas hacia afuera.

### Dimensiones (mm salvo indicación) — marco Hytrol 190-E24 (catálogo #589)
| Parámetro | Valor | Origen |
|---|---|---|
| Tubo del rodillo | **OD 1.9″ = 48.26** × 16 ga | manual 190-E24 (tú: SCH40, mismo OD) |
| Largo del rodillo | 21″ − 4 mm = **529.4** | 21″ menos holgura + carrera del resorte |
| Ranuras (O-ring) | centros a **35 y 65 mm** de cada borde, ancho 5 | tú (el 190-E24 usa O-ring **3/16″ = 4.76**) |
| Eje | barra **hexagonal 11 mm** (≈ 7/16″) | tú / manual |
| Pitch entre rodillos | 3″ = **76.2** (patrón ×4) | manual (rodillos cada 3″) |
| Canal | **6-1/2″ = 165.1 alto**, ala **1-1/2″ = 38.1**, **12 ga = 2.66** | **manual 190-E24** |
| BR / OW | **BR 542.1 / OW 623.6** (OW = BR + 3″) | manual (1-1/2″ de ala por lado) |
| Holgura rodillo–marco | **1/4″ = 6.35** por lado | manual |
| Perforación hexagonal en el alma | hex 11 mm, patrón ×4 a pitch 76.2, a la altura del eje | tú |
| **Patrón lateral de 6″** (bracket + travesaños) | Ø 5/16″, z = −40, paso 152.4 — **PROVISIONAL** | falta coordenada exacta del manual |
| **Travesaños** | ángulo **40×40×4** con pestañas en extremos — **PROVISIONAL** | falta patrón de montaje |
| **Motor UniDrive ONE** | cuerpo **Ø4.65″ = 118 × 62.7**, boss Ø1.56″ = 39.5, eje **D Ø0.5″ = 12.69**, pernos **Ø5/16″ = 8** | **ficha UniDrive S-UD23062200R01** |
| **Patrón de pernos del motor** | **6.01″ × 5.50″ = 152.7 × 139.7** (2×2, Ø8) | **ficha UniDrive** (= el "patrón de 6″") |
| **Bracket motor** | costanera (Cee, pestañas hacia adentro), doble fondo (módulo Dayton + tarjeta); lleva el patrón 6.01×5.50 | Cee tú; patrón motor UniDrive; tarjeta/módulo PROVISIONAL |
| **Polea de 2 ranuras** | Ø44, eje ∥ rodillos, en el eje del motor, entre 2 rodillos; **tangente inferior 3 mm sobre la pestaña inferior** (centro z = −119.7) | posición según tu criterio |

**Confirmado del UniDrive ONE** (ficha S-UD23062200R01): cuerpo Ø118 × 62.7,
eje D Ø12.69, pernos Ø8 en patrón **6.01″ × 5.50″** (= tu "patrón de 6″"). Hay
un **STEP oficial** en `unidrive.solutions/s/UniDrive-ONE.STEP` para geometría
exacta si se importa.

**Pendiente de confirmar (no está en el catálogo 190-E24 ni en la ficha UniDrive):**
coordenadas exactas del splice/costado de Hytrol; geometría de la tarjeta
**Sony Logic Plus** (ZoneLogix/ZPA) y del módulo **Dayton**; patrón de montaje
del ángulo 40×40 de los travesaños. Parametrizado: en cuanto lleguen, se ajusta.

### Supuestos y avisos de ingeniería
- **Profundidad de ranura limitada por la pared.** Una ranura de 5 mm de
  profundidad radial atravesaría la pared del tubo (3.68 mm). Se limitó a
  **2.0 mm** (deja 1.68 mm de pared bajo la ranura). Para alojar por completo
  un O-ring de 5 mm habría que usar un tubo de mayor espesor o un anillo de
  arrastre exterior. Ajustable con edición directa del diámetro del tramo.
- **Tapas integradas.** Las tapas de rodamiento se modelan como extremos
  macizos del tubo con barreno hexagonal (representan el rodamiento de eje
  hexagonal). No se modela el rodamiento como pieza aparte.
- **Dimensiones del canal C** no fueron especificadas: se usó un perfil
  estructural típico. Cámbialo por tu canal real.
- Holgura rodillo/alma: 0.5 mm por lado.

## `tapa_rodillo_impresion.json` — tapa de rodillo imprimible (rodamiento de 2 piezas + resorte)

Tapa para imprimir en 3D que hace de rodamiento liso, para el rodillo de arriba
(tubo 1-1/2″ SCH40, eje hexagonal 11 mm ≈ 7/16″). Réplica funcional del tipo
comercial *Mason Plastics MP1540SLR716HSS* (rodamiento hex con resorte, Ø1.900″).

Son **dos piezas** por tapa + un **resorte comprado**:
1. **Alojamiento** (pista exterior): copa que entra **a presión** en el tubo.
   Cuerpo con **conicidad** (Ø boca 41.09 con 0.2 mm de interferencia → Ø fondo
   40.29 de guía, ~1.4° de salida) para que quede apretada; flange Ø48.26 que
   tapa el extremo; bore de pista interno Ø24; agujero de paso del eje Ø14.
2. **Cubo hexagonal** (pista interior): barreno **hexagonal 11 mm** que se fija
   al eje; diámetro exterior Ø23.6 que **gira** dentro del bore del alojamiento
   (0.4 mm de juego); **bolsillo Ø15 × 8** en la cara interior para el **resorte
   de compresión** que precarga el eje (permite montar el rodillo entre las
   canales fijas y que el eje encaje en la perforación hexagonal).

Por rodillo: **2 alojamientos + 2 cubos hexagonales + 2 resortes**.

### Ajustes de tolerancia aplicados al rodillo (por este montaje)
- Largo del rodillo: **21″ − 4 mm** (antes −1) para más holgura en los extremos
  y la carrera del resorte.
- **Avellanado de entrada** Ø+1.2 × 2 mm en cada boca del barreno del tubo, para
  guiar la conicidad de la tapa al presionarla.

### Impresión (recomendado)
- Alojamiento: imprimir con el flange abajo (sin soportes); 3–4 perímetros para
  aguantar la presión. Cubo hex: con la cara del bolsillo hacia arriba.
- Ajusta la **interferencia** según tu impresora (±0.1–0.2 mm) con edición
  directa del diámetro del cuerpo cónico; el juego de la pista (0.4 mm Ø) puede
  requerir un afinado para que gire suave sin holgura.
- El resorte es una pieza **comprada** (muelle de compresión ~Ø13 × largo libre
  a elección); no se imprime.

## `mecanismo_resorte.json` — mecanismo del resorte (shuttle hexagonal)

Detalle de **cómo funciona el resorte**, según el diseño comercial (Interroll
1700 "shuttle hexagonal con resorte", Mason/FEI spring-loaded hex). Tres piezas
coaxiales; ábrelo y activa **▤ Sección** (plano Y, "Invertir lado") para ver el
corte:
1. **Alojamiento** (azul): copa que entra a presión en el tubo; su fondo cerrado
   es el **asiento del resorte**.
2. **Buje hexagonal retráctil / shuttle** (naranja): su punta hexagonal **sale**
   por el agujero del flange para encajar en la perforación hex de la canal; el
   **collar Ø23.6** queda retenido dentro del bore (no puede salir por el agujero
   Ø14 del flange) y hace de pista de giro.
3. **Resorte de compresión** (gris): entre el fondo del alojamiento y el collar;
   **empuja el shuttle hacia afuera**.

**Funcionamiento:** para montar el rodillo entre las dos canales fijas, se
**empuja la punta hex hacia adentro** (comprime el resorte y la punta se
esconde); con el rodillo en posición, la punta **salta** a la perforación
hexagonal de la canal. El hex fija el shuttle al marco (no gira) y el rodillo
gira sobre el collar. Basta un extremo con resorte; el otro puede ser fijo.

Resorte a comprar (muelle de compresión): **Ø ext ≈ 20.4, Ø int ≈ 15.6, alambre
≈ 2.4 mm, ~6 espiras, carrera ~8 mm** (el Ø interior libra el hex de Ø12.7 y el
exterior entra al bore Ø24).

## `chapas_desarrollo.json` — chapas plegadas con su DESARROLLO (cotas generales)

Las tres chapas del transportador modeladas como **chapa plegada real** (alma +
pliegues), para que cada una genere su **desarrollo plano con cotas generales**
(largo × ancho del despliegue, líneas de plegado y BA = θ·(R + K·t)). En la app,
selecciona la pieza y usa **⭳ Desarrollo DXF / ⭳ Desarrollo PDF** (aparecen en
propiedades de cualquier pieza de chapa).

| Chapa | Sólido | Desarrollo (largo × ancho) | Pliegues |
|---|---|---|---|
| **Canal** (alma 6-1/2″ + 2 alas 1-1/2″, 12 ga) | 235 cm³ | **348.6 × 253.3 mm** | 2 (90° R2.66) |
| **Bracket costanera** (alma + 2 alas, e4) | 180 cm³ | **300.7 × 150.0 mm** | 2 |
| **Travesaño ángulo** 40×40 (e4) | 179 cm³ | **500.0 × 89.0 mm** | 1 |

Los PDF/DXF de desarrollo ya generados: `desarrollo_canal.*`,
`desarrollo_bracket_costanera.*`, `desarrollo_travesano_angulo.*`.

**Aviso (honesto):** el desarrollo despliega la chapa y sus pliegues con cotas
envolventes, pero **los barrenos (hex, patrón de 6″, pernos del motor) NO se
reflejan** en el plano de desarrollo (lo indica la nota del cajetín). Desplegar
también los cortes es una mejora pendiente del motor de chapa.

## Regenerar
```bash
cd cad
for g in gen_transportador gen_tapa_rodillo gen_mecanismo_resorte; do
  npx esbuild ejemplos/$g.mjs --bundle --platform=node --format=esm \
    --alias:three=./vendor/three.module.min.js --outfile=/tmp/g.mjs && node /tmp/g.mjs
done
```
Cada script verifica que las piezas construyan (volumen > 0, sin NaN) antes de
escribir el JSON. Se ejecutan desde `cad/` (escriben en `ejemplos/`).
