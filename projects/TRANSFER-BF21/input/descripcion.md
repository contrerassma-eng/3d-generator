# Descripción del objeto

Llenar los campos `clave: valor` (los lee el pipeline; dejar vacío lo desconocido).
Las afirmaciones de este archivo entran a provenance.json como capa `user`
(declarado, no verificado). Las dimensiones se contrastan contra lo medido.

objeto: Módulo de transferencia bidireccional (omnis + correas) insertable en roller conveyor BF 21"
fabricante: diseño propio (foto3d)
modelo: TRANSFER-BF21
materiales: canales y placas de chapa 3 mm; bloques mecanizados; ruedas omni del proyecto RUEDA-OMNI-58; ver LEEME del módulo

## Dimensiones declaradas (si se conocen; en milímetros, solo número)

largo_mm: 530
ancho_mm: 527.4
alto_mm: 165.1

## Escala

Qué objeto de dimensión conocida aparece en las fotos y cuánto mide:

referencia_escala:
referencia_escala_mm:

Tras la primera publicación: medir la referencia en el visor (modo medición),
calcular factor = referencia_escala_mm / valor_medido y anotarlo aquí; luego
re-ejecutar S4 y S5.

factor_escala:

## Notas libres

Proyecto de DISEÑO puro (capa `user`): no hay fotos ni fotogrametría, así que
S0–S5 no aplican y no existe capa `measured`. La entrada es el pedido del
usuario (lecturas fijadas en DECISIONES.md), los componentes del repo (motor
UniDrive del catálogo ZP2026, reglas de banda del transfer90/NBT90) y los
hechos web con procedencia en input/web_facts.json. La entrega vive en
out/modulo/ y se regenera con: python pipeline/modulo_transfer.py projects/TRANSFER-BF21
