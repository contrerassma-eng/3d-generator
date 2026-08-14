# CELDA3 — celda triple omnidireccional (réplica del celluveyor)

> **¿Retomas este trabajo en otra conversación?** Empieza por
> **[TRASPASO.md](TRASPASO.md)**: estado, decisiones ya verificadas, trampas en
> las que no volver a caer y qué falta decidir.

Modelo 3D paramétrico y **verificado** de una celda hexagonal con tres ruedas
omnidireccionales accionadas por separado, para armar un módulo de 9 celdas
(3×3). Réplica funcional del mecanismo del *celluveyor* de cellumation, con los
componentes que el usuario ya tiene: **ruedas omni Ø48** y **motores TT 1:48**.

## El resultado, en tres números

| | |
|---|---|
| Celda | hexágono de **197.9 mm entre caras** (radio de rueda R = 76 mm) |
| Módulo 3×3 | **69.3 × 57.1 cm** |
| Velocidad · carga | **0.50 m/s** a 6 V · hasta **4.6 kg** apoyados en 6 ruedas |

Ese tamaño de celda **no se eligió: salió del barrido**. `barrido.sh` genera la
celda para cada radio y la pasa por la verificación exacta de interferencias con
sólidos B-rep (OpenCascade); R = 76 mm es el primer radio con cero solapes.

Con las piezas modeladas como **envolventes** el barrido daba R = 71 mm. Al
modelarlas de verdad —la campana del motor, su soporte, los rodillos— hicieron
falta 5 mm más de radio. Ésa es exactamente la diferencia entre un modelo que
sirve para fabricar y uno que solo sirve para mirar.

## Por qué los ejes de las ruedas son radiales

No es estética. Cada rueda solo puede imponer la componente de velocidad en su
dirección de rodadura `u_i`; la perpendicular la absorben sus rodillos libres.
Para un bulto rígido con velocidad `v` y giro `ω` sobre el centro de celda:

```
v_i = u_i · (v + ω × p_i)
```

Las tres ecuaciones forman `M·(vx, vy, ω) = (v1, v2, v3)`. Con los ejes
**radiales** (rodadura tangencial) `det M = 184.5` y la celda controla las tres
libertades. Con los ejes **tangenciales** la columna de ω se anula, `det M = 0` y
la celda no puede girar el bulto. Las dos cosas las comprueba `test_celda.mjs`.

## Por qué el motor no toca la rueda

El eje de salida del TT es de plástico, en voladizo y sin apoyo. Colgarle la
rueda y encima pararle un kilo es comerse la reductora. Aquí cada rueda va sobre
**su propio eje Ø4 apoyado en dos rodamientos 624ZZ**, uno a cada lado, y el
motor entrega **solo par** a través de un acople impreso. Es la misma razón por
la que el equipo original usa correas.

## Cómo se usa

```bash
cd cad
node ensambles/celda/gen_celda.mjs                    # genera la celda (falla si no pasa el gate)
node ensambles/celda/gen_celda.mjs --barrido          # sondeo rápido del radio
bash ensambles/celda/barrido.sh motor-dentro 60 90    # barrido con verificación EXACTA
python3 ensambles/nbt90/interferencias_brep.py --doc ensambles/celda/celda3.json
node ensambles/celda/planos_celda.mjs                 # DXF de corte + despiece del módulo
python3 ensambles/nbt90/a_step.py --doc ensambles/celda/celda3.json \
        --salida ensambles/celda/out/step --piezas    # STEP del conjunto y por pieza
node tests/test_celda.mjs                             # invariantes de función y armado
```

Verlo en 3D, sirviendo `cad/` por HTTP:

```
ensambles/ver.html?doc=celda/celda3.json&view=iso
```

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `params.mjs` | **tabla única de cotas**, cada una con su procedencia (`dib` dibujo del usuario / `cat` catálogo / `usr` afirmación del usuario / `dis` decisión de diseño) |
| `celda.mjs` | la celda: tres unidades motrices a 120° y la placa hexagonal |
| `gen_celda.mjs` | integrador + **compuerta**; emite `celda3.json` |
| `barrido.sh` | busca el radio mínimo con verificación B-rep exacta |
| `piezas.mjs` | los constructores de **geometría real** de cada pieza |
| `planos_celda.mjs` | `out/placa_hexagonal.dxf` (corte láser) y `out/despiece_modulo.csv` |
| `analisis/web_facts.json` | los datos de catálogo con URL, fecha y cita textual |

## Nivel de detalle

Cada pieza está modelada con la geometría que de verdad se fabrica o se compra,
no con su caja envolvente:

| Pieza | Qué lleva modelado |
|---|---|
| Rueda omni | cubo, dos platos y **16 rodillos abarrilados**. El perfil del rodillo, `r(h) = 24 − √(19² + h²)`, apoya sobre el círculo de Ø48 y vale exactamente los **R5.00** del dibujo en el centro: que las dos cotas del dibujo encajen así confirma la lectura |
| Motor TT | reductora, campana del motor y **los dos ejes con sus planos doble D**, más sus dos M3 de fijación |
| Soporte en C | **chapa plegada 2 mm**, 4 pliegues, desarrollo 120.08 mm con factor K: aloja los dos rodamientos y sujeta el motor. Es la pieza `32` de la patente [0054] |
| Ruedas de bola | pasivas, a la altura de las motrices, en las juntas entre celdas (patente [0050]) |
| Acople | alojamiento doble D de 5.5 de un lado, Ø4 del otro y prisionero M3 |
| Disco de encoder | las **36 ranuras** de verdad, que son las que cuenta el sensor |
| Sensor LM393 | PCB con la **horquilla** que abraza el disco |

## Lo que falta antes de cortar

1. **Confirmar el agujero de la rueda con calibre.** Todo el tren asume 4 mm por
   afirmación del usuario, sin verificar. Si fuese 6 mm cambian los 54
   rodamientos (a 626ZZ) y los 27 ejes.
2. **Medir con calibre el entrecaras del eje plano del TT** (`ttEjeAF`, hoy 3.7
   por decisión de diseño) y la posición de sus dos M3 (`ttFijacionB/C`): de eso
   dependen el alojamiento del acople y los taladros del soporte.
3. **Las celdas NO se pueden atornillar cara contra cara todavía**: el PCB del
   sensor sobresale 1.07 mm de la cara del hexágono. Ver `ref/bastidor_propuesta.md`.
4. **El bastidor del módulo no está modelado**, y quedan 3 interferencias entre
   el soporte en C y el sensor.

## La alternativa que encoge la celda

Los 204 mm salen de que el tren completo —rodamiento, rueda, rodamiento, acople,
motor, encoder— es **radial**: la celda tiene que contenerlo entero. El equipo
original evita esto poniendo el motor **debajo** y subiendo el giro con una
correa, con lo que el tren radial se reduce a rodamiento-rueda-rodamiento.

Estimación, no verificada: con transmisión por correa la celda bajaría a
**≈133 mm entre caras** y el módulo a ≈47 × 39 cm, a costa de 27 correas y 54
poleas. Si interesa, se modela y se barre igual que este.
