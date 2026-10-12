# Descripción del objeto

Llenar los campos `clave: valor` (los lee el pipeline; dejar vacío lo desconocido).
Las afirmaciones de este archivo entran a provenance.json como capa `user`
(declarado, no verificado). Las dimensiones se contrastan contra lo medido.

objeto: Transportador de banda modular Movex 530 LBP (roller top, baja contrapresión) — diseño CAD para fabricación
fabricante: Conveyone SpA (diseño propio; banda Movex serie 530)
modelo: CV-LBP530-18
materiales: banda POM/PP (Movex 530 LBP / 530 Friction Top), ejes SAE 1045, bastidor acero

## Dimensiones declaradas (si se conocen; en milímetros, solo número)

largo_mm: 5000
ancho_mm: 457.2
alto_mm:

## Especificación del usuario (capa user — pedido 2026-07-19)

- Banda modular Movex serie **530 LBP**, ancho **18 in = 457.2 mm**.
- Referencia de ingeniería: **manual de ingeniería Movex** (todas las
  recomendaciones de instalación: transferencia, catenaria, wearstrips,
  retorno). Los datos web citados viven en `input/web_facts.json`.
- **Ejes cuadrados de 1.5 in (38.1 mm)** con **torneado en las puntas**
  (muñones redondos mecanizados).
- **Tracción en uno de los extremos, abajo** (motriz bajo el bastidor).
- **Nosebar en ambas puntas** (transferencia de punta en los dos extremos).
- Motorreductor de **eje hueco Ø30 mm montaje directo** sobre la punta
  motriz del eje.
- Flota a fabricar: **4 líneas**, cada una con
  - 1 transportador **Grip Top 0.6 m** (misma serie 530, superficie de
    alta fricción; **0.8 m hasta el 2026-09-08**, ver actualización), y
  - 1 transportador **LBP 5.0 m** (acumulación con rodillos).
- URGENTE: planos de los ejes y lista de compra de material (barra cuadrada
  1.5 in SAE 1045 y normalizados) para las 4 líneas.

## Escala

Proyecto de DISEÑO (capa user, CAD paramétrico): la geometría nace acotada en
mm reales, no de fotos. No aplica referencia de escala fotogramétrica.

referencia_escala:
referencia_escala_mm:
factor_escala: 1.0

## Notas libres

Proyecto CAD sin etapa fotogramétrica (S0–S5 no aplican): se usa la
herramienta CAD/componentes + S6 para planos. Todos los datos del fabricante
Movex se registran con URL, fecha y cita en `input/web_facts.json`; lo que no
se encontró publicado se declara como SUPUESTO capa user y se marca
"verificar contra manual/muestra física antes de fabricar".

## Actualización 2026-07-20 (capa user — cotización Movex 26012937 adjunta)

- Sprockets y anillos: los de la cotización — **rueda moldeada Z-32
  (P158808YF), bore cuadrado 1.5 in con grano M8** + **collarines P21703Y**;
  montaje según indicaciones Movex (solo el central fijo, resto flotante).
- Nosebar en ambas puntas: **con rodamientos** (LBP: P22868 h19; GT: P22862).
- Guía de apoyo y lateral: **enrollables de la cotización** — bar cap UHMW
  P101203-30 sobre pletina 12 (apoyo) y conical rail T/L (lateral).
- Retorno: **rodillos con rodamiento sellado inserto (6202-2RS), eje muerto
  perforado y roscado**: desde FUERA de la estructura entra un **perno
  hexagonal M8 por cada lado** y fija el eje (decisión del usuario; el manual
  Movex sugiere zapatas para LBP — desviación registrada).
- Patas: equivalente a los **soportes del ZP2026 (B_005A)**; travesaños de la
  estructura: **los del ZP2026 (TR_S)**.

## Actualización 2026-09-08 (capa user — pedido de Sergio)

- El transportador Grip Top pasa de **0,8 m a 0,6 m** nose a nose: **CV-GT-600**
  (archivo `lbp530_gt06.json`; `GT_L=800` regenera el anterior).
- Fuentes Movex ahora disponibles en la carpeta Inventor del usuario
  (`Bandas Modulares/`): **catálogo métrico 2025** y **Engineering Manual
  V2.0**. Con ellas se cierran dos abiertas del rediseño: catenaria 50–150 /
  largo 500–900 y paso de apoyos de retorno 500 (manual p.72 y p.108);
  retorno recomendado para LBP paso 15 mm = zapata deslizante, D>50 para
  el resto (p.74) — la desviación (rodillos) sigue registrada.
- Lazo del GT 600 rediseñado: con el lazo del 800 la envoltura subía a 155°
  y el rodillo de sujeción caía sobre el tensor. Barrido paramétrico →
  tensor al fondo y al extremo (x 180 / z −400, giro ≈180°), rodillo de
  sujeción a 225 de la motriz y z −240. Envoltura motriz **143,7°**
  (Movex 140±10), lazo 2,33 m. Mecha combinada PL8 530×422 por costado.
- Nuevo generador de entregables `cad/ensambles/entregables_lbp530.mjs`:
  compra Movex por equipo y flota (con la decisión de guías explícita) y
  tablas para Inventor (parámetros del esqueleto `Ref_*` y despiece →
  archivos `.ipt/.iam` con la nomenclatura Conveyone).

## Actualización 2026-09-08 (2) — verificación de ángulos contra el manual Movex p.72

Pregunta de Sergio: «¿revisaste ángulos desde manual de ingeniería?». Revisado el
esquema **Bottom head drive** (manual V2.0 p.72), que es exactamente esta
arquitectura, y aplicado como COMPUERTAS del generador:

| Regla del manual | Antes | Ahora LBP | Ahora GT-600 |
|---|---|---|---|
| Giro de la banda en el nosebar de descarga 145°±10 (ramal a ~35°) | 95,8° ✗ (motriz a 120 de la punta) | **141,7°** (motriz a 600) | **138,6°** (motriz a 340, z −220) |
| Envoltura de la motriz 140°±10 | 141,6° / 143,7° | **140,4°** (snub a 100 / z −140) | **141,8°** (snub a 100 / z −140) |
| Snub pegado a la salida de la motriz | a 300 | a 100 | a 100 |
| Catenaria 700 +200/−50 entre snub y primer apoyo | 860 (medida) | **750** (compuerta) | no aplica (rodillo de cola en colisa, p.73) |
| Apoyos de retorno 500±50, último tramo 450±50 | 500 / 420 | 500 / **450** (compuertas) | — |
| Flecha 50–150 (H1), alarma >150 | 130 | 130 | — |

- GT-600: el eje tensor con sprockets locos se reemplaza por un **rodillo de
  cola Ø63,5 en colisa 9×40** (tensor por ajuste, manual p.73): con el ramal a
  35° no cabe un eje tensor. Quedan 6 sprockets por GT (sin locos), 2 UCF206.
- Ejes tensores: 4 en total (solo LBP). Barras: 8 motrices en una barra, 4
  tensores en la otra.
- Herramienta nueva `tools/inventor_lbp530.py`: lleva los JSON a Inventor 2027
  (piezas .ipt, ensambles .iam, planos .idw GA + corte A-A + fabricación, PDF).
  Probada por partes (pieza, ensamble, plano con corte); la corrida completa
  exige una instancia de Inventor sin documentos del usuario.

## Actualización 2026-09-08 (3) — decisión con Movex: UN SOLO EJE

Sergio, tras conversar con Movex: cada equipo lleva **un solo eje cuadrado 1,5 in,
el motriz, con sprockets**. La entrada usa nosebar igual que la descarga y la
banda vuelve por un **rodillo de cola Ø63,5 en colisa 9×40** (tensor por ajuste,
manual p.73). Aplicado al LBP-5000 (el GT-600 ya estaba así):

- Sin eje tensor ni sprockets locos: EJ-02 queda obsoleto (cantidad 0); una
  sola barra cuadrada de 6 m para los 8 ejes motrices.
- LBP: 58 piezas, lazo 10,78 m, envoltura 140,4°, nosebar 141,7°, último
  apoyo a 450 del rodillo de cola. Guarda de cola menos profunda.
- Compra: sprockets 44 (LBP 5 · GT 6), collarines 16, UCF206 16, rodillos
  Ø63,5 44 (LBP 9 · GT 2).
- Inventor regenerado: LBP 26 piezas .ipt, GT 27; GA con corte A-A y
  láminas de fabricación; PDF en `out/drawings/inventor/`.

## Actualización 2026-09-08 (4) — estilo BRP/Merge + patas ZP2026

Pedido de Sergio tras ver Inventor: soportes a piso de la familia ZP2026 y
bastidor en la línea de las carpetas BRP/Merge/Gapper. Aplicado en
`gen_lbp530.mjs`, `tools/inventor_lbp530.py` y `entregables_lbp530.mjs`:

- Laterales chapa 3 plegada 300 (2 tramos de 2500 en el LBP + acoples), frentes
  chapa 3 470×240, travesaños C 71×38 con orejas, todo con perno coche 3/8.
- Patas con las piezas reales del ZP2026 (B_005A_1, SOLID_06, B_004A_1) y
  travesaño de patas C 71×38 L=550; NPT de banda 918.
- GT sin mecha ni guarda (UCF206 sobre suple PL5); LBP con mecha PL8 apernada
  y guarda sólo en el cabezal motriz.
- Inventor: LBP 72 ocurrencias, GT 41; 39 ipt + 3 reales; láminas 16/11;
  capturas `out/drawings/inventor/nuevo_*.png`. Consumo de planchas rehecho.

## Actualización 2026-09-08 (5) — nivel de detalle de referencia

Componentes reales referenciados (UCF206 1485N3, pernería Content Center 3/8),
NMRV-P075 + brazo de reacción + separador (muñón motriz 190, eje 706), sprocket
dentado, chaveta, retención, escuadras de guía; subensambles Pata_ZP2026 y
ConjuntoEjeMotriz; esqueleto Ref_ (76 parámetros, 9 planos); .ipj. LBP 445
piezas / 321 occ Inventor; GT 181 / 133. Pernos coche LBP 89, GT 33.

## Actualización 2026-09-08 (6) — accionamiento y guías del BRP, banda por tramos

Mismo motorreductor del BRP (caja_314508014 + 50154 + EspBrazoReac, reales), guía de
desgaste UHMW 12×15, postes Sop_GuarLat + PortaGuardaMovex + rail P12501C, banda sólo en
cabezal y cola. Bastidor/patas/travesaños/guías de apoyo sin cambios. Pernos LBP
101 / GT 37. Inventor LBP 386 occ / GT 156 occ.

## Actualización 2026-09-09 — chapa real y planos en Inventor

Piezas plegadas como sheet metal de Inventor (perfil + pliegues + desplegado), agujero
cuadrado para perno coche, compuertas de interferencia y de tornillería en verde, DXF
desde el desplegado, láminas de pieza y de ensamble al estándar de las bandas de
referencia. Los planos de entrega salen de Inventor (`tools/inventor_lbp530.py
--instancia-propia`), no de foto3d.

