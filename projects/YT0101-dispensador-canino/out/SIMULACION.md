# Simulación de croqueta grano a grano — YT0101

Generado 2026-07-26T16:42:55+00:00. Capa `user`: es un MODELO, no una medición del aparato físico.


## 1. Qué se puso a prueba

La verificación G-DIS mide geometría. Tres cosas quedaban fuera de su alcance y eran supuestos:

| Supuesto del diseño | Cómo estaba justificado | Qué dice ahora la simulación |
|---|---|---|
| La cavidad se llena al None | declarado, «conservador» | — medido sobre el lecho |
| El agitador es obligatorio | deducido del criterio de Jenike | —: — g con, — g sin |
| El bisel desvía la croqueta sin partirla | esperado | fuerza máxima None N contra [64.0, 135.0] N de rotura |

## 2. El grano: de dónde sale cada número

Ninguno es de croqueta de perro medida contra PLA. **Esa fuente no existe**; lo que hay es lo siguiente, con su distancia al material real declarada.

| Parámetro | Valor | Origen |
|---|---|---|
| Densidad de partícula | 540 kg/m³ | croqueta de perro seca, MEDIDA (calibre + balanza) |
| Restitución | 0.533 | EXTRAPOLADO: pellet de acuicultura extruido flotante contra ABS |
| Fricción grano-pared | 0.331 | EXTRAPOLADO de ABS; el PLA da COF menor → es cota superior |
| Fricción grano-grano | 0.5 | SIN FUENTE: adoptado dentro del rango de fricción interna del lecho |
| Fricción de rodadura | 0.8 | CALIBRADO contra el ángulo de reposo publicado |
| Rigidez normal | 10000 N/m | elección numérica; solape medido None% del radio |

### Calibración

Barrido de fricción de rodadura contra el ángulo de reposo publicado (27.0–38.0°):

| μ rodadura | Ángulo de reposo simulado | Granos |
|---|---|---|
| 0.15 | 14.19° | 429 |
| 0.3 | 21.67° | 429 |
| 0.5 | 25.4° | 429 |
| 0.8 | 28.26° ← | 429 |

Contraprueba independiente: con ese grano el modelo empaqueta a **φ = 0.4864** y da una densidad aparente de **0.2627 g/ml**, contra los 0.4 g/ml citados del fabricante. La densidad aparente NO es un parámetro de entrada: sale del tamaño de grano, de la densidad de partícula y del empaquetamiento que consigue la gravedad, así que sirve de control del modelo.


## 3. Resultados


## 4. Gate G-SIM

| Prueba | Qué comprueba | Veredicto |
|---|---|---|
| S1 | La corrida es numéricamente limpia | **PASA** |
| S2 | El grano calibrado cae en el ángulo de reposo publicado | **PASA** |
| S3 | La densidad aparente del modelo contra la citada | **ADVERTENCIA** |
| S4 | Entrega alimento en todos los golpes (no se atasca) | **FALLA** |

**S3 — ADVERTENCIA.** discrepancia ≤ 15% con la densidad aparente citada. Medido: `{"densidad_simulada_g_ml": 0.2627, "densidad_citada_g_ml": 0.4, "discrepancia_pct": 34.3, "fraccion_empaquetamiento": 0.4864, "densidad_particula_kg_m3": 540.0}`. Acción: la densidad aparente citada y la densidad de partícula publicada no son del mismo producto: hay que medir el alimento real

**S4 — FALLA.** ningún golpe entrega menos de la mitad del mayor, y ninguno sale vacío. Medido: `{"por_golpe_g": []}`. Acción: revisar el criterio anti-arco y la geometría del cuello

## 5. Lo que esta simulación NO demuestra

- **No es el aparato.** Es un modelo de esferas con fricción de rodadura sobre las mallas del proyecto. La croqueta real no es una esfera: la rodadura la sustituye de forma aproximada y calibrada, no exacta.
- **Ningún parámetro de contacto es de croqueta contra PLA.** El más cercano es pellet extruido flotante contra ABS. La dirección del error se conoce (el PLA roza menos), la magnitud no.
- **Las paredes están resueltas a ±0.62 mm** por el muestreo del campo de distancia; es del orden del 5% del tamaño de grano.
- **No hay desgaste, ni humedad, ni finos.** El polvo del fondo del saco cambia la fricción y no está modelado.
- **La dosis definitiva se sigue pesando** con el alimento real: `out/ENSAMBLE.md` §5. Esta simulación acota lo que se espera encontrar, no lo reemplaza.
