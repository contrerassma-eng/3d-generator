# Traspaso a Inventor — Bloque OMNI (divert de rueda mecanum para ZP2026)

**Para:** el colega que va a seguir el desarrollo en Autodesk Inventor
**De:** Sergio Contreras (contreras.sma@gmail.com) — modelado previo hecho en
CadQuery/OCCT, entregado en STEP
**Fecha:** 08-09-2026

Este documento dice **dónde está todo**, **qué conviene conservar tal cual**,
**qué conviene rehacer nativo en Inventor** y **qué decisiones ya están
cerradas** para que no haya que re-discutirlas.

---

## 1. Qué es esto

Un **módulo de desvío (divert) de ruedas mecanum** que reemplaza **8 rodillos**
de una zona del transportador de rodillos con acumulación **ZP2026**. Va
montado dentro del propio conveyor, apoyado en travesaños sobre las pestañas
inferiores, y las ruedas asoman **5 mm** sobre la tapa para tomar la carga.

- **32 ruedas mecanum** (4 filas × 8 ejes), impresas, Ø63.6–64.0
- **8 ejes** hexagonales de 1/2", alternando mano derecha / mano izquierda
- **2 motores** NEMA 24 de 3 N·m en lazo cerrado, uno por familia de mano
- Transmisión **Poly-V 6PJ** en cadena, correas de dos poleas
- Estructura de **chapa plegada inoxidable**, lenguaje de diseño tomado del
  **Flowsort SLD/DLD** (ver §6)

---

## 2. Dónde está todo

| Qué | Dónde |
|---|---|
| Repositorio | `github.com/contrerassma-eng/3d-generator` |
| Rama | `claude/omniwheel-print-analysis-7kzqfg` |
| Pull request | [#110](https://github.com/contrerassma-eng/3d-generator/pull/110) |
| Carpeta de trabajo | `docs/analisis/bloque_omni/` |
| Rueda mecanum (pieza aparte) | `docs/analisis/mecanum64v9/` |

### Archivos que importan

| Archivo | Qué es |
|---|---|
| `COMPONENTES_STEP_v8.zip` | **Lo primero que hay que abrir.** Un STEP por componente: 32 referencias (chapas, poleas, correas, ejes, rodamientos, tornillería, motor, ruedas) |
| `BLOQUE_OMNI_v8_ENSAMBLE.zip` | `bloque_omni_v8.step`: el ensamble completo, 470 piezas instanciadas, 49 MB. **Sirve de referencia de posiciones**, no para editar |
| `VISTAS_BLOQUE_OMNI_v8.zip` | 8 renders del módulo sin tapa superior (planta, alzados, perfil, detalles) |
| `COMPONENTES_STEP.md` | Memoria técnica de la v8: materiales, desarrollos de chapa, transmisión, correcciones |
| `PLACAS_FLOWSORT.md` | De dónde sale el estilo de las chapas (las 9 reglas leídas del manual Flowsort) |
| `INTERPRETACION_FLOWSORT.md` | La caja Flowsort elemento por elemento y su traducción a este módulo |
| `DEPURACION_v5.md` | Cotas reales del motor medidas del STEP oficial (ojo: el patrón es 50×50, **no** 47.14) |

Los `.py` de la carpeta son los generadores; **no hacen falta para trabajar en
Inventor**, pero sirven si hay que regenerar un STEP con otra cota.

---

## 3. Sistema de coordenadas y cotas maestras

Todo el STEP viene en **milímetros**, con este origen (respetarlo al importar):

- **X** = a lo largo del transportador (sentido de avance)
- **Y** = transversal; **Y negativo** es el lado donde van los motores
- **Z** = vertical, **Z = 0 es arbitrario**; lo que manda es el plano de rodadura
- Origen en el **centro del módulo**

| Cota | Valor | De dónde sale |
|---|---|---|
| Paso entre ejes | **74.75 mm** | medido de la malla real del ZP2026 |
| Nº de ejes / zona | 8 / **598 mm** | reemplaza 8 rodillos |
| **Plano de rodadura** | **z = 115.1** | el del ZP2026: es la cota que NO se puede mover |
| Eje de las ruedas | z = 83.1 | rodadura − 32 (radio de envolvente) |
| La rueda asoma sobre la tapa | **5.0 mm** | pedido |
| Cara inferior de la tapa | z = 107.1 | chapa de 3 |
| Rieles (largueros del módulo) | y = −116 y y = +218 | chapa de 4 |
| Placa base | z = −72.6 … −68.6 | chapa de 4 |
| Pestaña inferior del ZP2026 | z = −78.6 | ahí apoyan los travesaños |
| Cara interior del conveyor | y = ±266.8 | semiancho interior 533.6 |
| Filas de ruedas | y = −39, 39, 117, 195 | 4 filas, grupo cargado a un lado |

**La zona muerta** (el sobrante entre el módulo y la cara interior del
conveyor) queda del lado Y negativo, ~150 mm. Ahí viven los motores y las
correas del lado cercano.

---

## 4. Qué conservar y qué rehacer nativo en Inventor

Esta es la parte importante del traspaso.

### 4.1 CONSERVAR tal cual (importar el STEP y usarlo)

| Pieza | Por qué conservarla |
|---|---|
| **Rueda mecanum v9** (`RUEDA_MECANUM64_v9_der/_izq`) | Es la pieza validada: β = 46°, envolvente Ø63.6–64.0, encaje a presión con clic sin tornillos, rodillos y pasadores del usuario. Verificada sobre malla (holgura rodillo-placa 0.700, rodillo-rodillo 0.719). **No la re-modeles**, es donde hay más trabajo metido |
| **Motor NEMA 24** (`MOTOR_NEMA24_stepperOnline`) | Es el STEP oficial del fabricante, copiado sin tocar |
| **Layout del módulo** (posiciones de ejes, filas, planos de correa) | Está resuelto y verificado sin interferencias; usar `bloque_omni_v8.step` como plantilla de posiciones |

### 4.2 REHACER nativo en Inventor (mejor allá que aquí)

| Pieza | Qué hacer en Inventor | Por qué |
|---|---|---|
| **7 chapas** (riel, escuadra, placa base, cuña de motor, travesaño, tapa superior, tapa ciega) | Importar el STEP → **Convert to Sheet Metal** → definir la regla de chapa → los pliegues quedan paramétricos y sale el **Flat Pattern** y el DXF de corte automáticamente | Aquí las modelé como sólidos con radio de plegado real, pero Inventor las maneja como chapa de verdad: desarrollo, tolerancia de pliegue, DXF, tabla de plegado para la plegadora |
| **Tornillería** (188 piezas: DIN 912, ISO 10642, DIN 934, DIN 125, DIN 127) | Borrarlas y poner las del **Content Center** | Las mías tienen rosca helicoidal real (bonita pero pesada). Las del Content Center entran a la BOM con su código, se cambian de medida en un clic y pesan nada |
| **Rodamientos** (16 × 6001-2RS) | **Content Center** → Shaft Parts → Deep Groove Ball Bearings | Igual: código de catálogo y BOM |
| **Correas y poleas Poly-V** | **Design Accelerator** → V-Belts | Inventor calcula tensión, largo normalizado y genera las poleas. Mis cotas de partida están en §5 |
| **Ejes** | **Design Accelerator** → Shaft | Da el cálculo de flexión y las chavetas/retenes si hicieran falta |

### 4.3 Cómo importar (receta corta)

1. `Open` → el `.step` → **Options** → *Save Components During Load* apagado
   si solo vas a mirar; encendido si vas a editar pieza por pieza.
2. Unidades: **mm**. Si Inventor pregunta, el STEP está en mm.
3. Para las chapas: abrir la pieza sola → `Convert to Sheet Metal` → elegir la
   cara base → `Sheet Metal Defaults`: espesor **4 mm** (o 3 / 8 según pieza),
   **radio interior de plegado = 4 mm** (8 mm en la chapa de 8).
4. **Factor K = 0.38** — es el que usé para calcular los desarrollos de §5. Si
   pones otro, los desarrollos van a dar distinto; no es un error, es la regla.

---

## 5. Datos para no re-derivar

### Desarrollos de chapa (K = 0.38)

| Pieza | Espesor | Pliegues | Desarrollo |
|---|---|---|---|
| Riel (×2, la misma pieza girada 180°) | 4 | 1 | **165.8 mm** |
| Escuadra riel↔base (×10, la misma) | 4 | 1 | **139.3 mm** |
| Placa base | 4 | 2 | **411.3 mm** |
| Cuña de motor (×2, la misma) | 8 | 1 | **148.9 mm** |
| Travesaño en U (×2, la misma) | 4 | 2 | **105.3 mm** |
| Tapa superior | 3 | 1 | **415.1 mm** |
| Tapa ciega modular | 3 | 1 | **135.1 mm** |

**5 números de pieza de chapa** para todo el bastidor. Los dos rieles son la
misma pieza girada 180° sobre Z — conviene mantener esa restricción al
modificar, se pierde fácil.

### Transmisión Poly-V

| Dato | Valor |
|---|---|
| Perfil | **PJ**, paso entre nervios 2.34, ángulo 40°, garganta de polea 2.4 |
| Nervios | **6** (6PJ), ancho de nervios 14.04, polea de 16 |
| Poleas | **Ø34** — es el mayor que cabe: con Ø36 la correa toca el ala del riel |
| Relación | **1:1** motor↔eje |
| Correas | **6PJ 305** (motor→1er eje, C = 99.02) y **6PJ 406** (eje→eje, C = 149.5) |
| Abrazamiento | **180° / 180°** en todas (dos poleas iguales) |
| Cadena | motor→eje1 (lado cercano), eje1→eje2 (lejano), eje2→eje3 (cercano), eje3→eje4 (lejano) |
| Tensado | motor: colisas verticales del riel. Eje-eje: tensor sobre el dorso del ramal flojo |

Cada eje lleva **como mucho 2 poleas, una en cada punta**: por eso alcanza con
un plano de correa por lado y familia, y el voladizo sobre el rodamiento se
queda en 28.5 mm.

### Motor (cotas medidas del STEP oficial, no de tabla)

| Cota | Valor | Ojo |
|---|---|---|
| Brida | 60 × 60, esquinas r5 | |
| **Patrón de tornillos** | **50 × 50** | **NO es 47.14** — eso es NEMA 23. Con 47.14 el motor no monta |
| Piloto | Ø38.1 × 2 | |
| Eje | Ø10 × 22.6, **liso** | sin D-cut → prisionero |
| Cuerpo (con encoder) | 110.8 | total con eje 133.6 |
| Tornillos de brida | **M5×8** | la rosca útil del motor es de solo **4 mm**, es ciega |
| Conector del encoder | sale por abajo, y = −38 … −6 | por eso la cuña lo esquiva |

### Rodamiento

**6001-2RS (12 × 28 × 8)**, embutido desde fuera en la chapa de 4 del riel.

Está calculado, no elegido a ojo: con Poly-V la pretensión sube y la carga en
el rodamiento próximo llega a **345 N**.

| Rodamiento | L10 |
|---|---|
| F6801ZZ 12×21×5 | 3 200 h ✗ |
| **6001-2RS** | **180 500 h** ✓ |

---

## 6. La referencia Flowsort

El estilo de las chapas y la lógica de la caja no son inventados: salen del
divertidor **Flowsort SLD/DLD**, que es el equipo comercial equivalente.

**Fuente (capa `web`, accedida 02-09-2026):**

> **Instruction Manual SLD/DLD 24V, V5 REV1.2** — Flowsort BV, Geldrop (NL),
> 14-12-2022, 40 páginas.
> Copia pública:
> `https://robotunits.com/wp-content/uploads/2023/02/Instruction-Manual-SLD-DLD-24V-V5-REV1.2-v5.2_e.pdf`

**Secciones que se usaron:**

| § | Qué aportó |
|---|---|
| §3.1 | Nombres de las partes: base plate, side plate, top/bottom cover plate, wheel drive assembly, cable grommet |
| §4.2–4.5 | Instalación y anchos de la máquina |
| §6.6.3 / §6.6.4 / §6.6.5 | **Las láminas de despiece de donde salió el lenguaje de chapa** (págs. 22, 23 y 24) |
| §6.7 | Tensado de correas |
| §8.1 | Repuestos y tornillería: M5×16 socket head + arandela grower en los grupos motrices, M5×12 hexagonal en la tapa inferior, M5×10 avellanado en la tapa superior |

**Las 9 reglas de chapa que se sacaron de ahí** (detalle en
`PLACAS_FLOWSORT.md`): toda ranura es colisa de extremos redondos, en columnas
de paso constante, dos por punto de fijación (verticales = altura, en Y =
profundidad), alas plegadas a 90° en los cantos libres, contornos con radio de
esquina, ventanas de aligeramiento obround, cáncamos de izaje, lamas de
ventilación en las tapas y pasacables redondos en la base.

También hay **página de producto** (`flow-sort.com`, "DIVERTER"): el ancho es
ajustable, cada ancho estándar tiene 50 mm de ajuste, y los tamaños entre
perfiles laterales son 400-450, 600-650, 800-850 y 1000-1050 mm.

**Nota de propiedad intelectual:** el manual es material de Flowsort BV. Se usó
como **referencia de diseño** (proporciones, lógica de montaje, tornillería),
no se copió geometría. Si el módulo se va a comercializar conviene revisar que
no haya patente viva sobre el mecanismo de divert de rueda mecanum.

---

## 7. Decisiones ya cerradas (no hace falta re-discutirlas)

1. **Rueda mecanum sin unión apernada.** Encaje a presión con entrada gradual,
   clic y apriete lateral. Medido: punta +0.004 (entra libre), base +0.106
   (aprieta), barb 0.034 (precarga). Esfuerzo de montaje ≈ 100 N, σ ≈ 42 MPa
   contra 90–110 del PA-CF en XY → FS ≈ 2.2.
2. **Barreno hexagonal 12.85 directo** en la rueda sobre el eje de 1/2". Se
   eliminaron 32 bujes adaptadores que tenían pared de 0.775 mm.
3. **Separadores con barreno hexagonal**, no tubo de PVC (el PVC quedaba
   excéntrico hasta 3.1 mm).
4. **Poleas outboard, en voladizo corto**, y **motor desde adentro hacia
   afuera** (cuerpo bajo las ruedas, solo el eje sale por el riel).
5. **6001-2RS**, forzado por la pretensión del Poly-V (§5).
6. **Materiales**: ruedas y poleas en polímero negro mate; tapa superior negra;
   estructura y tornillería en **acero inoxidable**. Va escrito en el propio
   STEP, así que el ensamble abre ya coloreado.
7. **La tapa ciega** de la zona sin ruedas queda fuera del ensamble principal
   (Sergio no la quiere en la vista), pero la pieza existe en la biblioteca.

---

## 8. Lo que queda abierto — sugerencias para Inventor

1. **Poleas de motor en aluminio.** A 0.75 N·m por eje, una polea impresa
   aguanta, pero las **2 poleas de motor** son las que más vueltas dan y más se
   desgastan. Si el módulo va a trabajar turnos largos, esas dos en aluminio.
2. **La holgura más justa del módulo son 1.20 mm**: entre la corona de la
   correa (z = 102.0) y la cara inferior del ala plegada del riel (z = 103.1).
   Cabe, pero es lo primero que hay que revisar si se cambia el diámetro de
   polea o la altura de la tapa.
3. **El alojamiento del rodamiento es un Ø28 en chapa de 4 mm.** Funciona pero
   es poco material para un ajuste a presión; en Inventor se puede evaluar un
   **portarrodamiento embutido** o un buje soldado, que es lo que haría el
   fabricante.
4. **Planos de fabricación.** Una vez convertidas a chapa, sacar los Flat
   Patterns y los DXF de corte, y la tabla de plegado. Ahí Inventor es mucho
   mejor que lo que tengo yo.
5. **BOM.** Con el Content Center puesto, la lista de materiales sale sola: son
   **470 piezas de 32 referencias**.
6. **Simulación.** Vale la pena un FEA rápido del riel con la carga de las 4
   filas más la tensión de las correas, y verificar la flecha del eje de 1/2"
   con el voladizo de 28.5 mm.

---

## 9. Cómo empezar, en orden

1. Descomprimir `COMPONENTES_STEP_v8.zip` en una carpeta de proyecto de Inventor.
2. Abrir `bloque_omni_v8.step` (del otro ZIP) **solo para mirar** y entender
   posiciones. Mirar las 8 vistas de `VISTAS_BLOQUE_OMNI_v8.zip` en paralelo.
3. Importar las 7 chapas una por una y convertirlas a Sheet Metal (§4.3).
4. Importar la rueda y el motor tal cual.
5. Rehacer tornillería, rodamientos y transmisión con Content Center y Design
   Accelerator (§4.2), con las cotas de §5.
6. Rearmar el ensamble usando las posiciones del STEP de referencia.
7. Flat patterns + DXF + BOM.

Cualquier cota que falte, está en `COMPONENTES_STEP.md` o se puede regenerar
corriendo `bloque_omni_v8.py --componentes`.
