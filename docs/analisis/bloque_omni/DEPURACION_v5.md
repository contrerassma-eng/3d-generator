# Bloque OMNI v5 — depuración contra el análisis conceptual + NEMA 24

Sergio compartió el análisis conceptual **CONVEYONE-OMNI-ZPA** (artifact
`04b40a14`, PR #113) y fijó el accionamiento: **NEMA 24 de 3 N·m en lazo
cerrado, con cable de retorno del encoder**. Esta versión aplica los
hallazgos que afectaban a este ensamble y monta ese motor.

## Los tres hallazgos del análisis que eran defectos reales de la v4

| # | Hallazgo (§ del análisis) | Estaba | Ahora |
|---|---|---|---|
| D1 | **Adaptador hex→hex de pared 0.775 mm** (§4.3: "inviable en metal, frágil impreso") | 32 bujes adaptadores 14.4/12.85 | **barreno hex 12.85 DIRECTO** en la rueda (v9) sobre el eje 1/2". 32 piezas eliminadas; la pared entre la ranura elástica y el hexágono sube de 1.90 a 2.78 mm |
| D2 | **Separadores de PVC 3/4" excéntricos hasta 3.1 mm** sobre el hexágono (§4.3) | tubo PVC ID 20.9 sobre vértices 14.66 | **separadores con barreno hexagonal 12.9**: excentricidad **0.10 mm** |
| D3 | **Apilado de la transmisión** (§4.2.3) | Poly-V doble, 4 planos, 67 mm | **una correa HTD 5M por familia en serpentín**, 2 planos (der −72, izq −97), 25 mm de separación |

## El accionamiento NEMA 24 (D4/D5)

**Poleas HTD 5M 20T (Dp 31.83) iguales en motor y ejes — relación 1:1**, así
que es una sola pieza para los 8 ejes y los 2 motores:

| Magnitud | Valor | Criterio |
|---|---|---|
| Par por eje | **0.75 N·m** | requisito §5: 0.45–0.84 ✓ |
| Motor a 1.0 m/s | 298 rpm | (448 rpm si se va a 1.5 m/s) |
| Tensión del ramal tenso | 188 N | |
| **Vida del F6801ZZ** | **L10 = 71 400 h** | objetivo >40 000 ✓ |

**Discrepancia deliberada con el análisis**: recomendaba sustituir el F6801
por **6001-2RS** en el lado de transmisión. Con la tensión real repartida en
los dos rodamientos de cada eje (122 N por rodamiento) el F6801 da 71 400 h,
casi el doble del objetivo, así que **se mantiene el F6801** que eligió
Sergio — y con ello los dos rieles siguen siendo la misma pieza.

**Montaje del motor**: NEMA 24 (brida 60×60, patrón 47.14, piloto Ø38.1, eje
Ø10×24), cuerpo 100 + encoder Ø50×30, tumbado con el eje paralelo a los de
rueda, cuerpo y encoder metidos en la zona muerta bajo la tapa ciega
modular, sobre placa de 8 mm con colisas de tensado.

> **Gate que falló y cómo se corrigió**: modelando el cable del encoder con
> salida **axial**, el motor izquierdo invadía el larguero 2.2 mm. Los
> closed-loop reales sacan el cable **radialmente** (conector lateral); con
> esa geometría la holgura pasa a **15.8 mm** (der: 40.8 mm).

## Gates v5 (todos verdes)

```
D1 eje hex 12.7 · barreno 12.85 directo (holgura 0.075/cara) · 0 adaptadores
D2 separadores hex: excentricidad 0.10 mm (PVC daba 3.10)
D3 HTD 5M 20T 1:1 · un plano por familia · separacion 25.0
D4 0.75 N.m/eje · 298 rpm a 1 m/s · tension 188 N · F6801 L10 71 400 h
D5 motor der holgura 40.8 · izq 15.8 al larguero · brida libre de base y envolvente
   luz entre planos de correa 10.0 · polea vs rueda 7.2
nivel 115.1 = ZP · sobresale 5.0 · ventana 46.3x40.6 · 104 piezas
```

## Sobre las skills de terceros del artículo de Snyk

Sergio propuso usar los repos de
`snyk.io/es/articles/top-claude-skills-3d-modeling-game-dev-shader-programming`.
**No se instalaron**: siete de las ocho son para assets de videojuego
(topología, UV mapping, retopología, rigging, shaders HLSL/GLSL,
Unity/Unreal/Godot) y no tocan CAD mecánico paramétrico. La única pertinente
—*CAD Agent*, build123d— vive en `openclaw/skills`, **repositorio archivado
que ya no clona**; además build123d es el hermano de CadQuery (mismo kernel
OCCT) que este pipeline ya usa, de modo que sería un cambio lateral, no una
mejora.

## Reproducir

```bash
python docs/analisis/bloque_omni/bloque_omni_v5.py   # gates + STEP + STLs
python docs/analisis/bloque_omni/bo5z_scene.py       # escena en el ZP2026
python docs/analisis/mecanum64v9/mecanum64v9.py      # rueda con hex directo
```
