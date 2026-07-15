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

- **Barra superior**: archivo (STL, guardar, abrir, ejemplo, nuevo) y el botón
  **☰** que muestra/oculta el panel de modelo.
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
- **✚ Función…**: agrega a la pieza seleccionada una caja o cilindro como
  **unión** (agregar material) o **corte** (quitar material) — booleanas CSG.
- **◎ Agujero**: clic sobre cualquier cara plana → diálogo con diámetro,
  profundidad o pasante, y opción de centrar en la cara. El agujero se taladra
  perpendicular a la cara.
- **✏ Boceto**: toca una cara plana → vista **ortogonal alineada a la cara**
  con **todas las aristas del modelo proyectadas** (vista ortogonal completa,
  incluidas otras piezas, generada analíticamente desde las funciones) como
  referencias con snap. Herramientas:
  - **╱ Línea** (cadena punto a punto, el 1.º cierra), **▭ Rectángulo**,
    **◯ Círculo**.
  - **✎ Lápiz**: dibujo a mano alzada (dedo, mouse o stylus) con
    reconocimiento de geometría — un trazo redondo se convierte en círculo,
    uno recto en línea (con ajuste a horizontal/vertical), y el resto en
    polilínea simplificada.
  - **⇤⇥ Cota**: toca 1 entidad (largo o diámetro) o 2 (distancia entre
    paralelas o ángulo), **incluidas las líneas de referencia proyectadas**.
    Las cotas aparecen como etiquetas tocables sobre el boceto (tocar = editar,
    valor 0 = eliminar) y también quedan editables en las propiedades de la
    función en el navegador de modelo, regenerando la pieza.
  - **✂ Recortar**: elimina el tramo tocado cortando contra todas las
    entidades y referencias. **⇥ Alargar**: extiende una línea hasta la
    siguiente entidad o referencia.
  - **✔ Extruir**: encadena el contorno (admite **agujeros interiores**:
    círculos u otros contornos cerrados dentro del principal) y extruye como
    unión o corte con altura paramétrica.
- Todo queda en el **árbol** (panel izquierdo). Al seleccionar una función se
  pueden editar sus cotas y **Regenerar**: el modelo se reconstruye aplicando
  las funciones en orden, como en Inventor.

### Ensamble (restricciones)
- **▬ Coincidir**: cara contra cara (normales opuestas), con separación
  opcional editable.
- **⫤ Alinear**: caras al ras (mismo sentido).
- **◉ Concéntrico**: clic cerca de un orificio/cilindro de cada pieza →
  alinea los ejes (para "atornillar" piezas por sus orificios).
- **✥ Mover**: arrastrar piezas en el plano (Shift = vertical). Al soltar,
  las restricciones se re-aplican. La primera pieza queda **fija** (📌);
  se puede fijar/liberar cualquier pieza desde sus propiedades.

### Inspección y archivo
- **📏 Medir**: distancia entre dos puntos (con ajuste a vértices) + ΔX/ΔY/ΔZ.
- **⭳ STL**: exporta el ensamble completo a STL binario (imprimible/importable).
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
| `js/app.js` | Viewport Three.js, picking, modos de interacción, diálogos, STL, persistencia |
| `vendor/` | Three.js 0.177 + OrbitControls (local, funciona sin internet) |

Límites conocidos: sin chaflanes/redondeos; las cotas del boceto son
dirigidas (mueven la geometría al editarlas, en orden), no un solver
simultáneo de restricciones 2D; y el solver de ensamble es secuencial
(3 pasadas), no de grados de libertad.
