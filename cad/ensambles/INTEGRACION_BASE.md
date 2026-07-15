# Integración del módulo de desviación 90° con el equipo base

Documento de ingeniería para montar el **módulo de transferencia 90°**
(`transfer_rodillos_90.json`) sobre el **equipo base** entregado en STEP
(`sorter_CO.stp`) **sin modificarlo**, con preensambles verificables, ajustes
documentados y permisibles, y control de calidad.

Capa `user` (diseño): las cotas son nominales de diseño; se **calibran** en
montaje contra el equipo real. Ver la última sección (límite de alcance).

---

## 1. Equipo base — interfaz leída del STEP

Del `sorter_CO.stp` (B-rep AP214, 704 piezas) se extrajo el **idioma de
hardware** del base, que el módulo respeta:

| Elemento del base | Lo que impone al módulo |
|---|---|
| Chumaceras **SKF UCFL 205 / UC 205** y **SKF 1206** | los rodamientos del módulo pasan a **unidades de brida UCFL** (no rodamientos desnudos) |
| **Ejes Ø20 H7** (locking LK30-C65-20H7) | ejes del módulo **Ø20 h6** |
| Transmisión **AT10 32T** (drive kit w/ timing) | el módulo conserva banda plana, pero comparte tornillería y montaje |
| **Rieles T-slot** + tornillería **M6 / 1/4-28 UNF** | montaje del módulo a **riel T-slot con tuercas en T M6** |

**No se modifica ninguna pieza del base.** Lo único permitido (tu instrucción)
son perforaciones en piezas **añadidas** y el uso de puntos de fijación
existentes (ranuras T-slot).

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
| 6 rodillos Ø40 | eje Ø12 fijo + 2×6901 internos + tuerca M10 | **eje Ø20 h6 que gira en 2 chumaceras UCFL204** (una por placa); rodillo con **chaveta 6×6** al eje |
| Tambor motriz | eje Ø25 + 6205 en portarodamiento + seegers | **1 UCFL204** (placa +X) + apoyo en el **rodamiento de salida del motor** (placa −X); **SIT-LOCK 20×28** fija el tambor (sin chaveta) |
| Tensores/retornos (idlers) | 6901 / bujes | **bujes de bronce SAE 841** Ø18/Ø12.2 (sin mantenimiento, sin rodamiento desnudo) + retención M6 |
| Acople motor↔eje | — | **2 chavetas DIN 6885 A 6×6** |

**Por qué UCFL204** (responde a "los rodamientos no me convencen"): es la
misma familia que el base (UCFL/UC 205), **autoalineante** (tolera desalineo
de las placas), **engrasable** y **serviciable** (se cambia sin desarmar el
eje), con **collar excéntrico** que fija axialmente. Los idlers, de baja
carga y velocidad, van a **buje de bronce** — mantenimiento nulo. Resultado:
**ningún rodamiento de bolas desnudo** en el módulo.

---

## 4. Preensambles (SA) — el usuario los arma y verifica por separado

| SA | Contenido | Verificación de armado | Tolerancia / ajuste |
|---|---|---|---|
| **SA-1 Canal + anclaje** | canal fijo, 4 pies T-slot, shims, electroválvula | escuadra del canal; pies a ras; ranuras T libres | planitud canal 0.5/m; pies coplanares ±0.2 |
| **SA-2 Elevación** | 2 cilindros ISO 6432, rótulas, palancas, soportes/horquillas, puentes | la palanca gira libre; leva toca el puente; carrera cilindro 10 → sube 6 | pernos Ø8/Ø8.2 (juego 0.2); bujes bronce en palanca |
| **SA-3 Cassette de rodillos** | 2 placas peine, 6 ejes Ø20 + rodillos + chavetas, 12 UCFL204 | eje gira a mano sin punto duro; juego axial por collar excéntrico | eje Ø20 h6 / UCFL bore 20; rodillo Ø20 H7 + chaveta |
| **SA-4 Transmisión** | tambor + SIT-LOCK, eje tambor, 1 UCFL204, tensores/retornos + bujes, banda 35×3, motorreductor + acople + chavetas | serpentín envuelve todas las poleas; banda al ras del vulcanizado; tambor concéntrico | SIT-LOCK apriete par nominal; tensado ±5 en colisa |
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
- [ ] Rodillos: concentricidad Ø40 respecto al barreno ≤ 0.1; vulcanizado sin poros.
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
2. **Giro de rodillos:** arrancar motor → los 6 rodillos giran al mismo sentido
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
