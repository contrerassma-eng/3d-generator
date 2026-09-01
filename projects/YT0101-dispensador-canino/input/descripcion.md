# Descripción del objeto

objeto: Dispensador canino mecánico modular — cabezal de alimento DOSIFICADO y cabezal de agua de nivel constante, ambos sobre bidón de 20 L
fabricante: diseño propio (proyecto YT0101)
modelo: YT0101-DC
materiales: PLA impreso FDM · perfil comercial 20×20 mm (aluminio o pino) · tornillería M4 · botellón de agua de 20 L reutilizado

## Dimensiones declaradas (si se conocen; en milímetros, solo número)

largo_mm: 470
ancho_mm: 470
alto_mm: 943

## Especificación del usuario (capa user — pedido 2026-07-26)

- Dos aparatos: **dispensador de alimento** y **bebedero de agua**, ambos con
  estanque de **bidón de 20 L** del tipo de agua purificada chileno.
- **Ambos puramente mecánicos**: sin motores, sin electrónica, sin baterías.
- El de alimento debe ser **dosificado**, no de flujo libre por gravedad: cada
  accionamiento entrega una cantidad conocida.
- Se acepta **cortar el bidón** del cabezal de alimento (boca de carga).
- Piezas **imprimibles en PLA** en impresora doméstica; se admiten engranajes.

## Decisiones de diseño que responden a ese pedido (capa user)

- Dosificación por **cajón de cavidad fija** (volumen calibrado) accionado por
  **cremallera y piñón** — no por rueda de paletas: con croqueta de 11-16 mm las
  holguras de una rueda de paletas industrial (0.05-0.25 mm, ver `web_facts`)
  son inalcanzables en FDM y las fuentes documentan atasco y trituración del
  gránulo en la punta de la paleta.
- **Sin resortes impresos**: el accionamiento es positivo en los dos sentidos.
  El PLA fluye (creep) bajo tensión sostenida y un resorte impreso perdería
  fuerza en semanas.
- **Agua sin válvula**: bebedero de nivel constante por el principio de la
  botella de Mariotte. Menos piezas, nada que se pegue ni se trabe.
- **Estructura compartida** entre ambos cabezales: mismo anillo, mismas patas,
  mismo collar de cuello.

## Datos que faltan por medir sobre el bidón real (antes de imprimir la serie)

Las cotas de catálogo del botellón varían por marca (boca 48-56 mm). Medir con
calibre sobre el envase que se va a usar y corregir `input/params.json`:

- `bidon.dia_boca_ext` — diámetro exterior de la boca.
- `bidon.altura_cuello` — del labio al arranque del hombro.
- `bidon.dia_asiento_hombro` — diámetro del hombro donde apoyará el anillo.

## Escala

Proyecto de DISEÑO (capa `user`, CAD paramétrico): la geometría nace acotada en
milímetros reales, no de fotogrametría. No aplica referencia de escala
fotográfica y no hay capa `measured` en este proyecto.

referencia_escala:
referencia_escala_mm:
factor_escala: 1.0

## Notas libres

La dosis nominal es de 50 g por golpe de palanca (media taza aproximadamente).
Un perro de 20 kg come 230 g/día en dos comidas → 2 golpes por comida más un
tercio. La dosis REAL depende de la densidad del alimento que se use: hay que
calibrarla pesando cinco golpes (`out/ENSAMBLE.md`, sección de calibración) y
anotar el resultado en `alimento.densidad_aparente_g_ml`.
