# Verificación funcional — YT0101-dispensador-canino

Generado: 2026-07-26T06:48:51+00:00 · capa `user` (diseño, no medición).

**Veredicto: PASA_CON_ADVERTENCIAS** (13 pruebas, 0 fallas, 2 advertencias)

| Prueba | Qué comprueba | Resultado |
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

## V1 — Todas las piezas son sólidos cerrados (imprimibles)

- **Resultado:** PASA
- **Criterio:** malla estanca (watertight) en el 100% de las piezas
- **Medido:** `{"no_estancas": [], "total": 23}`
- **Acción / nota:** revisar la operación booleana de la pieza indicada

## V2 — Cada pieza cabe en la cama declarada

- **Resultado:** PASA
- **Criterio:** envolvente ≤ [220.0, 220.0, 250.0]
- **Medido:** `{"exceden": {}, "cama_mm": [220.0, 220.0, 250.0]}`
- **Acción / nota:** partir la pieza o cambiar la cama en params.json

## V3 — El cajón recorre toda la carrera sin chocar con las piezas fijas

- **Resultado:** PASA
- **Criterio:** solape ≤ 25.0 mm³ en los 21 pasos de la carrera
- **Medido:** `{"solape_maximo_mm3": 0.0, "pasos": 21, "detalle": "[21 pasos]"}`
- **Acción / nota:** aumentar corredera_holgura o revisar la geometría del canal

## V4 — Con el cajón afuera, la boca de la tolva queda obturada

- **Resultado:** PASA
- **Criterio:** cobertura ≥ 99.5% de la boca de carga
- **Medido:** `{"cobertura": 1.0, "volumen_sonda_mm3": 13068.0}`
- **Acción / nota:** alargar la falda obturadora (sello_tabique) del cajón

## V5 — La cavidad entrega la dosis objetivo con el alimento de diseño

- **Resultado:** PASA
- **Criterio:** error ≤ 15.0% frente a la dosis objetivo
- **Medido:** `{"volumen_cavidad_medido_ml": 139.1, "volumen_nominal_ml": 139.1, "dosis_g": 50.1, "dosis_rango_g": [37.5, 56.3], "error_pct": 0.2, "objetivo_g": 50.0}`
- **Acción / nota:** ajustar cavidad_z en params.json y regenerar

## V6 — Cremallera y piñón engranan con la distancia correcta

- **Resultado:** PASA
- **Criterio:** línea primitiva de la cremallera tangente al primitivo del piñón (±0.25 mm) y carrera por barrido = carrera necesaria (±0.5 mm)
- **Medido:** `{"radio_primitivo_mm": 27.5, "distancia_montaje_mm": 27.5, "error_mm": 0.0, "backlash_mm": 0.3, "carrera_por_barrido_mm": 58.99, "carrera_necesaria_mm": 59.0, "barrido_palanca_deg": 122.9, "dientes": 22, "modulo": 2.5, "angulo_presion": 20.0}`
- **Acción / nota:** corregir x_pinon o el módulo/dientes

## V6c — La cremallera queda engranada en los dos extremos de la carrera

- **Resultado:** PASA
- **Criterio:** el eje del piñón (y=0) cae dentro de la cremallera en ambos extremos, con ≥5 mm de margen
- **Medido:** `{"tramo_cremallera_cargado_mm": [-72.7, 13.7], "tramo_cremallera_descargado_mm": [-13.7, 72.7], "posicion_pinon_mm": 0.0, "margen_de_engrane_mm": 13.7}`
- **Acción / nota:** recentrar y_cremallera_local o alargar la cremallera

## V6b — El piñón no sufre socavado (undercut) a 20°

- **Resultado:** PASA
- **Criterio:** z ≥ 17 dientes con ángulo de presión de 20°
- **Medido:** `{"dientes": 22, "minimo_recomendado": 17}`
- **Acción / nota:** subir el número de dientes o corregir el perfil

## V7 — Boca de carga (abertura rasgada) sobre el criterio anti-arco

- **Resultado:** PASA
- **Criterio:** ancho ≥ 3.0× la croqueta (abertura en cuña; la circular exige 6.0×)
- **Medido:** `{"ancho_mm": 45.0, "croqueta_mm": 12.0, "razon": 3.75, "esbeltez": 2.22}`
- **Acción / nota:** ensanchar cavidad_y

## V7b — Cuello del bidón (abertura circular) sobre el criterio anti-arco

- **Resultado:** ADVERTENCIA
- **Criterio:** Ø interior ≥ 6.0× la croqueta
- **Medido:** `{"diametro_interior_mm": 50.0, "croqueta_mm": 12.0, "razon": 4.17, "croqueta_max_sin_agitador_mm": 8.3, "agitador_montado": true}`
- **Acción / nota:** el cuello NO cumple para croqueta de 12 mm: el agitador es OBLIGATORIO, o bien usar croqueta ≤ 8.3 mm, o montar el adaptador de hombro (variante B, que elimina el cuello como sección crítica)

## V8 — Voladizos dentro de lo imprimible sin soportes

- **Resultado:** ADVERTENCIA
- **Criterio:** < 6% del área de cada pieza por debajo de 45.0° en su orientación de impresión
- **Medido:** `{"piezas_con_voladizo_pct": {"est_pie": 18.3, "est_escuadra_muro": 18.0, "agua_boquilla": 10.3, "agua_difusor": 11.3, "ali_corredera": 13.8, "ali_agitador": 9.8, "ali_chute": 7.8}, "limite_deg": 45.0}`
- **Acción / nota:** reorientar la pieza en el laminador o activar soportes solo en ella

## V9 — Columnas y anillo soportan el bidón lleno

- **Resultado:** PASA
- **Criterio:** factor de seguridad ≥ 3.0 en aplastamiento y pandeo
- **Medido:** `{"carga_total_N": 205.0, "carga_por_columna_N": 68.3, "tension_MPa": 0.26, "fs_aplastamiento": 176.0, "fs_pandeo_columna_impresa": 5.0, "area_perfil_impreso_mm2": 267.3, "area_perfil_macizo_mm2": 400.0, "empuje_lateral_para_volcar_N": 72.5, "radio_base_mm": 232.2}`
- **Acción / nota:** con 73 N de empuje lateral el conjunto vuelca: la escuadra de muro (est_escuadra_muro) es OBLIGATORIA en la unidad de alimento

## V10 — Bebedero de nivel constante coherente (principio de Mariotte)

- **Resultado:** PASA
- **Criterio:** borde inferior de las ventanas = nivel declarado (±0.5 mm) y ≥ 25 mm de margen hasta el borde del plato
- **Medido:** `{"nivel_equilibrio_mm": 38.0, "borde_ventanas_difusor_mm": 38.0, "margen_hasta_el_borde_mm": 34.0, "agua_en_el_plato_ml": 969.0, "autonomia_total_l": 21.0, "ajuste_de_nivel_mm": 60.0}`
- **Acción / nota:** corregir z_difusor o el alto del bebedero
