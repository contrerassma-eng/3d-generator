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

## 4. Elevación / neumática (Shigley)

| Ítem | Hallazgo | Corrección |
|---|---|---|
| **Dimensionado de cilindros** | 2×**Ø25** daban ~830 N útiles (con palanca ×1.67, η 0.85) vs carga de elevación (cassette **~64 kg** + producto ≈ **0.9 kN**) → **quedaban cortos** (SF < 1). | **2×Ø32** ISO 6432 → 966 N × 1.67 × 0.85 ≈ **1.37 kN** → **SF ≈ 1.5**. Rótulas a **M10**. |
| **Palanca** | Relación carrera cilindro 10 → 6 vertical. | Pernos Ø8 en bujes de bronce; pasador a doble cortante τ ≈ 5 MPa (holgado). |
| **Cinemática** | Cilindros en diagonal 36.7° basculantes (rótulas ambos extremos) → **sube vertical puro**; pasadores guía Ø8 en colisas verticales del canal fijan el grado de libertad. | OK. |

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

Todos los cambios de geometría están en `gen_transfer90.mjs` /
`gen_base_interface.mjs` y regenerados en los JSON, el test y los planos.
