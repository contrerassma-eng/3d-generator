# ESTÉTICA de la chapa del SORTER CO — iteración 1 (tensor), 06-08-2026

Instrucción literal del cliente:

> «Respecto q cada elemento de chapa especialmente tensor y estructuras
> visibles dale una iteración estética con diseñador industrial sin afectar
> elementos funcionales ni esteucturales para mal estructural para bien de
> hecho»

O sea: iteración **estética** de las chapas visibles — especialmente el
**tensor** — que (1) no toque nada funcional, (2) no empeore nada estructural
y (3) donde pueda, **mejore** lo estructural. Esta página registra el lenguaje
aprobado, lo aplicado (con cotas antes→después), lo rechazado con su porqué y
lo que queda para después. Todo dato nuevo es **capa `dis`** y vive en
`adapt/params_tensor2.mjs` → `export const ESTETICA`, con justificación valor
a valor; `adapt/mod_tensor2.mjs` lo consume. Nada de lo funcional se movió:
**ningún taladro, bulón, cara de apoyo, encaje, cordón, espesor ni material**,
y GEO/PALANCA/PIV/POL/NEUM ni una décima (SC-02/SC-03 abiertos con dueño en
ese archivo).

---

## 1. El lenguaje (aprobado)

**Principio rector.** La pieza dibuja su propio diagrama de esfuerzos: gorda
donde el momento manda (cubo), fina donde no (puntas), toda articulación
señalada con un **ojo concéntrico a su pasador**, y todas las transiciones
**tangentes**. Es el lenguaje de un balancín industrial de catálogo, no el de
un recorte de retal — que es exactamente lo que antes enseñaba
`vistas/sco_corte_calle3.png`.

**Familia de radios** (`ESTETICA` en `params_tensor2.mjs`):

| Regla | Valor | Dónde |
|---|---|---|
| Ojo a radio pleno: toda terminación con pasador o paso acaba en arco concéntrico | cubo **R48** sobre paso Ø50 (nuevo) · polea R30/Ø20 y lóbulo R20/Ø10 (existentes, se conservan) · nariz de lengüeta **R10** sobre bulón Ø8 (nuevo) | brazo, ménsula |
| Anillos mínimos | ojal de bulón ≥ **0.75·d₀** (referencia: la propia C85C25 del cliente); paso soldado ≥ **e+1** — el cubo lleva 23 ≥ 9: repisa real para el cordón y eco del Ø48 de la brida del casquillo | brazo, ménsula |
| Esquina exterior libre | **R12** = 1.5·e (`ESTETICA.esquina`) | placas de extremo, pletina del aire |
| Esquina con huella/cordón/apoyo a <12 del vértice | **R8** = e (`ESTETICA.esquinaMenor`) — suelo único, nunca < e | base de ménsula, esquina −Y baja de la pletina |
| Re-entrante EN camino de carga | R ≥ **7.5·e** → garganta del brazo **R60** (Kt ≈ 1.06) | brazo |
| Re-entrante fuera de camino de carga | R ≥ 3·e = 24 (mínimo de familia para futuros) | — |
| Esquina viva re-entrante | **PROHIBIDA** (la unión ingenua de dos cápsulas la produce) | — |
| Aristas | matado **R2 / 1×45°** en todo canto de corte accesible — nota de taller, no se modela | todas |

**Proporciones.** Flancos = tangentes comunes **rectas** entre los radios
funcionales (taper lineal = momento lineal), calculadas en código con
`t = atan2(Δz,Δy) ± acos((r1−r2)/d)`, nunca números pegados. Los márgenes
taladro-canto existentes **jamás** se reducen (patrón de familia: 13 sobre Ø9
≈ 1.44·d₀). Se añade material sólo donde mata un concentrador (anillo del
cubo) y se quita sólo donde no hay camino de carga (alma del triángulo, punta
del faldón).

**Arcos.** n = 72 puntos por círculo en las siluetas vistas
(`ESTETICA.nArcos`; antes 36 → facetas de 10° visibles en render) y paso ≤ 5°
en gargantas y acuerdos. El DXF del láser no cambia de coste.

**Color por función** (paleta `COL` que `nbt90/lib.mjs` ya trae — capa dis,
cero geometría, cero dato nuevo): chapa estructural **fija** → `COL.fijo`
(travesaño ya lo era; placas, ménsulas y pletina pasan de `COL.chapa`); lo que
**se mueve** → `COL.movil` (las 10 pletinas del brazo); lo rodante conserva
`COL.polea`. Los **nombres emitidos no cambian jamás**: TEN2, la comprobación
del soporte del AR20 y §F3 identifican por nombre (aviso en
`mod_tensor2.mjs` §B-bis). Pintura/RAL/granallado real: dato del cliente
**pendiente**, no se emite (ver §4).

**Grabado.** Identificación grabada en la misma pasada del láser, como
metadata de pieza (+ capa GRABADO de S6 cuando exista; no bloquea):
`TEN-BR · A36 e8` / `TEN-PLX` / `TEN-MEN`, texto single-stroke h = 8; piezas
idénticas **no** se numeran por calle. Los textos funcionales de presión se
**generan del parámetro** (`NEUM.presionTrabajoBar`) y sólo se cortan con
SC-02/SC-03 cerrados.

---

## 2. Lo aplicado (cotas antes → después)

### 2.1 `params_tensor2.mjs` — bloque `ESTETICA` (prerrequisito)
`export const ESTETICA = { ojoCubo: 48, gargantaR: 60, esquina: 12,
esquinaMenor: 8, narizLengueta: 10, nArcos: 72 }`, cada valor con su
justificación. Corregido además el comentario obsoleto de `PALANCA.rYugo`
(decía 186.79, de cuando `lobuloZ` era −292.5; con −312.5 la cuenta da
**201.00** — el código siempre calculó bien). Verificado: con el bloque aún
sin consumir, `gen_sorter_co.mjs` emitió **byte-idéntico**.

### 2.2 FIJO · Brazo tensor e=8 (±X) — 10 uds — **MEJORA estructural**
- **Antes**: hull convexo de 3 discos (R25/R30/R20, n=36 → facetas de 10°),
  con el contorno del cubo en R25 = radio del propio paso Ø50 → **ligamento
  CERO**: filo de chapa coincidente con el corte del agujero, sobre el cordón
  al cubo (el único concentrador real), y alma triangular entre las puntas.
- **Después**: silueta de **balancín con ojo** — cubo redondo **R48**
  concéntrico al paso Ø50 (anillo continuo de 23), flancos rectos tangentes
  48→30 (β = 85.31°) y 48→20 (β = 81.99°), y **garganta cóncava R60**
  (= 7.5·e, Kt ≈ 1.06) tangente a ambos flancos en lugar del alma. Barrido
  del cubo 130.4° pasando por 90°; garganta con centro (−61.34, −337.39) y
  barrido 105°; distancias verificadas sobre el emitido: 92 al borde del Ø50,
  69 al ojo del cubo, 54/42 a los anillos de polea/lóbulo — nada se toca.
- **Sin cambio**: ojos R30/Ø20 y R20/Ø10, los 3 taladros, las 3 poses, las
  palancas 74/136.22 y el espesor 8.
- **Estructural**: el camino de carga es la flexión de cada rama hacia el cubo
  (C3: M = 56.8 N·m, σ = 8.52 MPa con canto 50, «sobrado en cualquier
  hipótesis de silueta»); junto al cubo el canto SUBE de 50 a 96 con W del par
  de pletinas 21 104 mm³ → σ = 2.7 MPa, y desaparece el ligamento cero; el
  alma retirada unía las puntas donde M→0. Masa por pletina 2.22 → 1.96 kg
  (−11.6 %, medido en el emitido; ×10 = −2.6 kg). El número registrado de
  SC-02 y su dispensa **no se mueven** (§S los recalcula por su cuenta y
  ninguna de sus 12 comprobaciones lee estos contornos — verificado: log de
  compuerta byte-idéntico).
- **Riesgo**: el ojo crece +23 radiales en YZ pero vive en la banda X
  B±21…±29, verificada vacía (camisa ±13.3, bisagra ±20, collar X 80.06–95.06,
  chumaceras X ≥468.4); Ø96 invariante al giro del brazo. Solapes AABB del
  brazo: **cero parejas nuevas** respecto del emitido anterior.
- Color `COL.chapa` → `COL.movil`. Grabado `TEN-BR · A36 e8` (las 10
  idénticas, sin numerar). Matado de aristas R2/1×45° en nota de pieza.

### 2.3 FIJO · Travesaño frontal 40×40×3 (L=423.92) — **SIN cambio de contorno (decisión declarada)**
Perfil comercial cuya cara frontal entera es interfaz (10 Ø9 de las 5
ménsulas) y cuyas testas tapan las placas de extremo; contornearlo pediría
láser de tubo (operación nueva, prohibida). Nota añadida: costura del tubo
orientada a +Y (cara oculta contra la máquina); aristas de sierra de ambos
extremos matadas. Neutro por identidad: sección simétrica, I y W idénticos.

### 2.4 FIJO · Placa de extremo del travesaño (±X) 8×90×65 — 2 uds — **neutro**
- **Antes**: rectángulo 90×65 de esquinas vivas. **Después**: esquinas **R12**
  en los 4 vértices (rectR de lib.mjs, cotas derivadas de yc/TR.z); misma
  envolvente (Y 33…123 × Z −125…−60, verificada idéntica en el emitido),
  mismos 2 Ø9 (Y 46/110, cota publicada por `params_pg40.ALARGUE`).
- **Estructural**: camino perno (vértice más próximo a 28.2 del Ø9) → placa →
  cordón al tubo (vértice más próximo a 25.5); los arcos arrancan a 12 del
  vértice → los 13 de distancia al canto se conservan; la corona Z −60 no
  sube y el radio sólo ALEJA material de las tuercas M12 del UCF 207.
- Color → `COL.fijo`; grabado `TEN-PLX` en la cara libre. El nombre conserva
  «8×90×65».

### 2.5 FIJO · Ménsula de bisagra — lengüeta e=8 — 5 uds — **mejora + hallazgo colateral cerrado**
- **Lengüeta**: alto 23 → **20 CENTRADO en el bulón** (Z −85…−62 → **−82…−62**,
  bulón en −72) y nariz recta en Y26 → **radio pleno R10 concéntrico** al Ø8
  (punta a Y 24.5). Ligamento alrededor del ojo: 4.5 (esquinas vivas) →
  **6.0 uniformes = 0.75·d₀** (la práctica de la propia C85C25 en el mismo
  bulón). σ al empotramiento (8×20, F = 140.19 N) = 6.18 MPa, FS > 40: neutro.
- **HALLAZGO COLATERAL** (verificado en los boxes emitidos, ahora cerrado): la
  lengüeta de 23 bajaba a Z −85 contra el fondo de la luz de la C85C25 en −84
  → **solape de 1 mm no declarado**. Centrada queda con 2 mm de aire por cara
  dentro de la luz (−84…−60); techo en −62 → holgura 4.8 al tambor motriz
  intacta; nariz en Y 24.5 contra fondo de luz en 12.5 → 12 libres.
- **Base 40×35**: esquinas **R8** en los 4 vértices; arcos a ≥10.6 del centro
  de los Ø9 (cantos rectos adyacentes conservados); apriete pierde 55 mm² de
  1400 (−3.9 %) en puntas donde la presión es nula. Cara de apoyo y = 58
  **exacta** (verificada con bboxPieza: `sketchXZ` extruye hacia **−Y** — su
  docstring dice «+Y» y es falso, mismo vicio que tuvo `sketchYZ`; por eso
  yFace = 68).
- Color → `COL.fijo`; grabado `TEN-MEN` en la cara −Y.

### 2.6 FIJO · Pletina soporte del AR20 y del grupo de aire 8×90×320 — **mejora**
- **Antes**: rectángulo pleno 90×320. **Después**: **faldón con taper
  siguiendo el momento** — ancho 90 completo de Z −60 a −160 (las dos filas de
  amarres con su margen de siempre), flanco −Y recto en Y15 toda la altura
  (columna del grupo de aire), flanco +Y recto de (105,−160) a (65,−380);
  esquinas R12 en (15,−60), (105,−60), codo (105,−160) y (65,−380); **R8 sólo
  en (15,−380)**. Los 4 Ø9 idénticos (15 al canto, sin cambio).
- **Estructural**: es una ménsula colgada de los amarres Z −80/−140 y bajo
  −160 sólo lleva clips de la columna; quitar ~4 400 mm² ≈ 0.28 kg **en la
  punta** del voladizo sube la frecuencia propia sin tocar la sección en los
  amarres (su propia nota declara la vibración del faldón como el modo de
  fallo). Respaldo verificado en el emitido: borde taperado en Y 82.46 a
  Z −284 (cascada de tes muere en Y 72 → ≥10) y canto de la VHS20 en
  **Y 15.12** a Z −373.4 (con R16 se descalzaría a ~Y18 — por eso R8 ahí).
- `RP.placa = [90,8,320]` **se conserva como envolvente** → el nombre emitido
  «8×90×320» no cambia (TEN2, la comprobación del soporte del AR20 y §F3
  identifican por nombre). Regla de montaje registrada: bridas de tubo de la
  columna (no modeladas) siempre a ≤20 del eje Y 34.5.
- Color → `COL.fijo`. Grabados **generados, no pegados**: `TENSOR · 4,0 bar`
  (de `NEUM.presionTrabajoBar`; **no cortar** hasta cerrar SC-02/SC-03 — si el
  cierre cambia presión o calibre, el texto se regenera solo) y `LOTO ↓`
  sobre la VHS20 (papel de consignación declarado web PNEU-012).

### 2.7 Cierre de la iteración (verificación obligatoria)
- `node ensambles/sorter_co/gen_sorter_co.mjs`: compuerta **VERDE**, emite las
  968 piezas y el log es **byte-idéntico** al de antes de tocar nada — mismas
  dispensas abiertas (SC-03, SC-11, SC-02, SC-05), mismos avisos, mismas 12
  comprobaciones de §S con los mismos números (ninguna lee estos contornos).
- Solapes del tensor: cero parejas AABB nuevas para los brazos (calles 1/3/5
  muestreadas contra el emitido anterior); ménsula↔C85C25 pasa de solape de
  1 mm a 2 mm de aire.
- Vistas regeneradas y revisadas: `vistas/sco_tensor.png`,
  `vistas/sco_corte_calle3.png`, `vistas/sco_sorter_maquina.png`.
- Acción auditada con `pipeline/lib_audit.py log` (incluye el hallazgo
  colateral del solape de 1 mm) → `audit.log.jsonl` de este ensamble.

---

## 3. Lo rechazado, y por qué

| Propuesta | Porqué se rechazó |
|---|---|
| **P1 — brazo por unión de dos cápsulas** («la unión produce sola la garganta tangente, cero trigonometría») | FALSO geométricamente, verificado con las tangentes exactas: ambas cápsulas contienen el disco del cubo completo, así que en la garganta la frontera de la unión son los dos flancos interiores cruzándose en V = (−83.77, −241.46) con cuña de 75° — una **esquina viva re-entrante**, prohibida por la propia regla de la propuesta. Se rescata la intención (ojo + ramas tangentes) con contorno único calculado y garganta explícita R60. |
| **P1 — nariz de ménsula R11.5 centrada en (34.5, −73.5)** | No es concéntrica al bulón (centro a 1.5 del pin en −72 → «la lengüeta señala su bulón» no se cumple) y conserva el fondo en Z −85 → MANTIENE el solape de 1 mm con la luz de la C85C25 (miró el margen en Y y no el de Z). Superada por la lengüeta 20 con R10 concéntrico. |
| **P1 — regla «anillo ≥ ~1·Ø del agujero» tal como estaba escrita** | Su propio cubo no la cumple (23 ≈ 0.46·Ø50). Reescrita por tipo de ojo: ojal de bulón ≥ 0.75·d₀; paso soldado ≥ e+1 (el R48 se justifica por repisa de cordón, sección y eco del Ø48 de la brida, no por esa regla). |
| **P2 — acabado prescrito** (granallado + polvo poliéster, RAL 7031/5010 como metadato) | Prescribe proceso y color que el cliente no ha dado: **dato inventado** en el sentido de la regla de oro nº1 (el metadato quedaría emitido como especificación) y coste de proceso nuevo sin justificar. Sobrevive sólo la semántica con la paleta `COL` existente del render. |
| **P2 — esquinas inferiores R16 en la pletina del aire** | Muerde ~3 mm el respaldo de la esquina −Y de la VHS20 (el canto a Z −373.4 pasaría de Y15 a ~Y18) → viola «no tocar caras de apoyo/huellas». El taper SÍ sobrevive; esa esquina queda en R8 (canto a Y 15.12: nada). |
| **P2 — garganta R16** | No viola nada, pero pierde contra R60 en el único re-entrante portante: R16 = 2·e deja Kt ~1.3–1.5 donde R60 = 7.5·e deja Kt ≈ 1.06 con coste de láser idéntico (verificado que R60 cabe con el cubo R48). R24 = 3·e queda como mínimo de familia para futuros re-entrantes fuera de camino de carga. |
| **P3 — conservar el contorno del cubo en R25** («de los radios emitidos cuelgan retención y tornillería») | Justificación equivocada para el cubo: del contorno EXTERIOR no cuelga nada (el Ø50 es paso del cubo soldado y nadie lo toca); conservar R25 = conservar el único concentrador real — ligamento CERO — cuando eliminarlo es gratis y el cliente pidió «para bien estructural de hecho». Cae su tabla de 8 tramos (calculada para R25); sobrevive su MÉTODO (tangentes en código, muestreo fino, valores de verificación) y su garganta R60, recalculados aquí para R48. |
| **P3 — fallback «el R6 puede quedar sólo en el DXF y la pieza 3D seguir siendo box»** | Divergencia modelo↔plano: S6 dibuja DESDE el modelo; una cota que existe en el plano y no en el sólido es geometría sin fuente — contra la auditabilidad del repo. La vía principal (sketch + verificación del bbox por la dirección dudosa de sketchXZ, que resultó real) es la implementada. |
| **P3 — familia de radios R6/R10** | Sin defecto duro, pero fragmenta el lenguaje (tres propuestas, tres familias). Se elige UNA: R8 = e como suelo único coherente con «radio interno ≥ e» del encargo, R12 = 1.5·e para esquina libre; R6 < e metería un segundo suelo sin ganancia (donde R6 aportaba algo — la VHS20 — R8 ya deja el descalce en 0.12 mm). |

**Elecciones y porqué (resumen):**
- **Cubo R48** (no R34, no R25): R25 conserva el ligamento cero; R34 cumple
  e+1 pero deja un anillo de 9 que la brida Ø48 del casquillo casi tapa; R48
  da anillo de 23 — repisa holgada, σ 2.7 MPa, proporción pareja a los ojos
  existentes, eco del Ø48 de la brida, riesgo nulo verificado.
- **Garganta R60** (no R16, no R24): único re-entrante portante → el radio más
  generoso que cabe; Kt ≈ 1.06, cabe con el cubo R48, coste idéntico.
- **Familia R12/R8** (no R16, no R6/R10): un solo suelo R8 = e; R12 = 1.5·e
  esquina libre; tercera escala innecesaria.

---

## 4. Para DESPUÉS (piezas abiertas por otros agentes / decisiones del cliente)

- **Escuadras PG40 + las escuadras nuevas que exige SC-11** (fichero abierto
  por otro agente — hoy NO se tocan): aplicar la familia al emitirse las
  definitivas — esquinas libres R12 (R8 junto a huella o cordón), toda oreja
  con taladro termina en radio pleno concéntrico, margen taladro-canto
  ≥ 1.5·d₀, matado R2; NADA que toque colisas, taladros ni el cordón declarado
  (`mensulaCordon` a=5.6 de params_pg40). La estética va DESPUÉS de que exista
  la pieza de unión que SC-11 reclama — nunca antes que el gate.
- **Placas base de puente con caballete** (abiertas): CONGELADAS hasta cerrar
  SC-01 (hoy los puentes no apoyan en nada y el apoyo entero puede cambiar):
  cualquier estética de hoy se pisa con ese rediseño. Luego: esquinas libres
  R12, taladros/colisas de reglaje y superficies de apoyo intactos, sin
  cambio de espesor.
- **Guardas de testa** (abiertas): R12 en esquinas vistas del desarrollo,
  destalonado circular Ø2·e en los cruces de pliegue (lo regala el láser y
  evita la grieta de esquina), radios de plegado ≥ e como ya hace el módulo,
  matado de todo canto al alcance de la mano; pestañas y taladros de amarre
  intactos.
- **Cartelas** (abiertas): una cartela ES camino de carga (rigidiza el ángulo
  que cierra): el recorte cóncavo NO es gratis y exige trazar el camino pieza
  a pieza antes de dibujar. Donde proceda: hipotenusa cóncava con acuerdos
  tangentes a las dos alas, R ≥ 3·e fuera de camino de carga y ≥ 7·e dentro
  (Kt ≈ 1.06, como la garganta del brazo); no acortar el contacto con los
  cordones declarados.
- **Acabado real (pintura / RAL / granallado)**: DECISIÓN DEL CLIENTE
  PENDIENTE — no se emite ningún metadato de acabado ni RAL (regla de oro
  nº1: no inventar datos). Propuesta de familia registrada para cuando
  decida: una sola tinta para toda la chapa fija del tensor y otra para lo
  móvil, comprados desnudos; la semántica ya está anticipada en el render con
  la paleta `COL` existente.
- **Grabado funcional de presión** (`TENSOR · 4,0 bar` + `LOTO ↓`): la
  metadata queda escrita hoy (generada de `NEUM.presionTrabajoBar`, por eso
  va en código), pero NO se corta en chapa hasta cerrar SC-02/SC-03: la
  revisión ya exige cerrarlos antes de mandar nada al taller, y si el cierre
  cambia presión o calibre el texto se regenera solo. Si S6 aún no emite capa
  GRABADO, la metadata queda especificada sin bloquear nada.
- **Coordinación con el cierre de SC-02/SC-03** (dueño: params_tensor2): esta
  iteración NO toca palancas, presión ni abrazado (GEO/PALANCA intactos). Si
  el cierre va por C85 Ø32 (camino 3 de A2 de la revisión), el brazo nuevo
  VALE TAL CUAL: los tres ojos y la silueta se conservan (fuerzas ~×1.76 →
  uso del brazo sigue <0.1); lo que se rehace es el soporte del cilindro, ya
  avisado en A2.
