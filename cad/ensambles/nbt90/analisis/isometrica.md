# NBT90 — Lectura de la isométrica de despiece (`ref/iso_despiece.jpeg`)

**Imagen**: 1170 × 1219 px, JPEG de línea, vista isométrica de despiece con globos 1..25.
**Todas las coordenadas de este documento están en píxeles de la imagen ORIGINAL** (origen arriba-izquierda),
tal como las devuelven `tools/med_px.py rejilla|perfil|lineas`.

---

## 0. Método de medida

### 0.1 Sistema de ejes de la isométrica (verificado, no supuesto)

`med_px.py lineas` sobre la imagen completa devuelve decenas de segmentos con ángulos
**exactamente −30.0°, +30.0° y −90.0°** (p. ej. `(482, −30.0, 413,930 → 831,689)`,
`(304, +30.0, 792,541 → 1055,693)`, `(262, −90.0, 603,494 → 603,232)`).
Confirma isometría canónica:

| Eje | Dirección en pantalla (y hacia abajo) | Ángulo | Qué es en la máquina |
|---|---|---|---|
| **X** | (0.866, −0.500) — arriba-derecha | −30° | eje de los árboles del carro; **ancho** entre bandas |
| **Y** | (0.866, +0.500) — abajo-derecha | +30° | **dirección de marcha de las bandas angostas**; largo de las barras (11) |
| **Z** | (0, −1) — vertical | −90° | altura / carrera del pop-up |

**Regla de lectura**: en un *dibujo* isométrico los tres ejes se trazan a escala 1:1, de modo que
**la longitud en píxeles de un segmento paralelo a un eje ES su longitud verdadera** (en unidades de
dibujo). Por tanto cualquier *cociente* entre dos medidas axiales es exacto aunque no se conozca mm/px.

Para círculos: una circunferencia Ø*D* en un plano principal se proyecta como elipse de
**eje mayor 1.2247·D** y **eje menor 0.7071·D**; su caja envolvente mide
**0.866·D (horizontal) × 1.118·D (vertical)** si el eje de giro es X o Y
(comprobado analíticamente: |s(θ)|² = R²(1 − ½·sen2θ)). Se usa esta relación para deducir diámetros,
y se verifica que ambas vías (ancho y alto de la caja) den el mismo D — cuando no coinciden, se
declara confianza baja.

### 0.2 Herramientas usadas

- `rejilla` (≈30 recortes ampliados ×3…×12 con rejilla rotulada en coordenadas originales) para lectura visual.
- `perfil --fila/--col` para contar rachas de tinta (aristas) y medir separaciones.
- `lineas` (HoughLinesP) para extraer los segmentos rectos largos y validar los ejes.
- Detección de manchas densas (filtro de densidad de tinta 9×9 + componentes conexas) para localizar
  los cubos radiados de las poleas.

---

## 1. Catálogo de globos

Convenios de la columna **Fabricación**: `CH-P` chapa plegada · `CH-C` chapa cortada plana ·
`PLA` pletina/placa gruesa cortada (láser/plasma) · `MEC` mecanizado · `TUB` tubo/barra ·
`CAT` comprado de catálogo.

| # | Coord. globo | Punta de flecha | Nombre ES | Nombre EN | Fabr. | Cant. visible | Geometría leída | Conf. |
|---|---|---|---|---|---|---|---|---|
| **1** | (180,1135) | **(202,955)** | Buje / cojinete de brida | Flanged bearing / bushing | CAT | 1 (+1 simétrico fuera de vista) | Cilindro con pestaña, Ø≈22 px, alojado en el taladro central de la placa 9. Se ve la brida como elipse doble en (195–215, 930–958). | alta |
| **2** | (855,795) | **(838,845)** | Palanca acodada / balancín de elevación | Bell-crank lever / rocker arm | PLA | 2 (una explotada + una montada en (639,565)→(717,741)) | Placa gruesa perfilada tipo "bumerán", brazo largo ≈198 px a 66° en el dibujo. Cubo/pivote con **buje soldado saliente Ø≈39 px** en (838,887). Taladros en (731,792), (804,868), (814,963), (838,995), (822,1005). Cantos con radios. | alta |
| **3** | (957,285) | **(877,455)** | Escuadra/soporte de extremo del carro | Carriage end bracket | CH-P | 2 (una a cada extremo) | Chapa plegada, ala vertical con esquina superior redondeada y 2 taladros en (852,517) y (852,547); ala horizontal atornillada a la cara superior de la viga del carro. | alta |
| **4** | (133,547) | **(472,632)** | Larguero/travesaño de bastidor | Frame channel / cross member | CH-P | 1 visible (≥2 en la máquina) | Perfil largo en dirección **X**, ≥275 px, sección de canal; **placa de extremo con esquinas redondeadas** y 2–4 taladros en (475–500, 630–700); taladros de fijación en el alma (490,655),(495,678),(515,660),(520,685). | alta |
| **5** | (322,175) | **(456,274)** | Angular largo de cierre/guarda | Long closure angle | CH-P | 1 | Perfil en L, dirección **X**, de (287,347) a (465,243) → longitud ≈206 px. Sección en L de ala estrecha (3 líneas paralelas en el recorte). | media-alta |
| **6/7/8/13** | — | ver §2 | **Globos completamente fuera de encuadre** | — | — | — | 4 globos cortados; sus directrices entran por los bordes. Ver §2. | — |
| **9** | (258,1128) | **(183,953)** | Placa portacojinete | Bearing mounting plate | CH-C | 2 (una por costado) | Placa rectangular plana ≈57×55 px con **4 taladros de esquina** (190,935)/(225,955)… y taladro central grande para el buje 1. Explotada hacia fuera de la placa lateral. | alta |
| **10** | (163,417) | **(293,462)** | Panel de cierre / guarda lateral | Side cover panel / guard | CH-P | 1 (par simétrico en el lado opuesto, ver globo cortado derecho) | Chapa grande **192 (X) × 222 (Z) px**, plana, con **pestaña de refuerzo plegada** en el canto vertical izquierdo (banda estrecha en x 288–303). Sin taladros visibles en la cara. | alta |
| **11** | (800,30) | **(753,132)** | Barra/tirante superior plano | Top tie strap / hold-down bar | CH-C | **5** | Pletina plana en dirección **Y**, longitud entre centros de taladro **224 px**, ancho **17 px**, un taladro en cada extremo (izq. en (506,168),(540,147),(574,127),(609,108),(644,87)). Paso entre barras **40 px** (verificado por `perfil --col 660` y `--col 700`: 5 pares de aristas). | alta |
| **12** | (−34,757) parcial | **(113,843)** | Placa lateral del bastidor (lado cercano) | Frame side plate (near) | CH-P | 1 (par) | Chapa plegada en **C**: alma vertical + ala superior y ala inferior con hilera de taladros; **ventana rectangular** recortada en el centro. Ala superior de (107,723) a (354,866) → **287 px** en Y; altura de alma ≈170 px. | alta |
| **14** | (1050,1078) | **(867,1045)** | Chapa/bandeja inferior | Bottom pan / base plate | CH-C | 1 | Chapa plana grande, contorno **escalonado** (escalones y muescas), taladros perimetrales en (545,976),(613,1014),(682,1053),(813,963),(870,945). Arista larga en X = **482 px** ((413,930)→(831,689)). Explotada hacia abajo. | alta |
| **15** | (487,1120) | **(430,821)** | Casquillo separador | Spacer sleeve / bushing | TUB/MEC | 2 visibles | Tubo corto de pared gruesa, Ø exterior ≈33 px, longitud ≈40 px, ensartado en el eje del cilindro/pivote. Segundo casquillo similar en (350–400, 815–865). | media-alta |
| **16** | (360,1140) | **(264,1027)** | Pletina/soporte en L pequeño | Small retainer bracket | CH-P | 1 (par) | Pletina plana con 2 taladros ((215,1000),(240,1015)) y **pestaña plegada** en el extremo derecho (245–265, 1015–1035). | media |
| **17** | (610,1135) | **(551,828)** | Horquilla / rótula del vástago | Rod clevis / rod-end | MEC o CAT | 1 | Extremo del vástago: rosca + **tuerca de bloqueo** en (505–525, 805–830) + horquilla/ojo en (535–570, 830–870). Se une al agujero inferior de la palanca 2 mediante el pasador 19. | media-alta |
| **18** | (430,110) | **(542,274)** | Polea acanalada de banda angosta (radiada) | Narrow-belt grooved pulley (spoked) | CAT o MEC | 1 explotada (+10 montadas) | Rueda con **llanta acanalada + alma radiada (≈30–36 radios)** y **cubo hexagonal**. Ø≈62 px medido sobre la polea frontal limpia (609,547) (caja 52.8×71.1 → 61.0 / 63.6). La explotada en (558,313) da caja 70×75 → relación 1.07 ≠ 1.29, señal de que está **girada** en la explosión. | alta (identidad) / media (Ø) |
| **19** | (880,1145) | **(782,1047)** | Pasador con cabeza (bulón de horquilla) | Clevis pin | MEC/CAT | 1 (≥2) | Cilindro Ø≈9 px, L≈45 px, con cabeza en el extremo inferior-izquierdo; en (763–800, 1020–1048), explotado bajo la palanca 2. | alta |
| **20** | (65,628) | **(362,732)** | Escuadra/horquilla de anclaje trasero del cilindro | Cylinder rear mounting clevis | CH-P | 1 | Escuadra plegada con 2–3 taladros en el ala vertical (363–395, 725–760); recibe el pie trasero del cilindro neumático. | media-alta |
| **21** | (963,158) | **(855,238)** | Casquillo separador corto | Short spacer / standoff | TUB | 1 (≥5) | Cilindro corto vertical Ø≈5 px, L≈28 px, en (838, 222–250); se monta bajo la pestaña con taladro de (825–855, 195–215). | media |
| **22** | (1043,985) | **(853,995)** | Anillo/clip de retención del pasador | Retaining clip / cotter | CAT | 1 (≥2) | Pieza pequeña oscura junto al taladro inferior de la palanca 2, pareja funcional del pasador 19. No se resuelve el tipo exacto (E-clip, pasador de aletas o arandela). | baja |
| **23** | (912,55) | **(848,135)** | Tornillo/varilla larga | Long screw / stud | CAT | 1 (≥5) | Vástago fino vertical Ø≈5 px de (838,140) a (838,205) con cabeza pequeña arriba. Baja a través de la pestaña taladrada y del separador 21. | media-alta |
| **24** | (192,280) | **(465,352)** | Tornillo de cabeza hexagonal (de fijación/tensado) | Hex-head bolt | CAT | 1 | Tornillo con cabeza hexagonal y vástago, en (465–490, 340–355), orientado hacia abajo-izquierda; asociado al conjunto de la polea 18. | media |
| **25** | (258,1145) | **(238,1063)** | Disco / tapa (arandela grande o tapón) | Disc / cap (large washer or plug) | CH-C o MEC | 1 | Disco delgado Ø≈24 px con taladro central pequeño, en (218–240, 1018–1055). Caja 22×37 → relación 1.68, incompatible con círculo axial ⇒ está girado o es una tapa embutida. | baja |

### Piezas SIN globo visible (presentes en el dibujo)

| Elemento | Coord. | Descripción |
|---|---|---|
| Unidad FRL (filtro-regulador + lubricador) | (760–830, 250–360) | Regulador con pomo superior (800–815, 250–275), cuerpo, vaso con purga; codo/racor push-in a la izquierda (760–790, 320–355). Montado sobre la placa vertical derecha. Ningún globo apunta a ella dentro del encuadre. |
| Cilindro neumático | (363–565, 725–870) | Cabezal con **4 tirantes** en (390–420, 738–772), cuerpo Ø≈32 px a lo largo de **Y** (≈115 px de cuerpo), vástago + tuerca + horquilla (17). |
| Bandas angostas (abanico de 5) | (720–870, 555–750) | 5 bandas/tirantes descendiendo del árbol del extremo del carro, con envolvente enrollada en ambos extremos. |
| Postes-guía sobre la viga del carro | (696,541),(732,520),(767,502),(802,481) | Pequeña escuadra con **pasador vertical** de Ø≈6 px y 18 px de alto por estación; paso 40 px en X. |
| Soporte ranurado del carro | (655–710, 545–635) y su simétrico (900–955, 605–760) | Placa vertical con **2 ranuras oblongas** (regulación de altura) + taladros redondos + ala inferior plegada. |
| Escuadra en U | (950–1010, 555–600) | Canal plegado con 2 ranuras oblongas en el ala horizontal y taladros en las almas. |

---

## 2. Recortes del encuadre (obligatorio anotarlos)

Perfiles de borde (`perfil --col 3`, `--col 1166`, `--fila 5`) dan la cuenta exacta:

**Borde izquierdo (x=3)** — 3 rachas de tinta en y = 726.5, 788.5, **929.5**:
- 726.5 y 788.5 = las dos cuerdas del **globo 12**, cuyo centro cae en ≈(−34, 757): sólo se ve el "2".
- **929.5 = una directriz de un globo enteramente fuera de imagen**, cuya flecha muere en ≈(25,950)
  apuntando a la **chapa plana rectangular con 4 taladros de esquina** de (38–108, 875–1055)
  (guarda/tapa del costado cercano).

**Borde derecho (x=1166)** — rachas en y = 460.5, 501.5, 523.0, **579.5**, **652.5**, **774.5**:
- 460.5 / 523.0 = cuerdas del **globo parcialmente visible "2_"**, centro ≈(1185,492). Sólo se lee el
  primer dígito "2" y una astilla del segundo (recorte a ×12 en `roi 1115 440 1170 545`). Su directriz
  es el segmento `(210, −34.1°, 969,627 → 1143,509)` ⇒ **flecha en ≈(962,632)**, sobre la
  **escuadra en U / racor oscuro** de (950–1010, 555–640). Como 20…25 ya están asignados en otra parte,
  **es un globo repetido o un número ≥26**: no determinable.
- 579.5 = directriz `(255, −25.1°, 938,685 → 1169,577)` ⇒ **flecha en ≈(933,688)** sobre la
  **placa vertical ranurada** de (900–955, 605–760).
- 652.5 (8 px de grosor = cola de flecha) ⇒ **flecha en ≈(1148,655)** sobre el **angular largo en L**
  de (980–1160, 640–760).
- 774.5 ⇒ **flecha en ≈(1128,782)** sobre la **pestaña plegada del panel de guarda lejano**
  (1010–1135, 700–880).

**Borde superior (y=5)**: rachas en x=780.5 y 820 ⇒ el **globo 11** está cortado por arriba (legible).
**Borde inferior**: sin cortes.

**Balance**: globos legibles = 1,2,3,4,5,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25 (21) +
1 parcial ilegible ("2_") + **4 directrices sin globo** ⇒ los números ausentes **6, 7 y 8 y 13**
corresponden a esas 4 flechas (1 por la izquierda, 3 por la derecha). No es posible asignar cuál es
cuál sin la imagen completa.

---

## 3. Topología de ensamble

### 3.1 Arquitectura general

```
                 (Z) arriba
                  │
   bastidor fijo  │   carro elevable (pop-up)
   ───────────────┼──────────────────────────────
   placas laterales 12 (+simétrica)  ──┐
   larguero(s) 4 en X                  ├─ bastidor
   chapa inferior 14                   │
   paneles guarda 10 / lejano          ┘
                                        viga del carro (X) ── 5 estaciones a paso 40
                                        · 2 filas de poleas radiadas Ø62 (10 uds)
                                        · 5 postes-guía con pasador vertical
                                        · escuadras de extremo 3
                                        · árbol de extremo Ø27
   palancas 2 (×2) ──── pasadores 19/22 ──── vástago del cilindro (17)
   cilindro neumático ── escuadra trasera 20 ── FRL sobre placa vertical
```

### 3.2 Secuencia de armado deducida (de dentro hacia fuera)

1. **Bastidor**: se atornillan los largueros **4** entre las dos **placas laterales 12** (el larguero
   lleva placa de extremo con taladros; la placa lateral tiene alas superior e inferior taladradas a
   paso regular). Tornillería: pernos pasantes M8-ish por los taladros de las alas.
2. Se atornilla la **chapa inferior 14** al ala inferior de las placas laterales (taladros perimetrales
   escalonados que siguen el contorno recortado).
3. **Cojinetes**: buje **1** insertado en la **placa portacojinete 9**; el conjunto se atornilla por sus
   4 taladros de esquina a la placa lateral **12**, centrado en la ventana rectangular. Es el apoyo del
   eje de pivote de las palancas / del árbol de mando.
4. **Palancas 2** (×2, una por costado) montadas sobre ese eje por su **cubo con buje saliente Ø39**.
   El brazo superior (taladro en (731,792)) se conecta al carro; el brazo inferior (taladros
   (838,995)/(822,1005)) recibe el **pasador 19**, retenido por **22**.
5. **Cilindro neumático**: pie trasero a la escuadra **20** (atornillada al larguero/chapa base);
   vástago → tuerca de bloqueo → **horquilla 17** → **pasador 19** → brazo inferior de la palanca **2**.
   Los **casquillos 15** centran la horquilla dentro de la horquilla/orejeta.
6. **Carro elevable**: sobre la viga en **X** se montan:
   - las **escuadras de extremo 3** (una por extremo, con radio en la esquina),
   - los **soportes verticales ranurados** (ranuras oblongas = reglaje de altura del carro),
   - los dos **árboles** con las **10 poleas radiadas** (5 por árbol, paso 40, cubo hexagonal ⇒ **árbol
     hexagonal**, no chavetero),
   - las 5 **escuadras-guía con pasador vertical** (una por línea de banda).
7. Se enfilan las **5 bandas angostas** sobre sus pares de poleas y bajan hacia el accionamiento.
8. **Barras superiores 11** (×5): se apoyan sobre las orejetas taladradas de la estructura y se fijan
   con el **tornillo largo 23** + el **casquillo separador 21** en cada extremo (las 5 líneas verticales
   de trayectoria de explosión en x = 603, 638, 673, 707 (y 742, no detectada por Hough) confirman que
   bajan verticalmente a su sitio, con paso 34.6 px = 40·cos30°).
9. **Guardas**: panel **10** al costado cercano (con su pestaña plegada hacia dentro) y el panel gemelo
   al costado lejano; **angular 5** como remate superior; **angular largo en L** (globo cortado derecho)
   como remate del costado lejano.
10. **Neumática**: **FRL** atornillado a la placa vertical derecha; tubería push-in hasta las dos bocas
    del cilindro (en FIGURE 8A se ven las dos líneas paralelas hasta los racores del cilindro).

### 3.3 Poleas y bandas — cuentas verificadas

| Verificación | Método | Resultado |
|---|---|---|
| Nº de barras 11 | `perfil --col 660` → pares (88,105)(128.5,146)(168,185)(207.5,225)(248.5,266); `--col 700` idéntico | **5** |
| Nº de bandas del abanico | conteo de los extremos enrollados en `roi 690 540 900 780 ×6`: (723,740)(745,728)(777,712)(798,700)(813,690) | **5** |
| Paso entre líneas | agujeros izq. de las barras: (506,168)…(644,87), Δ=(34.5,−20.25) ⇒ 40.0 unidades | **40** |
| Nº de filas de poleas | proyección de los 11 cubos detectados sobre la perpendicular a X: 3 grupos p≈709.7 / 769.3 / 810.9; los dos últimos son la misma fila (misma pieza, dos manchas) | **2 filas** |
| Poleas por fila | s = 0.866x−0.5y de los cubos: dos secuencias de paso 40 que abarcan ≈160 unidades | **5 + 5 = 10** |

**Nota de honestidad**: el conteo de poleas (10) es por reconstrucción de dos series de paso 40 a partir
de 11 manchas de cubo; el solape en proyección impide contarlas de una en una. Confianza **media-alta**.

### 3.4 Mecanismo pop-up

- El cilindro es **horizontal**, con su eje a lo largo de **Y** (cuerpo de (390,750) a (500,820):
  Δ=(110,70) → +32.5° = eje Y). No empuja el carro directamente.
- Empuja la **horquilla 17** → **pasador 19** → **brazo inferior de la palanca 2**.
- La palanca gira sobre su **cubo Ø39** apoyado en el buje **1** de la placa **9** en la placa lateral.
- El **brazo superior** (taladro en (731,792)) levanta el carro. Con brazo ≈198 px y pivote Ø39,
  la relación brazo/pivote es 5.1 ⇒ palanca claramente amplificadora de carrera.
- Hay **dos palancas** idénticas (una explotada = globo 2, otra dibujada en su sitio en
  (639,565)→(717,741); ambos segmentos Hough a 66.1°/66.2° y longitudes 193/201 px).

---

## 4. Proporciones adimensionales

**Método**: cada longitud se mide sobre un segmento paralelo a un eje isométrico (por tanto la medida en
píxeles = longitud verdadera en unidades de dibujo); los diámetros se obtienen de la caja envolvente de
la elipse dividiendo por 0.866 (ancho) y por 1.118 (alto) y comprobando que ambos coincidan.
Todos los cocientes son adimensionales y por tanto **independientes de la escala desconocida**.

### 4.1 Medidas base (unidades de dibujo = px)

| Símbolo | Magnitud | Valor | Origen |
|---|---|---|---|
| `p` | paso entre líneas de banda (X) | **40.0** | agujeros barras 11; trayectorias verticales Δx=34.6=40·cos30 |
| `Dp` | Ø polea de banda angosta | **62** | polea frontal (609,547): caja 52.8×71.1 → 61.0 y 63.6 |
| `Lb` | largo barra 11 entre taladros (Y) | **224** | (506,168)→(700,280) |
| `wb` | ancho barra 11 (X) | **17** | `perfil --col 660` |
| `hv` | alto del alma de la viga del carro (Z) | **42** | rectas X (707,591)→(877,492) y (706,634)→(877,534) |
| `L4` | largo del perfil 4 (X) | **≈275** | (480,628)→(718,498), 238/0.866 |
| `L14` | arista larga de la chapa 14 (X) | **482** | Hough (413,930)→(831,689) |
| `L12` | ala superior placa lateral (Y) | **287** | (107,723)→(354,866) |
| `H12` | alto del alma placa lateral (Z) | **≈170** | `perfil --col 300`: alas en 834 y 1007 |
| `P10x`,`P10z` | panel 10 | **192 × 222** | `perfil --fila 400`: 291.5→458 = 166.5/0.866 |
| `Lpal` | brazo largo de la palanca 2 | **≈198** | Hough 66.1°, 193 y 201 px |
| `Db` | Ø del cubo/pivote de la palanca | **39** | caja 34×43 → 39.3 / 38.5 |
| `Dc` | Ø del cabezal del cilindro | **≈32** | caja 30×34 → 34.6 / 30.4 |
| `Lc` | largo del cuerpo del cilindro (Y) | **≈115** | (400,755)→(500,812) |
| `De` | Ø del árbol de extremo del carro | **≈27** | `perfil --col 745`: 610→641 = 31 = 1.155·D |
| `Dbu` | Ø del buje 1 | **≈22** | recorte ×9 (195–215, 935–955) |

### 4.2 Relaciones (25)

| # | Relación | Valor | Método |
|---|---|---|---|
| R1 | nº de líneas de banda | **5** | conteo directo (barras 11 y bandas) |
| R2 | paso entre bandas / Ø polea (`p/Dp`) | **0.65** | 40/62 — las poleas se solapan en proyección pero van sobre el mismo árbol |
| R3 | Ø polea / paso (`Dp/p`) | **1.55** | recíproco de R2 |
| R4 | largo barra 11 / paso (`Lb/p`) | **5.6** | 224/40 — la barra cubre 5.6 pasos en Y |
| R5 | esbeltez barra 11 (`Lb/wb`) | **13.2** | 224/17 |
| R6 | ancho barra / paso (`wb/p`) | **0.43** | 17/40 ⇒ hueco libre entre barras = 0.57·p |
| R7 | ancho útil del carro / largo barra 11 | **0.71** | (4·40)/224: la zona activa en X es más estrecha que la carrera en Y |
| R8 | alto alma viga / paso (`hv/p`) | **1.05** | 42/40 |
| R9 | Ø polea / alto alma viga (`Dp/hv`) | **1.48** | 62/42 |
| R10 | largo perfil 4 / ancho útil del carro | **1.72** | 275/160 |
| R11 | huella del bastidor `L14/Lb` (X vs Y) | **2.15** | 482/224 |
| R12 | placa lateral / barra 11 (ambas en Y) | **1.28** | 287/224 |
| R13 | esbeltez placa lateral (`H12/L12`) | **0.59** | 170/287 |
| R14 | panel guarda 10, alto/ancho | **1.16** | 222/192 |
| R15 | panel 10 ancho / paso | **4.8** | 192/40 |
| R16 | **brazo palanca / Ø pivote** (`Lpal/Db`) | **5.1** | 198/39 |
| R17 | Ø pivote palanca / Ø polea | **0.63** | 39/62 |
| R18 | Ø cabezal cilindro / Ø polea | **0.52** | 32/62 |
| R19 | largo cuerpo cilindro / brazo palanca | **0.58** | 115/198 |
| R20 | Ø árbol de extremo / Ø polea (`De/Dp`) | **0.44** | 27/62 |
| R21 | Ø buje 1 / Ø polea | **0.35** | 22/62 |
| R22 | Ø buje 1 / Ø pivote palanca | **0.56** | 22/39 |
| R23 | inclinación del ramal de banda hacia el accionamiento (ΔZ/ΔY) | **0.67** (33.7°) | dirección medida (−130,+175) resuelta en ejes: ΔY=150, ΔZ=−100 |
| R24 | separación entre las dos filas de poleas (ΔY/ΔZ) | **≈2.4** | ΔY≈82, ΔZ≈34, de los offsets de fila p=709.7 vs 810.9 |
| R25 | paso de poleas / Ø del árbol (`p/De`) | **1.48** | 40/27 |

**Interpretación rápida para modelar**: si se fija el paso entre bandas `p = 1`, entonces
Ø polea = 1.55, Ø árbol = 0.68, alma de viga = 1.05, barra superior = 5.6 × 0.43,
brazo de palanca = 4.95, Ø pivote = 0.98, Ø cilindro = 0.80, panel guarda = 4.8 × 5.55,
huella del bastidor ≈ 12.1 (X) × 7.2 (Y).

---

## 5. Coherencia con FIGURE 8A (`ref/fig8a_vistas.png`, 0.5277 mm/px)

### 5.1 Qué vista es cada una

- **Vista izquierda** = alzado de testa del conjunto motriz. Contiene: fila superior de poleas pequeñas
  con hexágono central (centros y≈397, x≈231/351/471/591/711/831, paso 120 px = **63.3 mm = 2.49"**,
  Ø≈65 px = **34 mm = 1.35"**); dos filas inferiores de círculos Ø≈90 px = **47.5 mm = 1.87"**
  (diámetro típico de rodillo 1.9"); un círculo grande Ø≈240 px = **126.7 mm = 4.99"** con un círculo
  interior Ø≈130 px = **2.70"**; correas envolviendo cada terna; tornillería, tubería y los dos
  **jack bolts** (varillas largas con ojo, y≈865 y 900).
- **Vista derecha** = vista en planta del mismo conjunto: **DRIVE ROLLER** como cilindro horizontal
  arriba, **motorreductor 1/2 HP 230/460 V** como bloque a la derecha, **DRIVE BELT** arriba-izquierda,
  **CYLINDER MOUNTING CHANNEL** abajo (canal de esquinas redondeadas) con el **ADJUSTMENT SLOT**
  (ranura de reglaje en ≈(1450,900)) y la cota **0.394"** (= exactamente **10 mm**) de recorrido.
- La cota **1/4"** (6.35 mm) de la vista izquierda mide un escalón vertical en la superficie superior.

### 5.2 Elementos comunes a ambos documentos

| Elemento | En la isométrica | En 8A | Comentario |
|---|---|---|---|
| Poleas de banda angosta en fila con paso constante | sí (10 uds, paso 40) | sí (fila superior, paso 120 px) | mismo concepto |
| Cubo/agujero **hexagonal** en las poleas | sí (visible en (600,545) y (558,313)) | sí (hexágono dibujado en cada polea) | **coincide**: árbol hexagonal |
| Bandas angostas descendiendo hacia el accionamiento | sí (abanico de 5, 33.7°) | sí (ramales largos inclinados) | coincide topológicamente |
| Cilindro neumático horizontal | sí (363–565, 725–870) | sí (canal de montaje del cilindro) | coincide |
| Escuadra/soporte con **ranuras oblongas** de reglaje | sí (655–710,545–635) y (900–955,605–760) | sí (**ADJUSTMENT SLOT**) | coincide |
| Placas laterales con alas taladradas | sí (globo 12) | sí (perfiles laterales con tornillería) | coincide |
| Tubería y racores neumáticos | sí (FRL + codo) | sí (dos líneas paralelas hasta el cilindro) | coincide |

### 5.3 Elementos que NO aparecen en la isométrica

- **Motorreductor 1/2 HP 230/460 V** — ausente por completo del despiece isométrico.
- **DRIVE ROLLER** (rodillo motriz largo) — no se identifica en la isométrica; el único cilindro largo
  del carro es el árbol Ø27 del extremo.
- **DRIVE BELT** (banda motriz motor→rodillo) — ausente.
- **JACK BOLTS** (pernos de argolla de nivelación) — ausentes.
- Las cotas **1/4"** y **0.394"** no tienen equivalente acotado en la isométrica.

### 5.4 Elementos que NO aparecen en 8A

- Unidad **FRL** (filtro-regulador con vaso) — sólo en la isométrica.
- **Palanca acodada 2** con su cubo y sus pasadores 19/22 — 8A no la muestra (queda oculta en el canal).
- **Barras superiores 11** con tornillos 23 y separadores 21.
- **Paneles de guarda 10** y angulares de cierre 5 / angular largo derecho.
- **Chapa inferior 14** de contorno escalonado.
- **Placa portacojinete 9** + buje 1 + pletina 16 + disco 25.

### 5.5 Contradicciones detectadas (importante)

1. **Relación paso/Ø de polea incompatible.**
   8A: paso 120 px / Ø 65 px ⇒ **p/Dp = 1.85**.
   Isométrica: 40 / 62 ⇒ **p/Dp = 0.65**.
   Factor de discrepancia ≈ **2.8×**. Aun suponiendo que en la isométrica las dos filas estén
   intercaladas y el paso real por fila sea 80, saldría p/Dp = 1.29, todavía un **43 %** por debajo de 8A.
   ⇒ **No son el mismo tamaño de máquina** (distinto nº/paso de bandas), o bien lo que se mide como
   "polea" en la isométrica incluye la banda envolvente y la pestaña exterior.
2. **Número de líneas de banda.** La isométrica da **5** (dos conteos independientes). En 8A se cuentan
   **6** poleas superiores en el ancho visible (x≈231…831) y la vista está recortada por la derecha,
   por lo que podrían ser más. ⇒ discrepancia de al menos 1 línea.
3. **Ausencia del grupo motriz completo en la isométrica**: dado que 8A se titula "conjunto motriz",
   la isométrica parece corresponder al **módulo de transferencia (carro pop-up + bastidor + neumática)**
   y NO al módulo de accionamiento. Deben tratarse como **dos subconjuntos distintos del mismo equipo**,
   no como dos vistas de lo mismo.

**Recomendación**: usar la isométrica para topología y proporciones del carro/bastidor/pop-up, y 8A
**sólo** para las cotas absolutas del accionamiento (1.9" de rodillo, 10 mm de recorrido, 1/2 HP).
No mezclar el paso entre bandas de una vista con el de la otra.

---

## 6. Cinemática (descripción mecánica)

### 6.1 Elevación (pop-up)

1. El aire de red entra por la **unidad FRL** montada en la placa vertical derecha (760–830, 250–360):
   filtro con vaso y purga + regulador con pomo. De ahí sale por racores push-in a la válvula/tubería.
2. La tubería alimenta las **dos bocas** del cilindro neumático (en 8A se ven las dos líneas paralelas
   que terminan en sendos racores). Es por tanto un **cilindro de doble efecto**.
3. El cilindro está **anclado por su culata** a la escuadra **20** y trabaja **horizontalmente a lo
   largo de Y**. Su vástago termina en tuerca de bloqueo + **horquilla 17**.
4. La horquilla arrastra el **pasador 19** (retenido por **22**) alojado en el **brazo inferior** de la
   **palanca acodada 2**. Los **casquillos 15** hacen de separadores/centradores en la articulación.
5. La palanca gira alrededor de su **cubo Ø39** que apoya en el **buje 1** montado en la
   **placa portacojinete 9**, atornillada a la **placa lateral 12**. Hay **una palanca por costado**,
   ambas sobre un eje común transversal (dirección X), de modo que las dos suben en fase.
6. El **brazo superior** de la palanca (taladro en (731,792)) empuja el **carro** hacia arriba.
   Con brazo/pivote = 5.1 (R16) y un ángulo de giro típico de 20–30°, la carrera vertical del carro es
   del orden de 0.35–0.5 veces la carrera del cilindro.
7. **Regulación de altura**: los soportes verticales del carro llevan **dos ranuras oblongas**
   (655–710, 545–635 y simétrico), que permiten fijar la cota superior del carro respecto al bastidor;
   equivalen al *ADJUSTMENT SLOT* de 8A. La cota **1/4"** de 8A es coherente con la altura a la que la
   banda debe sobresalir por encima del plano de rodillos.

### 6.2 Marcha de las bandas

8. Sobre la **viga del carro** (dirección X) van **dos árboles paralelos**, separados ΔY≈82 y ΔZ≈34
   (R24), cada uno con **5 poleas acanaladas radiadas Ø62 a paso 40**. El **cubo hexagonal** indica
   **árbol hexagonal**: las poleas se posicionan por forma, no por chaveta, y la posición axial la fijan
   los casquillos/collarines.
9. Cada una de las **5 bandas angostas** describe: polea superior-trasera → polea inferior-delantera →
   ramal descendente hacia el accionamiento, con una inclinación de **33.7°** respecto a la horizontal
   (R23). El tramo entre las dos poleas del carro es la **superficie portante** (marcha en dirección Y).
10. Sobre la viga hay **5 escuadras con pasador vertical** (una por línea) que actúan de **guía/retén**
    lateral de la banda; junto con las **5 barras superiores 11** (fijadas con tornillo **23** y
    separador **21**) forman el peine que mantiene cada banda en su carril.
11. El **árbol de extremo Ø27** cierra el carro por el lado del abanico de bandas y define el punto de
    entrada/salida de los ramales.

### 6.3 Accionamiento y tensado (según FIGURE 8A)

12. El **motorreductor 1/2 HP, 230/460 V** acciona el **DRIVE ROLLER** a través de la **DRIVE BELT**
    (transmisión por correa, no directa) — de ahí que en la planta el motor esté desplazado
    lateralmente respecto al rodillo.
13. La posición del motor es regulable: la ranura **ADJUSTMENT SLOT** de la planta permite desplazar la
    bancada del motor para **tensar la banda motriz**; la cota **0.394" (10 mm)** acota ese recorrido de
    ajuste en el otro extremo (movimiento del rodillo motriz).
14. El **TAKE-UP IDLER** (rodillo tensor) del alzado de testa mantiene la tensión de los ramales de
    banda angosta; los **JACK BOLTS** (pernos de argolla) sirven para nivelar/ajustar el conjunto
    respecto al bastidor de la línea principal.

### 6.4 Ciclo funcional

- **Reposo**: cilindro retraído, palancas caídas, carro por debajo del plano de transporte; la carga
  circula por la línea principal sin tocar las bandas.
- **Transferencia**: se presuriza el cilindro; el carro sube ~1/4" por encima del plano de rodillos;
  las 5 bandas, ya en movimiento, toman la carga y la desvían **90°** (marcha en Y, perpendicular a la
  línea principal, cuyo eje es X).
- **Retorno**: se invierte el cilindro, el carro baja y la línea principal recupera el paso.

---

## 7. Incertidumbres declaradas

| Punto | Estado |
|---|---|
| Números 6, 7, 8, 13 | **No visibles**: 4 directrices entran por los bordes (1 izq., 3 der.). Sus flechas sí están localizadas (§2), pero la asignación número↔pieza es imposible con este recorte. |
| Globo "2_" del borde derecho | Sólo se lee el primer dígito. Es un número de dos cifras que empieza por 2; como 20–25 ya están asignados, o es repetición o el despiece llega más allá de 25. |
| Naturaleza del abanico de 5 elementos (720–870, 555–750) | Leído como **bandas angostas** (extremos envolventes sobre polea/árbol + dos líneas rectas intermedias). **Alternativa**: muelles de tracción dibujados con espiras sólo en los extremos. Confianza **media**. |
| Función del pasador vertical de las 5 escuadras de la viga | Leído como **guía/retén de banda**. Alternativa: eje de un rodillo de guía de eje vertical. Confianza **media-baja**. |
| Ø exacto de las poleas | Medido sobre la polea frontal limpia (62). La polea explotada 18 da caja 70×75, relación 1.07 ≠ 1.29 ⇒ está girada respecto a los ejes; no se usa para el Ø. |
| Globo 22 y globo 25 | Piezas pequeñas, contornos no resolubles a esta resolución. Confianza **baja**. |
| Relación con FIGURE 8A | **Contradicción cuantitativa documentada en §5.5.** No usar las dos fuentes para la misma cota. |
