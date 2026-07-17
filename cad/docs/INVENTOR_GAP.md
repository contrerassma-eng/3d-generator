# foto3d CAD vs. Autodesk Inventor — análisis de brechas

Estado del CAD web y qué falta para acercarnos a Inventor, **priorizado por
impacto/esfuerzo**. Marca ✅ lo que ya existe, 🟡 parcial, ❌ falta.

## Lo que YA tenemos (base sólida)
- ✅ **Modelado paramétrico por árbol**: caja, cilindro, agujero, extrusión de
  boceto, revolución 360°, **patrón** rect/circular. Booleanas unión/corte.
  Árbol con suprimir, reordenar, renombrar, **edición directa** de caras.
- ✅ **Boceto 2D** rico: línea/rect/círculo/arco/polígono/lápiz, offset, empalme,
  recortar/alargar, mover, cotas (largo/Ø/dist/áng, con candado), snap a puntos
  notables + tangentes, **proyección selectiva** (símil Inventor), **entrada
  dinámica** (longitud/ángulo/diámetro con snap de ángulo), selección de
  perfiles, sección/corte, giro.
- ✅ **Ensamble**: coincidir/alinear/concéntrico, mover, **imán**, aislar,
  entornos Pieza/Ensamble, vistas ortogonales bloqueadas.
- ✅ **Medir con referencias** (aristas/caras/circunferencias/ejes).
- ✅ **Chapa plegada**: base + pliegues, **desarrollo con cotas generales +
  cortes** (perfil láser), BA con factor K.
- ✅ **Plano técnico** DXF/PDF: 4 vistas + **isométrica sombreada**, cotas,
  cajetín ISO, desarrollo de chapa.
- ✅ **Biblioteca de componentes**, STL, guardar/abrir, **pegar JSON de IA**,
  prompt para generar piezas por instrucciones. Móvil + offline.

## Brechas priorizadas

### P1 — Fundamentales (mayor impacto)
1. 🟡→ **Parámetros globales (fx) y ecuaciones** — tabla de parámetros con
   nombre y expresiones que las cotas citen (`ancho`, `paso=ancho/4`). Columna
   vertebral paramétrica; potencia la generación por IA ("hazlo 10 mm más
   ancho" = un número). **[EN CURSO en esta iteración]**
2. ❌ **Chaflán y redondeo 3D** en aristas — funciones insignia de Inventor
   ("Modificar"). Falta selección de aristas + operación CSG de bisel/redondeo.
3. ❌ **Solver de restricciones geométricas de boceto** — coincidente, paralela,
   perpendicular, tangente, igual, simétrica, horizontal/vertical. Hoy solo hay
   cotas (impulsoras/bloqueadas), no restricciones geométricas completas.

### P2 — Alto valor
4. ❌ **Funciones de trabajo**: planos de trabajo (desfase, ángulo, tangente,
   por 3 puntos), ejes y puntos de trabajo; bocetar en planos de trabajo, no
   solo en caras existentes (el CAD de línea de comandos ya los tiene).
5. ❌ **Barrido (sweep) y solevado (loft)** + **hélice/espiral** (resortes,
   roscas). Hoy solo extrusión y revolución — por eso el resorte va esquemático.
6. ❌ **Agujero enriquecido**: avellanado, refrentado (counterbore), roscado,
   normas de holgura, nota de rosca.
7. 🟡 **Ensamble avanzado**: grados de libertad, restricción de **ángulo** y de
   inserción, juntas (rotacional/deslizante), **detección de interferencias**,
   **vista explosionada**, **lista de materiales (BOM)**.

### P3 — Detalle y productividad
8. 🟡 **Detalle de plano**: vistas de **sección** y de **detalle**, líneas
   ocultas, líneas de centro, **tabla de agujeros**, tolerancias, GD&T, globos
   + BOM. Hoy: vistas + cotas envolventes + iso sombreada.
9. 🟡 **Robustez del árbol**: editar la definición completa de cualquier
   función, barra de reversión (rollback), diagnóstico de funciones enfermas,
   dependencias padre/hijo.
10. ❌ **Materiales y propiedades físicas**: asignar material, **masa/centro de
    gravedad/inercia** (ya calculamos volumen, falta exponerlo).
11. ❌ **Import/Export CAD**: **STEP/IGES** (in/out), importar **DXF** a boceto.
    Hoy exportamos STL/DXF/PDF.
12. ❌ **Patrón enriquecido**: patrón a lo largo de una trayectoria/curva,
    **espejo de función 3D**, patrón dirigido por boceto.

### P4 — Chapa y avanzados
13. 🟡 **Chapa**: auto-reconocer un sólido de espesor constante como chapa;
    desplegar **cortes sobre las alas** (hoy solo cortes del plano de la base);
    esquinas/reliefs normalizados; brida por contorno.
14. ❌ **Roscas** (cosméticas y reales), **iMate/iPart/iFeature**, tablas de
    configuración.

## Recomendación de orden
**fx (P1.1)** → **chaflán/redondeo (P1.2)** → **sweep/loft + hélice (P2.5)** →
**solver de boceto (P1.3)** → **agujero enriquecido (P2.6)** → detalle de plano
(P3.8). Cada uno es una iteración cerrada, verificable y desplegable.
