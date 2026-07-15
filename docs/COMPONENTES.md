# Biblioteca de componentes electrónicos (para diseñar carcasas)

Componentes estándar (placas ESP32, convertidores buck, sensores, pulsadores,
conectores de panel) definidos **como datos** en `componentes/catalogo.json`.
De cada registro se derivan, sin tocar código:

| Salida | Comando | Para qué |
|---|---|---|
| Malla 3D (`.glb` + `.stl`) | `python pipeline/componentes_cli.py generar <id>` | modelar la carcasa alrededor; insertar en dibujos S6 (`--fuente`) |
| Huella DXF a escala real | `python pipeline/componentes_cli.py huella <id>` | plano de taladrado/corte del panel: contorno, agujeros de montaje, cortes de pared, despejes |
| Pieza(s) `foto3d-cad` (JSON) | `python pipeline/componentes_cli.py cad-json <id> [<id> …]` | abrir en el CAD del navegador (`cad/`, botón 📂 Abrir) y ensamblar la carcasa con restricciones |

**Desde la interfaz web** no hace falta ningún comando: el botón **🔌 Comp.**
de la barra izquierda del CAD (`cad/`) lista el catálogo y lo inserta como
pieza (sólidos + agujeros de montaje pasantes) apoyada en Z=0. La app lee
`cad/componentes.json`, una copia del catálogo que se regenera con
`python pipeline/componentes_cli.py sync-web` cada vez que se edita
`componentes/catalogo.json` (hay una prueba que falla si quedan desincronizados).

Consulta: `listar [--categoria mcu|alimentacion|sensor|boton|conector|adaptador]`,
`info <id>`, `validar`. Con `--proyecto <X>` la salida va a
`projects/<X>/out/componentes/` y queda registrada en el `audit.log` del
proyecto; sin él, a `componentes/out/` (fuera de git).

## Capa de información y confianza

Los componentes son **capa `user`** (geometría de diseño): dimensiones
nominales de datasheet o típicas de mercado, **no** geometría medida por el
pipeline. Cada registro declara `fuente` (de dónde salió el dato) y
`confianza`:

- `datasheet`: dimensión oficial del fabricante.
- `verificar` / `generico`: valor típico; los módulos clónicos varían entre
  marcas. **Medir la unidad real con calibre antes de cortar una carcasa**,
  sobre todo posiciones de agujeros de montaje y el adaptador de borneras.

## Convención geométrica

- Unidades **mm**, **X = largo**, **Y = ancho**, **Z = arriba**.
- Origen: centro de la cara inferior de la PCB/cuerpo. Lo que cuelga bajo la
  PCB (pines de headers) queda en Z negativo.
- Piezas de panel (pulsador 12 mm, conectores M5/M8): el origen es el **plano
  exterior del panel**; la pieza crece hacia +Z (afuera) y −Z (adentro).

## Esquema de un componente

```jsonc
{
  "id": "buck_lm2596",                  // único, snake_case
  "nombre": "…", "categoria": "alimentacion", "descripcion": "…",
  "fuente": {"tipo": "datasheet|tipico|generico", "detalle": "…"},
  "confianza": "datasheet|verificar",
  "solidos": [                           // cuerpos primitivos
    {"tipo": "caja", "nombre": "PCB", "pcb": true,   // pcb: se perfora con los agujeros
     "at": [0,0,0], "dim": [43.2,21.2,1.6], "color": "#0d47a1"},
    {"tipo": "cilindro", "nombre": "…", "at": [x,y,z], "dia": 8, "alto": 11,
     "eje": [0,0,1]}                     // eje opcional (por defecto +Z)
  ],
  "agujeros_montaje": [{"pos": [x,y], "dia": 3.0}],   // atraviesan la PCB
  "cortes_panel":     [{"pos": [x,y], "dia": 16.6, "nota": "…"}], // perforar pared
  "despejes": [{"nombre": "…", "at": [x,y,z], "dim": [l,a,h]}],   // zonas libres
  "notas": "consejos de montaje en carcasa"
}
```

`at` es siempre el **centro de la base** del sólido (crece en +Z, igual que
las features del CAD del navegador). Agregar un componente = añadir un
registro y correr `validar`, `sync-web` y `python tests/test_componentes.py`.

## Flujo típico para una carcasa

1. `listar` → elegir componentes; `info <id>` para agujeros/cortes/notas.
2. Abrir el CAD (`cd cad && python -m http.server 8080`) y con **🔌 Comp.**
   insertar cada componente; crear la caja de la carcasa como pieza nueva y
   posicionar los componentes con restricciones (concéntrico sobre agujeros
   de montaje, coincidir caras). Alternativa por CLI:
   `cad-json esp32_devkitc_38 buck_lm2596 …` → botón 📂 Abrir.
3. `huella <id>` → DXF con las perforaciones exactas de cada cara del panel
   (capas `AGUJEROS` y `CORTE_PANEL`).
4. La carcasa terminada se exporta a STL desde el CAD, o se dibuja con norma:
   `python pipeline/s6_drawings.py projects/<X> --fuente out/cad/<pieza>.glb`.

## Carcasa paramétrica ESP32 + borneras (medidas reales)

El registro `adaptador_borneras_esp32_70x80` (confianza `medido`: PCB 80×70,
taladros 73×32 Ø2.7, borneras de 9 mm de fondo, 2× USB-C) trae además un bloque
`carcasa` con las alturas de pila y ventanas USB-C declaradas por el usuario.
De él deriva la carcasa completa:

```bash
python pipeline/carcasa_esp32.py [--salida <dir>] [--proyecto <X>] [--tapa-ciega]
```

Produce en `componentes/out/carcasa_esp32/` (o `projects/<X>/out/carcasa/`,
auditado): `carcasa_base` y `carcasa_tapa` (GLB+STL imprimibles),
`carcasa_ensamble.glb` y `carcasa_ensamble_explotado.glb` (base + placa +
tapa), y `carcasa_cad.json` (3 piezas editables en el CAD del navegador).
Diseño: cavidad con holgura 6.5, torres Ø7 con piloto Ø2.7×12 para 4× M3x16
avellanado DIN 965, muescas de cable en U en las paredes largas (cerradas por
el faldón de la tapa), bridas laterales con ranura M5 y ranuras superiores de
acceso a borneras (`--tapa-ciega` las quita). El original del usuario
(CadQuery) está en `componentes/carcasas/case_esp32_v3.py` como referencia de
procedencia; `tests/test_carcasa.py` verifica que la derivación siga sus
medidas. Sin el chaflán cosmético de 1 mm del borde superior de la tapa.

## Pruebas

- `python tests/test_componentes.py` — esquema, mallas, DXF, CLI.
- Motor del navegador (Node):
  ```bash
  cd cad
  npx esbuild tests/test_componentes.mjs --bundle --format=esm --platform=node \
    --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_comp.mjs
  node /tmp/test_comp.mjs   # requiere componentes/out/componentes_cad.json generado
  ```
