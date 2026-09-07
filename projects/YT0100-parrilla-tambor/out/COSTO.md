# YT0100 — dónde está el costo y qué se hizo con él

Generado por `design/costo.py` desde el BOM y `design/costos.json`.
**No hay precios inventados**: cada valor lleva su fuente y lo que falta se
reporta como PENDIENTE. Lo que sí se calcula —y es lo que de verdad se
cotiza— son las **cantidades físicas**.

---

## 1. Lo primero: el costo no estaba donde uno cree

Con los dos únicos precios que se pudieron citar:

| Concepto | Cantidad medida | Precio citado | Costo |
|---|---|---|---|
| Tubo 40×40 | **1,90 barras de 6 m** por unidad (lote de 10) | $12.150 la barra ([globalgtc](https://globalgtc.cl/producto/perfiles/perfil-tubular-cuadrado-40x40x2-00-mm-6mtrs/)) | **$23.085** |
| Corte láser | **10,5 min** de máquina por unidad | $350 el minuto ([corteenlaser](https://www.corteenlaser.cl/)) | **$3.675** |

**El tubo cuesta 6,3 veces el corte láser.** La intuición dice que "las piezas
CNC son lo caro"; los números dicen que no. Y falta el tercero:

| Armado | **134 uniones**, ≈ **74 min** por unidad |
|---|---|

A cualquier valor-hora realista, **el armado pesa más que todo el corte láser
del producto**. Las tres palancas reales, en orden, son: **tubo → mano de obra
→ chapa**. El láser es casi ruido.

> El precio del tubo citado es el del **e2**; este diseño usa **e1,5**, que pesa
> 24 % menos. Los $23.085 son una **cota superior**: el número real hay que
> cotizarlo (está como PENDIENTE en `costos.json`).

## 2. Un defecto que apareció al buscar el costo

Al mirar la parrilla como línea de costo salió a la luz que **el paso de varilla
era 45 mm con varilla Ø8: 37 mm de hueco**. Por ahí se cae un chorizo. Era
inservible.

Arreglarlo manteniendo la parrilla fabricada exigía paso 20 mm: **52 varillas,
104 agujeros y 104 inserciones de armado**. Es decir, arreglar el defecto por la
vía "fabricada" hacía subir el costo justo en la partida que más pesa (mano de
obra).

**La parrilla pasa a ser comprada.** El diseño aporta las barras de apoyo y las
cremalleras, que aceptan cualquier parrilla de la medida. Resultado: hueco de
**14 mm** (usable), **−8 piezas de chapa**, **−104 agujeros**, **−24 uniones**.
`design/costo.py` calcula el punto de equilibrio en la opción **O4**: fabricarla
cuesta +2 piezas CNC, +24 uniones y ≈ +24 min de armado. Sólo conviene si la
parrilla comprada supera eso.

## 3. Qué se cambió y cuánto bajó

| | Antes | Ahora | Δ |
|---|---:|---:|---:|
| **Masa total** | 87,3 kg | **78,4 kg** | **−10,2 %** |
| Bastidor | 25,5 kg | 19,4 kg | −24,0 % |
| Chapa CNC | 19,4 kg | 16,8 kg | −13,6 % |
| Madera (roble) | 10,6 kg | 6,9 kg | −35,2 % |
| **Corte láser** | 44,2 m | **33,3 m** | **−24,7 %** |
| Blanco de chapa e3 | 0,75 m² | 0,69 m² | −7,0 % |
| Blanco de chapa e2 | 0,65 m² | 0,55 m² | −15,3 % |
| Piezas CNC distintas | 13 | **11** | −15,4 % |
| Piezas totales | 296 | **241** | −18,6 % |

Las decisiones, una por una:

| # | Cambio | Por qué no degrada | Efecto |
|---|---|---|---|
| 1 | **Tubo 40×40×1,5** en vez de ×2 | El perno pasa por **una sola pared**: la cara exterior lleva un agujero de acceso Ø16 para la llave. Sin aplastamiento, y **se eliminan 40 casquillos** | −6,1 kg de acero, −24 % de la partida más cara |
| 2 | **Parrilla comprada** | Corrige el hueco de 37 mm y evita 104 inserciones | −8 blancos, −104 agujeros, −24 uniones |
| 3 | **Brasero Ø20 a paso 70** (era 52 × Ø14) | 30 agujeros grandes dan **más** área de paso de aire que 52 chicos | −0,4 m de corte y mejor tiro |
| 4 | Brasero 780×280×60 (era 810×300×70) | Sigue entrando el carbón para 0,42 m² de parrilla | −15 % del blanco de e2 |
| 5 | **Roble de 19 mm y un solo estante** | El roble es el material más caro por kg y en el estante no se ve ni se toca | −3,7 kg de roble (−35 %) |
| 6 | **Espetón en acero al carbono** | En parrilla criolla el fierro curado es lo bueno; el inox es lo de las parrillas de supermercado | Sale el inox del producto |
| 7 | **Canto con 5 tornillos** (era 6) | Paso de 170 mm, suficiente para rigidizar el borde | −4 uniones |
| 8 | **Dos pinturas** | **37 % de la masa** no ve fuego (todo el bastidor): pintura estándar en vez de silicona de alta temperatura | Ahorro de proceso |
| 9 | Tornillería **derivada de las piezas** | Antes estaba escrita a mano y quedó desactualizada al cambiar el diseño | El BOM ya no se puede desincronizar |

## 4. La escala importa más que cualquier rediseño

Los mismos DXF, producidos de a una o en lote de 10:

| | De a una | Lote de 10 |
|---|---:|---:|
| Barras de tubo por unidad | 2,00 | **1,90** |
| Descarte de tubo | 10,9 % | **6,2 %** |
| Aprovechamiento de lámina e3 | 23,3 % | **77,8 %** |
| Aprovechamiento de lámina e2 | 18,4 % | **61,4 %** |
| Unidades por lámina | — | **3,33** de cada espesor |

**Producir de a una tira tres cuartas partes de la lámina.** Ésta es la
diferencia más grande de todo el análisis y no cuesta rediseñar nada: cuesta
programar el láser por lote.

El anidado calculado es **conservador**: el nester de `costo.py` sólo acomoda
rectángulos. El blanco de `CUN-CUNA` tiene un vaciado en arco de ~0,10 m² donde
caben `CRE-RACK`, `BIS-HOJA`, `SOP-CHUM` y `ASA-SOP`. Un nester real saca más.

## 5. Palancas que quedan (las decide el usuario, no el diseño)

| Opción | Tubo | Roble | Uniones | Armado | Qué se pierde |
|---|---|---|---|---|---|
| **O1 · Sin mesa lateral** | **10,69 → 7,88 m** (−0,50 barras/u ≈ **−$6.075**) | −2,31 kg | −18 | −9 min | La superficie de apoyo. **Es la palanca más grande.** |
| **O2 · Sin estante** | — | −2,67 kg | 0 | 0 | El estante; los largueros quedan y admiten una tabla después |
| **O3 · Sin motor de spiedo** | — | — | −6 | −3 min | El ítem comprado más caro, **pero fue pedido explícitamente** |
| **O4 · Parrilla fabricada** | — | — | **+24** | **+24 min** | Es el camino caro: sólo si la parrilla comprada cuesta más que eso |

**O1 + O2 juntas** sacan ≈ **$6.075 de tubo, 5,0 kg de roble y 18 uniones** —
pero dejan el producto sin nada de roble a la vista salvo el asa y la barra.
Ahí ya no es una decisión de ingeniería sino de posicionamiento: es tuya.

## 6. Lo que falta para cerrar el costo

`design/costos.json` tiene **13 precios PENDIENTES**. Los cuatro que mueven la
aguja, en orden:

1. **Tubo 40×40×1,5** en barra de 6 m — la partida más cara del producto.
2. **Plancha e3 y e2** de 1220×2440 — se consumen 0,30 láminas de cada una por
   unidad en lote de 10.
3. **Tambor de 200 L recuperado** — el ítem con más variación entre proveedores.
4. **Motor de spiedo** y **parrilla de fierro** — los dos comprados que definen
   si O3 y O4 tienen sentido.

Con esos cuatro números, `python design/costo.py` cierra el costo completo.
Sin ellos, entrega las cantidades —que es lo que hay que llevar a cotizar.

---

*Los tiempos de láser y de armado salen de supuestos de proceso declarados en
`costos.json` (velocidad de corte por espesor, tiempo de perforación, segundos
por unión). No están cronometrados: son estimaciones de ingeniería, editables.*
