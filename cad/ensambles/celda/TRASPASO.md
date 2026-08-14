# TRASPASO — CELDA3, transportador omnidireccional experimental

Documento para retomar este trabajo en otra conversación. Léelo entero antes de
tocar nada: hay decisiones ya verificadas que no conviene repetir y trampas en
las que ya se cayó una vez.

**Rama:** `claude/modulo-3d-generation-4ezmuz` · **PR:** #103 (borrador)
**Última revisión:** `38588e3`

---

## 1. Qué se está construyendo

Un **módulo transportador omnidireccional experimental** de 9 celdas hexagonales
(3×3) que mueve cajas de cartón en cualquier dirección y las hace girar. Réplica
funcional del mecanismo del *celluveyor*.

**Referencia geométrica: la patente DE 10 2012 014 181 A1** (BIBA Bremen,
inventores Uriarte y Kunaschk, 2012), «Omnidirektionales Fördersystemmodul». El
PDF original está fuera del repositorio; su texto y sus 40 páginas rasterizadas
a 300 dpi están en `ref/` (los PNG están en `.gitignore`, se regeneran con
pymupdf desde el PDF).

Es un **modelo experimental de laboratorio, no un producto comercial**.

### Lo que el usuario YA TIENE comprado

| | Cantidad | Nota |
|---|---|---|
| Rueda omni Ø48 × 24.5 | **28** | el módulo usa 27 |
| Motor TT 1:48, 3–6 V, doble eje | **30** | el módulo usa 27 |

### Restricción de fabricación (la más importante del encargo)

Todo debe integrar **cuatro tecnologías**: componentes **comprados** + **chapa
plegada** + **pernería** normalizada + **impresión 3D**. Ninguna pieza puede
quedar fuera de una de esas cuatro categorías.

---

## 2. Estado actual, en números

| | |
|---|---|
| Celda | hexágono de **197.9 mm entre caras** · R (centro→rueda) = 76 mm |
| Módulo 3×3 | **69.3 × 57.1 cm** |
| Piezas por celda | **76** — 15 compradas · 7 fabricadas · 6 impresas · 48 de tornillería |
| Velocidad · carga | 0.50 m/s a 6 V · hasta 4.6 kg apoyados en 6 ruedas |
| Interferencias exactas | **3 sin resolver** (soporte en C ⨯ sensor); el resto limpio sobre 215 pares |
| Pruebas | 10 suites en verde · 23 comprobaciones en `test_celda.mjs` |

### Cómo se regenera todo

```bash
cd cad
npm install                                            # three, playwright
pip install cadquery trimesh pymupdf opencv-python-headless

node ensambles/celda/gen_celda.mjs                     # ensamble + compuerta
python3 ensambles/nbt90/interferencias_brep.py --doc ensambles/celda/celda3.json
node ensambles/celda/planos_celda.mjs                  # DXF de corte + despiece
python3 ensambles/nbt90/a_step.py --doc ensambles/celda/celda3.json \
        --salida ensambles/celda/out/step --piezas     # STEP conjunto y por pieza
node ensambles/nbt90/render.mjs celda/celda3.json ensambles/celda/vistas
node tests/test_celda.mjs
bash ensambles/celda/barrido.sh motor-dentro 60 90     # R mínimo, verificación exacta
```

---

## 3. Decisiones ya verificadas — NO volver a discutirlas

1. **Los ejes de las ruedas van RADIALES** (rodadura tangencial, disposición
   «kiwi»). Con ejes tangenciales la columna de ω de la matriz cinemática se
   anula (`det M = 0`) y la celda no puede girar el bulto. Demostrado en
   `test_celda.mjs` y confirmado por medición de la patente (119.7°–120.3°).
2. **El motor NO carga el peso del bulto.** Cada rueda va sobre su eje Ø4 entre
   dos rodamientos 624ZZ; el TT entrega solo par por un acople impreso. El eje
   del TT es de plástico y en voladizo.
3. **El encoder va sobre el eje de la RUEDA**, no del motor: mide la salida real
   y es inmune a que el acople patine.
4. **La geometría real cambia el resultado.** Con envolventes el barrido daba
   R = 71; con las piezas modeladas de verdad pide R = 76. La campana del motor
   y su soporte se comen 5 mm.
5. **El soporte es una C de chapa plegada**, no bloques impresos. La patente lo
   dicta en [0054]: *«ein im wesentlichen C-förmiger, nach oben offener Träger 32
   mit… Abkantungen 34 mit Bohrungen»*. 2 mm, 4 pliegues, desarrollo 120.08 mm
   con factor K = 0.44.
6. **Ruedas de bola pasivas** a la altura de las motrices ([0050]), para que el
   bulto no se enganche al cruzar de celda a celda.

---

## 4. Trampas en las que ya se cayó (no repetir)

- **El traductor a B-rep ignoraba el cuaternión de la pieza.** Ya corregido en
  `a_step.py`. Si aparecen interferencias «al 100 % de la menor» entre piezas
  idénticas, es que algo volvió a perder la rotación.
- **El informe de interferencias se escribía siempre en la carpeta del NBT90.**
  Ya corregido: acompaña al documento verificado.
- **`revolve` toma el eje SIN signo** (siempre crece hacia +x). Anclar los
  revolucionados en el extremo de menor x de su tramo.
- **El corte de boceto se extruye hacia −n** desde su plano: el plano del corte
  va ARRIBA de lo que se quiere quitar.
- **Un `hole` anclado en el plano medio de una pared solo taladra su mitad
  delantera.** Arrancarlo por fuera de la pieza.
- **No construir piezas con un marco genérico (u, w, t):** los signos se
  invierten cuando el motor mira al centro y las piezas quedan del revés. Usar
  coordenadas locales explícitas y pasar `s` (+1/−1).
- **El sondeo por cajas de `gen_celda.mjs` deja pasar solapes.** La verificación
  que manda es `interferencias_brep.py`.

---

## 5. Lo que dijeron los cuatro agentes

Los informes completos están en `ref/`. Resumen de lo accionable:

### `ref/patente_analisis.md` + `ref/patente_numerales.json`
- Regla geométrica dura [0049]: ruedas en los **puntos medios de los lados de un
  triángulo equilátero**, unidades en estrella a **γ = 120°**, ejes sobre las
  mediatrices, **prolongaciones de los ejes de motor concurriendo en el centro**.
- **La patente no describe NINGUNA transmisión** ni ninguna ecuación de control,
  y **no trae ni una sola cota en mm ni un solo material**.
- Contradicción real: [0011] dice 0° entre dirección eficaz y lado; la
  reivindicación 5 dice 90°. Lo coherente con [0049]+[0053] es **0°**.

### `ref/figuras_medicion.json` + `ref/figuras_resumen.md` (medición por píxeles)
- **R = a/2** con `a` = circunradio = lado del hexágono (0.499–0.512·a en tres
  láminas independientes).
- **Ø rueda ≈ 0.52·a** ⇒ para Ø48 la celda de la patente sería de **≈160 mm entre
  caras con R ≈ 46**, contra los 197.9 con R = 76 de ahora.
- **Los motores van hacia AFUERA** (r ≈ 0.86–1.13·a): **sobresalen de su propio
  hexágono y se alojan bajo la chapa del vecino**. Por eso la celda original es
  pequeña. Ésta es la diferencia de arquitectura más importante.
- Teselado en panal edge-to-edge, paso √3·a, todos los módulos con la misma
  orientación.
- El agente corrigió un fallo de `tools/med_px.py` con OpenCV 5
  (`reshape(-1,4)` en `lineas`); sin eso no se podían medir ángulos.

### `ref/bastidor_propuesta.md` (diseño mecánico de chapa y pernería)
- **La placa de acrílico 5 mm NO cumple**: flecha 0.694 mm (1.156 mm a 1000 h por
  fluencia) contra el criterio L/500 = 0.408. Propone **Al 5052-H32 de 2.5 mm**
  (0.237 mm).
- **Defecto abierto:** el PCB del sensor llega a 103.05 mm perpendicular a la
  cara del hexágono y la cara está a 101.97 → **sobresale 1.07 mm**, así que las
  celdas **no pueden atornillarse cara contra cara**. Propone colgar cada celda
  de los **tres vértices libres**, que en el panal coinciden de a tres: 15 nudos
  isostáticos.
- **Propagación peligrosa:** bajar `placaEsp` de 5 a 2.5 lleva `largoRanura` de
  44.99 a 40.86 mm. Sin recalcular, **la rueda no pasa por su ranura**.
- Perfiles con desarrollo calculado, 428 tornillos con par por unión, e inserto
  de latón termofusible + espiga Ø8 H11 en la interfaz impreso↔chapa.

### `ref/diseno_industrial.md`
- **Sin apoyos pasivos, una caja de hasta 150 mm no toca ninguna rueda.** Propone
  24 bolas locas (hoy hay 6).
- **El sensor del encoder es lo que fija el tamaño del hexágono** (R = 109.75)
  y no la rueda (R = 88.25). Ya se atacó en parte; queda margen.
- Propone cartucho de accionamiento extraíble, deck de una sola pieza, collarín
  de ranura impreso y basculación del módulo 90° para mantenimiento.

---

## 6. Decisiones abiertas — hacen falta del usuario

1. **¿Se rehace la celda con la proporción de la patente?** Motor hacia afuera
   anidando bajo la celda vecina, R ≈ a/2, celda ≈160 mm y módulo ≈56 × 46 cm.
   Es un cambio de arquitectura: obliga a rehacer el barrido y a tratar las 9
   celdas como un conjunto en vez de celda a celda. Gana ~20 % de compacidad y
   respeta la geometría original.
2. **El plano de la rueda omni Ø48 no está en disco.** Llegó incrustado en un
   mensaje, así que ningún agente puede medirlo por píxeles. Quedaron sin
   interpretar las cotas **16.20** y **3.58**. Pedir el archivo adjunto.
3. **Material de la placa**: acrílico 5 (no cumple) vs Al 5052-H32 2.5 vs DC01
   2.0. Si se cambia, recalcular `largoRanura`.

## 7. Medidas que faltan del usuario (con calibre, 5 minutos)

| Cota | Hoy | Qué rompe si está mal |
|---|---|---|
| Agujero de la rueda | 4 mm *(afirmado, sin verificar)* | los 54 rodamientos y los 27 ejes |
| Entrecaras del eje plano del TT (`ttEjeAF`) | 3.7 *(decisión de diseño)* | el alojamiento del acople |
| Posición de los 2 M3 del TT (`ttFijacionB/C`) | 9 y 8.5 *(decisión)* | los taladros del soporte en C |

---

## 8. Siguiente paso recomendado

Por orden:

1. **Resolver las 3 interferencias** soporte en C ⨯ sensor (bloquea el «cero
   interferencias» del conjunto).
2. **Resolver que las celdas no se pueden atornillar entre sí** — es un defecto
   de arquitectura, no de detalle: o se reubica el sensor, o se pasa al montaje
   por los tres vértices libres.
3. **Modelar el bastidor** en `bastidor_modulo.mjs` y pasarlo por
   `interferencias_brep.py`. `ref/bastidor_propuesta.md` es memoria de cálculo,
   **no** un modelo: nada de lo que propone está verificado geométricamente.
4. Decidir la arquitectura del punto 6.1 antes de cortar cualquier chapa.

## 9. Regla de oro del repositorio

No se inventa geometría. Cada cota lleva su procedencia en `params.mjs`
(`dib` dibujo / `cat` catálogo / `usr` afirmación del usuario / `dis` decisión de
diseño con justificación), y los datos de web van a `analisis/web_facts.json`
con URL, fecha de acceso y cita textual. Si un dato no se tiene, se marca
**A VERIFICAR** y se sigue; no se rellena con un número plausible.
