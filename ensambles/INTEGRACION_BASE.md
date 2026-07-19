# Integración del módulo de desviación 90° con el equipo base

Documento de ingeniería para montar el **módulo de transferencia 90°**
(`transfer_rodillos_90.json`) sobre el **equipo base** entregado en STEP
(`sorter_CO.stp`) **sin modificarlo**, con preensambles verificables, ajustes
documentados y permisibles, y control de calidad.

Capa `user` (diseño): las cotas son nominales de diseño; se **calibran** en
montaje contra el equipo real. Ver la última sección (límite de alcance).

---

## 1. Equipo base — interfaz leída del STEP

### 1a. Inventario de elementos reales (medido en el teselado del STEP)

Máquina: **X ∈ [−482, 542] (1024 ancho) · Y ∈ [−1666, 90] (1756 largo, flujo) ·
Z ∈ [−433, 86] (519 alto)**. Elementos identificados por segmentación de la malla:

| Elemento | Cota real medida |
|---|---|
| **Plano de transporte (top de banda)** | **Z = 52.3** (constante en las 4 lanes; el Z=86 son los rieles/guardas del borde, NO la banda) |
| **4 bandas pasantes** Ø40 | X = **0 / 139 / 277 / 416** (paso 139), eje a Z≈42, top Z=52.3, corren en Y[−1531,−51] |
| **4 vigas de soporte de banda** | bajo cada lane, sección ≈40×80 a Z≈0, Y[−1551,−54] |
| **4 largueros de bastidor** (perfil profundo) | bajo cada lane, ≈32×100 a Z≈0, Y[−1658,36] (todo el largo) |
| **Hueco de transferencia — ya enmarcado** | **2 travesaños pesados del base** a **Y = −654** y **Y = −1525** (sección 68×300, Zc=−214), abarcan **X[−70, 486]** → hueco **556 (X) × 871 (Y), centro X=208 / Y=−1090** |
| **Transfer de rodillos DELGADOS original** | banco de rodillos finos + soportes verticales a Y≈−1090 (Z[−155,49]) + accionamiento en el cabezal Y≈−1608 → **se elimina** |
| **Patas al piso** | en las esquinas del transfer (Y≈−804 y −1525) y del cuerpo, bajan a Z≈−430 |

**Colocación resultante del módulo** (en coordenadas del STEP): centro
**X = 208, Y = −1090**, bajado para que la tangente de los rodillos quede en
**Z = 56.3 = plano de banda (52.3) + 4**. Los 4 belts pasan por las calles entre
los 5 rodillos; los 2 travesaños del base (Y=−654 / −1525) reciben las fijaciones
del módulo. Se ve en `ver_integracion_real.html` (por defecto px=208, py=−1090).

### 1b. Idioma de hardware del base (que el módulo respeta)

Del `sorter_CO.stp` (B-rep AP214, 704 piezas) también se extrajo:

| Elemento del base | Lo que impone al módulo |
|---|---|
| Chumaceras **SKF UCFL 205 / UC 205** y **SKF 1206** | los rodamientos del módulo pasan a **unidades de brida UCFL** (no rodamientos desnudos) |
| **Ejes Ø20 H7** (locking LK30-C65-20H7) | ejes del módulo **Ø20 h6** |
| Transmisión **AT10 32T** (drive kit w/ timing) | el módulo conserva banda plana, pero comparte tornillería y montaje |
| **Rieles T-slot** + tornillería **M6 / 1/4-28 UNF** | montaje del módulo a **riel T-slot con tuercas en T M6** |
| **4 bandas pasantes** medidas en el teselado a **X = 0 / 139 / 277 / 416** (paso **139**, hueco libre ≈ 99) | los rodillos del módulo se distribuyen a **paso 139** (1 por hueco + bordes) → **5 rodillos Ø63** que emergen ENTRE las bandas reales |
| **Transferencia de rodillos DELGADOS** original en el cabezal (zona Y ≈ −640…−1600, centro X = 208) | **se elimina** (rodillos finos + su transmisión) y se **calza** este módulo en ese hueco |

**No se modifica ninguna pieza del base** que se conserva. Lo permitido (tu
instrucción): **quitar la transferencia de rodillos delgados** que el STEP ya
traía (rodillos finos + sus bandas de transmisión), perforar solo piezas
**añadidas**, y usar puntos de fijación existentes (rieles T-slot). El resto
del transportador (bandas pasantes, bastidor) queda intacto. La colocación en
el hueco real se visualiza en `ver_integracion_real.html` (base teselado a
color, sin el transfer viejo, con el módulo montado).

---

## 2. Principio de integración (sin modificar el base)

- El **canal fijo** del módulo se ancla al base con **4 pies de anclaje a
  riel T-slot** (`FIJO · Pie anclaje T-slot`): cada pie lleva
  - una **ranura para tuerca en T M6** → ajuste de **posición X** sobre el riel;
  - **2 colisos M8** al canal → ajuste de **altura ±7 mm**;
  - **shim de nivelación 1 mm** apilable → nivelación fina y reparto de carga.
- **Cero taladros en el base.** Si en alguna posición no hay riel, se usa una
  brida de abrazadera al perfil (documentada, no incluida en el modelo).
- La **altura de emergencia** de los rodillos y la **separación
  rodillo↔polea tensora** se **calibran** con los colisos/shim contra el
  **plano de banda real** del base (ver §5, tabla de ajustes).

---

## 3. Cambio de mecanismos de fijación y rodamientos

Los rodamientos desnudos anteriores (6901/6205 + seegers + portarodamiento)
**se eliminan**. En su lugar:

| Miembro rotante | Antes | Ahora |
|---|---|---|
| 5 rodillos Ø63 × 800 (ajustados al hueco del base) | eje Ø12 fijo + 2×6901 internos + tuerca M10 | **RODILLO DE EJE MUERTO MACIZO** (Hytrol MRT): eje macizo Ø20 × 830 **fijo** (no gira), **perforado Ø8.5 + roscado M10 interior** en cada extremo; el **tubo de acero Ø51 × 800** gira sobre **2 rodamientos 6004 2RS** (20×42×12) entre eje y tubo; **perno HEXAGONAL M10 DIN 933 + golilla** sujeta el eje a cada placa desde fuera de la chapa |
| Tambor motriz | eje Ø25 + 6205 en portarodamiento + seegers | **1 UCFL204** (placa +X) + **MOTORREDUCTOR DE EJE HUECO** montado directo sobre el eje (sin acople) con **brazo de torque**; **SIT-LOCK 20×28** fija el tambor (sin chaveta) |
| Tensores/retornos (idlers) | 6901 / bujes | **bujes de bronce SAE 841** Ø18/Ø12.2 (sin mantenimiento, sin rodamiento desnudo) + retención M6 |
| Acople motor↔eje | — | **2 chavetas DIN 6885 A 6×6** |

**Por qué EJE MUERTO + rodamientos internos** (responde a "los rodamientos no
me convencen" y "pon rodamiento entre eje y tubo, sujeción con perno al eje"):
el eje no gira, así que las placas no necesitan chumaceras en los rodillos —
solo un **alojamiento Ø20.5** y el **perno M10** que rosca en el eje. El tubo
rueda sobre **rodamientos 6004 sellados** (2RS, engrasados de por vida), un
diseño estándar de rodillo de transporte: robusto, barato y desmontable
(se cambia el rodamiento sacando el tubo). El **tambor** sí conserva **1
UCFL204** (familia del base, autoalineante, engrasable, collar excéntrico).
Los idlers, de baja carga, van a **buje de bronce**. Resultado: **ningún
rodamiento de bolas desnudo suelto** en el módulo.

---

## 4. Preensambles (SA) — el usuario los arma y verifica por separado

| SA | Contenido | Verificación de armado | Tolerancia / ajuste |
|---|---|---|---|
| **SA-1 Canal + anclaje** | canal fijo, 4 pies T-slot, shims, electroválvula | escuadra del canal; pies a ras; ranuras T libres | planitud canal 0.5/m; pies coplanares ±0.2 |
| **SA-2 Elevación** | 2 cilindros ISO 6432, rótulas, palancas, soportes/horquillas, puentes | la palanca gira libre; leva toca el puente; carrera cilindro 10 → sube 6 | pernos Ø8/Ø8.2 (juego 0.2); bujes bronce en palanca |
| **SA-3 Cassette de rodillos** | 2 placas laterales, 5 ejes muertos MACIZOS Ø20×830 (roscados M10), 5 tubos Ø51×800 + 10 rodamientos 6004 + vulcanizado + tapas, 10 pernos HEXAGONALES M10 | el tubo gira a mano sin punto duro; el eje no gira; perno hex apretado al par | eje Ø20 / alojamiento placa Ø20.5; tubo bore Ø42 H7 (asiento 6004) |
| **SA-4 Transmisión** | tambor + SIT-LOCK, eje tambor, 1 UCFL204, tensores/retornos + bujes, banda 35×3, motorreductor de eje hueco + brazo de torque | serpentín envuelve todas las poleas; banda al ras del vulcanizado; tambor concéntrico; reductor calza sobre el eje | SIT-LOCK apriete par nominal; tensado ±5 en colisa; brazo de torque libre de flexión |
| **SA-5 Guiado** | pasadores guía Ø8 en colisas del canal | el marco móvil sube/baja vertical sin agarrotarse | Ø8 m6 / colisa 8.5 (juego 0.5) |

Cada SA se entrega con su **plano** (juego `planos_transfer90/…`) y su fila en
el **despiece** (`_despiece.json`).

---

## 5. Ajustes documentados y permisibles

| Ajuste | Mecanismo | Rango | Cómo se fija |
|---|---|---|---|
| **Altura del módulo** (plano de emergencia) | colisos M8 de los pies + shims 1 mm | **±7 mm** (colisos) + shims | calibrar tangente de rodillos = plano de banda del base **+4 mm** |
| **Posición X** sobre el base | tuerca en T M6 en la ranura del pie | libre a lo largo del riel | centrar el módulo en el hueco entre bandas del base |
| **Nivelación** | pila de shims por pie | 0…4 mm por esquina | reparto de carga uniforme (holgura de UCFL ≤ 0.1) |
| **Separación rodillo↔tensora** | posición de la 2ª línea (colisa de tensor) | **±5 mm** | tensado de banda + envoltura del serpentín |
| **Tensado de banda** | eje roscado M12 + tuerca en colisa vertical | ±5 mm | flecha de banda nominal, sin patinaje |
| **Carrera de emergencia** | tope del cilindro / relación de palanca | 6 mm (fija) | verificar que el rodillo baje 2 mm bajo el plano al retraer |

Todos los ajustes son **permisibles con el hardware** (colisos, shims, tuercas
en T, roscas de tensado) — no requieren mecanizar el base ni el módulo.

---

## 6. Control de calidad (checklist de recepción)

**Por preensamble (SA):**
- [ ] Ejes Ø20 h6 dentro de tolerancia (micrómetro); chaveteros N9.
- [ ] UCFL204: giro libre, sin juego radial perceptible; collar excéntrico apretado.
- [ ] Rodillos: concentricidad Ø63 respecto al bore de rodamiento ≤ 0.1; vulcanizado sin poros; el tubo gira libre sobre los 6004 sin punto duro.
- [ ] Tambor: SIT-LOCK apretado al par; excentricidad de la corona ≤ 0.1.
- [ ] Idlers: buje sin juego axial > 0.3; giran libres.

**Del módulo integrado:**
- [ ] Los 4 pies apoyan y las tuercas en T muerden el riel (par de apriete).
- [ ] Tangente de rodillos elevada = plano de banda del base **+4 mm** (comparador).
- [ ] Al retraer, el rodillo queda **2 mm bajo** el plano de banda.
- [ ] Serpentín con tensado correcto; banda al ras del vulcanizado.
- [ ] Elevación simultánea de ambos lados (los 2 cilindros suben parejo).

---

## 7. Pruebas funcionales

1. **En vacío (sin banda del base):** pulsar electroválvula → el marco sube 6 mm
   uniforme; sin señal → baja por gravedad/resorte (posición segura).
2. **Giro de rodillos:** arrancar motor → los 5 rodillos giran al mismo sentido
   y velocidad (serpentín); medir 80 m/min tangencial (banda 60 m/min).
3. **Con producto:** caja de prueba sobre la banda del base → al elevar y girar,
   el producto se desvía a 90° sin marcar ni patinar.
4. **Ciclo de resistencia:** N ciclos de emergencia; verificar que no se afloja
   ninguna tuerca en T ni cambia la altura calibrada.

---

## 8. Secuencia de integración final

1. Fijar **SA-1** al riel T-slot del base (pies + tuercas en T), sin apretar del todo.
2. Montar **SA-2** (elevación) y **SA-5** (guiado) sobre SA-1.
3. Bajar el conjunto **SA-3 + SA-4** (cassette de rodillos + transmisión) sobre los puentes.
4. **Calibrar altura** con colisos + shims hasta tangente = plano de banda +4 mm (§5).
5. **Centrar en X** con las tuercas en T; apretar al par.
6. **Tensar** la banda (M12) y verificar el serpentín.
7. Correr las **pruebas** (§7) y llenar el **checklist** (§6).

---

## 9. Límite de alcance (honesto)

Este entorno **no abre ni edita el B-rep** de 22 MB del `sorter_CO.stp` ni hace
*mate* CAD contra él. La interfaz se derivó de los **datos del STEP** (tipos de
rodamiento, eje Ø20, M6, riel T-slot) y el módulo se diseñó **paramétrico y
ajustable** para calzar por **calibración**, no por una cota exacta adivinada.
Para el *mate* exacto en tu CAD hacen falta 2 anclas que confirmes: **cota del
plano de banda** y **posición del riel T-slot** más cercano al hueco de
transferencia; con eso se fija el nominal y el rango de ajuste (±7) lo absorbe.
El generador (`gen_transfer90.mjs`) tiene esas cotas como parámetros.
