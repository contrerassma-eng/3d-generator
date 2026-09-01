# Dispensador canino: alimento dosificado + agua, sobre bidón de 20 L

Familia de aparatos **puramente mecánicos** que usan el botellón de agua
purificada de 20 L como estanque. Todo lo que sale de estas herramientas es
capa `user` (diseño), nunca `measured`, y cada número que gobierna la geometría
está citado en `projects/<X>/input/web_facts.json`.

Proyecto de referencia: `projects/YT0101-dispensador-canino`.

## Los dos cabezales

| | ALIMENTO | AGUA |
|---|---|---|
| Principio | cajón dosificador de cavidad fija | nivel constante (botella de Mariotte) |
| Accionamiento | palanca → piñón → cremallera | ninguno: se autorregula |
| Entrega | una dosis por barrido completo | nivel fijo, ajustable en altura |
| Bidón | recortado (boca de carga) | íntegro |
| Electrónica | ninguna | ninguna |
| Resortes | ninguno | ninguno |

Ambos se montan sobre la **misma estructura**: tres columnas de perfil 20×20
inclinadas 12°, anillos de segmentos impresos y collar de cuello partido.

## Herramientas

| Script | Qué hace |
|---|---|
| `pipeline/lib_solidos.py` | primitivas de diseño: engranaje de evolvente, cremallera, trinquete, loft, revolución, booleanas y utilidades FDM |
| `pipeline/gen_dispensador.py` | genera las piezas (STL + GLB) desde `input/params.json`, ya orientadas para imprimir |
| `pipeline/ens_dispensador.py` | ensambles en posición de trabajo, vistas y animación del ciclo |
| `pipeline/verifica_dispensador.py` | gate **G-DIS**: 21 pruebas medidas sobre las mallas reales |
| `pipeline/doc_dispensador.py` | memoria, manual de armado, lista de impresión y de compra |
| `pipeline/web_dispensador.py` | paquete web navegable autocontenido |
| `pipeline/lib_dem.py` | motor de elementos discretos: contacto blando, campo de distancia sobre malla |
| `pipeline/sim_granos.py` | simula la croqueta grano a grano dentro del aparato — gate **G-SIM** |

## Flujo completo

```bash
P=projects/YT0101-dispensador-canino
python pipeline/gen_dispensador.py      $P          # piezas
python pipeline/ens_dispensador.py      $P --anim   # ensambles, vistas y GIF
python pipeline/verifica_dispensador.py $P          # gate G-DIS
python pipeline/doc_dispensador.py      $P          # memoria y manuales
python pipeline/web_dispensador.py      $P          # visor web
python pipeline/s6_drawings.py          $P --fuente out/piezas/<pieza>.glb
python pipeline/sim_granos.py           $P todo --anim   # gate G-SIM (lento)
```

El orden importa: la documentación lee el resultado de la verificación, y la
verificación lee los parámetros y las mallas.

## Cambiar el diseño

Todo vive en `projects/<X>/input/params.json`. Los cambios más habituales:

| Quiero… | Toco… |
|---|---|
| Otra dosis por golpe | `alimento.dosis_objetivo_g` (recalcula la profundidad de la cavidad) |
| Otro alimento | `alimento.densidad_aparente_g_ml` y `croqueta_dia_mm` |
| Otro bidón | el bloque `bidon` completo (medir con calibre) |
| Otra impresora | `impresion.cama_mm` (la prueba V2 avisa si algo deja de caber) |
| Otro nivel de agua | `agua.nivel_agua` |

Tras cualquier cambio, **volver a correr generación + verificación**: las 21
pruebas están para eso.

## Las pruebas del gate G-DIS

| Prueba | Qué comprueba |
|---|---|
| V1 | todas las piezas son sólidos cerrados |
| V2 | cada pieza cabe en la cama declarada |
| V3 | el cajón recorre la carrera sin chocar con las piezas fijas (21 posiciones) |
| V4 | con el cajón afuera, la tolva queda obturada (si no, el bidón se vacía solo) |
| V5 | la cavidad, medida sobre la malla, entrega la dosis objetivo |
| V6 / V6b / V6c | engrane cremallera-piñón: distancia de montaje, socavado y engrane en ambos extremos |
| V7 / V7b | criterio anti-arco de Jenike en cada sección estática del camino |
| V8 | voladizos, evaluados en la orientación de impresión |
| V9 | estructura: aplastamiento, pandeo y vuelco |
| V10 | coherencia del nivel de equilibrio del bebedero |
| V11 | las ménsulas alcanzan de verdad las orejas del canal |
| V12 | el biela-manivela del agitador cierra en toda la carrera |
| V13 / V13b | la palanca barre sin golpear columnas, y los topes muerden pasado el recorrido |
| V14 | ninguna pieza fija ocupa el sitio de otra (con lista de encajes intencionados) |
| V15 | la cadena macho-hembra del bajante encaja y solapa |
| V16 | la cavidad queda alineada con la boca de carga y con la de descarga |
| V17 | las piezas que se atornillan tienen los taladros enfrentados |

Un `FALLA` detiene el trabajo. Un `ADVERTENCIA` es un límite conocido del
diseño que se documenta y se explica, no se maquilla.

## Dos advertencias que son parte del diseño, no defectos

1. **El cuello del bidón no cumple el criterio anti-arco** (6× el tamaño de la
   croqueta) para croqueta de 11-16 mm. Por eso el agitador viene montado y
   existe `ali_adaptador_hombro`, que elimina el cuello del camino cortando el
   envase donde mide Ø152.
2. **Siete piezas tienen voladizos parciales** sobre 45°. Se imprimen con
   soporte solo en ellas; la lista dice cuáles.

## Lo que hay que medir antes de imprimir la serie

Las cotas de catálogo del botellón varían por marca (boca de 48 a 56 mm) y
ninguna ficha pública publica el perfil del hombro. Medir con calibre
`dia_boca_ext`, `altura_cuello` y `dia_asiento_hombro` sobre el envase real, y
corregir `params.json`. Es la única forma de que las piezas calcen.

Y la dosis se calibra pesando cinco golpes con el alimento que se va a usar:
está en `out/ENSAMBLE.md` §5. Sin esa medición el aparato dosifica un volumen
conocido, pero no una masa conocida.


## La simulación de grano (G-SIM)

G-DIS mide geometría: que nada choque, que la cavidad tenga el volumen que dice,
que la boca cumpla —o no— el criterio anti-arco. Tres cosas quedaban fuera de su
alcance y eran **supuestos declarados**, no resultados:

1. que la cavidad se llena al 0.90 de su volumen;
2. que el agitador es obligatorio porque el cuello no cumple Jenike;
3. que el bisel desvía la croqueta en vez de partirla.

`sim_granos.py` los pone a prueba soltando croqueta de verdad —esferas
polidispersas con fricción de rodadura— dentro de las mallas reales.

### Cómo está construido

| Pieza del modelo | Cómo entra |
|---|---|
| Paredes fijas | campo de distancia con signo muestreado sobre la MALLA (±0.6 mm) |
| Cajón | el mismo campo en marco local, con su traslación |
| Agitador | su campo, girado por la cinemática real de la biela |
| Cuello y hombro del envase | primitivas analíticas exactas (el bidón no es una pieza: es el envase) |
| Contacto | normal lineal amortiguada, tangencial con historia, rodadura |

### Calibración: primero el grano, después el aparato

El grano se ajusta contra dos propiedades **publicadas y medidas** del alimento,
sobre geometría analítica exacta, antes de tocar el aparato:

- **ángulo de reposo** → se barre la fricción de rodadura hasta caer en el rango
  publicado. La rodadura es el sustituto habitual de la forma no esférica.
- **densidad aparente** → contraprueba independiente. No es un parámetro de
  entrada: sale del tamaño de grano, de la densidad de partícula y del
  empaquetamiento que consiga la gravedad.

### Lo que el modelo no es

Ningún parámetro de contacto es de croqueta de perro medida contra PLA: **esa
fuente no existe**. Lo más cercano publicado es pellet de acuicultura extruido y
flotante contra ABS, y así está declarado en `params.json`, campo por campo. Del
PLA se conoce la dirección del error (roza menos que el ABS), no su magnitud.

Y hay una contradicción entre dos fuentes citadas que el modelo no puede
resolver: la densidad de partícula publicada de croqueta (0.527–0.554 g/cm³) es
incompatible con la densidad aparente del fabricante (0.401 g/ml), porque
exigiría empaquetar al 72–76% cuando el máximo de esferas es 64%. No son del
mismo producto. **La dosis en gramos hereda esa incertidumbre**: la cavidad
entrega un volumen conocido y verificado, y la masa se calibra pesando cinco
golpes con el alimento real (`out/ENSAMBLE.md` §5).

### Pruebas del gate G-SIM

| Prueba | Qué comprueba |
|---|---|
| S1 | la corrida es numéricamente limpia (solape y contactos acotados) |
| S2 | el grano calibrado cae en el ángulo de reposo publicado |
| S3 | la densidad aparente del modelo contra la citada |
| S4 | entrega alimento en todos los golpes: no se atasca |
| S5 | el factor de llenado declarado (0.90) contra el simulado |
| S6 | la dosis simulada cae en el rango de diseño |
| S7 | el agitador cambia de verdad el comportamiento del cuello |
| S8 | la fuerza de contacto no llega a romper la croqueta |

El motor tiene sus propias pruebas (`tests/test_dem.py`): caída libre, solape en
reposo contra mg/k, restitución, umbral de rozamiento por los dos lados y campo
de distancia contra una esfera analítica. Un integrador que se ve bien en una
animación puede estar equivocado en el signo del rozamiento —lo estuvo— y
entonces todo lo que se mida con él es decorado.
