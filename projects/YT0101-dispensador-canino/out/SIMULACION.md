# Simulación de croqueta grano a grano — YT0101

Generado 2026-07-26T18:00:13+00:00. Capa `user`: es un MODELO, no una medición del aparato físico.


## 1. Qué se puso a prueba

La verificación G-DIS mide geometría. Tres cosas quedaban fuera de su alcance y eran supuestos:

| Supuesto del diseño | Cómo estaba justificado | Qué dice ahora la simulación |
|---|---|---|
| La cavidad se llena al 0.9 | declarado, «conservador» | 1.205 medido (fracción sólida 0.4221 contra 0.3505 del lecho libre) |
| El agitador es obligatorio | deducido del criterio de Jenike | ADVERTENCIA: 29.96 g con, 31.04 g sin |
| El bisel desvía la croqueta sin partirla | esperado | fuerza máxima 26.49 N contra [64.0, 135.0] N de rotura |

## 2. El grano: de dónde sale cada número

Ninguno es de croqueta de perro medida contra PLA. **Esa fuente no existe**; lo que hay es lo siguiente, con su distancia al material real declarada.

| Parámetro | Valor | Origen |
|---|---|---|
| Densidad de partícula | 540 kg/m³ | croqueta de perro seca, MEDIDA (calibre + balanza) |
| Restitución | 0.533 | EXTRAPOLADO: pellet de acuicultura extruido flotante contra ABS |
| Fricción grano-pared | 0.331 | EXTRAPOLADO de ABS; el PLA da COF menor → es cota superior |
| Fricción grano-grano | 0.5 | SIN FUENTE: adoptado dentro del rango de fricción interna del lecho |
| Fricción de rodadura | 0.8 | CALIBRADO contra el ángulo de reposo publicado |
| Rigidez normal | 10000 N/m | elección numérica; solape medido 35.0% del radio |

### Calibración

Barrido de fricción de rodadura contra el ángulo de reposo publicado (27.0–38.0°):

| μ rodadura | Ángulo de reposo simulado | Granos |
|---|---|---|
| 0.15 | 14.19° | 429 |
| 0.3 | 21.67° | 429 |
| 0.5 | 25.4° | 429 |
| 0.8 | 28.26° ← | 429 |
| 1.2 | 29.98° | 429 |
| 1.8 | 24.18° | 429 |

Contraprueba independiente: con ese grano el modelo empaqueta a **φ = 0.4864** y da una densidad aparente de **0.2627 g/ml**, contra los 0.4 g/ml citados del fabricante. La densidad aparente NO es un parámetro de entrada: sale del tamaño de grano, de la densidad de partícula y del empaquetamiento que consigue la gravedad, así que sirve de control del modelo — y aquí NO cuadra.

Merece la pena separar las dos razones, porque no dicen lo mismo:

1. **Las fuentes citadas se contradicen entre sí.** La densidad aparente del fabricante (0.4 g/ml) junto con la densidad de partícula medida de croqueta (540 kg/m³) exigiría empaquetar por encima del máximo físico de un lecho de esferas (0.64). No pueden ser el mismo producto.
2. **Con esferas no se puede acertar todo a la vez.** La rodadura alta que hace falta para levantar el talud de un grano no esférico deja el lecho suelto. Se puede reproducir el ángulo de reposo o el empaquetamiento, no los dos. Aquí se eligió el ángulo de reposo, porque lo que se está preguntando es de FLUJO: si arquea, si el agitador sirve, si la cavidad se llena.

Consecuencia práctica, y es la que importa: **las masas que salen de esta simulación están sesgadas a la baja**. El resultado utilizable es el FACTOR DE LLENADO —un cociente entre la fracción sólida de la cavidad y la del lecho libre, donde el sesgo se cancela—, no los gramos. La cavidad entrega un VOLUMEN verificado sobre la malla (prueba V5); convertirlo a gramos exige la densidad aparente del alimento real, medida con balanza.


## 3. Resultados


### base

644 granos de 12.0 mm, 3 golpes de 1.1 s, dt = 3e-05 s.

| Golpe | Masa descargada |
|---|---|
| 1 | 31.11 g |
| 2 | 30.05 g |
| 3 | 28.73 g |

Media **29.96 g**, desviación 1.19 g.


### sin agitador

644 granos de 12.0 mm, 3 golpes de 1.1 s, dt = 3e-05 s.

| Golpe | Masa descargada |
|---|---|
| 1 | 30.49 g |
| 2 | 30.02 g |
| 3 | 32.61 g |

Media **31.04 g**, desviación 1.38 g.


## 4. Gate G-SIM

| Prueba | Qué comprueba | Veredicto |
|---|---|---|
| S1 | La corrida es numéricamente limpia | **FALLA** |
| S2 | El grano calibrado cae en el ángulo de reposo publicado | **PASA** |
| S3 | La densidad aparente del modelo contra la citada | **ADVERTENCIA** |
| S4 | Entrega alimento en todos los golpes (no se atasca) | **PASA** |
| S5 | El factor de llenado declarado contra el simulado | **PASA** |
| S6 | La dosis simulada cae en el rango de diseño | **ADVERTENCIA** |
| S7 | El agitador cambia el comportamiento del cuello | **ADVERTENCIA** |
| S8 | La fuerza de contacto no llega a romper la croqueta | **ADVERTENCIA** |

**S1 — FALLA.** solape < 2% del radio (rigidez suficiente) y ningún contacto acotado. Medido: `{"solape_max_pct_radio": 35.0, "contactos_acotados": 15709}`. Acción: subir rigidez_normal_N_m y bajar dt_s en params.json

**S3 — ADVERTENCIA.** discrepancia ≤ 15% con la densidad aparente citada. Medido: `{"densidad_simulada_g_ml": 0.2627, "densidad_citada_g_ml": 0.4, "discrepancia_pct": 34.3, "fraccion_empaquetamiento": 0.4864, "densidad_particula_kg_m3": 540.0}`. Acción: Dos causas distintas y las dos hay que decirlas. (1) Las fuentes se contradicen: la densidad aparente del fabricante y la densidad de partícula publicada exigirían un empaquetamiento por encima del máximo físico de un lecho de esferas, así que no son del mismo producto. (2) Con esferas se puede reproducir el ÁNGULO DE REPOSO o el EMPAQUETAMIENTO, no los dos: la rodadura alta que hace falta para el talud de un grano no esférico deja el lecho suelto. Se eligió acertar el flujo, que es lo que se está preguntando. Consecuencia: las masas simuladas salen BAJAS y el resultado que vale es el FACTOR DE LLENADO (un cociente, donde el sesgo se cancela), no los gramos. Los gramos se calibran con balanza.

**S6 — ADVERTENCIA.** dosis media dentro de [37.6, 56.3] g (rango por densidad del alimento). Medido: `{"dosis_simulada_g": 29.96, "desviacion_g": 1.19, "rango_diseno_g": [37.6, 56.3], "objetivo_g": 50.0}`. Acción: recalibrar pesando cinco golpes con el alimento real

**S7 — ADVERTENCIA.** sin agitador la entrega cae al menos a la mitad (si no, el agitador no está justificado por esta simulación). Medido: `{"con_agitador_g": 29.96, "sin_agitador_g": 31.04, "por_golpe_sin": [30.49, 30.02, 32.61]}`. Acción: si el aparato dosifica igual sin agitador, decirlo: sobra una pieza

**S8 — ADVERTENCIA.** fuerza máxima de contacto por debajo de 64.0 N (rotura mínima publicada de croqueta de perro), Y con el solape dentro del rango de validez del contacto blando (<10% del radio). Medido: `{"fuerza_max_N": 26.49, "carga_rotura_N": [64.0, 135.0], "solape_max_pct_radio": 35.0, "concluyente": false}`. Acción: NO CONCLUYENTE: el solape máximo se salió del rango de validez, así que la fuerza medida es una COTA INFERIOR de la real. Para zanjarlo hay que subir rigidez_normal_N_m y bajar dt_s, que multiplica el tiempo de cálculo.

## 5. Lo que esta simulación NO demuestra

- **No es el aparato.** Es un modelo de esferas con fricción de rodadura sobre las mallas del proyecto. La croqueta real no es una esfera: la rodadura la sustituye de forma aproximada y calibrada, no exacta.
- **Ningún parámetro de contacto es de croqueta contra PLA.** El más cercano es pellet extruido flotante contra ABS. La dirección del error se conoce (el PLA roza menos), la magnitud no.
- **Las paredes están resueltas a ±0.62 mm** por el muestreo del campo de distancia; es del orden del 5% del tamaño de grano.
- **No hay desgaste, ni humedad, ni finos.** El polvo del fondo del saco cambia la fricción y no está modelado.
- **La dosis definitiva se sigue pesando** con el alimento real: `out/ENSAMBLE.md` §5. Esta simulación acota lo que se espera encontrar, no lo reemplaza.
