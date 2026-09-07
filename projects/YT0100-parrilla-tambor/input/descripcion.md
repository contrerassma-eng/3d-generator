# Descripción del objeto

Llenar los campos `clave: valor` (los lee el pipeline; dejar vacío lo desconocido).
Las afirmaciones de este archivo entran a provenance.json como capa `user`
(declarado, no verificado). Las dimensiones se contrastan contra lo medido.

objeto: Parrilla / ahumador sobre medio tambor de 200 L, armado 100 % atornillado — diseño para producción
fabricante: (diseño propio)
modelo: YT0100 "Medio Tambor"
materiales: tambor de acero 200 L recuperado (e 1.10), perfilería tubular 40x40x2, chapa de acero e2/e3 (corte láser + plegado), madera de roble macizo, tornillería M5/M6/M8 zincada, motor de spiedo 220 V

## Dimensiones declaradas (si se conocen; en milímetros, solo número)

largo_mm: 1140
ancho_mm: 900
alto_mm: 1170

## Especificación del usuario (capa user — pedido 2026-09-06)

Texto original del pedido:

> "Genera un modelo 3D de una parrilla en base de medio tambor de aceite,
> perfilería metálica, algunas piezas CNC (corte láser y plegado) (todo sin
> soldadura), motor tipo speedo, madera roble. Objetivo producto premium y
> bajo costo producción y muy escalable fácil armar"

Traducción a requisitos de diseño (capa `user`, decisiones registradas, no verificadas):

| # | Requisito | Decisión de diseño |
|---|---|---|
| R1 | Base: medio tambor de aceite | Tambor estándar de 200 L cortado longitudinalmente por su plano diametral. **Las dos mitades se usan**: la inferior es la cuba, la superior es la tapa abisagrada. Cero descarte. |
| R2 | Perfilería metálica | Bastidor de tubo cuadrado 40×40×2 (12 tubos, 3 largos distintos). |
| R3 | Algunas piezas CNC (corte láser + plegado) | 11 piezas de chapa, **2 espesores únicos** (e2 y e3). Cada una nace de su desarrollo plano (DXF a escala real, con líneas de plegado y BA real). |
| R4 | **Todo sin soldadura** | Ninguna unión soldada en todo el producto: uniones por tornillería pasante M5/M6/M8 con tuerca de brida serrada. La rigidez del tambor cortado se restituye con perfiles de canto atornillados, no con soldadura. |
| R5 | Motor tipo speedo | Motor de spiedo (asador giratorio) comercial 220 V / 40 W / 2,5 rpm, eje Ø8, sobre soporte de chapa plegada atornillado a la testa de la cuba. Espetón de barra cuadrada 12×12 mm inoxidable. |
| R6 | Madera roble | Roble macizo e25: mesa lateral, barra frontal, estante inferior (2 tablas) y asa de la tapa. Toda la madera se atornilla **desde abajo**, sin tornillos a la vista en la cara superior. |
| R7 | Premium | Canto vivo del tambor encapsulado (nada de bordes cortados a la vista), tiro regulable arriba y abajo, parrilla de altura regulable en 3 posiciones, madera maciza, herrajes ocultos. |
| R8 | Bajo costo de producción | Analizado con números en `out/COSTO.md`: el tubo cuesta 6,3× el corte láser y el armado pesa más que todo el láser. Se rediseñó en consecuencia (−10,2 % de masa, −24,7 % de corte, −35 % de roble). |
| R9 | Muy escalable | 15 programas de láser + 1 plegadora + 1 sierra de tubo. Sin soldador, sin cabina de soldadura, sin calificación de soldador. La producción escala agregando turnos de armado, no capacidad de taller. |
| R10 | Fácil de armar | Kit plano: se arma con **2 llaves (13 y 10) y un destornillador**. Sin herramienta especial, sin taladrar en obra (todos los agujeros vienen en el corte láser o en la plantilla de taladrado del tambor). |

### Supuestos que hay que verificar antes de fabricar (capa user)

- **S1** El tambor real que se compre debe medirse: los tambores recuperados
  varían ±10 mm en Ø y ±15 mm en largo entre fabricantes. Los parámetros
  `TAMBOR_D`, `TAMBOR_L` y `TAMBOR_E` de `design/parametros.json` mandan sobre
  toda la geometría; al cambiarlos se regenera el producto completo.
- **S2** El motor de spiedo se declara por su ficha comercial (ver
  `web_facts.json`); el patrón de sus agujeros de montaje **no está publicado**
  y se modeló como 2 agujeros Ø6,6 a 50 mm. Verificar con el motor en mano y
  ajustar `SOP-MOTOR` (es un único parámetro).
- **S3** No se ha hecho cálculo estructural ni ensayo térmico. Los espesores
  salen de práctica de taller, no de un cálculo (ver `out/MEMORIA_PARRILLA.md`,
  sección "Lo que este modelo NO acredita").

## Escala

Proyecto de DISEÑO (capa `user`, CAD paramétrico): la geometría nace acotada en
mm reales, no de fotos. No aplica referencia de escala fotogramétrica.

referencia_escala:
referencia_escala_mm:

factor_escala: 1.0

## Notas libres

Proyecto CAD sin etapa fotogramétrica (S0–S5 no aplican): se usa el generador
paramétrico `design/gen_parrilla.py` + S6 para los planos. Todo dato de
terceros (dimensiones del tambor, ficha del motor, densidad del roble) se
registra con URL, fecha y cita en `input/web_facts.json`. Lo que no está
publicado se declara SUPUESTO capa `user` y queda marcado "verificar".
