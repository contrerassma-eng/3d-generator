# Descripción del objeto

Llenar los campos `clave: valor` (los lee el pipeline; dejar vacío lo desconocido).
Las afirmaciones de este archivo entran a provenance.json como capa `user`
(declarado, no verificado). Las dimensiones se contrastan contra lo medido.

objeto: Línea NO-Label — lectura de QR por el fondo de la caja y clasificación por tamaño (cajas de cereza)
fabricante: Conveyone SpA (diseño propio; módulos de banda M-haste MB400; omni según bloque del usuario)
modelo: CV-NLB (OMW-1 · TWB-MB400 · MB400-4000 · OMW-2 · BLT-500)
materiales: ruedas omni POM/PU, bandas modulares POM, perfiles de aluminio T-slot 40 / MA4080, chapa negro mate, UHMW

## Dimensiones declaradas (si se conocen; en milímetros, solo número)

largo_mm: 6779.2
ancho_mm: 609.6
alto_mm: 800

## Especificación del usuario (capa user — pedido 2026-10-05)

Secuencia pedida textualmente: «Avanza con Omni, M-haste MB400 twin belt
mientras y MB 4000 después, y luego Omni, luego cinta plana perpendicular
salida. Usa Inventor con todo el detalle necesario».

- **Omni 1**: bloque de ruedas omnidireccionales (render del usuario: 8 filas,
  correas síncronas laterales, 3 orejas de anclaje por lado). Justifica la caja
  hacia la DERECHA (−Y mirando aguas abajo).
- **Twin belt** sobre MB400 «mientras» (provisional hasta definir el twin belt
  definitivo): dos carriles con hueco central; la caja entra referenciada por
  una guarda de teflón; al entrar completa, una fotocélula dispara la cámara,
  que mira desde ABAJO por el hueco y lee el QR del fondo. El **box de cámara
  hay que alargarlo** (referencia en disco D: del usuario, no entregada).
- **MB400 de 4000 mm** después del twin (separa y transporta).
- **Omni 2**: clasifica — cajas chicas siguen derecho, cajas grandes salen a
  90° (lógica con detención, fotocélula a 0,82·L).
- **Cinta plana perpendicular** de salida para las cajas grandes.
- Cuadros azules del croquis = gabinetes (referencia, no modelados).
- Alcance (INVENTARIO_REPOS.md): Conveyone no cotiza el sistema NO-Label ni la
  cámara (Yolotech); aquí se modela la mecánica, el box, el sensor de disparo y
  el emplazamiento de la cámara como interfaz.

## Valores POR CONFIRMAR (sin fuente — no comprar ni fabricar)

- Dimensiones de caja chica y grande (placeholders 300×200×150 y 400×300×200).
- Altura del plano de producto 800 mm (mesa inox de planta en la foto).
- Rueda omni Ø60×38, 6 rodillos a 45° (proveedor); el render muestra 4 ruedas
  por fila y la compuerta G1 exige 7 a paso 3" para que la caja chica apoye en
  ≥2 columnas.
- Óptica de cámara 75° y posición del QR en el fondo de la caja (Yolotech).
- Referencias «box cámara» y «lavadora de totes» del disco D: del usuario.

## Escala

Proyecto de DISEÑO (capa user, CAD paramétrico): la geometría nace acotada en
mm reales, no de fotos. No aplica referencia de escala fotogramétrica.
