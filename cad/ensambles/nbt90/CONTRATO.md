# NBT90 — contrato de los módulos de diseño

Documento que fija **cómo** se escribe cada subsistema de la transferencia 90°
de bandas angostas, para que cuatro diseños escritos en paralelo integren sin
choques. Las **cotas** viven en `params.mjs` (una sola tabla, derivada de las
mediciones de `analisis/`); las **primitivas** viven en `lib.mjs`.

## 1. Sistema de coordenadas (único, no se discute)

```
 X = eje de los rodillos de transferencia ( = flujo del transportador ANFITRIÓN;
     también la dirección en que corren las bandas angostas del clasificador )
 Y = expulsión a 90° ( = dirección en que se REPARTEN los rodillos, a paso 3" ).
     Origen Y = 0 en el eje de simetría del módulo.
 Z = arriba.  Z = 0 en la cara inferior del bastidor; X = 0 en la placa lateral
     de accionamiento. El plano de las bandas del anfitrión está en Z = P.planoBanda.
```

Todo en **milímetros**. El equipo original es imperial: `lib.mjs` exporta
`IN = 25.4` y `pulg(f)`; usa esos helpers para que las cotas de catálogo
(1.9", 5/8", 7/16" hex, 1/4-20) queden exactas y trazables.

Estado modelado: **elevado** (pop-up con la carrera aplicada), igual que el
transfer de rodillos del repo. `params.mjs` expone `P.carrera` y el estado
retraído se obtiene restando `P.carrera` a las piezas del módulo móvil.

## 2. Firma de un módulo

Cada subsistema es un archivo `cad/ensambles/nbt90/<modulo>.mjs` que exporta
**una sola función**:

```js
import { Ensamble } from './lib.mjs';
import { P } from './params.mjs';

/** @param {Ensamble} E  ensamble compartido; agrega piezas con E.addPart(...)
 *  @returns {object} métricas del módulo (para las verificaciones del gate) */
export function bastidor(E) { … return { chapas: 12, masaKg: 41.2 }; }
```

- **No** escribe archivos, **no** imprime, **no** lee JSON: solo agrega piezas.
- **No** redefine cotas globales: toda dimensión compartida sale de `P`. Las
  cotas que solo usa el módulo van en un bloque local al principio del archivo
  (`const L = { … }`), cada una con su justificación (`med`/`cat`/`txt`/`dis`).
  **Nadie edita `params.mjs` ni `lib.mjs`** — se escriben en paralelo y un
  cambio ahí rompería a los demás.
- Puede exportar además constantes derivadas que otros módulos necesiten
  (p. ej. `export const ejeMotrizZ = …`), pero **nunca** duplicando un valor
  que ya está en `P`.

## 3. Nombres de pieza (los lee el despiece y los planos)

```
<CAPA> · <Descripción con cotas> [(posición)]
```

- `CAPA` es `FIJO` (queda quieto) o `MÓVIL` (sube con el pop-up).
- La descripción lleva las cotas que definen la pieza: `Placa lateral 6×310×420`,
  `Rodillo 1.9" × 300`, `Perno hex 3/8-16 × 1"`.
- La posición, entre paréntesis, cuando hay varias iguales: `(banda 3, +Y)`.

Piezas **compradas** (`hardware: true` o `componente: '<id>'` en `extra`) se
listan aparte en la lista de materiales; las **fabricadas** llevan plano.

Chapa: agrega `extra.chapa = { t, material, fibra: [[u,v],…], radio }` cuando la
pieza es chapa plegada, para que el desarrollo (flat pattern) salga del mismo
dato con el que se construyó el sólido.

## 4. Colores (`COL` de `lib.mjs`)

| Color | Uso |
|---|---|
| `COL.chapa` / `COL.chapaOsc` | chapa del bastidor (fija) |
| `COL.movil` | chapa y estructura del cassette que sube |
| `COL.polea` | poleas y carretes |
| `COL.banda` | bandas angostas y banda motriz |
| `COL.rodillo` | rodillos y tambores |
| `COL.rodamiento` | rodamientos y chumaceras |
| `COL.motor` | motorreductor |
| `COL.neumatica` | cilindros, FRL, racores, mangueras |
| `COL.tornillo` | pernos, tuercas, golillas, seguros |

## 5. Reglas de diseño (se verifican en el gate)

1. **Nada flota**: toda pieza se apoya o se atornilla a otra. Si dos piezas se
   unen, existe la tornillería que las une (perno + tuerca + golillas) y el
   agujero correspondiente en ambas.
2. **Nada interfiere**: dos sólidos no comparten volumen salvo el solape
   intencional de un ajuste (los tests usan AABB + comprobaciones dirigidas).
3. **Todo gira sobre algo**: ningún eje sin rodamiento o buje; ninguna polea sin
   retención axial (seguro, collar o tornillo prisionero).
4. **Las bandas cierran**: cada banda se construye con `bandaFaces`, que falla
   si la trayectoria no tiene tangente. Se reporta largo desarrollado y
   envolvente por polea; la envolvente de la polea motriz ≥ 120°.
5. **Se puede armar**: hay acceso de llave a cada perno; los pernos entran por
   fuera; las colisas de ajuste tienen recorrido real.
6. **Se puede fabricar**: la chapa tiene espesor de catálogo (calibre), radio de
   plegado ≥ espesor, y su desarrollo se calcula con `desarrollo()`.

## 6. Reparto de módulos

| Módulo | Archivo | Contenido |
|---|---|---|
| Bastidor | `bastidor.mjs` | ROLLER FRAME WELDMENT (placas peine), SIDE CHANNEL, TRANSFER CROSS CHANNEL, CROSS ANGLE, SPACER PLATE, TRANSFER ROLLER GUARD, NOTCHED BRACE CHANNEL, BASE CHANNEL WELDMENT y su tornillería |
| Rodillos | `rodillos.mjs` | 6 rodillos vulcanizados Ø1-3/8" con eje hexagonal 5/16", rodamientos, retención en las ranuras del peine, y las 5 bandas angostas + regletas del anfitrión (contexto) |
| Transmisión | `transmision.mjs` | serpentín de banda plana de 1", poleas locas Ø2-1/2", tensor con colisa, poleas de retorno, rueda motriz, buje sin chaveta y motorreductor SEW |
| Elevación y neumática | `elevacion.mjs` | mesa guía neumática Ø100×20, canal de montaje del cilindro con colisas, 4 jack bolts, válvula 4 vías, silenciador, racores y tubería |

El integrador `gen_nbt90.mjs` llama a los cuatro en ese orden, corre `verify()`
y emite `narrow_belt_transfer_90.json`.

## 7. Banco de pruebas

`node cad/ensambles/nbt90/_check.mjs <modulo> [--v]` construye la geometría real
de cada pieza del módulo con el motor CSG y falla si alguna no tiene malla,
tiene volumen ≤ 0 o NaN. Además avisa de piezas fuera de la envolvente. **Un
módulo no se da por terminado hasta que este banco pasa en verde.**
