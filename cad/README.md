# foto3d CAD — mini diseño 3D paramétrico (símil Inventor)

Pequeño software de diseño 3D que corre en el navegador, sin instalación ni
dependencias externas (Three.js va incluido en `vendor/`). Modelado por
funciones (features) con regeneración paramétrica, operaciones booleanas,
agujeros sobre caras y ensamble con restricciones. Unidades: **milímetros**,
eje **Z hacia arriba**.

## Cómo abrirlo

Necesita servirse por HTTP (los módulos ES no cargan desde `file://`):

```bash
cd cad
python -m http.server 8080
# abrir http://localhost:8080
```

Al arrancar carga un ensamble de ejemplo (base con 4 orificios + puente
atornillable) que muestra todas las capacidades.

## Interfaz (pensada también para celular)

- **Barra superior**: archivo (STL, guardar, abrir, ejemplo, nuevo), exportar
  **plano técnico DXF/PDF** y el botón **☰** que muestra/oculta el panel de
  modelo.
- **Barra "metro" izquierda**: herramientas en tiles táctiles grandes
  (pieza, agujero, función, restricciones, mover, medir).
- **Panel ocultable**: árbol de piezas/funciones/restricciones + propiedades
  (sección plegable). En pantallas chicas arranca oculto y se cierra solo al
  activar una herramienta para no tapar el modelo.
- **Táctil**: 1 dedo orbita, 2 dedos paneo/zoom; en modo Mover, un 2.º dedo
  cambia el arrastre a vertical (equivale a Shift con mouse).

## Qué puede hacer

### Piezas y funciones (árbol paramétrico)
- **⬛ Caja / ⬤ Cilindro**: crean una pieza nueva con su función base.
- **🔌 Comp.**: inserta un componente electrónico de la biblioteca
  (`componentes/catalogo.json`, servido como `componentes.json`; ver
  `docs/COMPONENTES.md`): ESP32, buck, sensores, pulsadores, conectores de
  panel. Entra como pieza normal (sólidos + agujeros de montaje pasantes)
  apoyada en Z=0, lista para posicionar con restricciones y modelar la
  carcasa alrededor. Tras editar el catálogo, correr
  `python pipeline/componentes_cli.py sync-web`.
- **✚ Función…**: agrega a la pieza seleccionada una caja o cilindro como
  **unión** (agregar material) o **corte** (quitar material) — booleanas CSG.
- **◎ Agujero**: clic sobre cualquier cara plana → diálogo con diámetro,
  profundidad o pasante, y opción de centrar en la cara. El agujero se taladra
  perpendicular a la cara.
- **✏ Boceto**: toca una cara plana → vista **ortogonal alineada a la cara**
  con **todas las aristas del modelo proyectadas** (vista ortogonal completa,
  incluidas otras piezas, generada analíticamente desde las funciones) como
  referencias con snap. Herramientas:
  - **Cinta de herramientas ARRIBA** (estilo ribbon de Inventor, con scroll
    horizontal): **╱ Línea** (cadena punto a punto, el 1.º cierra),
    **▭ Rectángulo**, **◯ Círculo**, **⌒ Arco** (centro-inicio-fin),
    **⬡ Polígono regular** (centro + vértice, n lados), **∥ Equidistancia**
    (offset de entidades o referencias) y **◜ Empalme** (redondeo de esquina
    entre dos líneas, con recorte a tangencia).
  - **✎ Lápiz**: dibujo a mano alzada (dedo, mouse o stylus) con
    reconocimiento de geometría — un trazo redondo se convierte en círculo,
    uno recto en línea (con ajuste a horizontal/vertical), y el resto en
    polilínea simplificada.
  - **Snap con puntos notables** (imanta creación y cotas): extremos y punto
    medio de líneas, centro y 4 cuadrantes de círculos/arcos — también de la
    geometría proyectada (incluidos centros de agujeros/cilindros) — y
    **tangencias** al dibujar una línea hacia un círculo. La barra de estado
    indica el tipo de snap activo.
  - **⇤⇥ Cota**: toca 1 entidad (largo o diámetro) o 2 (distancia entre
    paralelas o ángulo), **incluidas las líneas de referencia proyectadas**.
    Etiquetas tocables sobre el boceto y editables también en las propiedades
    de la función. Cada cota tiene **🔒 candado**: sin candado es dinámica (se
    actualiza al mover la geometría); con candado **restringe** (se re-aplica
    tras cada movimiento). Botón explícito de eliminar en el diálogo.
  - **✥ Mover** (edición directa): arrastra entidades manteniendo conectados
    los extremos vecinos; al soltar se re-aplican las cotas 🔒.
    **⌦ Borrar**: elimina la entidad tocada.
  - **⬚ Selección tipo AutoCAD**: arrastra hacia la DERECHA = ventana azul
    (solo lo contenido por completo); hacia la IZQUIERDA = captura verde
    (todo lo tocado); un toque alterna una entidad. **⧉ Copiar**: duplica la
    selección declarando un **punto base** (con snap) y tocando uno o varios
    destinos (también con snap).
  - **✂ Recortar**: elimina el tramo tocado cortando contra todas las
    entidades y referencias. **⇥ Alargar**: extiende una línea hasta la
    siguiente entidad o referencia.
  - **✔ Extruir** con **selección de perfiles** tipo Inventor: si hay varios
    contornos cerrados, se pintan las regiones y tocas cuáles incluir (verde)
    o excluir (gris); el anidado va por paridad (isla dentro de un agujero =
    sólido). La selección queda guardada en la función.
  - **Boceto consumido visible**: en las propiedades de la función, "Mostrar
    boceto" dibuja el croquis sobre la pieza para reutilizarlo de guía; además
    sus entidades siempre se proyectan como referencia en bocetos nuevos.
- **Navegador de modelo con edición directa**: cada función del árbol tiene
  botones **⏸ suprimir/reactivar** (se excluye de la regeneración, como en
  Inventor), **↑/↓ reordenar** (el orden cambia el resultado) y, en sus
  propiedades, nombre editable, cotas, "Mostrar boceto" y eliminar. El modelo
  se reconstruye aplicando las funciones en orden.

### Ensamble (restricciones)
- **▬ Coincidir**: cara contra cara (normales opuestas), con separación
  opcional editable.
- **⫤ Alinear**: caras al ras (mismo sentido).
- **◉ Concéntrico**: clic cerca de un orificio/cilindro de cada pieza →
  alinea los ejes (para "atornillar" piezas por sus orificios).
- **✥ Mover**: arrastrar piezas en el plano (Shift = vertical). Al soltar,
  las restricciones se re-aplican. La primera pieza queda **fija** (📌);
  se puede fijar/liberar cualquier pieza desde sus propiedades.
- **🧲 Imán** (activable/desactivable): al arrastrar una pieza, se ajusta
  magnéticamente a las demás — caras en **contacto**, caras **al ras**
  (alturas y alturas totales en el arrastre vertical), **centros** de pieza
  y **centros de ejes** (orificios/cilindros alineados para atornillar).
  La barra de estado indica qué ajuste enganchó (contacto/ras/centro/eje).

### Inspección y archivo
- **📏 Medir**: distancia entre dos puntos (con ajuste a vértices) + ΔX/ΔY/ΔZ.
- **⭳ STL**: exporta el ensamble completo a STL binario (imprimible/importable).
- **⭳ DXF / ⭳ PDF**: plano técnico normalizado del ensamble, con el mismo
  estilo que S6 — marco ISO 5457 (marcas de centrado y retícula de
  referencia), cajetín ISO 7200 con el símbolo del primer diedro, vistas
  alzado/planta/perfil/isométrica y cotas envolventes (ISO 129). El **DXF**
  va a escala real (1 unidad = 1 mm; marco ×K, como S6) y el **PDF** al
  tamaño de papel elegido automáticamente (A4–A0, escala ISO 5455). Aristas
  características sin líneas ocultas; las grietas de triangulación del CSG
  se filtran antes de proyectar. Todo capa `user` (diseño, no medición).
- **💾 Guardar / 📂 Abrir**: proyecto en JSON (todo el árbol paramétrico y
  las restricciones). Además hay autoguardado en el navegador.
- **Ctrl+Z** deshace; **Esc** cancela el modo activo; **Supr** elimina lo
  seleccionado.

## Arquitectura

| Archivo | Rol |
|---|---|
| `index.html` | UI + `bundle.js` (script clásico es2017, compatible con navegadores/WebViews antiguos) |
| `dev.html` | Igual que index pero cargando los módulos de `js/` directo (para desarrollar sin rebuild) |
| `bundle.js` | App empaquetada; regenerar tras editar `js/` con: `npx esbuild js/app.js --bundle --minify --target=es2017 --format=iife --alias:three=./vendor/three.module.min.js --outfile=bundle.js` |
| `js/csg.js` | Booleanas de sólidos por BSP (unión/corte/intersección) ↔ `BufferGeometry` |
| `js/sketch2d.js` | Croquizador 2D: entidades, intersecciones, recorte/alargado, contornos con agujeros, cotas y reconocimiento de trazos |
| `js/model.js` | Documento paramétrico, regeneración, detección de caras planas y ejes, solver de restricciones |
| `js/componentes.js` | Biblioteca de componentes: carga `componentes.json` y convierte registros del catálogo en piezas (mismo mapeo que `pipeline/lib_componentes.cad_part`) |
| `componentes.json` | Copia servible del catálogo (`componentes/catalogo.json`); regenerar con `python pipeline/componentes_cli.py sync-web` |
| `js/app.js` | Viewport Three.js, picking, modos de interacción, diálogos, STL, persistencia |
| `js/drawing2d.js` | Plano técnico en el navegador: aristas características (con filtro de grietas CSG), vistas del primer diedro, marco/cajetín ISO y escritores DXF (R12) y PDF (1.4) propios |
| `vendor/` | Three.js 0.177 + OrbitControls (local, funciona sin internet) |

Límites conocidos: sin chaflanes/redondeos; las cotas del boceto son
dirigidas (mueven la geometría al editarlas, en orden), no un solver
simultáneo de restricciones 2D; y el solver de ensamble es secuencial
(3 pasadas), no de grados de libertad.
