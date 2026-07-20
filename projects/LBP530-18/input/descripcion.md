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
  - 1 transportador **Friction Top 0.8 m** (misma serie 530, superficie de
    alta fricción), y
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
