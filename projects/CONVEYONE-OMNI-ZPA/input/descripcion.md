# Descripción del objeto

Llenar los campos `clave: valor` (los lee el pipeline; dejar vacío lo desconocido).
Las afirmaciones de este archivo entran a provenance.json como capa `user`
(declarado, no verificado). Las dimensiones se contrastan contra lo medido.

objeto: Sistema modular ZPA (acumulación cero presión) con zonas desviadoras Omniwheel — replanteamiento conceptual completo (mecánica, accionamiento, control, comunicaciones, potencia, seguridad)
fabricante: Conveyone (diseño propio, Sergio Contreras)
modelo: CONVEYONE-OMNI-ZPA
materiales: ver memoria REV B (input/ref) y ANALISIS_CONCEPTUAL.md

## Dimensiones declaradas (si se conocen; en milímetros, solo número)

largo_mm: 609.6
ancho_mm: 533.4
alto_mm:

## Escala

Qué objeto de dimensión conocida aparece en las fotos y cuánto mide:

referencia_escala:
referencia_escala_mm:

Tras la primera publicación: medir la referencia en el visor (modo medición),
calcular factor = referencia_escala_mm / valor_medido y anotarlo aquí; luego
re-ejecutar S4 y S5.

factor_escala:

## Notas libres

Proyecto de DISEÑO / INGENIERÍA CONCEPTUAL (capa `user`): no hay fotos ni
fotogrametría, así que S0–S5 no aplican y no existe capa `measured`. Las
entradas son:

- `input/HANDOFF_2026-09-03.md` — handoff técnico del usuario (documento
  rector del replanteamiento, incluye sus prompts en bruto).
- `input/ref/Omniwheel_Memoria_Calculo_Transmision_REV_B.pdf` (+ `.txt`) —
  memoria mecánica REV B generada con ChatGPT; el handoff la declara "base
  mecánica congelada actualmente".
- Conversaciones previas con ChatGPT ("Dimensionar transmisiones Omniwheel" y
  "Diseñar lógica Omniwheel ZPA"): propuestas a auditar, no restricciones.
- Diseños existentes en este repositorio (otras ramas/PR): Bloque OMNI v4
  tipo Flowsort para el ZP2026 (PR #110), módulo CV-OMW de ejes
  perpendiculares (PR #97), TRANSFER-BF21 (PR #100), CELDA3 (PR #103),
  ruedas omni/mecanum v5/v7 (PR #111, #110). El transportador anfitrión
  ZP2026 (rodillos 24 V con motor UniDrive + ZoneLogix Plus) está en
  `cad/componentes/models/ZP2026.glb` y en `componentes/catalogo.json`.

Afirmaciones del usuario que se registran como capa `user` (no verificadas):

- Zona Omni: 8 ejes a paso 3 in (76,2 mm), familias alternadas ±45°, un
  motor por familia; 4 OmniWheels Ø50 por eje en 400 mm activos; ancho total
  21 in (533,4 mm); largo útil ≈ 24 in (609,6 mm).
- Cajas: 500×300 mm / 5 kg; 300×250 mm / 2,5 kg; vacías 0,5 kg.
- Velocidad: "por lo menos un metro por segundo" (prompt 1) y 1,5 m/s
  tangenciales (memoria REV B). La discrepancia se trata en el análisis.
- Prototipo: ESP32 industrial DIN + 2 × NEMA 23 con driver básico; producto:
  instalación física en cadena UPSTREAM/DOWNSTREAM, gateway a PLC, ZPA local
  que funcione sin PLC, bus de motores ~48 VDC y control 24 VDC (hipótesis).
- Zonas normales: UniDrive + ZoneLogix Plus (ACG / UniDrive Solutions).

Los hechos obtenidos de la web van a `input/web_facts.json` con URL, fecha de
acceso y cita textual; NUNCA al modelo sin procedencia. La entrega de esta
etapa es `out/ANALISIS_CONCEPTUAL.md`.
