# Bastidor en chapa plegada y plan de pernería — módulo 3×3 de celdas omnidireccionales

Propuesta de ingeniería para la estructura del módulo de 9 celdas de
`cad/ensambles/celda`. Capa **`user`** (decisión de diseño): nada de lo que sigue
es medido ni de catálogo salvo lo marcado como `cat`. Todo valor lleva su cálculo
o su norma; lo que no tengo va marcado **A VERIFICAR**.

Ejes según `nbt90/CONTRATO.md` y `celda/params.mjs`: **Z = 0 en el plano de
transporte** (tope de las ruedas), todo el mecanismo en Z negativo; X, Y
horizontales con origen en el centro de la celda A1. Unidades: mm.

---

## 0. Lo que dice la geometría existente antes de diseñar nada

Reconstruí el tren motriz desde `params.mjs` (script en el scratchpad de la
sesión) para tener la **huella real en planta** de lo que cuelga bajo cada placa.
Esto manda sobre todo lo demás:

| pieza | radio (desde el centro de celda) | semiancho tangencial | Z |
|---|---|---|---|
| rueda omni Ø48 | 63.75 … 88.25 | ±24.0 | −48 … 0 |
| bloque porta-rodamiento (motor) | 52.25 … 62.25 | ±13.0 | −37 … −7 |
| bloque porta-rodamiento (libre) | 89.75 … 99.75 | ±13.0 | −37 … −7 |
| acople impreso | 35.25 … 51.25 | ±7.0 | −31 … −17 |
| reductora TT | 11.25 … 33.25 | ±9.0 | −51 … −14 |
| campana del motor Ø20.5 | 12.0 … 32.5 | ±10.25 | **−84** … −51 |
| soporte del motor | 7.25 … 25.25 | ±10.0 | −51 … −7 |
| disco de encoder Ø30 | 104.75 … 106.75 | ±13.0 | −39 … −9 |
| **sensor LM393** | 99.75 … **109.75** | **±16.0** | −46 … −23 |

Tres consecuencias, y las tres condicionan el bastidor:

**(0.1) El punto más bajo del mecanismo está en Z = −84** (la campana del motor
TT). Cualquier viga que cruce bajo una celda tiene que pasar por debajo de esa
cota.

**(0.2) NO se puede poner estructura en el plano de una cara del hexágono.**
Barriendo las 11 piezas × 3 unidades × 6 caras, la máxima distancia perpendicular
de una pieza al plano de una cara es **103.05 mm** (esquina del PCB del LM393),
y el plano de la cara está a `af/2 = 101.97`. El sensor **sobresale 1.07 mm**
del prisma hexagonal de la placa.
> Esto invalida los **24 taladros M3 por cara** que hoy emite
> `planos_celda.mjs`: una eclisa o un nervio en el plano de la cara choca con el
> sensor. Las celdas **no se pueden atornillar cara contra cara**.

**(0.3) Los vértices del hexágono son de dos clases.** Las ruedas apuntan a los
vértices ∠90°, ∠210°, ∠330°; los vértices ∠30°, ∠150°, ∠270° están **libres**:
la pieza más próxima a ellos está a **78.13 mm**. Y en el panal esos vértices
libres coinciden: en cada uno concurren tres celdas, cada una por su propia
dirección libre (∠30 / ∠150 / ∠270). Comprobado sobre las 9 celdas.
> **Ese es el hallazgo que ordena todo el bastidor**: las celdas se cuelgan por
> sus tres vértices libres. Son 3 apoyos por placa — isostático, sin
> hiperestatismo ni balanceo — y en el módulo de 9 celdas dan **15 nudos** sobre
> **4 líneas rectas** paralelas a X, separadas `1.5·Rv = 176.63 mm`.

Huella del módulo recalculada: **713.82 × 588.75 mm** (coincide con los 71.4 ×
58.9 cm del README, panal escalonado A-B-A).

---

## 1. Decisión: chapa vs. acrílico para la placa superior

### 1.1 Caso de carga y modelo

Bulto de **3 kg = 29.42 N**. La carga **no entra por la superficie de la placa**:
el bulto apoya en las ruedas (que sobresalen 5 mm), las ruedas cargan sus ejes,
los ejes sus rodamientos y los rodamientos los **6 bloques impresos** que cuelgan
de la placa. Así que la placa se carga **por debajo, en 6 puntos** (radios 57.25
y 94.75, a 120°) y se apoya en sus 3 vértices libres.

Calculé cuatro casos, tres con solución cerrada y uno numérico:

- **(a) (b) (c)** placa circular equivalente en área (`a_eq = 107.08 mm`,
  área del hexágono 36 022 mm²), simplemente apoyada en el borde:
  puntual centrada `w = W a²(3+ν) / [16πD(1+ν)]`; uniforme
  `w = W a²(5+ν) / [64πD(1+ν)]`; anillo de radio b = 76
  `w = W/(8πD)·[ (3+ν)/(1+ν)·(a²−b²)/2 − b²·ln(a/b) ]`.
- **(d)** **Rayleigh–Ritz sobre el hexágono real con 3 apoyos puntuales** en los
  vértices libres, base polinómica completa de grado 6 (28 términos),
  cuadratura de 12 696 puntos sobre los 6 triángulos, **con las 3 ranuras de
  rueda descontadas del dominio** (quitan el 10.1 % del área), carga repartida
  en los 6 bloques, restricción `w = 0` en los apoyos por multiplicadores de
  Lagrange. `D = E·t³/[12(1−ν²)]`.

### 1.2 Resultados (flecha en el centro, con ranuras, carga por los 6 bloques)

| material | E [MPa] | ν | t | D [N·mm] | (a) punt. | (c) anillo | **(d) 3 apoyos** | Δw centro-rueda | masa/placa |
|---|---|---|---|---|---|---|---|---|---|
| PMMA colado | 3000 | 0.37 | 5.0 | 36 207 | 0.456 | 0.162 | **0.694** | 0.035 | 190 g |
| PMMA a 1000 h (fluencia, E→1800) | 1800 | 0.37 | 5.0 | 21 724 | 0.760 | 0.270 | **1.156** | 0.059 | 190 g |
| Al 5052-H32 | 70 000 | 0.33 | 2.0 | 52 370 | 0.321 | 0.115 | **0.463** | 0.030 | 173 g |
| **Al 5052-H32** | 70 000 | 0.33 | **2.5** | 102 285 | 0.164 | 0.059 | **0.237** | 0.015 | **217 g** |
| Al 5052-H32 | 70 000 | 0.33 | 3.0 | 176 748 | 0.095 | 0.034 | **0.138** | 0.009 | 258 g |
| Acero DC01 | 200 000 | 0.30 | 1.5 | 61 813 | 0.276 | 0.099 | **0.387** | 0.029 | 381 g |
| Acero DC01 | 200 000 | 0.30 | 2.0 | 146 520 | 0.116 | 0.042 | **0.163** | 0.012 | 508 g |

Tensión (placa circular s.a., carga uniforme, `σ = 3(3+ν)W/(8πt²)`):
0.47 MPa en acrílico 5 mm, 1.87 MPa en Al 2.5, 5.15 MPa en acero 1.5. **La
resistencia no decide nada**: estamos dos órdenes de magnitud por debajo de
cualquier límite. Decide la **rigidez**.

### 1.3 Criterio y decisión

Criterio adoptado: **flecha ≤ L/500 = 203.95/500 = 0.408 mm**, con L = distancia
entre apoyos (= lado del triángulo de vértices libres = `af`). Justificación: es
el criterio habitual de bastidor de máquina, y aquí tiene además un sentido
funcional — las tres ruedas de una celda tienen que repartirse la carga; una
flecha diferencial grande descarga la rueda central de la deformada y la celda
pierde tracción. La columna Δw confirma que el gradiente entre el centro y los
puntos de rueda es pequeño en todos los casos; lo que hay que acotar es la
flecha absoluta, porque es lo que descuadra una celda respecto de sus vecinas.

- **Acrílico 5 mm: FALLA.** 0.694 mm en el instante, y **1.156 mm a las 1000 h**
  con el módulo de fluencia. Es 2.8× el criterio. Y el fallo es progresivo: el
  PMMA cargado de forma permanente sigue deformando.
- **Al 5052-H32 2.0 mm: FALLA** por poco (0.463).
- **Al 5052-H32 2.5 mm: PASA** (0.237, 1.7× de margen).
- Acero DC01 2.0 también pasa (0.163) pero pesa **2.3×** (508 g vs 217 g).

> ### DECISIÓN: **placa hexagonal de aluminio 5052-H32 de 2.5 mm**, plana, corte láser/waterjet.

Además del número, tres razones que el cálculo no ve pero el taller sí:

1. **Rigidez gratis.** `D` sube de 36 207 (acrílico 5) a 102 285 (Al 2.5): **2.8×
   más rígida** con **la mitad del espesor** y **sólo 27 g más** (217 vs 190).
2. **Uniones atornilladas repetidas.** El encargo pide poder desarmar para
   ajustar. El PMMA es entallable, sensible a la fisuración por tensión (crazing)
   y las aristas de corte láser quedan con tensión residual; cada apriete de un
   M3 a 6 mm del borde es un iniciador de grieta. El 5052-H32 no.
3. **No hay que roscar nada.** Todas las uniones de la placa son pasantes con
   tuerca autoblocante (§4), que es lo que aguanta 50 desmontajes.

**Consecuencias de cambiar `placaEsp` de 5.0 → 2.5** (hay que propagarlas en
`params.mjs`, no son cosméticas):

| cota | antes | ahora | por qué |
|---|---|---|---|
| `placaEsp` | 5.0 | **2.5** | esta decisión |
| `zPlaca` (cara inferior) | −10.0 | **−7.5** | `−ruedaSobresale − placaEsp` |
| `largoRanura` (tangencial) | 44.99 | **40.86** | `2·√(24² − (zBot+24)²) + 2·ranuraHolgura`, con `zBot = −7.5` |
| `anchoRanura` (radial) | 30.5 | 30.5 | no depende del espesor |
| alto del bloque porta-rodamiento y del alma del soporte de motor | — | **+2.5 mm** | el alma llega hasta `zPlaca`, que ha subido |
| 24 taladros M3 por cara del hexágono | sí | **se eliminan** | ver §0.2 — chocan con el LM393 |

**A VERIFICAR**: que el taller corte aluminio (láser de fibra, waterjet o
fresadora CNC). Un láser CO₂ de acrílico **no** corta aluminio. Si no hay
acceso a corte de aluminio, la alternativa es **DC01 2.0 mm** (flecha 0.163,
508 g/placa, +2.6 kg en el módulo) con corte láser de acero, que sí es
universal.

---

## 2. Geometría del bastidor

### 2.1 Concepto

Cuatro niveles, todos atornillados, ninguno soldado:

```
Z=0      ═══════ plano de transporte (tope de las ruedas) ═══════
Z=−5     ┌──────────────── PLACA HEXAGONAL CH-01 (Al 2.5) ────────────────┐
Z=−7.5   └────────────────────────────────────────────────────────────────┘
Z=−10           ▓▓▓ NUDO CH-02 (DC01 2.5) ▓▓▓   ← empalma 3 placas
Z=−55           ║ pestaña del nudo
                ║
                ║ POSTE EN L CH-03 (DC01 1.5, 40×40×130)
Z=−84    · · · · · · · · · punto más bajo del mecanismo (campana TT) · · · ·
Z=−100   ═╣════════ VIGA LONGITUDINAL EN C CH-04 (DC01 1.2, 40×20) ════════
Z=−140   ═╩═══════ TRAVESAÑO EN C CH-05 (DC01 1.2, 40×20) ═══════
Z=−180
Z=−210            ▼ nivelador M8 (comprado)
```

Holgura viga–mecanismo: **16.0 mm** (−84 a −100). Es el paso para el mazo de
cables de los 3 motores y los 3 encoders de cada celda.

### 2.2 Planta: dónde van los nudos

Panal escalonado A-B-A; 3 filas de 3 celdas; `af = 203.95`, `Rv = 117.75`.

```
      Y ▲
        │                                                   borde sup. y=+470.95
 +412.12│  ●─────────●─────────●─────────●          ◄── línea de nudos 4  (viga V4)
        │      ╲   ╱     ╲   ╱     ╲   ╱
 +353.25│       (C1)     (C2)      (C3)             fila 2:  x = 0 · 203.95 · 407.90
        │      ╱   ╲     ╱   ╲     ╱   ╲
 +235.50│  ────●─────────●─────────●─────────●      ◄── línea de nudos 3  (viga V3)
        │          ╲   ╱     ╲   ╱     ╲   ╱
 +176.63│           (B1)     (B2)      (B3)         fila 1:  x = 101.97 · 305.92 · 509.87
        │          ╱   ╲     ╱   ╲     ╱   ╲
  +58.87│  ●─────────●─────────●─────────●          ◄── línea de nudos 2  (viga V2)
        │      ╲   ╱     ╲   ╱     ╲   ╱
      0 │       (A1)     (A2)      (A3)             fila 0:  x = 0 · 203.95 · 407.90
        │      ╱   ╲     ╱   ╲     ╱   ╲
 −117.75│  ────●─────────●─────────●                ◄── línea de nudos 1  (viga V1)
        └──────────────────────────────────────────► X
         x=−101.97   101.97   305.92   509.87 / 611.85
```

Coordenadas exactas de los **15 nudos** (● arriba), y cuántas celdas cuelga cada uno:

| línea (y) | x de los nudos | celdas por nudo |
|---|---|---|
| V1: y = −117.75 | 0 · 203.95 · 407.90 | 1 · 1 · 1 |
| V2: y = +58.87 | −101.97 · 101.97 · 305.92 · 509.87 | 1 · 3 · 3 · 2 |
| V3: y = +235.50 | 0 · 203.95 · 407.90 · 611.85 | 2 · 3 · 3 · 1 |
| V4: y = +412.12 | −101.97 · 101.97 · 305.92 · 509.87 | 1 · 2 · 2 · 1 |

Cada celda apoya en **3 nudos**: dos en la línea de arriba (sus vértices ∠30 y
∠150) y uno en la de abajo (su vértice ∠270). 9 celdas × 3 = 27 incidencias
celda-nudo.

Las **4 vigas longitudinales** corren paralelas a X con el **alma en
`y = línea_de_nudos + 20`** (el desplazamiento de 20 mm es para que la pestaña
del nudo, el ala del poste y el alma de la viga queden en el mismo plano y todas
las uniones sean solapes planos con tornillo horizontal accesible):
`y = −97.75 · +78.87 · +255.50 · +432.12`.
Largo 794 mm cada una (de x = −140 a x = +654: 713.82 del módulo + 40 de vuelo a
cada lado).

Los **2 travesaños** van *debajo* de las vigas, en `x = −120` y `x = +634`,
largo 610 mm (y de −137.75 a +472.12). Se atornillan ala contra ala con las 4
vigas: **8 cruces**.

**Arriostramiento**: 2 pletinas diagonales 25×2 mm (CH-08, plana) bajo la
parrilla, de esquina a esquina del rectángulo 754 × 529.87 →
largo `√(754² + 529.87²) = 921.6 mm`. Sin ellas la parrilla es un mecanismo de
cuatro barras (1 tornillo por cruce = rótula).

### 2.3 Secciones de los perfiles

Todas con **radio interior de plegado R = t** (regla del taller, la misma que
`P.radioPliegue` de `nbt90/params.mjs`) y **factor K = 0.44**.

```
CH-04 / CH-05 · VIGA Y TRAVESAÑO EN C 40×20, t = 1.2, R = 1.2
                                                   fibra media (u, w):
      ├──20──┤                                       [19.4,   0  ]
   ┌──────────┐  ── z = −100 (viga) / −140 (travesaño)   [ 0,     0  ]
   │ ┌────────┘                                      [ 0,   −38.8]
   │ │                    ▲                          [19.4, −38.8]
   │ │  alma              40 (canto exterior)      2 pliegues de 90°
   │ │                    ▼
   │ └────────┐  ── z = −140 / −180
   └──────────┘
   ↑ el alma va en el plano y = línea de nudos + 20; las alas apuntan a +Y


CH-03 · POSTE EN L 40×40 × 130, t = 1.5, R = 1.5
        ┌─┐                       fibra media:  [−39.25, 0] · [0, 0] · [0, −39.25]
        │ │  ala en el plano      1 pliegue de 90°
        │ │  y = nudo+20          El ala larga solapa: arriba 45 mm con la
        │ └──────┐                pestaña del nudo, abajo 40 mm con el alma
        └────────┘                de la viga. El ala perpendicular es el
        ├───40───┤                arriostramiento contra pandeo y contra el
                                  vuelco del nudo.

CH-02 · NUDO DE EMPALME, t = 2.5, R = 2.5
        planta                          sección A-A
    ┌───────────────┐              ═══════════════════   ← 3 placas CH-01 (Z=−7.5)
   ╱  ○         ○    ╲             ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ← nudo (Z=−7.5…−10)
  │ ○   ⊕ nudo    ○  │                        ║
  │                  │  ← disco Ø80           ║ pestaña 60×45 (Z=−10…−55)
   ╲  ○         ○   ╱                         ║
    └────┬─────┬────┘   ← corte a v=+16       ║  poste CH-03 atornillado por fuera
         │ 60  │           y pestaña 60×45
    6 × M4 en circunferencia Ø60 (r = 30 desde el nudo),
    a ∠(210±35)°, ∠(330±35)°, ∠(90±35)° → 2 tornillos por placa.
    Distancia al borde de la placa en ese punto: 30·sin25° = 12.7 mm ✓ (mín. 8 para M4)
    Distancia al borde del disco: 10 mm ✓ (2.5·d)
```

**Verificación de despeje de todo el bastidor**: la pieza del mecanismo más
próxima a un nudo está a **78.13 mm**; el nudo (r = 40), su pestaña y el poste
caben con >35 mm de aire. Y las vigas están por debajo de Z = −100, con el punto
más bajo del mecanismo en −84. **Cero interferencias, sin tocar la geometría de
celda verificada por el barrido B-rep.**

### 2.4 Comprobaciones estructurales

Masa estimada del módulo cargado: 41 kg (14 kg de módulo + 27 kg de carga).

- **Viga CH-04 (C 40×20×1.2)**: `I = 22 303 mm⁴`, `W = 1 115 mm³`.
  Carga por viga 100.5 N sobre luz de 754 mm entre travesaños ⇒
  `δ = 5qL⁴/384EI = 0.13 mm = L/5 995`; `σ = M/W = 8.5 MPa` frente a
  `Re ≈ 210 MPa` de DC01. Sobra por 25× en tensión; el canto de 40 lo fija la
  necesidad de meter dos M5 en el alma con distancia al borde de 12 mm, no la
  flecha.
- **Poste CH-03 (L 40×40×1.5, l = 130)**: `A = 117.8 mm²`, radio de giro débil
  ≈ 4.9 mm, `λ = 26.7` (columna corta). `N_cr(Euler) ≈ 327 kN` frente a los
  **26.8 N** que le tocan. El poste está dimensionado por el aplastamiento del
  tornillo y por la rigidez a flexión del conjunto, no por pandeo.
- **Aplastamiento de tornillo en chapa** (`F_adm ≈ d·t·f_b/2.5`):
  M4 en Al 2.5 → 1 680 N; M5 en DC01 1.5 → 1 800 N; M5 en alma DC01 1.2 →
  1 440 N. Las cargas de servicio son de decenas de newton.

---

## 3. Piezas de chapa, con su desarrollo (K = 0.44)

Desarrollos calculados con `desarrollo(fibra, t, r, k)` de
`cad/ensambles/nbt90/lib.mjs`, es decir **`BA = θ·(R + K·t)`** y retroceso al
punto de tangencia **`setback = (R + t/2)·tan(θ/2)`**, sobre la **fibra media**:

```
largo_desarrollado = Σ tramos_fibra_media + Σ (BA − 2·setback)
```

Compensación por pliegue de 90°, para cada espesor usado:

| t | R | BA = (π/2)(R+0.44t) | setback = R+t/2 | compensación BA−2·setback |
|---|---|---|---|---|
| 2.5 | 2.5 | 5.65 | 3.75 | **−1.85** |
| 2.0 | 2.0 | 4.52 | 3.00 | **−1.48** |
| 1.5 | 1.5 | 3.39 | 2.25 | **−1.11** |
| 1.2 | 1.2 | 2.71 | 1.80 | **−0.89** |
| 1.0 | 1.0 | 2.26 | 1.50 | **−0.74** |
| 0.8 | 0.8 | 1.81 | 1.20 | **−0.59** |

### Tabla de piezas

| id | designación | material | t | R | pliegues | tramos de la fibra media | **desarrollo** | blank (desarrollo × largo) | masa/u | n | masa total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **CH-01** | Placa hexagonal e/c 203.95 | Al 5052-H32 | 2.5 | — | **0** | plana | — (plana) | e/c 203.95, Rv 117.75 | 217 g | 9 | 1.95 kg |
| **CH-02** | Nudo de empalme Ø80 + pestaña 60×45 | DC01 | 2.5 | 2.5 | **1** × 90° | 56 + 45 = 101 | **99.15** | 99.15 × 80 | 112 g | 15 | 1.68 kg |
| **CH-03** | Poste en L 40×40 × 130 | DC01 | 1.5 | 1.5 | **1** × 90° | 39.25 + 39.25 = 78.5 | **77.39** | 77.39 × 130 | 118 g | 15 | 1.78 kg |
| **CH-04** | Viga longitudinal en C 40×20 × 794 | DC01 | 1.2 | 1.2 | **2** × 90° | 19.4 + 38.8 + 19.4 = 77.6 | **75.82** | 75.82 × 794 | 567 g | 4 | 2.27 kg |
| **CH-05** | Travesaño en C 40×20 × 610 | DC01 | 1.2 | 1.2 | **2** × 90° | 19.4 + 38.8 + 19.4 = 77.6 | **75.82** | 75.82 × 610 | 436 g | 2 | 0.87 kg |
| **CH-06** | Bandeja de electrónica U 180×25 × 400 | DC01 | 1.0 | 1.0 | **4** × 90° | 11.5+24.5+179+24.5+11.5 = 251 | **248.04** | 248.04 × 400 | 779 g | 2 | 1.56 kg |
| **CH-07** | Faldón perimetral en L 30×15 *(opcional)* | DC01 | 0.8 | 0.8 | **1** × 90° | 29.6 + 14.6 = 44.2 | **43.61** | 43.61 × 800 | 219 g | 4 | 0.88 kg |
| **CH-08** | Diagonal de arriostramiento 25×2 × 921.6 | DC01 | 2.0 | — | **0** | plana | — (plana) | 25 × 921.6 | 362 g | 2 | 0.72 kg |

**Total chapa**: 8.16 kg de bastidor (CH-02…CH-06) + 1.95 kg de placas +
0.72 kg de diagonales = **10.8 kg** (11.7 kg con el faldón).

### Detalle de los desarrollos (los números uno a uno)

**CH-02 · Nudo.** Fibra media `[(−40, 0), (16, 0), (16, −45)]` en el plano
(v, z), v medido desde el nudo. Tramos 56 y 45 (Σ = 101). Un pliegue de 90°:
`BA = 1.5708 × (2.5 + 0.44×2.5) = 1.5708 × 3.6 = 5.65`;
`setback = (2.5 + 1.25) × tan45° = 3.75`.
**Desarrollo = 101 + 5.65 − 2×3.75 = 99.15 mm.**
Blank: disco Ø80 truncado en v = +16, más rectángulo 60 × 45 → envolvente
99.15 × 80.

**CH-03 · Poste en L.** Alas exteriores 40 y 40 ⇒ fibra media 39.25 + 39.25 =
78.5. `BA = 1.5708 × (1.5 + 0.66) = 3.39`; `setback = 2.25`.
**Desarrollo = 78.5 + 3.39 − 4.5 = 77.39 mm.** Blank 77.39 × 130.

**CH-04 / CH-05 · C 40×20.** Canto exterior 40, alas exteriores 20, t = 1.2 ⇒
fibra media 19.4 + 38.8 + 19.4 = 77.6. Dos pliegues:
`BA = 1.5708 × (1.2 + 0.528) = 2.71`; `setback = 1.8`.
**Desarrollo = 77.6 + 2×(2.71 − 3.6) = 77.6 − 1.78 = 75.82 mm.**
Blank 75.82 × 794 (viga) y 75.82 × 610 (travesaño).

**CH-06 · Bandeja en U.** Fondo exterior 180, laterales 25, pestañas 12 ⇒ fibra
media 11.5 + 24.5 + 179 + 24.5 + 11.5 = 251. Cuatro pliegues:
`BA = 2.26`, `setback = 1.5`.
**Desarrollo = 251 + 4×(2.26 − 3.0) = 251 − 2.95 = 248.05 mm.**

**CH-07 · Faldón en L.** 29.6 + 14.6 = 44.2; `BA = 1.81`, `setback = 1.2`.
**Desarrollo = 44.2 + 1.81 − 2.4 = 43.61 mm.**

### Reglas de fabricación aplicadas

- **R interior = t** en todas las piezas (`P.radioPliegue` del repo). Para DC01
  (recocido, A ≥ 28 %) el radio mínimo a 90° transversal a la fibra es ≈ 0.5·t;
  con R = t hay factor 2 de margen. Para Al 5052-H32 el mínimo es ≈ 1.0…1.5·t
  — **pero CH-01 no lleva pliegues**, así que no aplica.
- **Ala mínima plegable** ≈ 4t + R: CH-04 exige 6.0 y tiene 20 ✓; CH-06 exige
  5.0 y tiene 12 ✓; CH-07 exige 4.0 y tiene 15 ✓.
- **Desahogos de pliegue** Ø = 2t donde un pliegue muere contra un corte
  (CH-02 en los dos extremos de la pestaña; CH-04/05 en las muescas de los
  extremos). Mismo criterio que `bastidor.mjs` del NBT90.
- **Recuperación elástica**: DC01 1.0–1.5 mm a 90° recupera ≈ 1–2°; se
  sobrepliega. Marcar en el plano el ángulo **90° ±0.5°** sólo en CH-02 y CH-03
  (los que fijan la geometría), y **90° ±1.5°** en el resto.

---

## 4. Plan de pernería del módulo completo

**Criterios**:
- **Nada roscado en chapa.** 2.5 mm de acero dan 3.6 filetes en M4 y 3.1 en M5,
  por debajo del `1·d` mínimo, y una rosca en chapa se estropea al tercer
  desmontaje. Todas las uniones de chapa van **pasantes con tuerca autoblocante
  DIN 985**, que es lo que soporta desmontaje repetido.
- **Nada roscado en plástico impreso.** Ver §5: insertos de latón.
- **Cabezas avellanadas (DIN 7991) en todo lo que asome al plano de transporte**:
  una cabeza cilíndrica DIN 912 M4 mide 4 mm y la rueda sólo sobresale 5 mm.
- Taladros pasantes: M3→Ø3.4, M4→Ø4.5, M5→Ø5.5, M6→Ø6.6, M8→Ø9.0
  (ISO 273, serie media). Distancia al borde ≥ 2·d.
- Clase: **A2-70 inoxidable** en M3–M5 (es lo que se stockea en tamaños
  pequeños, no se oxida en laboratorio y su límite elástico de 450 MPa sobra);
  **8.8 zincado** en M6–M8, donde el par de apriete sí importa.

| # | Unión (qué une con qué) | Norma del tornillo | Métrica × largo | Clase | Tuerca | Golillas | Par | **Cant. módulo** |
|---|---|---|---|---|---|---|---|---|
| 1 | Bloque porta-rodamiento **(impreso)** → placa CH-01 | DIN 7991 avellanado | **M3 × 12** | A2-70 | — (inserto latón M3 en el bloque) | — | **0.6 N·m** ¹ | **108** |
| 2 | Soporte de motor **(impreso)** → placa CH-01 | DIN 7991 | **M3 × 12** | A2-70 | — (inserto latón M3) | — | **0.6 N·m** ¹ | **54** |
| 3 | Soporte de motor → reductora TT **(comprada)** | DIN 912 | **M3 × 30** | A2-70 | DIN 985 M3 | 2 × DIN 125 A3.2 | **0.5 N·m** ² | **54** |
| 4 | Prisionero del acople **(impreso)** → eje Ø4 | DIN 916 punta cóncava | **M3 × 6** | A2-70 | — (inserto latón M3) | — | **0.5 N·m** ¹ | **27** |
| 5 | Soporte del sensor LM393 **(impreso)** → placa CH-01 | DIN 7991 | **M3 × 12** | A2-70 | — (inserto latón M3) | — | 0.6 N·m ¹ | **54** |
| 6 | **Placa CH-01 → nudo CH-02** (empalme entre celdas) | DIN 7991 | **M4 × 16** | A2-70 | DIN 985 M4 | 1 × DIN 9021 M4 (bajo tuerca) | **2.2 N·m** ³ | **54** |
| 7 | Nudo CH-02 → poste CH-03 | DIN 933 | **M5 × 16** | A2-70 | DIN 985 M5 | 2 × DIN 125 A5.3 | **4.8 N·m** | **30** |
| 8 | Poste CH-03 → alma de viga CH-04 | DIN 933 | **M5 × 16** | A2-70 | DIN 985 M5 | 2 × DIN 125 A5.3 | **4.8 N·m** | **30** |
| 9 | Viga CH-04 → travesaño CH-05 (8 cruces) | DIN 933 | **M6 × 25** | 8.8 zn | DIN 934 + DIN 127 B (grower) | 2 × DIN 125 A6.4 | **10.1 N·m** | **8** |
| 10 | Diagonales CH-08 → parrilla (comparten los tornillos #9 en 4 cruces) | — | — | — | — | +1 × DIN 125 A6.4 | — | 0 |
| 11 | Cruce central de las dos diagonales CH-08 | DIN 933 | **M6 × 16** | 8.8 zn | DIN 985 M6 | 2 × DIN 125 A6.4 | 10.1 N·m | **1** |
| 12 | Nivelador → travesaño CH-05 | nivelador M8 × 50 base goma **(comprado)** | **M8** | — | 2 × DIN 934 M8 (contratuerca) | 2 × DIN 9021 M8 | **12 N·m** ⁴ | **4** |
| 13 | Bandeja CH-06 → ala inferior de viga CH-04 | DIN 933 | **M4 × 12** | A2-70 | DIN 985 M4 | 2 × DIN 125 A4.3 | 2.4 N·m | **8** |
| 14 | Faldón CH-07 → viga *(opcional)* | DIN 933 | **M4 × 10** | A2-70 | DIN 985 M4 | 1 × DIN 125 A4.3 | 2.4 N·m | **16** |

¹ **Limitado por el inserto, no por el tornillo.** Un M3 A2-70 admitiría
1.0 N·m; el par de arrancado de un inserto termofusible M3 en PETG está en el
entorno de 1.5–2 N·m — **A VERIFICAR con una probeta**. Se aprieta a **0.6 N·m**
con llave dinamométrica de 1/4", que es 1/3 del arrancado estimado.
² Rosca a través de la carcasa de plástico del TT; el par lo limita la carcasa.
³ Reducido desde 2.4 N·m porque el avellanado en 2.5 mm de aluminio trabaja en
cuña: el cono apoya sobre 1.75 mm de espesor y a más par abomba la chapa.
⁴ Apriete de la contratuerca, no del nivelador.

### Resumen de compras

| artículo | norma | cantidad | + 15 % repuesto |
|---|---|---|---|
| Tornillo avellanado M3 × 12 A2-70 | DIN 7991 / ISO 10642 | 216 | 250 |
| Tornillo cilíndrico M3 × 30 A2-70 | DIN 912 / ISO 4762 | 54 | 62 |
| Prisionero M3 × 6 punta cóncava A2 | DIN 916 / ISO 4029 | 27 | 32 |
| Tornillo avellanado M4 × 16 A2-70 | DIN 7991 | 54 | 62 |
| Tornillo hexagonal M4 × 12 / M4 × 10 A2-70 | DIN 933 / ISO 4017 | 8 / 16 | 30 |
| Tornillo hexagonal M5 × 16 A2-70 | DIN 933 | 60 | 70 |
| Tornillo hexagonal M6 × 25 y M6 × 16 8.8 zn | DIN 933 | 8 / 1 | 12 |
| Tuerca autoblocante M3 / M4 / M5 / M6 | DIN 985 / ISO 10511 | 54 / 62 / 60 / 1 = **177** | 205 |
| Tuerca hexagonal M6 / M8 | DIN 934 / ISO 4032 | 8 / 8 = **16** | 20 |
| Golilla plana A3.2 / A4.3 / A5.3 / A6.4 | DIN 125 A / ISO 7089 | 108 / 16 / 120 / 22 = **266** | 310 |
| Golilla ancha M4 / M8 | DIN 9021 / ISO 7093 | 54 / 8 = **62** | 72 |
| Arandela grower M6 | DIN 127 B | 8 | 12 |
| **Inserto roscado latón M3 termofusible** (Ø4.6 × L5.7) | — (tipo Ruthex M3 / CNC Kitchen) | **243** | 280 |
| Nivelador M8 × 50 con base de goma | — (comprado) | 4 | 4 |

**Total pernería (sin el faldón opcional): 428 tornillos + 243 insertos +
193 tuercas + 328 golillas.**
Peso estimado de la pernería completa: ≈ 0.9 kg.
**A VERIFICAR**: referencia comercial y par de arrancado del inserto elegido.

---

## 5. Interfaz entre tecnologías: cómo se atornilla una pieza impresa a la chapa

Hay tres interfaces distintas y cada una se resuelve de forma distinta.

### 5.1 El tornillo **rosca dentro** de la pieza impresa → **inserto de latón termofusible**

Es el caso de los 6 bloques porta-rodamiento, los 3 soportes de motor y el
soporte del sensor de cada celda: el tornillo baja desde arriba, atraviesa la
placa de aluminio y busca rosca en el plástico.

- **Por qué no roscar el PETG directamente** (que es lo que hace hoy
  `bloqueTaladroProf: 12`): una rosca impresa o tallada en PETG aguanta bien el
  primer apriete y se degrada con cada ciclo; el encargo pide explícitamente
  poder desarmar para ajustar. Además el PETG **fluye** bajo carga sostenida:
  la precarga del tornillo se pierde en horas y la unión se afloja sola.
- **Inserto termofusible M3 (Ø exterior 4.6, largo 5.7)**, colocado con la punta
  de un soldador a 230 °C sobre un taladro impreso de Ø4.0. El latón moldea el
  plástico y queda anclado en una rosca de latón que no fluye.
- **Números**: la carga de servicio por bloque es `29.42/6 = 4.9 N`, y por
  tornillo (2 por bloque) **2.45 N**. El arrancado a tracción de un inserto M3
  en PETG está en el entorno de 300–500 N (**A VERIFICAR con probeta**): factor
  >100. La unión no está dimensionada por la carga sino por la **repetibilidad**.
- **Impresión del alojamiento**: ≥4 perímetros y ≥60 % de relleno alrededor del
  inserto; si el inserto queda a menos de 2 mm de una pared, la pared se abomba
  al insertarlo.

### 5.2 La pieza impresa **apoya** contra la chapa → área, no tornillo

El bloque apoya su cara superior (26 × 10 = 260 mm²) contra la placa.
`4.9 N / 260 mm² = 0.019 MPa`, tres órdenes de magnitud por debajo del umbral de
fluencia del PETG (≈ 5 MPa a temperatura ambiente). No hace falta nada más.

### 5.3 La posición angular de la rueda **no puede depender del tornillo** → espiga de centrado

Éste es el detalle que más importa y hoy no está resuelto. Un M3 en un taladro
Ø3.4 tiene 0.4 mm de juego radial; con los dos bloques de una rueda separados
`89.75 − 57.25 = 32.5 mm` en radio, ese juego permite **±0.7° de desalineación
del eje de la rueda**. En un transportador omnidireccional el eje de rodadura es
la matriz de control (`det M = 184.5` del README): desalinearlo mete error de
velocidad transversal y hace patinar los rodillos.

**Solución**: cada bloque impreso lleva **una espiga cilíndrica Ø8 × 2.0 mm
impresa en su cara superior**, que entra en un taladro Ø8 H11 de la placa (corte
láser, tolerancia ±0.05 mm). La espiga toma el cortante y **posiciona**; los dos
M3 sólo aprietan. Con dos espigas por rueda (una por bloque) el eje queda
definido por la placa, no por la pernería, y el error angular baja a
`0.1/32.5 = ±0.18°`.

### 5.4 La chapa apoya en la chapa → nunca roscar, siempre pasante

Todas las uniones chapa-chapa son **pasante + DIN 985**. Donde la chapa es fina
y la carga concentrada (tornillo #6, placa de aluminio 2.5 mm), se pone
**golilla ancha DIN 9021** del lado de la tuerca: reparte sobre Ø12 en vez de
Ø9 y evita que la tuerca embuta la chapa.

### 5.5 Dilatación diferencial

Al 5052 α = 23.8 µm/m·K, DC01 α = 11.7 µm/m·K, PETG α ≈ 70 µm/m·K.
- Bloque PETG (26 mm) contra placa Al, ΔT = 20 K: 0.024 mm. Irrelevante.
- Cubierta de aluminio (714 mm) contra parrilla de acero, ΔT = 20 K:
  `714 × 12.1e-6 × 20 = 0.17 mm` en todo el módulo. Se absorbe en el juego de
  los taladros Ø4.5 de los nudos (0.5 mm). **No usar ajustes sin juego en los
  M4 de los nudos** por este motivo; el que posiciona es el corte láser del
  nudo, no el tornillo.
- **Par galvánico Al/acero y Al/A2**: en laboratorio seco es despreciable.
  Si el módulo va a trabajar con humedad, golilla de nylon entre placa y nudo
  (**A VERIFICAR** la condición de servicio con el usuario).

---

## 6. Orden de montaje

Pensado para que **cada celda se pueda sacar sola** sin desmontar el módulo, y
para que la geometría quede definida por piezas cortadas por láser y no por
acumulación de tolerancias.

**Fase A — subconjuntos (en banco, en paralelo)**

1. **Insertos**: colocar los 243 insertos M3 de latón en las piezas impresas
   (bloques, soportes de motor, acoples, soportes de sensor) con soldador a
   230 °C y tope de profundidad. Verificar perpendicularidad.
2. **Unidades motrices** (27): montar rodamiento 624ZZ en cada bloque, eje Ø4,
   rueda omni, segundo rodamiento y bloque, acople y prisionero (#4, 0.5 N·m),
   motor TT sobre su soporte (#3, 0.5 N·m), disco de encoder. Dejar el
   prisionero **flojo**: se aprieta al final, con la celda montada.
3. **Placas CH-01** (9): rebabar los cantos de las 3 ranuras (crítico: el corte
   láser deja arista viva que corta el bulto). Verificar los 6 taladros Ø8 H11
   de las espigas y los 6 Ø4.5 de los nudos con calibre.

**Fase B — parrilla base**

4. Atornillar los 2 travesaños **CH-05** bajo las 4 vigas **CH-04** (#9, 8 × M6,
   sin apretar) sobre una mesa plana. Insertar las 2 diagonales **CH-08** en los
   4 cruces de esquina y su tornillo central (#11).
5. **Escuadrar la parrilla midiendo las dos diagonales** (deben coincidir en
   ±1 mm sobre 921.6) y **apretar** los 9 M6 a 10.1 N·m.
6. Montar los 4 niveladores (#12) y **nivelar la parrilla con nivel de burbuja en
   las dos direcciones**. Éste es el plano de referencia de todo el módulo.

**Fase C — postes y nudos**

7. Atornillar los 15 postes **CH-03** al alma de las vigas (#8, 30 × M5) —
   **sin apretar**.
8. Atornillar los 15 nudos **CH-02** a la cabeza de los postes (#7, 30 × M5) —
   **sin apretar**.
9. **Aplanado del nivel de nudos**: con un mármol, una regla de 800 mm o un
   nivel láser, llevar las 15 caras superiores de los nudos a un mismo plano
   (Z = −7.5) y **apretar los 30 M5 de #8 a 4.8 N·m**. El juego de los Ø5.5 da
   ±0.5 mm de reglaje vertical, suficiente para absorber la tolerancia de largo
   de los postes.
10. Apretar los 30 M5 de #7 a 4.8 N·m.

**Fase D — cubierta, celda a celda**

11. Colocar la placa CH-01 de la celda **A1** sobre sus 3 nudos, meter los 6 M4
    (#6) con golilla ancha y tuerca autoblocante, **sin apretar**.
12. Repetir con A2, A3, B1…C3, en ese orden. Cada nudo interior va recibiendo
    hasta 3 placas.
13. **Apretar los 54 M4 a 2.2 N·m** empezando por el nudo central y saliendo en
    espiral (como una brida): así los errores de posición se reparten hacia el
    perímetro en vez de acumularse en una esquina.

**Fase E — mecanismo**

14. Por debajo, presentar cada unidad motriz a su placa: **primero las espigas
    Ø8 en sus taladros**, luego los 4 M3 de los bloques (#1) y los 2 del soporte
    de motor (#2), a 0.6 N·m.
15. Montar los 27 soportes de sensor (#5) y ajustar la horquilla del LM393 sobre
    el disco de encoder.
16. **Apretar los 27 prisioneros del acople** (#4) con la rueda girada a mano
    para comprobar que no roza en la ranura de la placa.

**Fase F — cierre**

17. Bandejas de electrónica **CH-06** (#13), cableado, faldón **CH-07** si se
    monta (#14).
18. **Comprobación final**: con un comparador sobre un mármol o una regla,
    verificar que los **27 puntos de contacto de las ruedas** están en un plano
    dentro de ±0.5 mm. Si una rueda queda baja, se corrige con golillas entre
    bloque y placa (0.5 mm), no forzando la estructura.

**Desmontaje de una sola celda**: quitar sus 6 M4 (#6) y sus M3 de mecanismo; la
placa sale hacia arriba con todo su tren colgando. Los nudos, postes y vigas
no se tocan, y las celdas vecinas siguen apoyadas en sus otros 2 nudos.
*(Nota: al sacar una celda de esquina, sus vecinas pierden un apoyo — sacar sólo
una celda cada vez, o apear.)*

---

## 7. Riesgos de fabricación y cota crítica de cada uno

| # | Riesgo | Por qué pasa | **Cota crítica** | Mitigación / control |
|---|---|---|---|---|
| R1 | **Las 27 ruedas no quedan coplanarias** y alguna no toca el bulto | Se acumulan: largo del poste, planitud de la viga, espesor del nudo, flecha de la placa | **Largo del poste CH-03 = 130 ±0.2** y **cara superior del nudo en Z = −7.5 ±0.3** | Reglaje vertical en la fase C-9 con el juego de los Ø5.5; comprobación final con comparador (paso F-18). El juego de 0.5 mm de los pasantes es el ajuste, no un defecto |
| R2 | **El eje de una rueda queda desalineado** y la celda pierde control de ω | Juego de 0.4 mm en los M3 de los bloques sobre 32.5 mm de brazo → ±0.7° | **Taladro Ø8 H11 de la espiga en la placa, y su posición radial ±0.1** | Espiga de centrado impresa (§5.3): el tornillo aprieta, la espiga posiciona |
| R3 | **El sensor LM393 choca con la estructura** | Sobresale 1.07 mm del plano de la cara del hexágono (§0.2) | **Radio máximo del PCB = 109.75** y semiancho **±16** | Ninguna estructura en los planos de cara; el bastidor sólo toca los vértices libres (78.13 mm de despeje). Si se cambia el sensor o su soporte, **rehacer esta comprobación** |
| R4 | **Los desarrollos salen cortos o largos** y las vigas no cuadran | Factor K real ≠ 0.44, o el radio de la matriz no es el nominal | **Desarrollo de CH-04 = 75.82** (y su canto exterior 40.0 ±0.3) | **Plegar una probeta de 100 mm de la misma bobina antes de cortar las 6 piezas** y recalcular K con el largo medido. Es media hora y salva 6 vigas |
| R5 | **Recuperación elástica**: los pliegues salen a 91–92° | DC01 recupera 1–2° a 90° | **Ángulo de CH-02 y CH-03 = 90° ±0.5°** (los que fijan la geometría); el resto ±1.5° | Sobrepliegue calibrado en la misma probeta de R4; escuadra de control en cada pieza |
| R6 | **Grieta o desgarro en el pliegue** | Radio menor que el mínimo, o pliegue paralelo a la fibra de laminación | **R interior = t en todas las piezas** (2.5 / 1.5 / 1.2 / 1.0 / 0.8) | R = t es 2× el mínimo del DC01; orientar el blank con la línea de pliegue **transversal** a la fibra |
| R7 | **La placa de aluminio no se puede cortar** en el taller disponible | Un láser CO₂ de acrílico no corta aluminio | **t = 2.5 de la placa CH-01** | **A VERIFICAR** antes de comprar material. Alternativa ya calculada: DC01 2.0 mm (flecha 0.163 mm, +2.6 kg) |
| R8 | **Se arranca la rosca de una pieza impresa** al tercer desmontaje | Rosca directa en PETG | **Ø4.0 del taladro del inserto y ≥2 mm de pared alrededor** | Insertos de latón (§5.1). Probeta de arrancado antes de hacer los 243 |
| R9 | **La parrilla queda romboidal** (no escuadrada) y el panal no cierra | 1 solo M6 por cruce = rótula | **Diagonales CH-08 iguales en ±1 mm sobre 921.6** | Escuadrar midiendo diagonales **antes** de apretar (paso B-5); las 2 pletinas CH-08 lo fijan |
| R10 | **La ranura de la rueda no deja pasar la rueda** | Se cambió el espesor de la placa y la cuerda de la ranura depende de él | **`largoRanura = 40.86` con t = 2.5** (era 44.99 con t = 5.0) | Recalcular la ranura **cada vez** que cambie `placaEsp`: `2·√(24² − (24 − 5 − t)²) + 6` |
| R11 | **Aristas vivas del corte láser** cortan el bulto o el operario | Las 3 ranuras y el perímetro quedan con rebaba | **Perímetro y ranuras de CH-01** | Rebabado obligatorio (paso A-3); romper arista 0.3 × 45° |
| R12 | **Los 15 nudos no son intercambiables** y el panal no cierra | Cada nudo define la posición de hasta 3 placas | **Circunferencia de 6 taladros M4 a r = 30 ±0.1** y **la posición del nudo en la viga ±0.3** | Todos los nudos salen del mismo programa de láser; los taladros de la viga se marcan desde un mismo cero, no en cadena |
| R13 | **El módulo cabecea** (se apoya en 3 de sus 4 patas) | Suelo no plano | **Recorrido del nivelador M8 ≥ 15 mm** | Niveladores M8 × 50 con contratuerca (#12); nivelar en fase B-6 |

---

## Anexo · qué habría que tocar en `params.mjs` y qué falta

Cotas nuevas propuestas (todas capa `user`, procedencia `dis`), a añadir en un
bloque `// ---- bastidor del módulo`:

```js
placaEsp: 2.5,          // dis: Al 5052-H32 2.5 mm — flecha 0.237 mm en el caso
                        //      de 3 kg con 3 apoyos (criterio L/500 = 0.408)
placaMaterial: 'Al 5052-H32 2.5 mm (corte láser fibra / waterjet)',
espigaDia: 8.0,         // dis: espiga de centrado del bloque impreso, H11
espigaAlto: 2.0,        // dis
nudoEsp: 2.5,           // dis: chapa DC01 del nudo de empalme
nudoDia: 80.0,          // dis: disco del nudo
nudoTornR: 30.0,        // dis: radio de la circunferencia de 6 × M4
posteSecc: [40, 40],    // dis: angular en L del poste
posteEsp: 1.5,          // dis
posteLargo: 130.0,      // dis: de Z=−10 (nudo) a Z=−140 (fondo del alma de viga)
vigaCanto: 40.0,        // dis: C 40×20
vigaAla: 20.0,          // dis
vigaEsp: 1.2,           // dis
vigaZ: -100.0,          // dis: 16 mm bajo la campana del motor (Z=−84)
travesanoZ: -140.0,     // dis
radioPliegue: 'igual al espesor',  // regla de taller (misma que nbt90)
factorK: 0.44,          // dis: acero al carbono conformado en prensa
```

**Pendiente / A VERIFICAR** (por orden de impacto):

1. **El agujero de la rueda** (`ruedaBore = 4`, sin calibre). Si fuese 6, cambian
   54 rodamientos, 27 ejes y el tren crece ~6 mm por lado ⇒ cambia `Rv`, cambia
   `af`, cambia **toda la retícula de nudos** de este documento. Es el primer
   dato que hay que confirmar.
2. **Par de arrancado del inserto M3 en PETG** — probeta.
3. **Que el taller corte aluminio** (R7).
4. **Factor K real de la bobina de DC01** — probeta de plegado (R4).
5. **Posición de los dos M3 de la reductora TT** (`ttFijacionB/C`, hoy `dis`):
   de ellos dependen los 54 tornillos #3.
6. Referencia comercial del nivelador M8 y del inserto de latón.
7. Verificar este bastidor con `interferencias_brep.py` una vez modelado en
   `bastidor_modulo.mjs` con `seccionChapa`/`desarrollo` — este documento es la
   memoria de cálculo, no el modelo.
