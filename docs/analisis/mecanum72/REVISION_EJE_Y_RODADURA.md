# Revisión solicitada: cadena del eje, retención axial, envolvente real y radio efectivo

Pedido: (1) revisar la cadena eje 12.7 → casquillo → aro interior Ø20 del 6804,
con corte axial completo, cotas y retención axial de rodamientos y polea;
(2) confirmar la envolvente real de rodadura y resolver la herencia de nombre;
después, (3) cálculo geométrico de los seis rodillos: variación del radio
efectivo en una vuelta. Sin modificaciones de diseño hasta cerrar los puntos.

## 1 · Cadena eje → casquillo → aro interior (medida sobre los sólidos)

Corte acotado: `MEC_corte_axial_cotas.png` (plano por un perno central,
azimut 45°, secciones de malla de las piezas construidas).

| Interfaz | Cotas medidas | Juego diametral | Tipo |
|---|---|---|---|
| Eje 1/2" en casquillo | 12.70 en bore 12.83–12.85 | 0.15 | deslizante |
| Casquillo en aro interior | Ø19.90 en Ø20.00 | 0.10 | deslizante |
| Aro exterior en asiento | Ø32.00 en Ø32.09–32.15 (impreso tiende a cerrar) | ~0–0.15 | prensa suave |
| Aro interior Ø23.2 vs bore de brida Ø25 | — | 1.8 | no roza ✓ |
| Brida casquillo Ø22 por bore de brida Ø25 | — | 3.0 | pasa ✓ |
| Eje vs bore de rueda | 12.70 en Ø13.38–13.40 | 0.7 | nunca toca ✓ |

Profundidad de asiento medida: **7.05 en ambas placas** (rodamiento de 7.0 queda
a ras de cara, 0.05 de fondo). Largo de casquillo 8.20 = barril 7.00 + brida 1.20.

**Retención axial (quién sujeta qué):**

- **Aro exterior**: cazado entre el **hombro del asiento** (hacia adentro,
  anillo de contacto r14–16.07, aliviado r<14 para no rozar el aro interior)
  y la **brida de polea/retenedor** (hacia afuera, bore Ø25 lo tapa de Ø28.7
  a Ø32, con 0.05 de juego axial). Atornillada con 6× 2.9×6 en r19.
- **Aro interior**: acoplado axialmente al exterior por las bolas (rígido
  ranura profunda); su posición sobre el eje la da la **brida del casquillo**
  empujada por un **collarín de 1/2" del usuario** en cada lado. Ruta de
  carga axial: collarín → brida casquillo → aro interior → bolas → aro
  exterior → hombro del asiento → rueda. Apriete de collarines **suave**
  (los dos lados a tope precargan los rodamientos uno contra otro).
- **Polea**: 6 tornillos 2.9×6 (de los 12 taladros cada 30°); el par de la
  correa a r19 exige <7 N por tornillo — sobrado en cortante.

**Hallazgos (pendientes de tu OK, no se modificó nada):**

1. Toda la cadena eje–casquillo–aro es deslizante: el bloqueo a rotación del
   casquillo sobre el eje depende solo de la fricción del apriete de los
   collarines. Es funcionalmente suficiente (el rodamiento gira con mucha
   menos fricción), pero si quieres bloqueo positivo la mejora es engrosar
   la brida del casquillo de 1.2 a 4 mm y cruzarle un **prisionero M3**
   radial al eje.
2. El contacto brida-casquillo ↔ aro interior es un anillo de solo 1 mm de
   ancho (r10–11). Subir la brida a Ø23 lo duplicaría sin rozar nada.
3. Las puntas de la estrella (r31.2) quedan a **0.63 mm del suelo** en el
   mínimo del radio efectivo (31.83). Con rodillos duros no es problema; si
   los rodillos cedieran ~0.6 mm bajo carga, la placa tocaría.

## 2 · Envolvente real y nombre

Medida sobre la envolvente convexa de los 6 rodillos (función soporte,
1440 posiciones): **Ø63.66 – 64.01 mm. La rueda construida es Ø64, no Ø72.**

El "72" del nombre de archivos es herencia del intento con d0=27 (Ø72
nominal) que se descartó el mismo día por el rizado (ver §3). Es un error de
nomenclatura mío. Opciones:

- **(a) Renombrar todo a MECANUM64-B** (o el código que prefieras): un solo
  cambio de nombres, la geometría queda como está. **Recomendada.**
- (b) Si lo que quieres es una rueda Ø72 real, es un rediseño: con tus
  rodillos a d0=27 el rizado medido es 0.704 mm (1.97 %), 4× peor que la
  actual (§3).

No renombro nada hasta que elijas.

## 3 · Radio efectivo de rodadura en una vuelta (el cálculo)

Método: la rueda gira sobre su eje; el suelo es un plano que contiene la
dirección del eje. La altura del eje para un giro θ es la **función soporte
de la proyección de los 6 rodillos sobre el plano de giro** — el suelo solo
puede apoyar en la envolvente convexa, así que se evalúa sobre el casco
convexo de la proyección (los ~10⁶ puntos de superficie se reducen a sus
vértices). Barril físico exacto: meridiano en arco de R=57.36 (33.5 · Ø18 ·
Ø13, tus cotas). Gráficas: `MEC_radio_efectivo.png`; datos:
`radio_efectivo.json`; código: `radio_efectivo.py`.

| Configuración | radio efectivo (mm) | rizado | % del radio |
|---|---|---|---|
| **v6 construida** (d0=23, β=46°) | 31.832 – 32.005 | **0.173 mm** | **0.54 %** |
| d0=27 ("Ø72", descartada) | 35.296 – 36.000 | 0.704 mm | 1.97 % |
| Perfil "exacto" de fórmula (R=32) | 32.000 – 32.276 | 0.276 mm | 0.86 % |

Lecturas de ingeniería:

- **El eje oscila ±0.087 mm**, 6 veces por vuelta (una por relevo de
  rodillo). El perfil es casi plano (+0.02 mm) con un valle corto de
  −0.15 mm en cada relevo. A 0.5 m/s eso es una excitación de ~15 Hz con
  aceleración vertical pico ~0.8 m/s²: rodadura suave de verdad, no solo
  estética.
- **Avance por vuelta = 200.98 mm** → radio equivalente para odometría
  **31.987 mm** (usar este valor, no 32.0: −0.04 %).
- El punto de contacto recorre linealmente **z = +10.6 → −10.6 mm** a lo
  largo del eje en cada tramo de 60° y salta al rodillo siguiente en el
  relevo: el comportamiento mecanum clásico (ese barrido axial es el que
  genera la componente lateral de fuerza).
- Hallazgo teórico: el perfil de fórmula cerrada ρ(s)=√(R²−s²cos²β)−d0 que
  usa toda la literatura **no es exacto**: su condición de contacto solo
  vale en el ecuador del rodillo; medido, ondula 0.276 mm. Tu barril
  moldeado (meridiano circular) a d0=23/β=46° lo bate: 0.173 mm. Es decir:
  **con estos rodillos, este diámetro y este ángulo, la rueda rueda mejor
  que la "ideal" de libro.**
- Por qué d0=27 falla: al alejar los ejes, cada rodillo cubre menos ángulo
  de rueda y los relevos caen en valles profundos (0.70 mm) — se pierde el
  solape que a d0=23 deja los barriles casi tangentes (0.73 mm entre sí).

## Reproducir

```bash
python docs/analisis/mecanum72/radio_efectivo.py    # tabla + MEC_radio_efectivo.png
python docs/analisis/mecanum72/seccion_cotas.py     # medidas + MEC_corte_axial_cotas.png
```
