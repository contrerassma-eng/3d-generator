# Línea NO-Label — omni · twin belt MB400 con cámara · MB400 4000 · omni · cinta perpendicular

Módulo de **lectura de QR por el fondo de la caja y clasificación por tamaño**
para cajas de cereza (proyecto `projects/NOLABEL`). Diseño paramétrico en el
CAD del repo (formato `foto3d-cad`, capa **`user`**), con **compuerta de
diseño**: el generador se niega a emitir si una regla no se cumple.

```bash
node cad/ensambles/nolabel/gen_nolabel.mjs      # → nolabel_linea.json · nolabel_omni.json · nolabel_dims.json
cd cad && node tests/test_nolabel.mjs           # invariantes + construcción CSG de una muestra por equipo
cd cad && node ensambles/nbt90/render.mjs nolabel/nolabel_omni.json ensambles/nolabel/vistas/omni   # vistas (Chromium sin cabeza)
```

Abrir en el CAD: servir `cad/` y `index.html` → 📂 Abrir → `ensambles/nolabel/nolabel_linea.json`
(o el visor `ensambles/ver.html?doc=nolabel/nolabel_linea.json&view=iso`).

Ejes: **X = flujo** (0 = nariz de entrada del omni 1) · **Y = ancho** (+Y
izquierda mirando aguas abajo; la referencia y la salida a 90° van a la
derecha, `lado = −1`) · **Z = arriba, 0 = plano del producto**; piso en Z = −800.

## Secuencia (pedido del usuario, 2026-10-05)

| # | Tag | Equipo | x0 | L × W | Función |
|---|---|---|---:|---|---|
| 1 | `OMW-1` | Bloque omni 24"×24" | 0 | 609.6 × 609.6 | **Justifica** la caja contra la guía UHMW del lado derecho (cara en Y = -274.8) |
| 2 | `TWB` | Twin belt sobre M-haste MB400 («mientras») | 619.6 | 1500 × 500 | 2 carriles W200 con hueco central de 100; guarda de teflón con embudo lleva la caja al eje de la cámara; **capota de cámara del STEP del usuario, alargada a 1200** (856×716, abierta por abajo), cámara mirando hacia abajo; **fotocélula dispara** con la caja chica entera y centrada bajo la cámara |
| 3 | `MB4000` | M-haste MB400 L4000 W400 («después») | 2129.6 | 4000 × 400 | Separa (gapper) y transporta al omni 2 |
| 4 | `OMW-2` | Bloque omni 24"×24" | 6169.6 | 609.6 × 609.6 | **Clasifica**: fotocélula a 0,82·L (X = 6669.47); la caja grande se detiene y sale a 90° a la derecha; la chica sigue derecho |
| 5 | `BLT` | Cinta plana perpendicular | xc = 6474.4 | 2000 × 500 | Recibe las cajas grandes 15 mm bajo el plano, con **placa de transferencia** desde el borde del omni |

Huecos: omni→twin y twin→MB400 **10**; MB400→omni 2 **40** (el
motorreductor lateral del MB400 sobresale 29 de su nariz y debe librar la guarda de correa del omni).
Largo total de la línea **6779.2 mm** + cinta de salida 2000 mm hacia −Y.

## Qué se modeló (detalle)

**Bloque omni (`omni.mjs`)** — según los dos renders del usuario (8 filas × 7 ventanas,
**un motorreductor por fila** en carcasas ventiladas al costado, 3 orejas por lado) y
`omniwheel.md` del simulador (24", paso 3", 60 W / 24 VDC por fila): 8 ejes Ø15 a paso 76,2
con **7 ruedas omni Ø60×38** cada uno (cubo revolucionado + 6 rodillos Ø16×22 a **±45°**, mano
alternada por fila), 2 rodamientos 6002 por eje en placas laterales PL6, tapa negro mate con
ventana por rueda (tapa gris clara como el render), **8 motorreductores 24 V** acoplados directo al eje que
asoman de la banda negra bajo el deck y van bajo **una carcasa ventilada continua** gris clara (lado opuesto a
la referencia), cubeta inferior baja para los drivers (altura total del bloque ≈ 166), 3 orejas de anclaje por lado
con M10, bastidor PG40 + patas MA4080 + pies M12. El omni 1 lleva la **guía de referencia UHMW
20×60**; el omni 2 la **fotocélula de detención** a 0,82·L. Las filas pares e impares se
comandan por separado: mismo sentido = avance; sentidos opuestos = empuje lateral.

**MB400 (`mb400.mjs`)** — cotas del generador M-haste `Conveyone-/backend/mhaste/src/mb400.py`:
piñones Ø90×28 sobre ejes Ø25, banda modular paso 50 esp. 6, tiras de
desgaste UHMW 18×8, rodamientos con soporte UCF 60×40×40, bastidor T-slot 40,
travesaños, patas MA4080 con pie M12, guías LA 6×30, motorreductor MT-GM
160×72 con placa 95×95×8 **lateral** en el eje de descarga (lado opuesto a la
referencia). El twin agrega la **capota de cámara del STEP del usuario**
(`MONTAJE_BOX_CORRECCIONES_06_12_21.stp`, medido con CadQuery: 863,9 × 856 × 716,3, abierta por
abajo, cabeceros de 80,5, paneles 30/45, cubrejunta 700×60×30, 4 pads 100×100×30) **alargada a
1200** como pidió el usuario, montada 60 mm sobre el plano del producto en 4 patas propias, con
aberturas de paso 520×320 en los cabeceros, **cámara colgada del techo mirando hacia
abajo** y 2 barras LED; **guarda de teflón UHMW 15×60 con embudo de 350 mm a 26.54°** (de la
guía del omni 1 en Y = -274.8 a la cara de referencia Y = -100) con brazos fuera de la capota, y
**fotocélula réflex de disparo + espejo** a 900 de la nariz (la caja chica queda centrada bajo la cámara).

**Cinta plana (`cinta.mjs`)** — banda PVC 3 mm sobre cama PL3, tambores Ø89
(tubo 4) con eje Ø25 en chumaceras UCF205, bastidor de canal C 120×40×4 con
alas hacia afuera, travesaños, motorreductor de eje hueco (componente del
catálogo) en el tambor de descarga, patas MA4080, **placa de transferencia
PL3** desde Y = -328.3 (tras la guarda del omni) hasta la nariz.

## Compuertas (todas PASS en esta emisión)

| Regla | Valor |
|---|---|
| G1 omni: la caja chica justificada apoya en ≥2 columnas y ≥3 filas de ruedas | 3 columnas × 3 filas |
| G2 twin: ventana < W caja chica − 80 | 100 < 120 |
| G2 twin: ambas cajas a caballo de la ventana con ≥50 mm por carril | chica [50, 50] · grande [50, 150] |
| G2 twin: la óptica cubre la tapa de la caja grande | ±340.92 a 444.3 de la tapa ≥ ±200 |
| G2 twin: capota alargada, caja grande entera adentro | L 1200 (STEP 863,9), margen 250 |
| G2 twin: disparo con la caja chica entera y centrada bajo la cámara | sensor a 900 de la nariz (cámara a 750) |
| G2 twin: embudo ≤ 30° | 26.54° |
| G3: planos de producto | {'omni1': 0, 'twin': 0, 'mb4000': 0, 'omni2': 0, 'cinta': -15} |
| G4: salida a 90° — ancho de cinta ≥ L caja grande + 50 · hueco omni→placa ≤ 60 | 500 ≥ 450 · 4 mm |
| G5: todos los pies en el piso | 26 pies, Z mín. -800 |
| G6: interferencias AABB entre equipos | 0 |
| G7: ids únicos y envolvente | OK |

## Procedencia de las cotas (`params.mjs`)

- **`cad`**: paso de grilla 3", largo 24" y fotocélula 0,82·L (`conveyone-simulator/docs/omniwheel.md`); todas las
  cotas MB400 (`mb400.py`); bbox del motor UniDrive y motorreductor de eje hueco (`componentes/catalogo.json`).
- **`web`**: rodamiento 6002 15×32×9 y correa AT5 ancho 10 → `projects/NOLABEL/input/web_facts.json`
  (citas de títulos de búsqueda: las páginas de proveedor están bloqueadas desde esta red; confianza media).
- **`user` (archivos del usuario)** en `projects/NOLABEL/input/referencias/`: STEP del box de cámara (medido →
  `box_camara_step_medidas.json`), PDF «Lavador de cajas» (Danich: túnel inox, rociadores, transporte por
  banda, guías ajustables — plano sin cotas, sólo referencia constructiva), renders del bloque omni (planta
  y lateral), croquis y foto de planta.
- **`dis`** (decisión Conveyone): huecos, guías, chapa, teflón, capota alargada a 1200 sobre 4 patas, abertura 520×320, cinta 500×2000, drop 15.
- **`pc` POR CONFIRMAR** (sin fuente — no comprar ni fabricar): **cajas** chica 300×200×150 y grande 400×300×200,
  **altura 800**, **rueda omni Ø60×38 / 6 rodillos** (proveedor), **óptica 75°** y posición del QR (Yolotech).

## Hallazgos del diseño (para decidir)

1. **4 vs 7 ruedas por fila.** El render del usuario muestra 4 ruedas por fila. Con 4 a paso 139 la caja chica
   (W200) apoya en **una sola columna** y G1 falla. Se adoptó la grilla del simulador: **7 ruedas a paso 3"**.
   Si el bloque real es de 4, hay que confirmar el ancho mínimo de caja o cambiar la rueda.
2. **El motorreductor lateral del MB400** (160 a lo largo del flujo, centrado a 51 de la nariz) invade al equipo
   siguiente si el hueco es 10 → hueco **40** antes del omni 2 (la caja de 300 lo puentea). Alternativa: tracción
   en la nariz de entrada o motor desplazado hacia afuera.
3. **Referencia de la caja en el twin**: la caja chica debe quedar **a caballo** de la ventana (cara de guía en
   Y = -100, sobre la mitad del carril derecho), no pegada al borde del transportador; por eso el embudo
   recorre 174.8 mm desde la guía del omni 1.
4. **La capota del STEP va SOBRE la cinta, abierta por abajo** («como tiene abierto abajo ve todo lo que pasa»):
   la cámara lee el QR de la **tapa**, no del fondo. El hueco de 100 entre carriles del twin queda sin función
   óptica (reservado para una 2ª cámara inferior si el QR fuera por abajo). Alargada de 863,9 a 1200 para que
   la caja grande quede entera adentro con 250 de margen al disparar.
5. **Un motor por fila.** El render lateral del usuario muestra 8 motorreductores individuales; se reemplazó
   el esquema de 2 familias con correas por 8 motores acoplados directo al eje bajo una carcasa ventilada
   continua; colores y proporción de altura ajustados al render (tapa clara, ruedas gris oscuro).

## Abiertas (preguntas a Sergio — salen sólo de aquí)

1. Dimensiones reales de caja chica y grande (y altura con tapa) y cadencia.
2. ~~¿«MB 4000» = MB400 de 4000 mm?~~ Confirmado por el usuario: ambos módulos son MB400.
3. Rueda omni real (proveedor, Ø, ancho, rodillos) y cantidad por fila del bloque del render.
4. Óptica/distancia de trabajo de la cámara Yolotech; confirmar que el QR va en la TAPA (la capota mira hacia abajo).
5. Del «Lavador de cajas» Danich: ¿qué se reutiliza (túnel inox, rociadores, guías ajustables)? El plano no trae cotas.
6. Altura del plano de producto (800 supuesto) y lado de salida (derecha supuesto).
7. ¿La chica sigue a un transportador de rodillos aguas abajo del omni 2 (no modelado)?

## Despiece (de `nolabel_dims.json`, contado de la geometría)

**OMW-1** — 442 piezas en 15 líneas (+ 28 de tornillería)

| Cant. | Descripción | Componente |
|---:|---|---|
| 1 | Carcasa inferior | `—` |
| 8 | Carcasa motor | `carcasa_motor_70x62x96` |
| 8 | Eje | `eje_15x633.6` |
| 3 | Escuadra guía | `—` |
| 1 | Guía de referencia UHMW 20×60 | `uhmw_20x60` |
| 4 | Larguero PG40 | `perfil_pg40` |
| 8 | Motorreductor 24 V | `motorreductor_24v_48x60` |
| 6 | Oreja de anclaje | `—` |
| 4 | Pata MA4080 | `MA4080` |
| 4 | Pie nivelador M12 | `MB400-FT-M12` |
| 2 | Placa lateral | `—` |
| 336 | Rodillo omni f1 y-228.6 #1 | `rodillo_omni_16x22` |
| 28 | Rueda omni | `rueda_omni_60x38_izq` |
| 28 | Rueda omni | `rueda_omni_60x38_der` |
| 1 | Tapa superior | `—` |

**TWB** — 67 piezas en 25 líneas (+ 8 de tornillería)

| Cant. | Descripción | Componente |
|---:|---|---|
| 2 | Banda modular MB400 W200 carril 1 | `MB400-BELT-MOD-W200` |
| 2 | Barra LED | `barra_led_600` |
| 2 | Brazo guarda | `—` |
| 1 | Cámara de lectura QR (mira hacia abajo) | `camara_qr` |
| 1 | Capota de cámara 1200×856×716.3 (STEP alargado) | `capota_camara_1200x856x716` |
| 1 | Cubrejunta superior 700×60×30 | `capota_cubrejunta` |
| 1 | Eje conducido Ø25×580 | `MB400-SH-IDL-25` |
| 1 | Eje motriz Ø25×724 | `MB400-SH-DRV-25` |
| 1 | Espejo réflex | `reflector` |
| 1 | Fotocélula de disparo de cámara | `fotocelula_reflex` |
| 1 | Guarda de teflón (UHMW) con embudo 26.54° | `uhmw_15x60` |
| 1 | Guía lateral LA | `MB400-LA-L1500` |
| 2 | Larguero T-slot 40 −Y L1500 | `MB400-PF-40-L1500` |
| 1 | Motorreductor MT-GM-160x72 | `MT-GM-160x72` |
| 4 | Pad superior −X−Y | `capota_pad` |
| 4 | Pata capota −X−Y | `perfil_40x40` |
| 4 | Pata MA4080 | `MA4080` |
| 8 | Pie nivelador M12 | `MB400-FT-M12` |
| 6 | Piñón conducido Ø90 | `MB400-SPR-IDL-D90` |
| 6 | Piñón motriz Ø90 | `MB400-SPR-DRV-D90` |
| 1 | Placa de motor 95×95×8 | `MB400-MP` |
| 4 | Rodamiento con soporte UCF conducido | `MB400-BRG-UCF` |
| 4 | Soporte de eje conducido | `MB400-SB` |
| 6 | Tira de desgaste UHMW | `MB400-WS-L1308` |
| 2 | Travesaño T-slot 40 | `MB400-PF-40-W600` |

**MB4000** — 55 piezas en 15 líneas (+ 20 de tornillería)

| Cant. | Descripción | Componente |
|---:|---|---|
| 1 | Banda modular MB400 W400 carril 1 | `MB400-BELT-MOD-W400` |
| 1 | Eje conducido Ø25×480 | `MB400-SH-IDL-25` |
| 1 | Eje motriz Ø25×624 | `MB400-SH-DRV-25` |
| 2 | Guía lateral LA | `MB400-LA-L4000` |
| 2 | Larguero T-slot 40 −Y L4000 | `MB400-PF-40-L4000` |
| 1 | Motorreductor MT-GM-160x72 | `MT-GM-160x72` |
| 10 | Pata MA4080 | `MA4080` |
| 10 | Pie nivelador M12 | `MB400-FT-M12` |
| 4 | Piñón conducido Ø90 | `MB400-SPR-IDL-D90` |
| 4 | Piñón motriz Ø90 | `MB400-SPR-DRV-D90` |
| 1 | Placa de motor 95×95×8 | `MB400-MP` |
| 4 | Rodamiento con soporte UCF conducido | `MB400-BRG-UCF` |
| 4 | Soporte de eje conducido | `MB400-SB` |
| 5 | Tira de desgaste UHMW | `MB400-WS-L3808` |
| 5 | Travesaño T-slot 40 | `MB400-PF-40-W500` |

**OMW-2** — 440 piezas en 15 líneas (+ 28 de tornillería)

| Cant. | Descripción | Componente |
|---:|---|---|
| 1 | Carcasa inferior | `—` |
| 8 | Carcasa motor | `carcasa_motor_70x62x96` |
| 8 | Eje | `eje_15x633.6` |
| 1 | Fotocélula de detención (0.82·L) | `fotocelula_reflex` |
| 4 | Larguero PG40 | `perfil_pg40` |
| 8 | Motorreductor 24 V | `motorreductor_24v_48x60` |
| 1 | Ojo de fotocélula | `—` |
| 6 | Oreja de anclaje | `—` |
| 4 | Pata MA4080 | `MA4080` |
| 4 | Pie nivelador M12 | `MB400-FT-M12` |
| 2 | Placa lateral | `—` |
| 336 | Rodillo omni f1 y-228.6 #1 | `rodillo_omni_16x22` |
| 28 | Rueda omni | `rueda_omni_60x38_izq` |
| 28 | Rueda omni | `rueda_omni_60x38_der` |
| 1 | Tapa superior | `—` |

**BLT** — 31 piezas en 12 líneas (+ 8 de tornillería)

| Cant. | Descripción | Componente |
|---:|---|---|
| 1 | Banda plana PVC 500×4099.03 | `banda_pvc_500` |
| 1 | Cama deslizante PL3 | `pl3_cama` |
| 2 | Canal lateral C120×40×4 | `canal_c120` |
| 4 | Chumacera UCF205 tensor | `chumacera_ucfl205` |
| 2 | Eje tensor Ø25×680 | `eje_25` |
| 1 | Motorreductor de eje hueco | `motorreductor_eje_hueco` |
| 4 | Pata MA4080 | `MA4080` |
| 2 | Pestaña de placa | `pestana_placa_transferencia` |
| 4 | Pie nivelador M12 | `MB400-FT-M12` |
| 1 | Placa de transferencia PL3 (46 mm) | `placa_transferencia` |
| 2 | Tambor tensor Ø89×520 | `tambor_89x520` |
| 7 | Travesaño soporte cama | `tubo_40x40` |

Tornillería normalizada: 92 pernos hex (M6 patas MB400 · M8 patas cinta · M10 orejas omni).

## Archivos

- `params.mjs` tabla única de cotas con procedencia · `omni.mjs` · `mb400.mjs` · `cinta.mjs` · `gen_nolabel.mjs` (integrador + compuerta + despiece)
- `nolabel_linea.json` (1127 piezas) · `nolabel_omni.json` (bloque solo) · `nolabel_dims.json`
- `vistas/omni/*.png` y `vistas/linea/*.png` (render headless) · `cad/tests/test_nolabel.mjs`
- Proyecto: `projects/NOLABEL/` (descripción capa user, web_facts, referencias del usuario, audit.log)
