# Descripción del objeto

Llenar los campos `clave: valor` (los lee el pipeline; dejar vacío lo desconocido).
Las afirmaciones de este archivo entran a provenance.json como capa `user`
(declarado, no verificado). Las dimensiones se contrastan contra lo medido.

objeto: Rueda omnidireccional (omni wheel) de doble hilera, Ø58 mm exterior
fabricante:
modelo:
materiales: placas de plástico blanco (probable PA/POM), rodillos negros (probable
  caucho o TPU), tornillería cruciforme cincada — todo sin verificar

## Dimensiones declaradas (si se conocen; en milímetros, solo número)

largo_mm: 58
ancho_mm: 58
alto_mm:

## Escala

Qué objeto de dimensión conocida aparece en las fotos y cuánto mide:

referencia_escala: el propio diámetro exterior de la rueda (envolvente de las coronas de los rodillos)
referencia_escala_mm: 58

Tras la primera publicación: medir la referencia en el visor (modo medición),
calcular factor = referencia_escala_mm / valor_medido y anotarlo aquí; luego
re-ejecutar S4 y S5.

factor_escala:

## Notas libres

Entrada: UNA sola foto frontal de catálogo (cuatro copias de la misma rueda sobre
fondo blanco), no una captura fotogramétrica. Por eso este proyecto NO corre
S0–S5: con una sola vista no hay triangulación y no existe capa `measured`.

Lo entregado es la VISTA DE FRENTE (`out/drawings/`), generada con
`pipeline/rueda_omni.py`: proporciones medidas sobre la foto y escaladas por el
único dato duro disponible, el Ø58 exterior declarado por el usuario. Esas cotas
son capa `user` con incertidumbre declarada; verificar con calibre antes de
fabricar cualquier pieza que acople con la rueda.

No determinable desde esta foto: barreno del eje, tipo de acople (liso / hexagonal
/ chavetero), ancho total de la rueda y rosca de la tornillería. Si se necesitan,
o se miden con calibre o se citan de la ficha del fabricante en
`input/web_facts.json` (comando "investiga").

Para obtener geometría `measured` real haría falta una captura propia siguiendo
`docs/PROTOCOLO_CAPTURA.md` (vuelta completa alrededor de la pieza).
