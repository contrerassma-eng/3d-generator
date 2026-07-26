# MEMORIA DE DISEÑO — Dispensador canino YT0101

Generado: 2026-07-26T06:48:56+00:00 · Capa `user` (diseño paramétrico, no medición).
Cada cota nace de `input/params.json`; cada dato externo está citado en
`input/web_facts.json` con URL, fecha de acceso y cita textual.

## 1. Qué se pidió y qué se construyó

Dos aparatos mecánicos para un perro, ambos con estanque de bidón de 20 L:

| | Cabezal de ALIMENTO | Cabezal de AGUA |
|---|---|---|
| Principio | Cajón dosificador de cavidad fija | Nivel constante (botella de Mariotte) |
| Accionamiento | Palanca → piñón m2.5 z22 → cremallera | Ninguno: se autorregula |
| Entrega | 50 g por golpe | Nivel fijo de 38 mm |
| Bidón | Recortado (boca de carga Ø150) | Íntegro |
| Autonomía | 159 dosis (8 kg) | 21.0 L |
| Altura total | 943 mm | 705 mm |

Nada de electrónica, motores ni baterías. Ningún resorte impreso.

## 2. El bidón de 20 L como estanque

El botellón chileno de agua purificada resulta ser el mismo molde que el
estándar norteamericano de 5 galones, y esto es lo que permite diseñar
piezas que le calzan:

- Cuerpo Ø275 mm y alto 495 mm — [cl-vertientes-altura](https://www.agualasvertientes.cl/producto/recarga-botellon-20-litros-agua-purificada/) — «Alto 49.5 cm, diámetro del cuerpo 27.5 cm, diámetro de boca: 5.6 cm»
- Boca Ø55 mm (crown, NO es una rosca) — [us-5gal-steelhead-neck](https://steelheadinc.com/product/polycarbonate-water-cooler-bottle/) — «3-Gallon PC Bottle: 11.4 L capacity, 55mm crown top neck. 5-Gallon PC Bottle: 18.9 L capacity, 55mm crown top neck.»
- Peso lleno 20.9 kg — [us-5gal-peso-lleno](https://thecookingfacts.com/what-are-the-dimensions-of-a-5-gallon-water-bottle/) — «the total weight of the bottle ranges from 40 to 45 pounds»

**Aviso de tolerancia:** entre marcas la boca va de 48 a 56 mm
([cl-vertientes-diametro-boca](https://www.agualasvertientes.cl/producto/recarga-botellon-20-litros-agua-purificada/) — «diámetro de boca: 5.6 cm»). El collar del cuello es partido y
aprieta con dos tornillos, así que absorbe esa variación; aun así hay que
medir el envase real con calibre y corregir `params.json` antes de imprimir
la serie definitiva. Las cotas del hombro del envase son un **supuesto
declarado**, no un dato de catálogo: ninguna ficha pública las publica.

## 3. Por qué un cajón dosificador y no una rueda de paletas

La rueda de paletas es lo primero que uno dibuja, y es la solución
equivocada para croqueta de perro impresa en PLA:

- La holgura industrial punta-carcasa es de [rotary_clearance_tipica](https://www.powderprocess.net/Pneumatic_Transport/Airlock_Rotary_Valve.html) — «Typical clearance for airlock rotary valves is 0.1 mm and usually ranges from 0.05mm to 0.25 mm depending on the service expected for the valve.».
  Una impresora FDM doméstica no sostiene esa holgura en un diámetro de
  140 mm (tolerancia típica [fdm_tolerancia_general](https://formlabs.com/blog/understanding-accuracy-precision-tolerance-in-3d-printing/) — «± 0.5% (lower limit: ± 0.5 mm)»).
- Con holgura grande, la croqueta se atasca o se parte justo ahí: [rotary_particulas_grandes_riesgo](https://patents.google.com/patent/US4030642A/en) — «When overly large particles get stuck or clipped between the housing and rotor tips, inlet baffles help remove material from the vane tips before it e…».

El cajón de cavidad fija traslada la tolerancia crítica a un ajuste
deslizante PLANO, que es justo donde las guías de impresión dan cifras
utilizables: [fdm_clearance_ajuste_deslizante](https://www.snapmaker.com/blog/3d-printing-tolerances/) — «For a free-sliding fit on a 10mm shaft, you might need to design your hole as 10.5mm to achieve the 0.4mm clearance... Prusa's design guidelines call …». Es además el
mecanismo de los dispensadores de cereal y caramelos: [slide_powder_dispenser_patente](https://patents.google.com/patent/US20090001101A1/en) — «A slider includes a dosage chamber with an opening in both the top surface and the bottom surface... In the first position the dosage chamber is subst…».

## 4. De la ración a la cavidad: cómo sale la dosis

Ración de referencia: perro de 20 kg, [racion-royalcanin-mediana](https://mypawsafe.com/royal-canin-feeding-guide-by-breed-size-and-age/) — «15 kg dog: 190g per day / 20 kg dog: 230g per day / 25 kg dog: 270g per day [...] twice-daily feeding»

- Densidad de diseño: **0.40 g/ml** — [gramos-por-taza-purina](https://www.purina.com/dogs/shop/purina-one-chicken-rice-dry-dog-food) — «1 cup (8 oz measuring cup) = 95 g»
- Rango contemplado: 0.30–0.45 g/ml ([densidad-rango-objetivo-industria](https://www.mdpi.com/2227-9717/13/7/2083) — «the pre-dryer or wet kibble bulk density (304.2–382.5 g/L) was within the typically targeted range of 300–400 g/L for optimal dog food textural hardne…», [gramos-por-taza-championdog](https://www.championdog.cl/producto/adulto/alimento-seco/) — «1 taza = 250 mililitros = 112 gramos»)
- Factor de llenado adoptado: 0.90 — [slide_disco_principio_medicion](https://interplasinsights.com/plastics-machinery/mos-corner-how-do-the-various-types-of-dosing-device-work-part2/) — «they actively meter the material by enclosing the required volume in chambers – similar to measuring using a cup or tablespoon when cooking... any exc…»

```
volumen de cavidad = dosis / (densidad x llenado)
                   = 50 g / (0.40 g/ml x 0.90) = 139.1 ml
cavidad = 100 x 45 x 30.9 mm
```

**Dosis resultante: 50 g por golpe** (entre 38 y 56 g según la marca de alimento).
Con el inserto de media dosis montado, la mitad. Un perro de 20 kg come
230 g/día en dos comidas: **2.3 golpes por comida**.

La dosis NO se declara verificada por catálogo: se calibra pesando cinco
golpes con el alimento real (`ENSAMBLE.md`, §5). Ese es el único número
que convierte el diseño en un dosificador de verdad.

## 5. Que no se forme arco (el fallo clásico de estos aparatos)

Criterio de Jenike, vía Mehos: [regla-6x-arqueo-jenike](https://www.academia.edu/5856350/Follow_these_guidelines_for_proper_design_of_bins_hoppers_and_feeders_to_avoid_operational_and_safety_problems_Handle_Bulk_Solids_Safely_and_Effectively) — «the outlet should be at least six times the largest particle diameter». Para una
abertura rasgada basta la mitad: [arqueo-vs-rathole-geometria](https://www.chemengonline.com/facts-fingertips-hopper-outlet-geometry-arching/?printmode=1) — «The minimum outlet width required to prevent an arch from forming in a wedge-shaped, mass-flow hopper... For a given material, this value is usually a…».

| Sección del camino | Forma | Medida | Exigido | Razón | Resultado |
|---|---|---|---|---|---|
| Boca de carga | rasgada 100×45 | 45 mm | 3× = 36 mm | 3.75× | CUMPLE |
| Cuello del bidón | circular | 50 mm | 6× = 72 mm | 4.17× | NO CUMPLE |

**El cuello del bidón no cumple** para croqueta de 12 mm, y no se
puede tapar ese dato: es la sección estática más estrecha de todo el camino.
Tres salidas, las tres previstas en el diseño:

1. **Agitador obligatorio** (viene montado): cuatro dedos accionados por la
   biela del cajón barren la garganta en cada golpe y rompen el puente.
2. **Croqueta ≤ 8.3 mm**: con ese tamaño el cuello cumple el
   criterio por sí solo ([kibble-tamano-afb-pequena](https://www.afbinternational.com/blog/white_paper/small-dogs-large-kibble/) — «small (7–8 millimeter in diameter)»).
3. **Adaptador de hombro** (`ali_adaptador_hombro`): se corta el envase donde
   mide Ø152 mm y el cuello desaparece del camino. Es la variante de mejor
   flujo y la recomendada para croqueta de raza grande
   ([kibble-tamano-afb-grande](https://www.afbinternational.com/blog/white_paper/small-dogs-large-kibble/) — «large (15–16 millimeter)»).

La pared del adaptador va a 65° respecto de la horizontal, dentro del
rango de flujo másico: [angulo-pared-tolva-DEM-pellets](https://www.mdpi.com/2077-0472/14/4/523) — «the hopper half angle is between 65° and 75°... the MFI ~0.24 is identified as the criterion to distinguish the mass flow from the funnel flow».

> **Vacío de datos declarado.** No existe fuente publicada del ángulo de
> reposo de la croqueta de perro; lo más cercano son pellets de alimento
> animal ([angulo-reposo-pellets-alimento-2015](https://adelbahnasawy.wordpress.com/wp-content/uploads/2014/09/some-engineering-properties-of-different-feed-pellets.pdf) — «the bulk density ranged from 0.64-0.74 g/cm3... The repose angle ranged from 25.67-38.7º.»), que son más
> densos y compactos. Medirlo con el alimento real es parte de la puesta en
> marcha.

## 6. El tren de accionamiento

- Piñón recto de evolvente **m=2.5, z=22**, Ø primitivo 55.0 mm, Ø cabeza 60.0 mm, ángulo de presión 20° ([gear_angulo_presion_estandar](https://meta-matic.com/en/3d/spur-gear/guide/) — «20° pressure angle conforming to JIS B 1701-1 / ISO 53 standard»).
- z=22 > 17: no hay socavado — [gear_min_dientes_20deg](https://meta-matic.com/en/3d/spur-gear/guide/) — «minimum of 17 teeth to avoid undercut that weakens tooth roots at the standard 20° pressure angle».
- Ancho de cara 15 mm = 6× el módulo ([gear_ancho_cara](https://meta-matic.com/en/3d/spur-gear/guide/) — «a face width of about 6–10 times the module (e.g. 12–20 mm for m=2) balances strength and practicality well»).
- Backlash 0.30 mm, extremo holgado del rango recomendado porque el par
  es manual y va a entrar polvo de croqueta: [gear_backlash_flanco](https://kingroon.com/blogs/3d-printing-guides/how-to-get-perfect-3d-printed-gears) — «a suitable backlash value could be anywhere between 0.18–0.3mm... a clearance of around 0.1–0.2 mm is a good starting point between mating gear teeth».
- Un barrido de palanca de **123°** desplaza el cajón 59 mm — exactamente la carrera necesaria (cavidad 45 + tabique 14).
- Ventaja mecánica de la palanca: **6.5:1**.

La cremallera va embutida en el flanco del cajón: las puntas de los dientes
quedan 2 mm por dentro del plano de deslizamiento, así el
piñón entra por la ventana del carril y nada roza (prueba V3).

**Sin resortes.** El accionamiento es positivo en los dos sentidos, porque
[spring_pla_mal_material](https://hackaday.com/2026/04/27/the-challenges-of-3d-printing-reliable-springs/) — «PLA makes for a very poor spring material, so you probably want to skip that one.»

## 7. El agua: nivel constante sin válvula

[mariotte-principio](https://en.wikipedia.org/wiki/Mariotte%27s_bottle) — «The pressure at the bottom of the air inlet is always the same as the pressure outside the reservoir, i.e. the atmospheric pressure... it will always …»

En la práctica: el bidón invertido descarga por el bajante hasta que el agua
tapa las ventanas del difusor; ahí deja de entrar aire y el flujo se detiene.
Cuando el perro bebe y el nivel baja, entra aire y repone. El nivel de
equilibrio es exactamente la cota del borde inferior de esas ventanas:
**38 mm** sobre el fondo del plato, regulable ±30 mm
con el tramo deslizante.

- Agua en el plato: 969 ml · autonomía total 21.0 L.
- Margen hasta el borde del plato: 34 mm (no rebalsa aunque
  el perro empuje el plato).
- No hay válvula de flotador: nada que se pegue, nada que gotee.

## 8. Estructura y seguridad

El bidón lleno pesa 205 N y lo reparten tres columnas de
perfil 20×20 mm inclinadas 12°:

- Carga por columna: 68 N → tensión 0.26 MPa (factor de seguridad 176 frente al aplastamiento).
- Pandeo de Euler de la columna impresa: factor 5.0.
- **Vuelco: bastan 72 N de empuje lateral** con base de 232 mm de radio.

Ese último número es el que manda: un perro mediano empuja bastante más de
72 N. **La escuadra de muro (`est_escuadra_muro`) no es opcional**
en el cabezal de alimento, que es el más alto.

## 9. Contacto con el alimento: qué se puede afirmar y qué no

- La resina PLA está admitida como material de contacto alimentario: [pla_fda_gras](https://scienceinsights.org/is-pla-food-grade-fda-rules-and-safety-limits/) — «The FDA cleared PLA polymers as a food contact substance through Food Contact Notification No. 1926, which allows PLA containing up to 16% D-lactic ac…»
  Eso aplica a la RESINA, no garantiza que la pieza impresa lo sea.
- Postura precautoria sobre las líneas de capa: [pla_porosidad_riesgo_biofilm](https://spoolhound.com/food-safety-guide) — «FDM prints contain microscopic voids and layer lines that can trap food and moisture, encouraging bacterial growth and biofilm formation.»
- Evidencia en contra de esa postura: [pla_estudio_thomas_sem](https://hackaday.com/2022/09/05/food-safe-3d-printing-a-study/) — «a typical 3D print does not have any detectable porosity [mediante imágenes SEM]... the grooves from layer lines are vastly oversized compared to bact…»
- Lo que sí está claro es la limpieza: [pla_limpieza_efectiva](https://hackaday.com/2022/09/05/food-safe-3d-printing-a-study/) — «ordinary dish soap and water are totally sufficient to remove 90% or more of all of the pathogens... even those pesky biofilms could be quickly dispat…»

Por eso el cajón sale entero tirando de él, sin herramientas: la pieza que
toca la croqueta se lava. Alimento seco, poco tiempo de contacto y lavado
regular: el riesgo es bajo, pero la discrepancia entre fuentes se declara en
vez de esconderse.

## 10. Resultado de la verificación

**PASA_CON_ADVERTENCIAS** — 13 pruebas, 0 fallas, 2 advertencias (detalle completo en `VERIFICACION.md`).

| | Prueba | Resultado |
|---|---|---|
| V1 | Todas las piezas son sólidos cerrados (imprimibles) | **PASA** |
| V2 | Cada pieza cabe en la cama declarada | **PASA** |
| V3 | El cajón recorre toda la carrera sin chocar con las piezas fijas | **PASA** |
| V4 | Con el cajón afuera, la boca de la tolva queda obturada | **PASA** |
| V5 | La cavidad entrega la dosis objetivo con el alimento de diseño | **PASA** |
| V6 | Cremallera y piñón engranan con la distancia correcta | **PASA** |
| V6c | La cremallera queda engranada en los dos extremos de la carrera | **PASA** |
| V6b | El piñón no sufre socavado (undercut) a 20° | **PASA** |
| V7 | Boca de carga (abertura rasgada) sobre el criterio anti-arco | **PASA** |
| V7b | Cuello del bidón (abertura circular) sobre el criterio anti-arco | **ADVERTENCIA** |
| V8 | Voladizos dentro de lo imprimible sin soportes | **ADVERTENCIA** |
| V9 | Columnas y anillo soportan el bidón lleno | **PASA** |
| V10 | Bebedero de nivel constante coherente (principio de Mariotte) | **PASA** |

## 11. Lo que este diseño todavía no demuestra

Honestidad de ingeniería: la verificación es geométrica y analítica. NO
sustituye al prototipo. Quedan por comprobar en el aparato físico:

1. El factor de llenado real de la cavidad (se supuso 0.90).
2. Si el agitador basta para el cuello del bidón con croqueta de 12 mm.
3. El desgaste del par cremallera-piñón en PLA tras unos miles de ciclos.
4. Que el perro no vuelque el conjunto (de ahí la escuadra de muro).
5. El ángulo de reposo del alimento real.
