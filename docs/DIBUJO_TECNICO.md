# S6 — Dibujo técnico y CAD

Dos herramientas complementarias sobre el modelo medido:

- `pipeline/s6_drawings.py` — láminas normalizadas (DXF a escala real + PDF).
- `pipeline/cad_cli.py` — planos de referencia, bocetos con referencias
  geométricas y sólidos (extrusión, revolución, barrido).

Ambas respetan las reglas de oro: nada se inventa (todo deriva de la malla
medida o de entidades declaradas por el usuario), toda acción queda en
`audit.log.jsonl`, y la certificación de escala nunca se oculta.

## Láminas normalizadas (S6)

```powershell
python pipeline/s6_drawings.py projects/<X>                  # vistas del modelo
python pipeline/s6_drawings.py projects/<X> --chapa auto     # + lámina de despliegue
python pipeline/s6_drawings.py projects/<X> --fuente out/cad/pieza.glb
```

Produce en `projects/<X>/out/drawings/`:

| Archivo | Contenido |
|---|---|
| `<nombre>.dxf` | Geometría **a escala real** (1 unidad = 1 mm reales). El marco y el cajetín están multiplicados por el denominador de escala: al trazar a la escala del cajetín se recupera la lámina física exacta. Cotas en mm reales. |
| `<nombre>.pdf` | Lámina(s) listas para imprimir al tamaño ISO elegido (A4–A0 apaisado). Una página por lámina: vistas + una página por despliegue de chapa. |

Normas aplicadas:

- **ISO 5456-2** — proyección en primer diedro (sistema europeo): planta bajo
  el alzado, perfil (vista lateral izquierda) a la derecha, más isométrica.
- **ISO 5455** — escalas normalizadas (1:1, 1:2, 1:5, … y ampliaciones para
  objetos < 50 mm). Formato `--formato A3` o automático (el que da mayor escala).
- **ISO 5457** — marco con márgenes (20 mm de archivado a la izquierda),
  borde de hoja recortada, marcas de centrado y retícula de referencia
  (números 1..n arriba/abajo, letras A.. sin I/O en los laterales; campos
  de ≈50 mm según formato).
- **ISO 7200** — cajetín de 180×42 mm en tres zonas, con rótulo pequeño y
  valor jerarquizado por casilla: marca del método (`foto3d`) con el símbolo
  gráfico del primer diedro (ISO 5456-2); identificación (designación
  destacada, proyecto, fuente, verificación de escala, SHA-256, nota); y
  clasificación (escala protagonista, formato, lámina n/N, fecha, unidades,
  nº de plano). El estado de la escala nunca se oculta (`CERTIFICADA (G4)`
  o `NO CERTIFICADA — requiere S4`). Si un valor no cabe, se reduce su
  altura de letra antes de truncar con elipsis.
- **ISO 129** — cotas generales (texto 3,5 mm; capa COTAS). Se acotan las
  dimensiones envolventes por vista (sin duplicar entre vistas).

Capas DXF: `VISIBLE`, `OCULTA` (trazos), `COTAS`, `PLIEGUE` (trazo-punto),
`NORMA` (marco/cajetín, línea gruesa), `FINA` (retícula y divisiones del
cajetín), `TEXTO`.

Opciones: `--vistas alzado,planta,perfil,isometrica` · `--angulo 25` (umbral
de arista característica) · `--formato A4..A0` · `--chapa auto|<id de cara>`.

### Gate G6

- `PASA`: DXF + PDF generados y escala certificada (hay `factor_escala`, G4).
- `SIN_CONTRASTE`: archivos generados pero escala NO certificada — las
  medidas están en unidades del modelo; la lámina lo declara en el cajetín.
- `FALLA`: faltan archivos.

G6 no muta la etapa S0–S5 del proyecto (es una salida derivada, se puede
ejecutar desde S2_OK en adelante y repetir cuantas veces se quiera).

### Despliegue de chapa (`--chapa`)

Detecta las caras planas de la malla, las une por sus pliegues (aristas con
ángulo entre `chapa_min_pliegue_deg` y `chapa_max_pliegue_deg`, en
`config/thresholds.json`) y las abate rígidamente sobre el plano de la cara
raíz (`auto` = la de mayor área; o `--chapa <id>` con el id de `cad_cli caras`).

Límites declarados (no se ocultan):

- Desarrollo **rígido, sin factor K** ni compensación de curvado: la longitud
  desarrollada es la de la superficie medida. Para chapa doblada real con
  espesor, el desarrollo exacto exige la superficie neutra, que una malla
  escaneada no contiene. La lámina lo advierte.
- Sobre un sólido cerrado el resultado es la red (tipo papercraft) de la
  cadena de caras conectadas; sobre una superficie de chapa abierta es el
  desarrollo plano clásico. Los pliegues van en capa `PLIEGUE` (trazo-punto).
- Vistas: las líneas ocultas son aproximadas (por orientación de caras, sin
  oclusión completa); el contorno exterior de cada vista sí es exacto.

## CAD: planos, bocetos y sólidos (`cad_cli.py`)

Los sólidos CAD son **capa `user`** (diseño anclado a la medición, no medición).
Se guardan en `projects/<X>/cad/cad.json` (documento paramétrico) y
`out/cad/*.glb|.stl`. Nunca se fusionan con `out/model.glb`.

```powershell
python pipeline/cad_cli.py projects/<X> caras                    # caras planas del modelo (ids)
python pipeline/cad_cli.py projects/<X> plano-cara 0             # plano sobre la cara 0
python pipeline/cad_cli.py projects/<X> plano-desfasado PL1 25   # plano paralelo a +25 mm
python pipeline/cad_cli.py projects/<X> plano-3p "0,0,0" "1,0,0" "0,1,0"
python pipeline/cad_cli.py projects/<X> refs PL1                 # referencias @r1..@rN
python pipeline/cad_cli.py projects/<X> boceto B1 --plano PL1 --json b1.json
python pipeline/cad_cli.py projects/<X> extruir B1 30
python pipeline/cad_cli.py projects/<X> revolucionar B1 --eje "0,0;0,50" --angulo 360
python pipeline/cad_cli.py projects/<X> barrer B1 --camino B2
python pipeline/cad_cli.py projects/<X> exportar-dxf B1
```

- **Referencias geométricas**: `refs <plano>` proyecta el modelo medido al
  plano y publica puntos citables (esquinas y centro de la cara, bbox del
  modelo). En un boceto, cualquier coordenada puede ser `"@r3"`. Si se cita
  una referencia inexistente, el comando **lista las disponibles y se
  detiene** (pide las referencias, no las inventa).
- **Entidades de boceto**: `linea`, `rect`, `circulo`, `arco`, `poli`
  (cerrada o abierta), con coordenadas UV en mm sobre el plano.
- **Sólidos**: extrusión (altura ± sobre la normal del plano), revolución
  (eje = dos puntos UV del plano del boceto, perfil a un solo lado del eje),
  barrido (perfil cerrado a lo largo del camino de otro boceto; el perfil se
  orienta perpendicular al camino). Se reporta si el sólido es estanco y su
  volumen.
- Cualquier sólido se dibuja con norma:
  `python pipeline/s6_drawings.py projects/<X> --fuente out/cad/<nombre>.glb`.

### Plano desde el CAD web (botones ⭳ DXF / ⭳ PDF)

El diseñador del navegador (`cad/index.html`) exporta directamente el plano
técnico del ensamble con el mismo estilo de S6 (marco ISO 5457, cajetín
ISO 7200 con símbolo de primer diedro, vistas y cotas envolventes), sin
servidor: los escritores DXF (R12) y PDF (1.4) corren en el navegador
(`cad/js/drawing2d.js`). El DXF sale a escala real y el PDF al tamaño de
papel. Es capa `user` y la NOTA del cajetín lo declara (diseño CAD, no
medición; aristas sin líneas ocultas).

### Flujo conversacional ("boceto en una cara")

1. Usuario: «boceto en la cara superior de <X>» → Claude ejecuta `caras`,
   muestra la tabla y pide confirmar cuál.
2. `plano-cara <id>` + `refs PL<n>` → Claude muestra las referencias y
   **pide** al usuario la geometría en función de ellas.
3. Claude escribe el JSON de entidades citando `@rN`, ejecuta `boceto` y
   ofrece extruir / revolucionar / barrer / exportar DXF.

## Dependencias

`pip install -r requirements.txt` (añade: trimesh, shapely, ezdxf,
matplotlib, mapbox-earcut, networkx). Sin binarios externos: no requiere
COLMAP/OpenMVS, solo el `out/model.glb` ya producido por S2 (o un sólido CAD).
