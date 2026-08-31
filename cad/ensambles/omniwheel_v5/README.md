# Omniwheel v5 — rueda omnidireccional VACIADA con NERVIOS

Rueda omni de **doble hilera** (Ø50 sobre rodillos) diseñada para imprimirse
rápido sin perder función: el cuerpo va **vaciado** y la rigidez la ponen
**nervios radiales** orientados con la carga, no el relleno del slicer.
Comparte envolvente con el `rodillo_traccion_50x40` del catálogo (rueda de
desvío del sorter): Ø50 de rodadura, barreno **Ø12.2** deslizante sobre eje
Ø12 h9 y cubos separadores Ø18 × 22 integrados por lado.

Capa **`user`** (decisión de diseño, dimensiones nominales → verificar con
calibre). Todo sale de la tabla `P` de `gen_omniwheel_v5.py`; el reporte de
compuertas y volúmenes queda en [`verificacion.json`](verificacion.json).

## Qué se gana con el vaciado + nervios

| Cuerpo (2 hileras, PETG) | Volumen | Peso |
|---|---|---|
| Macizo v4-equivalente | 37.9 cm³ | 48.1 g |
| **v5 vaciado + nervios** | **24.3 cm³** | **30.9 g** |
| Ahorro geométrico | **−35.9 %** | |

Y en tiempo de impresión el ahorro es mayor que el geométrico, porque la v5
se lamina con **0–5 % de relleno y 2 perímetros** (los nervios SON la
estructura), mientras que el macizo necesitaría ~35 % de relleno para ir
cargado. Los rodillos van huecos (cámara interna con conos a 45°): −17 % de
TPU, que es el material más lento de imprimir. Con `cubo_l = 0` (uso robot,
sin cubos de sorter) el cuerpo baja además un ~25 % adicional.

Límite físico: barreno + mordazas + techo de cierre son mínimos funcionales;
vaciar más de esto empieza a comerse la función.

## Arquitectura

- **2 hileras IGUALES** (misma pieza impresa 2 veces), enfrentadas por su
  cara de unión y desfasadas **30°** (media división) al montar: la muesca
  grabada en la cara exterior de cada una debe quedar a 30°. La envolvente
  de rodadura resulta un círculo Ø50 continuo (solape 7.8° en cada junta).
- **6 rodillos tonel por hilera** (TPU 95A, perfil de corona R25), cada uno
  sobre un **pasador Ø3 × 22**. El pasador baja por una ranura vertical y
  queda **cautivo** al enfrentar la otra hilera: su techo cierra las ranuras.
- La rueda desliza en el eje Ø12 h9 igual que el rodillo original del
  sorter: la sujeción axial la dan los separadores del montaje (por eso los
  cubos integrados).

## Compuertas (el generador FALLA si alguna no pasa)

| | Qué verifica | Resultado |
|---|---|---|
| GV1 | mallas estancas (watertight) | ✔ |
| GV2 | cobertura de rodadura 360° con solape ≥ 3° | ✔ 7.8° |
| GV3 | rodillo inflado +0.35 no toca el cuerpo | ✔ 0 mm³ |
| GV4 | apoyo del pasador ≥ 3.5 mm por lado | ✔ 3.6 |
| GV5 | el cuerpo nunca sobresale del círculo de rodadura | ✔ r 23 < 25 |
| GV6 | espesores ≥ mínimos FDM 0.4 | ✔ |

## Cómo se regenera

```bash
pip install trimesh manifold3d scipy rtree shapely numpy
python cad/ensambles/omniwheel_v5/gen_omniwheel_v5.py
```

Emite en `out/` (derivados, fuera de git): `hilera_v5.stl`, `rodillo_v5.stl`,
`cuerpo_macizo_ref.stl` (solo para comparar), `omniwheel_v5.glb` (ensamble
coloreado; se ve con `cad/ensambles/_glbview.html`).

## Impresión

| Pieza | Uds | Material | Laminado |
|---|---|---|---|
| `hilera_v5.stl` | 2 | PETG | tal como sale del STL (la cara plana de unión ya queda contra la cama): **0–5 % relleno, 2 perímetros**, sin soportes |
| `rodillo_v5.stl` | 12 | TPU 95A | eje vertical, 2 perímetros, 0 % relleno (la cámara interna es autosoportada, conos 45°) |

## Montaje

1. Meter el pasador Ø3 × 22 en el barreno del rodillo.
2. Dejar caer rodillo + pasador en las ranuras de las dos mordazas (entran
   por la ventana radial de cada bahía). 6 por hilera.
3. Enfrentar las dos hileras cara de unión contra cara de unión con las
   **muescas a 30°** (los rodillos de una hilera centrados en los huecos de
   la otra). El techo de cada hilera deja cautivos los pasadores de la otra.
4. Montar en el eje Ø12 h9; los separadores del montaje aprietan el paquete
   axialmente (opcional: una gota de adhesivo entre caras para fijar el
   desfase fuera de un montaje que apriete).

**BOM comprada**: 12 × pasador Ø3 × 22 (varilla calibrada o clavo Ø3 cortado).

## Parámetros principales (tabla `P` del generador)

| Cota | Valor | Procedencia |
|---|---|---|
| Ø rodadura | 50 | cat — envolvente del rodillo del sorter |
| Barreno | 12.2 | cat — deslizante sobre eje Ø12 h9 |
| Cubos separadores | Ø18 × 22 c/u | cat — como el original (`cubo_l = 0` para omitirlos) |
| Ancho por hilera / total | 19 / 38 (+ cubos = 82) | dis |
| Rodillos por hilera | 6 × Ø12 × 13 | dis |
| Pasador | Ø3 × 22 | dis |
| Nervios | 6 × 2.0 + 6 × 1.6 | dis |
| Alma / techo | 1.6 / 1.6 | dis |

Cualquier cambio de cota = editar `P` y regenerar: las compuertas revalidan
la pieza completa.
