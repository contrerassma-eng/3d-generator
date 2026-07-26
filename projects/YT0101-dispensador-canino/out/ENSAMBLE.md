# ARMADO, CALIBRACIÓN Y USO — Dispensador canino YT0101

Generado: 2026-07-26T07:30:09+00:00

## 1. Antes de imprimir: medir el bidón

Consigue el botellón de 20 L que vas a usar y mide con calibre:

| Qué medir | Parámetro en `input/params.json` | Valor de partida |
|---|---|---|
| Ø exterior de la boca | `bidon.dia_boca_ext` | 55 mm |
| Alto del cuello (labio → hombro) | `bidon.altura_cuello` | 32 mm |
| Ø del hombro donde apoyará el anillo | `bidon.dia_asiento_hombro` | 180 mm |

Si alguno difiere más de 2 mm, corrige el archivo y vuelve a generar:

```bash
python pipeline/gen_dispensador.py projects/YT0101-dispensador-canino
python pipeline/verifica_dispensador.py projects/YT0101-dispensador-canino
```

## 2. Impresión

Ajustes generales: capa 0.2 mm · boquilla 0.4 mm · 4 perímetros · relleno 35% · material PLA.
Para el piñón y la cremallera: 5 perímetros y 40% de relleno ([gear_infill_recomendado](https://howtomechatronics.com/how-it-works/how-to-3d-print-gears-the-ultimate-guide/) — «I recommend a minimum of 35% infill when 3D printing gears, and up to 100% infill if needed... the wall line count, which I recommend to be 5 or more»).

Los STL salen **ya girados a su posición de impresión**: cárgalos tal cual.
La lista completa con cantidades y gramos está en `LISTA_IMPRESION.csv`.

## 3. Armado del módulo base (igual para los dos aparatos)

1. Corta tres columnas de perfil 20×20 mm:
   **33 cm** para el bebedero, **57 cm** para el dosificador.
2. Une los tres segmentos del anillo con dos M4×20 por junta.
3. Mete cada columna en su abrazadera del anillo y aprieta los dos M4×35.
4. Repite con el anillo inferior de arriostre (misma pieza) a unos 150 mm del suelo.
5. Calza los pies y pega el fieltro antideslizante en el rebaje.
6. **Cabezal de alimento: atornilla la escuadra de muro.** No es opcional
   (ver memoria §8: el conjunto vuelca con un empujón lateral moderado).

## 4. Cabezal de alimento

1. Atornilla `ali_canal_base` al anillo por sus dos orejas.
2. Mete `ali_corredera` por la boca trasera del canal; debe deslizar sola,
   sin forzar (holgura de diseño 0.35 mm por lado). Si roza, lija
   suave los patines; **no** limes la cavidad, que es la que mide la dosis.
3. Tapa con `ali_canal_tapa` y aprieta los cuatro M4×30.
4. Enfila `ali_eje_pinon` por la torre, monta `ali_pinon` a media altura
   (tiene que engranar con la cremallera del cajón) y fija con el pasador Ø3.
5. Encaja `ali_palanca` en el hexágono superior del eje **apuntando al sector
   libre entre columnas** (con el cajón dentro debe quedar a unos 70° del
   frente, girando hacia la izquierda al tirar). Si la montas en otra posición
   del hexágono, el brazo golpea una columna a mitad de barrido.
6. Mueve la palanca de tope a tope: el cajón debe recorrer 59 mm y la
   cavidad quedar exactamente bajo la boca de carga en un extremo y sobre la
   de descarga en el otro.
7. Monta el agitador en el adaptador, la manivela en su punta hexagonal y
   la biela entre manivela y oreja del cajón (M4 con tuerca **floja**: es una
   articulación, no una unión).
8. Atornilla `ali_chute` bajo la boca de descarga.
9. Corta el bidón y monta el adaptador (§4.1 o §4.2).

### 4.1 Variante A — cuello del bidón (recomendada para croqueta ≤ 8 mm)

1. Con el bidón boca abajo, marca y corta en su **base** (que ahora queda
   arriba) una boca de carga de Ø150 mm. Sierra de calar de dientes finos o
   cuchillo caliente; desbarba el canto con lija 180.
2. Calza `ali_adaptador_cuello` sobre el cuello y aprieta sus dos M4.
3. Atornilla el adaptador a la brida de la tapa del canal (4 × M4×16).

### 4.2 Variante B — corte en el hombro (para croqueta de 11-16 mm)

1. Corta el bidón **donde el hombro mide Ø152 mm** y descarta el cuello.
2. Corta también la boca de carga en la base, igual que en la variante A.
3. Apoya el canto cortado dentro de la garganta de `ali_adaptador_hombro`:
   sostiene por gravedad, no necesita apriete.

Con esta variante desaparece la sección crítica del cuello y el criterio
anti-arco se cumple en todo el camino.

## 5. Calibración de la dosis (el paso que no se puede saltar)

La dosis calculada es de **50 g** con alimento de 0.40 g/ml, pero cada
marca pesa distinto (el rango real da entre 38 y 56 g). Para saber la tuya:

1. Carga el bidón con el alimento que usas de verdad.
2. Da **cinco golpes completos** de palanca sobre un recipiente en la balanza.
3. Divide el total por 5 → esa es tu dosis real por golpe.
4. Anótala: `densidad_real = dosis_medida_g / 139.1 ml / 0.90`, y escribe ese valor en
   `input/params.json` → `alimento.densidad_aparente_g_ml`.
5. Registra la medición en la bitácora del proyecto:

```bash
python pipeline/lib_audit.py log projects/YT0101-dispensador-canino \
  "calibracion: 5 golpes = <XXX> g con <marca> -> dosis real <YY> g/golpe"
```

Repite la calibración cada vez que cambies de marca de alimento.

### Cuántos golpes por comida

| Perro | Ración diaria | Por comida (2/día) | Golpes |
|---|---|---|---|
| 5 kg | 85 g | 42 g | 0.8 |
| 10 kg | 150 g | 75 g | 1.5 |
| 20 kg | 230 g | 115 g | 2.3 |
| 30 kg | 340 g | 170 g | 3.4 |
| 40 kg | 410 g | 205 g | 4.1 |

(Ración según [racion-royalcanin-mediana](https://mypawsafe.com/royal-canin-feeding-guide-by-breed-size-and-age/) — «15 kg dog: 190g per day / 20 kg dog: 230g per day / 25 kg dog: 270g per day [...] twice-daily feeding». Consulta a tu veterinario:
estas tablas son del fabricante del alimento, no una prescripción.)

## 6. Cabezal de agua

1. Arma la cadena del bajante de abajo hacia arriba: difusor → tubo de nivel
   → tramo fijo → boquilla.
2. Da 2-3 vueltas de cinta de teflón en las acanaladuras de la boquilla y
   métela en el cuello del bidón hasta que la brida tope en el labio.
3. Pon el collar partido sobre el cuello y aprieta.
4. Invierte el bidón sobre el anillo — **entre dos personas: son 21 kg**.
5. Centra el plato bajo el bajante.
6. Ajusta la altura del tubo deslizante hasta que el agua se estabilice en la
   marca de nivel del plato (38 mm). Cada marca del tubo = 10 mm.

Si el agua no para de salir: la boquilla no está sellando (revisa el teflón)
o el difusor quedó por encima del nivel. Si no sale nada: el difusor está
apoyado en el fondo del plato, súbelo.

## 7. Uso diario

- **Alimento:** un golpe de palanca completo por dosis. De tope a tope; a
  medio camino la cavidad no llega a descargar del todo.
- Si la palanca se traba, **no fuerces**: devuélvela y repite. Casi siempre
  es una croqueta atravesada en el canto de corte y el vaivén la acomoda.
- **Agua:** revisar el nivel una vez al día; rellenar el bidón cuando quede
  bajo el hombro.

## 8. Limpieza

| Cada | Qué |
|---|---|
| Semana | Sacar el cajón (ver abajo) y lavarlo con agua y jabón |
| Semana | Lavar el plato del bebedero |
| Mes | Desmontar el bajante y limpiar el difusor |
| Cambio de saco | Vaciar el bidón y aspirar el polvo de croqueta del canal |

### Cómo se saca el cajón

La cremallera está engranada con el piñón, así que el cajón **no** sale de
un tirón. Son tres movimientos:

1. Saca el pasador Ø3 de la parte baja del eje del piñón.
2. Levanta el eje (con la palanca puesta hace de asa) hasta que el piñón
   salga de su alojamiento en la torre.
3. Ahora el cajón sale tirando hacia atrás.

Para volver a montarlo, el orden inverso: cajón dentro, eje abajo con el
piñón engranando en la cremallera, pasador puesto.

Agua y jabón bastan: [pla_limpieza_efectiva](https://hackaday.com/2022/09/05/food-safe-3d-printing-a-study/) — «ordinary dish soap and water are totally sufficient to remove 90% or more of all of the pathogens... even those pesky biofilms could be quickly dispat…»
**No** lavar en lavavajillas: el PLA se deforma cerca de los 60 °C.

## 9. Si algo no funciona

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Sale menos alimento del esperado | croqueta grande, cavidad mal llena | recalibrar; probar variante B |
| No sale nada y el bidón está lleno | arco en el cuello | mover la palanca 2-3 veces; montar variante B |
| La palanca se traba siempre en el mismo punto | rebaba en el carril | lijar el patín, nunca la cavidad |
| Cae alimento con el cajón afuera | falda obturadora mal montada | revisar que la tapa apriete el canal |
| El plato rebalsa | boquilla sin sellar | rehacer el teflón |
| El agua no baja | difusor tocando el fondo | subir el tubo deslizante |
