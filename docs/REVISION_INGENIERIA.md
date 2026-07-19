# Revisión de ingeniería — Transfer de rodillos 90° (estilo MRT)

Revisión exhaustiva del conjunto `transfer_rodillos_90.json` + `base_interface.json`
con criterio de diseñador de transportadores, aplicando:

- **Shigley** (*Mechanical Engineering Design*): ejes, rodamientos, uniones
  atornilladas, chavetas, factores de seguridad.
- **Habasit** (*Engineering Guide* de bandas): selección de banda plana,
  diámetros mínimos de polea, arrastre por fricción (Euler).
- **Hytrol** (práctica de transfer de rodillos / MRT): arquitectura, centros de
  rodillo, accionamiento por banda, bastidor.
- **item / item24** (perfilería de aluminio con ranura en T): opción de bastidor
  atornillado para el marco de integración.

Estado: **capa `user`** (diseño con dimensiones nominales). Verificar contra la
unidad real antes de mecanizar. `cad/tests/test_transfer90.mjs`: 43/43 OK.

---

## 1. Rodillos de eje muerto (Shigley + Hytrol)

**Arquitectura (correcta).** Rodillo de EJE MUERTO: eje macizo Ø20 fijo a las dos
placas; el tubo Ø51 gira sobre 2 rodamientos 6004. Es la construcción estándar de
rodillo de transporte (Interroll/Rulmeca) y de la cama de un transfer MRT.

| Ítem | Hallazgo | Corrección |
|---|---|---|
| **Fit de rodamiento** | La nota decía *aro exterior J7 / aro interior j5*. Con el TUBO girando, la **carga rota con el aro exterior** → debe ir **apretado** y el aro interior **holgado** (regla SKF/Shigley). El j5 interior (interferencia) estaba **al revés**. | Aro exterior **Ø42 N7** (apretado en el tubo); aro interior **Ø20 g6** (deslizante en el eje muerto). |
| **Retención axial del tubo** | El tubo (con rodamientos) no tenía tope axial definido. | **Hombro en el bore + circlip DIN 472 Ø42** por lado (o tapa de extremo atornillada, ya modelada). |
| **Rosca interior del eje** | M10 en Ø20: pared 5.75 mm alrededor del taladro Ø8.5. | Engagement de rosca **≥ 2×Ø (24 mm)**; perno M10 8.8 par **45 N·m** + freno de rosca medio. |
| **Flexión del eje** | 830 mm entre placas. | Despreciable: la carga entra por los rodamientos a ±386 y se reacciona en las placas a ±415 (voladizo 29 mm). Tramo central sin carga. |
| **Aplastamiento en placa** | Eje Ø20.5 en chapa 6 mm. | σ ≈ 1.3 MPa (holgado). |

**Centros de rodillo (Hytrol).** 5 rodillos a paso 139 → el producto debe apoyar
en **≥3 rodillos** (longitud mínima **≈ 420 mm** en el sentido de expulsión) para
transferencia suave.

## 2. Banda y poleas (Habasit)

| Ítem | Hallazgo | Corrección |
|---|---|---|
| **Ø mín de polea de RETORNO** | Retornos **Ø24** — por **debajo** del Ø mínimo Habasit para banda de 3 mm/2 telas con **contraflexión** (≈ Ø50). Sobre-flexión → fatiga del empalme. | **Retornos Ø50** (subidos a z=45 para no rozar la base). |
| **Ø de tensores** | Ø50, algo justos y altos. | **Ø80 y bajados a z=58**: más envoltura + bajan el ramal (compliancia del pop-up). |
| **Arrastre del tambor** | Fricción sobre llanta lisa Ø90, envoltura ≈200°. | **Lagging de caucho ranurado e=6** → µ≥0.7. Euler: T1/T2 = e^{µθ} = e^{0.7·3.49} ≈ 11 (holgado para ~0.18 kW). |
| **Autocentrado** | — | **Abombado (crown)** en tambor y poleas (ya modelado). |
| **Tensado** | — | Tensores en **colisa vertical** con eje roscado M12 (take-up ±5 mm). |

## 3. Accionamiento (Shigley + Hytrol)

- **Motorreductor de EJE HUECO** directo sobre el eje del tambor (sin acople ni
  alineación) + **brazo de torque**. Es la solución simple/confiable de un
  transfer: menos piezas, sin problemas de alineación. **Todo el cassette sube
  junto** (elección del usuario) → la banda no cambia de longitud, tensión
  constante.
- **Chaveta del tambor** DIN 6885 6×6: a 0.18 kW / 212 rpm, T ≈ 8 Nm →
  τ ≈ 11 MPa (holgada).

## 4. Elevación / neumática (Shigley) — POP-UP POR BISAGRA

Mecanismo actualizado a **pivote por bisagra** integrado en la estructura lateral
(a pedido): línea de bisagra (eje Y) al pie de la placa **−X**; 2 cilindros
**verticales** suben el lado **+X** 6 mm → la cama **bascula 0.41°** (despreciable).
Elimina las colisas verticales de guía (fricción/desgaste) y la palanca+leva.

| Ítem | Análisis | Resultado |
|---|---|---|
| **Reparto de carga** | Bisagra a X=−415, cilindros a X=+300, CG a X=0. Momentos: la **bisagra toma ~0.5·W**, **cada cilindro ~0.26·W**. Con W (cassette ~64 kg + producto) ≈ 0.9 kN → cilindro ≈ 235 N. | 2×Ø32@6bar = 966 N → **SF ≈ 4** (muy holgado; el cilindro casi no trabaja). |
| **Bisagra (Shigley)** | Pasador Ø12 h9 en buje de bronce H7, doble cortante, reacción ~0.5·W repartida en 2 nudillos → ~225 N/nudillo. τ ≈ 2 MPa. | Holgado; toma el empuje lateral sin colisas. |
| **Tilt** | 6 mm sobre brazo 2·combX=830 → **0.41°**; los 5 rodillos emergen 0.6…5.4 mm (aceptado por el usuario). | Plano de transporte prácticamente plano. |
| **Descarga en reposo** | **Topes de altura M10** regulables fijan los +6 mm y cargan el peso en reposo → el cilindro no sostiene presión estática. | Menos consumo de aire y desgaste. |
| **Cinemática** | Cilindros verticales basculantes (horquilla abajo + rótula M10 arriba al puente +X); grado de libertad único (rotación en la bisagra). | Robusto, sin colisas. |

## 5. Bastidor e integración (Hytrol + item)

- **Placas laterales** 6 mm (canal) separadas 830 (= largo de rodillo + acoples),
  trabadas por 5 ejes + 2 puentes + eje del tambor → cassette rígido.
- **Bastidor de integración en la base** (`base_interface.json`): 2 largueros +
  3 **travesaños de trabazón** que abren y refuerzan el hueco, **4 cartelas** de
  anclaje M12 al bastidor de la máquina, **rieles T-slot + tuercas M12** para los
  4 pies del módulo, **topes de altura M10**.
- **Libertad del mecanismo**: 8 mm de holgura entre el marco y el canal FIJO →
  los 6 mm de pop-up quedan libres.
- **Opción item24**: el marco de integración puede fabricarse en **perfil de
  aluminio con ranura en T** (atornillado, sin soldadura) manteniendo la misma
  geometría de largueros/travesaños; conviene si se prioriza montaje/ajuste sobre
  rigidez máxima.

## 6. Fabricabilidad — checklist

- [x] Ø mín de polea respetado en toda la banda (Habasit).
- [x] Fits de rodamiento con la regla de aro rotante (Shigley/SKF) + circlip.
- [x] Cilindros con SF ≥ 1.5 sobre la carga real de elevación.
- [x] Roscas internas con engagement ≥ 2×Ø.
- [x] Lagging del tambor para µ del arrastre.
- [x] 0 interferencias inesperadas (barrido AABB: solo contactos intencionales).
- [ ] **Pendiente contra la unidad real**: masa exacta del cassette (afina SF de
      cilindros), plano de banda del base (afina altura de emergencia), tie-ins
      exactos de las cartelas al bastidor nativo.

## 7. Conjunto completo CON LAS BANDAS (análisis de sistema)

`integracion_modulo_base.json` (`gen_integracion.mjs`) modela el **conjunto**:
la transferencia + las **4 bandas pasantes** del transportador base corriendo en
las calles entre las 5 líneas de rodillos, con sus **tambores** en los extremos.

| Ítem de sistema | Análisis / criterio | Resultado |
|---|---|---|
| **Bandas del base (Habasit)** | 4 bandas planas **40×3** (poliéster/NBR) a paso 139, en las calles Y=±69.5 / ±208.5 entre rodillos. Tambores Ø60 (> Ø mín). | OK; anchos y Ø compatibles. |
| **Traspaso de producto (Hytrol)** | El producto viaja en las bandas (plano Z=170). Al activar el transfer, los rodillos **emergen +4 mm** sobre el plano de banda → el producto se **despega de la banda** y queda solo sobre los rodillos, que lo expulsan a 90°. Al retraer, bajan **−2 mm** bajo el plano → la banda retoma el producto. | Interfaz correcto: **+4 / −2 mm** garantizan traspaso limpio sin lucha banda↔rodillo. |
| **Compatibilidad de velocidades** | Banda base v_b (flujo) y rodillos v_r (expulsión) son **ortogonales e independientes**; durante la expulsión el producto ya no toca la banda → no hay conflicto cinemático. v_r 80 m/min tangencial dimensiona el motorreductor del transfer. | Sin restricción de sincronía. |
| **Reparto de carga (Shigley)** | En estado elevado, el peso del producto lo toman los **5 rodillos** (no las bandas). Carga/rodillo ≤ ~1/5 del producto → los 6004 y el tubo Ø51 sobran (ver §1). | OK. |
| **Ancho de producto vs calles** | Producto ancho apoya sobre varios rodillos **y** cruza las calles de banda (40 mm). Las bandas (Z=170) quedan 4 mm por debajo del lomo del rodillo (Z=174) → no rozan el producto en transferencia. | OK. |
| **Tracking de las bandas base** | Tambores con abombado/pestaña (práctica del transportador base). | Fuera del alcance del módulo; se respeta el hardware del base. |
| **Estructura del conjunto** | El **bastidor de integración** (§5) abre el hueco y ata el transfer al bastidor del base; las bandas pasan por las calles, el transfer cuelga en la ventana. | Coherente; libertad de pop-up conservada. |

**Modos de fallo a vigilar en puesta en marcha:**
- Desalineo banda↔calle → roce del canto de banda con el rodillo (holgura calle−rodillo ≥ (139−63−40)/2 = **18 mm por lado**, holgado).
- Producto muy corto (< 3 centros ≈ 420 mm) → transferencia irregular (limitación de layout, no de diseño).
- Presión de banda base sobre producto durante el pop-up → nula (producto ya despegado a +4).

## 8. Equipo base — transportador twin-belt (`gen_base.mjs`)

Mismo análisis (Habasit/Shigley/conveyor) al **equipo base paramétrico**,
**manteniendo la posición de las bandas** (calles Y=±69.5/±208.5). Correcciones
aplicadas para fabricabilidad:

| Ítem | Análisis / hallazgo | Corrección |
|---|---|---|
| **Soporte de banda (Habasit)** | Una banda plana de **3 m sin apoyo se hunde** entre tambores. | **CAMA DESLIZANTE** (slider bed) de chapa bajo cada calle (o rodillos de carga como alternativa). |
| **Potencia del motor** | P = F·v; F ≈ µ·(m_banda+carga)·g ≈ 0.3·(≈53 kg)·9.81 ≈ **156 N**; a v ≈ 0.5 m/s → **P ≈ 80 W**. | Motor **0.37 kW** (era 0.55, sobredimensionado) — sobra margen para arranque. |
| **Arrastre del tambor (Habasit/Euler)** | Fricción sobre Ø90, envoltura 180°. Sin lagging µ~0.25 → patina. | **Lagging de caucho ranurado e=6** en el tambor de cabeza → µ≥0.7; T1/T2 = e^{µθ} ≈ 2.6. |
| **Ø de tambor (Habasit)** | Ø90 > Ø mínimo de polea motriz para banda 3 mm. | OK. |
| **Take-up (Habasit)** | Elongación de banda ≈ 1–2% del lazo (6 m) → **60–120 mm**. Tenía ±40. | **Husillo de take-up ±60 (120 mm)** en la cola, con colisa. |
| **Eje del tambor (Shigley)** | Par = F·R = 156·0.045 ≈ **7 N·m**; flexión por T1+T2 sobre la luz de rodamiento. | Ø30 holgado (τ y flecha muy por debajo); chumaceras de pie estándar. |
| **Bastidor / flecha (Shigley)** | Canal C sobre 3 m: con patas solo en extremos, luz **2.5 m** → flecha marginal. | **Par de patas CENTRAL** (6 patas) → luz 1.25 m; flecha ≪ L/500. Riostras diagonales para rigidez longitudinal. |
| **Patas / carga** | ~53 kg + bastidor sobre 6 patas → <120 N/pata. | Postes 60×60 + placa + nivelador M16: holgado. |
| **item / perfilería** | El bastidor puede ir en **perfil de aluminio ranurado (item/Bosch)** atornillado en vez de canal soldado. | Documentado como alternativa (montaje/ajuste vs rigidez). |

**Interfaz base ↔ transferencia:** el hueco (X=±430) queda enmarcado por 2
travesaños pesados que reciben las cargas del módulo; el plano de banda (Z=170)
es común, así los rodillos emergen +4 sin conflicto. Las 4 bandas **no cambian
de posición** (calles Y=±69.5/±208.5).

---

Todos los cambios de geometría están en `gen_transfer90.mjs`, `gen_base.mjs`,
`gen_base_interface.mjs` y `gen_integracion.mjs`, regenerados en los JSON, el
test y los planos.
