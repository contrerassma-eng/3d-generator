# Ejemplos de proyectos foto3d-cad

Proyectos `.json` listos para abrir en el CAD con **📂 Abrir** o **📋 Pegar**
(pega el contenido y elige "Reemplazar todo el proyecto").

## `transportador_rodillos.json` — transportador de rodillos (4 rodillos)

Generado por instrucciones (ver el mensaje del usuario) con el motor del CAD.
Un banco de 4 rodillos sobre dos canales tipo C con las pestañas hacia afuera.

### Dimensiones (mm salvo indicación)
| Parámetro | Valor | Origen |
|---|---|---|
| Tubo del rodillo | SCH40 nom. 1-1/2″, **OD 1.9″ = 48.26**, pared 0.145″ = 3.68, ID = 40.89 | dato del usuario / norma |
| Largo del rodillo (con bordes de tapa) | 21″ − 1 mm de holgura = **532.4** | 21″ menos tolerancia para giro libre |
| Ranuras (O-ring elástico Ø5) | centros a **35 y 65 mm** de cada borde (la 2.ª a 30 mm de la 1.ª), ancho 5 | dato del usuario, espejadas en ambos extremos |
| Eje | barra **hexagonal 11 mm** entre caras | dato del usuario |
| Pitch entre rodillos | 3″ = **76.2** (patrón rectangular ×4) | dato del usuario |
| Tangente del rodillo sobre la pestaña superior | **1/4″ = 6.35** | dato del usuario |
| Canal C | alma 3″ = 76.2 alta, pestaña 1″ = 25.4, espesor 3 | supuesto (no especificado) |
| Perforación hexagonal en la chapa | hex 11 mm, patrón ×4 a pitch 76.2, a la altura del eje | dato del usuario |

### Supuestos y avisos de ingeniería
- **Profundidad de ranura limitada por la pared.** Una ranura de 5 mm de
  profundidad radial atravesaría la pared del tubo (3.68 mm). Se limitó a
  **2.0 mm** (deja 1.68 mm de pared bajo la ranura). Para alojar por completo
  un O-ring de 5 mm habría que usar un tubo de mayor espesor o un anillo de
  arrastre exterior. Ajustable con edición directa del diámetro del tramo.
- **Tapas integradas.** Las tapas de rodamiento se modelan como extremos
  macizos del tubo con barreno hexagonal (representan el rodamiento de eje
  hexagonal). No se modela el rodamiento como pieza aparte.
- **Dimensiones del canal C** no fueron especificadas: se usó un perfil
  estructural típico. Cámbialo por tu canal real.
- Holgura rodillo/alma: 0.5 mm por lado.

### Regenerar
```bash
cd cad
npx esbuild ejemplos/gen_transportador.mjs --bundle --platform=node --format=esm \
  --alias:three=./vendor/three.module.min.js --outfile=/tmp/gen.mjs && node /tmp/gen.mjs
```
El script verifica que cada pieza construya (volumen > 0, sin NaN) antes de
escribir el JSON.
