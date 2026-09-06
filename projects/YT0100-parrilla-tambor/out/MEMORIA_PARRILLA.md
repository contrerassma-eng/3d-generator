# YT0100 "Medio Tambor" — memoria de diseño

Parrilla / ahumador sobre medio tambor de 200 L, **100 % atornillada**, con
perfilería tubular, 13 piezas de chapa CNC, motor de spiedo y roble macizo.

Generado por `design/gen_parrilla.py` desde `design/parametros.json`.
Toda la geometría es **capa `user`** (diseño). Los datos de terceros están en
`input/web_facts.json` con URL, fecha y cita textual.

---

## 1. Cifras del producto

| | |
|---|---|
| Envolvente (tapa cerrada) | **1464 × 757 × 1309 mm** |
| Altura de trabajo (borde de la cuba) | **880 mm** |
| Superficie de parrilla | **0,416 m²** (2 módulos de 400 × 520) |
| Niveles de parrilla | 3 — varillas a **132 / 168 / 202 mm** sobre el fondo del brasero |
| Masa total | **87,3 kg** |
| Piezas distintas | **37** (13 de chapa CNC, 4 largos de tubo, 4 de madera) |
| Piezas totales | **296** (de las cuales 200 son tornillería) |
| Uniones soldadas | **0** |

Reparto de masa (kg): bastidor 25,6 · chapa CNC 19,4 · tambor 18,4 ·
madera 10,5 · parrilla 6,0 · comprados 3,9 · tornillería 3,5.

## 2. De dónde sale cada dato

| Dato | Capa | Fuente |
|---|---|---|
| Ø572 × 851 × e1,10 del tambor; 208 L; 19,5 kg vacío | `web` | repackify / Greif — ver `web_facts.json` |
| Motor 220 V / 40 W / 2,5 rpm / eje Ø8 / 80 kg | `web` | ficha comercial citada |
| Roble 755 kg/m³, "very durable" | `web` | The Wood Database |
| Toda la geometría, espesores, alturas y uniones | `user` | decisiones de este diseño |
| Masas | derivadas | volumen del modelo × densidad (acero 7,85 · inox 7,90 · roble 0,755 g/cm³) |

**Verificación cruzada:** el modelo da 9,18 kg por media virola. El tambor
completo pesa 19,5 kg según ficha ⇒ 9,75 kg por mitad. Diferencia **5,8 %**,
compatible con las tapas embutidas y los nervios reales. La geometría del
tambor es coherente con la fuente citada.

## 3. Las cuatro exigencias, y cómo se resuelven

### R4 — Sin soldadura (la restricción que ordena todo el diseño)

| Unión | Solución | Por qué funciona sin soldar |
|---|---|---|
| Tubo ↔ tubo (bastidor) | **Traslape directo + 2 × M8 en remache-tuerca** | Los tubos se cruzan por la cara, no a tope: la unión trabaja a cortante en dos pernos, no a flexión de un cordón. **No hay ninguna escuadra intermedia.** |
| Chapa ↔ tubo | M8 en remache-tuerca instalado en el taller de tubos | El remache-tuerca es lo que reemplaza a la tuerca soldada; se pone con una pistola, en segundos |
| Chapa ↔ tambor | M6 pasante + **golilla ancha** + tuerca de brida serrada | La golilla reparte sobre la chapa de 1,1 mm del tambor, que si no se ovalaría |
| Canto cortado del tambor | `PER-CANTO` atornillado, 6 × M5 por perfil | Ver §4 |
| Parrilla | Varillas pasantes + `PAR-PLETINA` atornillada | La parrilla se arma sin soldar ni un punto |
| Bisagra | 2 hojas iguales + pasador M8 con tuerca autoblocante | Bisagra desmontable; la tapa sale sin herramienta especial |

**El remache-tuerca es la pieza clave del proyecto:** sin él haría falta acceso
al interior del tubo, y sin acceso el bastidor exigiría soldadura.

### R7 — Premium

- **Ningún canto cortado a la vista.** Los cuatro bordes del corte longitudinal
  van encapsulados en `PER-CANTO`; al cerrar, las dos alas se enfrentan y forman
  el asiento de la tapa (laberinto de humo, y superficie lista para una junta de
  fibra si se quiere sellar más).
- **Tiro regulable arriba y abajo** (4 discos), en las **testas planas** del
  tambor: asiento perfecto, sin fugas por curvatura.
- **Parrilla regulable en 3 alturas** sin herramienta: se levantan las dos barras
  y se cambian de peldaño.
- **Madera atornillada desde abajo**: la cara superior de la mesa, el estante y
  las asas no tiene ni un tornillo a la vista.
- **Tapa abisagrada** con el eje por fuera de las alas de canto: abre 90° sin
  rozar y sin desmontar nada.

### R8 / R9 — Bajo costo y escalabilidad

Consumos por unidad (calculados del modelo, no estimados):

| Recurso | Cantidad | Comentario |
|---|---|---|
| Tubo 40×40×2 | **10,0 m** (4 largos distintos) | 2 barras de 6 m por unidad |
| Chapa e3 | 0,42 m² netos / **0,75 m² de blancos** | ≈ 4 unidades por lámina de 1220×2440 |
| Chapa e2 | 0,60 m² netos / **0,65 m² de blancos** | ≈ 4 unidades por lámina |
| Corte láser | **44,2 m** de trayectoria (22,8 + 21,4) | El costo de láser se cotiza por metro: este número es el que hay que pedir |
| Plegados | **22 pliegues** en 9 piezas distintas | 1 sola plegadora; ninguna pieza pasa 4 pliegues |
| Roble | 0,0145 m³ (4 despieces) | |
| Tambor | 1 unidad, **recuperado, sin descarte** | Las dos mitades se usan |

- **Dos espesores únicos** (e3 y e2) ⇒ dos programas de anidado, dos cambios de
  material al día.
- El blanco de `CUN-CUNA` (660 × 352) tiene un gran vaciado en arco: ahí caben
  anidadas `CRE-RACK`, `BIS-HOJA`, `SOP-CHUM` y `ASA-SOP`. El consumo real de
  lámina es menor que los 0,75 m² de las cajas envolventes.
- **La producción no necesita soldador ni cabina de soldadura**, que es el
  cuello de botella típico de este producto: escalar es agregar puestos de
  armado (banco + 2 llaves), no capacidad de taller ni calificación de personal.
- **Se taladra el tambor entero y después se corta** (`PLA-TESTA` +
  `PLA-VIROLA`, utillaje de este proyecto): no hay que sujetar medias cañas
  para taladrar, y el kit llega a armado con todos los agujeros hechos.

### R10 — Fácil de armar

Herramientas: **llave 13, llave 10, llave 8 y un destornillador**. Nada más.
Sin taladrar, sin soldar, sin herramienta especial. Ver `out/ARMADO.md`.

## 4. El problema real: un tambor cortado pierde su rigidez

Un tambor cerrado es rígido porque es un tubo cerrado. Al cortarlo por su plano
diametral, cada mitad queda como una lámina de 1,1 mm de 851 mm de largo con
dos bordes libres: se abre y se ondula sólo con su peso.

Este diseño lo resuelve **sin soldar**, con tres elementos que trabajan juntos:

1. **`PER-CANTO`** — perfil 28 × 22 en e2, del largo completo (851 mm),
   atornillado a la pared por 6 × M5. Convierte cada borde libre en un ala de un
   perfil en L: la sección resistente del borde pasa de 1,1 mm de chapa a un
   ángulo. Es lo que impide que la boca se abra.
2. **`CUN-CUNA`** ×2 — cunas de e3 que abrazan la virola hasta ±55° y la
   **amarran** con dos pestañas tangentes por cuna (4 × M6). No sólo sostienen:
   fijan la forma circular en dos secciones.
3. **Las testas del propio tambor**, que quedan enteras en cada mitad y actúan
   de diafragma en los extremos.

Las pestañas de amarre son tangentes a la virola por construcción (la línea de
pliegue es una tangente exacta al arco): **apoyan planas contra el tambor, no de
canto**. Mismo criterio en `BRA-SOP`, que es largo en X (donde el cilindro es
plano) y angosto en el sentido curvo, de modo que el hueco máximo contra la
pared es **0,7 mm**.

## 5. Térmico

- El fuego vive en `BRA-CUERPO` (e2), **66 mm** por encima del fondo de la cuba:
  la virola no recibe llama directa y la ceniza cae por las perforaciones
  Ø14 al fondo. 66 mm es holgado para un asado, **justo para una jornada larga
  de ahumado**: si el uso es ahumador, bajar `z_brasero` no sirve (el brasero
  se angosta con la curva) — hay que vaciar ceniza entre tandas.
- Aire: entra por los dos tiros bajos de las testas y sale por los dos altos de
  la tapa — tiro cruzado regulable en los dos extremos.
- La madera está **fuera de la zona caliente** (distancias medidas del modelo):
  la mesa a **110 mm** de la testa, la barra frontal a **221 mm** de la
  superficie del tambor, el estante **369 mm** bajo el fondo. Ninguna pieza de
  roble toca el tambor ni ve llama.
- El **asa de la tapa** sí está sobre una zona caliente: los 95 mm de montante de
  3 mm actúan de puente térmico largo y el roble es mal conductor, pero **con la
  tapa mucho rato cerrada hay que usar guante**. No se ha medido.
- Dilatación: la virola crece ≈ 0,9 mm en 851 mm por cada 100 °C
  (α ≈ 11 µm/m·K). Los agujeros de M5/M6 con holgura de paso (Ø5,5 / Ø6,6) la
  absorben; no hay ninguna unión que impida el movimiento longitudinal.

## 6. Secuencia de fabricación

1. **Tambor** — desgasificar y quemar el interior (el tambor es recuperado);
   taladrar las **dos testas** con `PLA-TESTA` y la virola con `PLA-VIROLA`
   **con el tambor todavía entero**; recién entonces cortar por el plano
   diametral. Las dos mitades salen listas.
2. **Láser** — 2 láminas (e3 y e2) con los 13 desarrollos del producto que hay en
   `out/drawings/` (el 14.º DXF es el utillaje `PLA-VIROLA`, se corta una vez).
   Los DXF están a escala real: capa `CORTE` = trayectoria; `PLIEGUE` y
   `TANGENTE` son referencia y **no se cortan**.
3. **Plegadora** — 22 pliegues. Cada DXF lleva rotulado el sentido, el ángulo,
   el radio y el BA de cada pliegue.
4. **Tubos** — 4 largos de corte + Ø11 y Ø9; **remaches-tuerca M8** puestos aquí.
5. **Pintura** — en polvo alta temperatura sobre las piezas sueltas (kit plano).
6. **Armado** — banco, 2 llaves, ~45 min (estimado, no cronometrado).

## 7. Lo que este modelo NO acredita

Dicho sin rodeos, para que nadie fabrique creyendo que está verificado:

- **No hay cálculo estructural.** Los espesores (e3 / e2 / tubo 40×40×2) salen
  de práctica de taller, no de un cálculo de tensiones ni de un FEM. La cuna en
  e3 está holgadamente sobredimensionada a la vista (una placa cargada en su
  plano); **e2,5 o e2 probablemente basten y ahorrarían 1,3 kg por unidad** —
  pero eso hay que verificarlo, no suponerlo.
- **No hay ensayo térmico.** Ni temperaturas de la madera, ni del asa, ni
  deformación de la virola en caliente, ni vida útil del brasero de e2.
- **No hay prototipo.** Ninguna cota se ha contrastado contra un tambor real.
  Los tambores recuperados varían ±10 mm en Ø y ±15 mm en largo entre
  fabricantes: **medir el tambor que se compre y ajustar `parametros.json`
  antes de mandar a cortar**.
- **El patrón de montaje del motor es un SUPUESTO** (S2 en `descripcion.md`):
  2 × Ø6,6 a 50 mm. No está publicado. Verificar con el motor en mano.
- **Los pliegues del sólido 3D son de arista viva.** El radio real sólo
  interviene donde importa para fabricar, que es el desarrollo (BA y BD
  exactos, factor K 0,38). Diferencia geométrica en el sólido: 0,43 × espesor.
- **Precios: ninguno.** La §3 entrega *cantidades* medidas del modelo
  (metros de corte, m² de blanco, número de pliegues, metros de tubo), que es lo
  que hay que llevar a cotizar. Poner precios aquí sería inventarlos.
- Las uniones traslapadas de tubo aprietan las dos paredes del tubo pasante.
  Para producción conviene **casquillo interior o perno con collar**; con
  40×40×2 y M8 al par correcto no se abolla, pero conviene confirmarlo.

## 8. Regenerar el producto

```bash
python design/gen_parrilla.py                        # sólido + DXF + BOM
python design/vista.py iso alzado perfil planta      # vistas PNG
python ../../pipeline/s6_drawings.py . --fuente out/cad/parrilla_tambor.glb
```

Cambiar **un** valor de `design/parametros.json` (por ejemplo el Ø del tambor
que se consiguió, o la altura de trabajo) y volver a correr: se recalculan la
cuna, los desarrollos de corte, las masas y el BOM. El producto es paramétrico
de punta a punta.
