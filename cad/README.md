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
- **✏ Boceto**: toca una cara plana → la vista pasa a **ortogonal alineada a la
  cara** y se proyectan sobre el plano **todas las aristas del modelo** (la vista
  ortogonal completa, incluidas otras piezas) como referencias. Dibuja un
  polígono, rectángulo o círculo con **snap** a esa geometría proyectada (verde)
  o a la grilla de 1 mm, cierra y extruye como **unión** (hacia afuera) o
  **corte** (bolsillo hacia adentro). La altura queda editable en el árbol.
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
| `js/model.js` | Documento paramétrico, regeneración, detección de caras planas y ejes, solver de restricciones |
| `js/app.js` | Viewport Three.js, picking, modos de interacción, diálogos, STL, persistencia |
| `vendor/` | Three.js 0.177 + OrbitControls (local, funciona sin internet) |

Límites conocidos: sin chaflanes/redondeos, el boceto admite un contorno por
extrusión (sin agujeros interiores en el mismo boceto), y el solver de
restricciones es secuencial (aplica cada restricción en orden, 3 pasadas), no
un solver simultáneo de grados de libertad.
