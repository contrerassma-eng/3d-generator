# Compra Movex — proyecto LBP530-18 (CV-LBP-5000 + CV-GT-600)

Generado por `cad/ensambles/entregables_lbp530.mjs` desde `lbp530_dims.json`, `lbp530_5m.json` y `lbp530_gt06.json`.
Fecha de datos: 2026-09-09 · Flota: 4 líneas × (1 LBP 5,0 m + 1 GT 0.6 m).
Cotización de referencia: Movex 26012937 (09-07-2026, EUR EXW Castelli Calepio, validez vencida 06-08-2026 → pedir revalidación).

| Pos | Artículo | Descripción | Un. | por LBP | por GT | Flota 4 líneas | Cotizado | EUR unit. | Nota |
|---|---|---|---|---:|---:|---:|---:|---:|---|
| M1 | P5324010018A | Banda Movex 530 LBP LFA 18 in (rollos 1,5 m) | m | 12 | 0 | 48 | 90.3 | 174.85 | lazo real 10.78 m/equipo; lo cotizado (90.3 m) cubre ~2× — repuesto o futuras líneas |
| M2 | P5323010018A | Banda Movex 530 GT (grip top) LFA 18 in (rollos 1,5 m) | m | 0 | 3 | 12 | 18 | 243.18 | lazo real 1.67 m/equipo con L=600; cotizado 18 m |
| M3 | P158808YF | Sprocket moldeado Z-32 PD 153,4 bore cuadrado 1,5 in c/grano M8 | u | 5 | 6 | 44 | 152 | 17.42 | solo en el eje motriz (un eje por equipo, decisión Movex 2026-09-08): LBP 5 (grid A·B·C·B·C·A) · GT 6; solo el central fijo, resto flotante |
| M4 | P21703Y | Collarín de referencia 1,5 × 1,5 in | u | 2 | 2 | 16 | 60 | 2.32 | 2 por eje motriz (flanquean el sprocket central fijo) |
| M5 | P22868 | Nosebar 530 LBP h19 c/rodamientos K=6 in, 6 agujeros, BluLub | u | 6 | 0 | 24 | 51 | 38.73 | 3 × K6 in por punta × 2 puntas; catálogo 2025 p.313: "NoseBar with Bearings for 530 LBP — 22868" |
| M6 | P22862 | Nosebar 530 Series (LBP excluida) h19 c/rodamientos K=6 in | u | 0 | 6 | 24 | 51 | 31 | catálogo 2025 p.312: "NoseBars with Bearings for 530 Series — 22862 K 152,4" |
| M7 | P101203-30 | BAR CAP UHMW 17,53×19,05 p/pletina 12 mm — guía de APOYO (rollo 30 m) | m | 49.04 | 3.53 | 210.28 | 360 | 6.96 | LBP 10 pistas · GT 7 pistas × largo útil; pistas ENTRE carriles de rodillos, luz ≤50 (cat. p.237); comprar 8 rollos |
| M8 | P12501C | Conical rail L 1¼ in AISI304 + Ti-White — guía LATERAL de producto | m | 10 | 1.2 | 44.8 | 105 | 23.08 | ambos costados × largo nose a nose; barras de 3 m → 15 barras |
| M9 | P12201C | Conical rail T 1 in AISI304 (PART 122) — apoyo alternativo | m | 0 | 0 | 0 | 156 | 17.14 | SOLO si se elige la opción B de guías (apoyo por perfiles Movex 122/124/125); con la opción A (bar cap) no se necesita |
| M10 | P12401C | Conical rail T 40 mm AISI304 (PART 124) — apoyo alternativo | m | 0 | 0 | 0 | 105 | 18.63 | ídem M9 |

Valor de lo NECESARIO (opción A de guías): **EUR 16.285,61** · valor de lo COTIZADO: EUR 36.068,45.

## Decisión de guías (lo que "considerar guía" obliga a cerrar)

- **Opción A — apoyo por BAR CAP sobre pletina 12 (la modelada):** M7 + pletina local 12×30. Guía lateral M8. No se compran M9/M10.
  Cumple la regla Movex del 530 LBP en acumulación: pistas entre carriles de rodillos, luz ≤ 50 mm (catálogo 2025 p.237).
- **Opción B — apoyo por perfiles cónicos Movex 122/124/125 (brochure p.6, luces 28/30/56/30/28):** se compran M9 + M10 + M8 en las cantidades cotizadas (156 + 105 + 105 m) y se descarta M7. Más caro por metro (17–23 vs 7 EUR) y obliga a rehacer las aletas del bastidor para el clip del perfil.
- Recomendación: **A**. Reducir M9/M10 a cero (o dejar 1 barra de cada como muestra) y M8 a 15 barras de 3 m.

## Cantidades cotizadas que NO cuadran con la flota (confirmar con Movex antes de la OC)

- Sprockets: cotizados 152 vs necesarios 44 (LBP 5 + GT 6 por línea). Sobran 108: repuesto o cuenta distinta de ejes.
- Nosebar P22868: cotizados 51 vs 24; P22862: 51 vs 24.
- Collarines: cotizados 60 vs 16.
- Banda LBP: cotizada 90,3 m vs 48 m (2×); banda GT: 18 m vs 12 m.

## Lo que Movex NO vende para este diseño (compra local)

| Ítem | LBP | GT | Flota | Nota |
|---|---:|---:|---:|---|
| Chumacera UCF206 (Ø30) | 2 | 2 | 16 | LBP: sobre la mecha PL8 apernada; GT: sobre suple de descanso PL5 en el alma (línea BRP) |
| Motorreductor: el MISMO del BRP (caja sinfín eje hueco Ø30 + motor 1 HP, STEP 314508014) con brazo de reacción 50154 y pasador EspBrazoReac | 1 | 1 | 8 | pedido Sergio 2026-09-08; el NMRV-P 075 0,55 kW de criterios/accionamiento.md queda como mínimo calculado |
| Rodillo Ø63,5 eje muerto (tubo A513 + 2×6202-2RS): retorno, snub y cola | 9 | 2 | 44 | LBP: snub + apoyos de retorno a 500±50 (manual p.72); GT 600: snub + rodillo de cola en COLISA como tensor (manual p.73); el manual p.74 sugiere zapata para el retorno del LBP 15 mm — desviación registrada |
| Pletina acero 12×30 de canto (núcleo de la guía de apoyo) | 49.04 m | 3.53 m | 210.28 m | recibe el bar cap M7 |
| Escuadra de pata B_005A_1 (pieza REAL ZP2026) | 6 | 2 | 32 | misma pieza del ZP2026 (ZP2026\Piezas), apernada bajo la pestaña con 2× perno coche 3/8 |
| Columna de pata SOLID_06 C 77×38×3 L=588 (pieza REAL ZP2026) | 6 | 2 | 32 | misma columna del ZP2026 → NPT de banda 918 |
| Placa base de pata B_004A_1 (pieza REAL ZP2026) | 6 | 2 | 32 | |
| Travesaño de patas C 71×38×3 (sección B_002A_1) L=550 | 3 | 1 | 16 | entra en el C de las columnas, 4× perno coche 3/8 |
| Travesaño de bastidor C 71×38×3 con orejas (sección B_002A_1) | 5 | 1 | 24 | bajo las guías de apoyo, colgado de las almas con 4× perno coche 3/8 |
| Lateral chapa 3 plegada (alma 300, pestaña 38 + labio 20 afuera) | 4 | 2 | 24 | LBP: 2 tramos de 2500 por lado + 2 acoples PL3 |
| Frente porta-nosebar chapa 3 plegada 470×240 | 2 | 2 | 16 | pestañas 40 apernadas a las almas |
| Mecha PL8 apernada (LBP) / Suple de descanso PL5 (GT) | 2 / 0 | 0 / 2 | 8 / 8 | |
| Guarda del cabezal motriz chapa 1,5 (sólo LBP) | 1 | 0 | 4 | el GT viaja completo dentro del bastidor de 300 |
| Perno coche 3/8 in UNC (ANSI B18.5) + golilla plana F436 + golilla de presión B18.21.1 + tuerca AS 2465 | 101 | 37 | 552 | largos LBP {"1":84,"3":8,"1.25":8,"3.5":1} · GT {"1":28,"3":8,"3.25":1} (in); todo apernado, nada soldado (Merge/BRP) |
| Poste de guía de cajas Sop_GuarLat_BRP + porta guía Movex BM (piezas reales BRP/Merge) | 12 + 12 | 4 + 4 | 64 + 64 | llevan el conical rail L 1¼ in P12501C; 2 pernos coche 3/8 al alma por poste |
| Guía lateral de desgaste UHMW 12×15 (como Guias_desgaste_BRP), por tramos | 4 | 2 | 24 | contacto lateral de la banda sobre el borde superior del lateral |
| Barra cuadrada 1,5 in SAE 1045 calibrada × 6 m | — | — | 1 (+1) | 8 ejes motrices por barra; sin ejes tensores (un solo eje por equipo) |

Envolturas verificadas: LBP 140.36° · GT 141.79° (objetivo Movex 140±10°, manual p.108).
