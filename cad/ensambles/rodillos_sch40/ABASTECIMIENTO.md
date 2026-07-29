# ABASTECIMIENTO — 80 rodillos en 8 semanas

Cómo repartir compra en China / compra en Chile / fabricación local para tener
**80 rodillos RC-SCH40-48 en 56 días** al mejor costo.

Reproducir: `node cad/ensambles/rodillos_sch40/abastecimiento.mjs 80 0 8`
(cambia los argumentos: `nPlanos nConicos semanas`).

Etiquetas: **[F]** dato con fuente citada · **[E]** estimación mía, hay que cotizar.
Fuentes en `projects/RC-SCH40-48/input/web_facts.json`.

---

## El resultado en una frase

**Compra todo en Chile menos las tapas y los rodamientos; ésos vienen de China
POR AVIÓN en el primer embarque; el torneado se hace acá y son sólo 20 horas de
máquina.** Sale **US$ 18–29 por rodillo** según qué hagas con la tapa.

---

## 1. La restricción que manda: el barco no llega

| Ruta | Desglose | Total | ¿Cabe en 56 d? |
|---|---|---|---|
| **Aéreo** | 5 RFQ + 20 producción + 3 booking + **8 vuelo** + 4 aduana | **40 d** | ✅ con 16 d de holgura |
| Marítimo FCL | 5 + 20 + 3 + **31 barco** + 10 aduana | **69 d** | ❌ |
| Marítimo LCL | igual pero con consolidación | 61–99 d | ❌ |

Tránsito **[F]**: Shanghái/Ningbo → San Antonio **28–32 días**; Shenzhen 30–34.
Aéreo **7–10 días**. Aduana con documentos completos: **24–72 h hábiles** en canal
verde, 2–7 días en canal rojo.

**Y el aéreo aquí casi no duele.** Todo lo que viene de China pesa **17 kg**
(160 tapas de 67 g + 160 rodamientos de 39 g + 160 anillos). A **US$ 5–8/kg [F]**
son **US$ 85–137 de flete** sobre US$ 200–400 de mercadería. No hay ningún
argumento de costo para el barco en esta lista de materiales.

**Arancel [F]:** 6 % ad valorem sobre CIF, **pero el TLC Chile–China lo deja en
0 %** si el proveedor emite el **Certificado de Origen Form F**. Pídelo: no cuesta
nada. El IVA de 19 % se recupera como crédito fiscal si estás con IVA.

---

## 2. Qué se compra dónde

| Ítem | Cant. | Ruta | Días | Por qué |
|---|---|---|---|---|
| Cañería A53 SCH40 1-1/2" | **8 barras de 6 m** | **Chile** — Küpfer / Prodalam / Cintac | 1–3 | Ítem de bodega. 11 tubos por barra. Importar acero pesado es absurdo. |
| Barra Ø12 SAE 1045 trefilada | **8 barras de 6 m** | **Chile** — Otero / Küpfer / Aceros RAY | 1–5 | Ver §4: aquí está el ahorro grande. |
| Rodamiento 6201-2Z | 160 (pide 200) | **China, mismo vuelo** | 40 | US$ 0.20–0.50 **[F]** contra **US$ 2.57 [F]** en retail chileno. |
| Anillo DIN 471 Ø12 | 160 | **Chile** — Anillos Gerwuth | 1–10 | Importa y fabrica. Sin riesgo de plazo. |
| Resorte Ø18×1.4 L0=32 | 160 | **Chile** — American Spring / Resortes Araya | 8–15 | *"El proceso de fabricación puede demorar entre 3 y 5 días hábiles"* **[F]**. |
| **Tapa portarodamiento** | **160** | **decisión — ver §3** | 9–40 | La única pieza sin fuente chilena. |
| Torneado de tubos y ejes | 80 + 80 | **Chile** — taller de Santiago | 10–20 | **20 h de máquina**. No es el cuello de botella. |

---

## 3. La tapa: tres caminos, los tres caben

Es la única decisión de verdad del rodillo plano.

| | Costo (160 u + rodamientos) | Plazo | Riesgo |
|---|---|---|---|
| **1 · Comprar en China, aéreo** | **US$ 662–910** | 40 d | Depende de un proveedor y un vuelo. Es la única línea con riesgo de plazo. |
| **2 · Tornear en Chile de barra Ø50** | **US$ 850–1 172** | **10 d** | Ninguno. 18 h de torno + 44 kg de barra. |
| **3 · Imprimir en PA6-CF** | **US$ 488** *(sólo filamento + rodamientos)* | **9 d** | Fluencia del polímero — ver §6. No incluye horas-máquina de impresora. |

**Recomendación: la 2, tornear, salvo que ya tengas cotización firme del proveedor
chino.** Cuesta US$ 200–260 más que importar, y a cambio elimina la única
dependencia externa del programa. En un lote de 80 con fecha dura, esos US$ 250
son el seguro más barato que vas a comprar.

La 3 es la más barata en material pero paga con riesgo técnico, y su costo no
incluye la impresora ni el operador. Úsala para repuestos, o para las primeras 10
unidades mientras esperas las metálicas.

⚠️ **Las tapas chinas no están cotizadas contra nuestro plano.** Los US$ 1.00–2.25
salen de listados de portarodamientos **TK para 6204/6205 [F]**, que son piezas más
grandes de otra familia. El código **SKPB4812-2.0 no aparece con precio en ninguna
parte**. Sirve como orden de magnitud, no como cotización. Además a 160 unidades
estás **bajo el MOQ** de casi todos: compra 200 y paga el tramo de 100.

---

## 4. El error de US$ 2 400: acero plata vs 1045 trefilado

Esto se encontró cotizando y **corrige lo que yo mismo había recomendado antes**.

**ISESA vende el acero plata en barras de 1 metro** a **$29.760 CLP [F]**. Nuestro
eje mide **553 mm**: sale **un eje por barra** y se bota el 45 %.

```
80 ejes × $29.760 = $2.380.800 CLP ≈ US$ 2 506       ← acero plata
8 barras de 6 m de 1045 trefilado ≈ US$ 95–125 [E]   ← lo correcto
```

**Casi 20 veces.** El acero plata es material de matricería vendido al detalle; no
es materia prima de producción.

**Pero el trefilado viene h11**, que sobre Ø12 es −0/−0.11 mm: demasiado holgado
para que el aro interior no baile. La salida es obvia y barata:

> Comprar **1045 trefilado h11 en barra de 6 m** y **rectificar a g6 sólo los
> 40 mm de cada punta**, que es el tramo que recorre el aro interior (10 de ancho
> del rodamiento + los ~13 de carrera del resorte + margen).

Es la misma sujeción en la que ya se hacen las caras planas y las gargantas, así
que no agrega operación. Ya está en `params.mjs` (`eje.tolBarra`, `eje.zonaAjustada`).

---

## 5. Las camisas cónicas: comprar gana a imprimir

Sólo aplica si parte del lote es cónico. Con **80 cónicos** (240 camisas):

| | Costo | Recursos | Veredicto |
|---|---|---|---|
| Imprimir PA6-CF | **US$ 2 287** de filamento (53.6 kg) | **3 198 h → 5 impresoras** en paralelo 19 h/día durante 6 semanas | ⚠️ Es una línea de producción, no una tarea lateral |
| **Comprar en China, aéreo** | **US$ 1 068–2 028** | un embarque | ✅ Más barato y sin riesgo operativo |
| Molde de inyección | US$ 8 000–20 000 de utillaje | 25–45 d sólo el molde | ❌ No cabe |

La cuenta de impresión sale de la ficha real: **PA6-CF admite 8 mm³/s de velocidad
volumétrica máxima [F]** = 28.8 cm³/h teóricos, y lo realista es 60–75 % de eso →
**20 cm³/h**. Con 40.8 litros de plástico eso da ~3 200 horas de impresora.

Con **20 cónicos** (60 camisas) la cosa cambia: 800 h → **2 impresoras**, US$ 572
de filamento. Ahí imprimir sí es razonable.

⚠️ **Ojo con dos cosas del catálogo:** la camisa Damon es de **polipropileno**, no
de PA6 **[F]**; y no se encontró ningún proveedor que venda las camisas **sueltas**
con precio — Damon sólo las describe dentro del rodillo completo. Lo que sí está
cotizado son **rodillos cónicos completos a US$ 5–20 [F]**, que es una decisión de
diseño distinta (no calzarían con nuestro tubo de 522 ni con el eje Ø12).

---

## 6. PA6-CF: dos advertencias antes de comprar filamento

1. **`PA6-CF` no es lo mismo que "PA6 negro antiestático"**, que es lo que dice el
   catálogo. El nylon con fibra de carbono no es antiestático por norma. Si el
   antiestático es un requisito real de tu aplicación, hay que resolverlo antes de
   comprar. Si **no** lo es, con PA6 liso o incluso PETG tienes **2–3× el caudal y
   la mitad del costo de material** — y pasarías de 5 impresoras a 2.
2. **Operación [F]:** boquilla de **acero endurecido 0.6 mm** obligatoria (la fibra
   come el latón), 260–290 °C, secado **80 °C durante 8–12 h antes de cada
   impresión** y almacenaje bajo 20 % HR. **No pasar CF por el AMS**: destruye los
   tubos de PTFE; alimentar desde bobina externa.

---

## 7. Costo total

Sin IVA. Rango bajo/alto según las cotizaciones que faltan.

**80 planos:**

| Escenario | Total | Por rodillo |
|---|---|---|
| Tapa importada por aéreo | US$ 1 626–2 346 | **US$ 20–29** |
| Tapa torneada en Chile | US$ 1 814–2 609 | **US$ 23–33** |
| Tapa impresa en PA6-CF | US$ 1 452–1 924 | **US$ 18–24** |

Base común (cañería, eje, anillos, resortes, torneado de tubos y ejes):
**US$ 964–1 436**.

**60 planos + 20 cónicos:** US$ 25–40 por rodillo.
**80 cónicos:** US$ 47–61 por rodillo.

---

## 8. Plan — la semana 1 es la que importa

**Semana 1 (y de verdad, esta semana):**
1. **RFQ de la tapa a 3–5 proveedores chinos con el plano RC48**, pidiendo
   explícitamente: precio a 200 u, **días de producción** y **Form F**. Es el único
   ítem donde atrasarse mata la fecha. En paralelo, pide cotización de torneado de
   la tapa a un taller de Santiago: si el chino se demora, arrancas sin esperar.
2. **Decidir cónicos sí/no y cuántos.** De eso depende si hay que arrendar o
   comprar impresoras, o meter las camisas en el mismo embarque aéreo.
3. Cotizar: barra Ø12 1045 trefilada 6 m (Otero/Küpfer), torneado de tubos y ejes
   (2–3 talleres), resorte (American Spring), anillo (Gerwuth **por teléfono**, no
   publican precio), y **verificar el precio de la cañería en Küpfer** — el dato que
   se consiguió es de snippet y es internamente inconsistente.

**Semanas 2–3:** comprar cañería y barra (bodega), largar el torneado de tubos y
ejes (20 h, entra holgado), confirmar el embarque aéreo.

**Semanas 4–6:** llega el aéreo (día ~40), llegan resortes y anillos, se prensan
las tapas y se arma.

**Semanas 7–8:** armado, control y **holgura**. Deja las dos semanas libres: con
una fecha dura y un proveedor extranjero, la holgura es parte del diseño.

---

## 9. Lo que NO cabe en 56 días

- ❌ **Cualquier flete marítimo** (57–99 días).
- ❌ **Molde de inyección** (25–45 d de utillaje + muestras + envío = 40–75 d antes
  de la primera pieza buena).
- ❌ **Rodillos chinos a medida con más de 25 días de producción**, aun por avión.
- ⚠️ **Imprimir 240 camisas con menos de 3 impresoras** (y realmente hacen falta 5
  con margen de fallo).
- 💸 **Acero plata para los ejes**: llega a tiempo, pero cuesta 20× de más.

---

## 10. Lo que hay que cotizar (nada de esto está cerrado)

| Dato | Estado |
|---|---|
| Precio de la tapa SKPB4812-2.0 | **sin cotizar** — los US$ 1.00–2.25 son de una pieza análoga, no de ésta |
| Precio de la cañería en Küpfer | snippet contradictorio; la estimación por peso (~US$ 51/barra) es la creíble |
| Barra Ø12 1045 trefilada | **[E]** sin precio publicado |
| Hora de torno CNC en Santiago | **[E]** US$ 19–37/h; el único dato chileno hallado era de router CNC, otro proceso |
| Anillos DIN 471 y resortes | **[E]** ninguno publica precio; ambos cotizan por teléfono |
| Tipo de cambio | **[E]** se usó 950 CLP/USD |

El script recalcula todo con cambiar el bloque `C` de `abastecimiento.mjs`.
