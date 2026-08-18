# Descripción del objeto

Llenar los campos `clave: valor` (los lee el pipeline; dejar vacío lo desconocido).
Las afirmaciones de este archivo entran a provenance.json como capa `user`
(declarado, no verificado). Las dimensiones se contrastan contra lo medido.

objeto: Kit colgante de techo para transportador Hytrol 190-E24 (retenedor RC-48V + placa PD-48)
fabricante: CONVEYONE SpA (diseño propio; equipo base Hytrol 190-E24)
marca_planos: CONVEYONE
marca_planos_sub: CONVEYONE SpA
modelo: CV-HGR-190E24-01 Rev. B (asiento en V)
materiales: Acero ASTM A36, chapa 4 mm, corte láser (decisión del usuario 2026-08-18)

## Dimensiones declaradas (si se conocen; en milímetros, solo número)

largo_mm: 200.11
ancho_mm: 30
alto_mm: 63.2

## Escala

Qué objeto de dimensión conocida aparece en las fotos y cuánto mide:

referencia_escala:
referencia_escala_mm:

Tras la primera publicación: medir la referencia en el visor (modo medición),
calcular factor = referencia_escala_mm / valor_medido y anotarlo aquí; luego
re-ejecutar S4 y S5.

factor_escala:

## Notas libres

Proyecto SIN fotos: nace de la carpeta de traspaso de CONVEYONE SpA
`input/docs/Conveyone_Colgante_Hytrol_190E24.pdf` (CV-HGR-190E24-01 Rev. B,
"asiento en V" definido por Sergio en terreno). Todo lo declarado ahí entra
como capa `user`; el propio documento cita catálogo Hytrol 190-E24 y boletín
de instalación N.º 667 como sus fuentes.

Piezas a fabricar (capa user, CAD paramétrico):
- RC-48V — retenedor de cañería, asiento en V 90° incluidos. Chapa 4 mm,
  Ri 4 mm (1×t), factor K 0.44, 5 pliegues (90·45·90·45·90). Desarrollo
  declarado por el documento: 200.11 × 30 mm. Ancho interior entre alas 52,
  altura de ala 31.5, profundidad total 57.5 (medidas desde el plano de las
  orejas), pernos Ø11 a 96 mm entre ejes, prisionero Ø8.5 (roscar M10)
  centrado en un flanco.
- PD-48 — placa distribuidora plana 116 × 34 × 4 mm, 2 agujeros Ø11 a
  96 mm entre ejes (centrados en el ancho, a 10 mm de cada extremo).

Decisiones del usuario (2026-08-18, chat):
- material: acero ASTM A36 en 4 mm (compatible con K=0.44 a Ri=1×t).
- cantidad_por_pieza: 12 (doce RC-48V + doce PD-48).
- entregar planos "perfectos" PDF + DXF con el método vigente del repo
  (desarrollos analíticos por pieza + láminas normalizadas) incluyendo el
  cálculo del desarrollo (expansión de material) por factor K.

Rev. foto3d B-1 (instrucciones del usuario, mismo chat, 2026-08-18):
- extremos de AMBAS piezas semicirculares (radio completo = ancho/2,
  centrado en el agujero): RC-48V R15, PD-48 R17.
- agujeros de perno como COLISOS 11×16 (ajuste ±2.5 mm) en ambas piezas:
  la medida final en terreno no se conoce con precisión. El prisionero
  Ø8.5 (roscar M10) permanece circular.
- PD-48 pasa de 116 a 130 mm de largo para conservar distancia al borde
  con coliso + extremo redondeado (2 ejes @96 sin cambio).
- en la lámina del RC-48V, mostrar VISUALMENTE la pieza plegada (sección
  formada con el sentido de cada pliegue), no solo la nota escrita.
- alcance: SOLO las piezas — sin plano de conjunto/ensamble.

Contexto del conjunto (para lámina de arreglo general): cañería galvanizada
Ø48.3 × 3.68 (Sch 40), largo 762 mm, agujeros pasantes Ø17.5 a 711.2 mm entre
ejes (25.4 desde cada extremo); varillas roscadas 5/8"; el retenedor aprieta
la cañería contra el ala inferior del canal (interferencia 0.8 mm).
