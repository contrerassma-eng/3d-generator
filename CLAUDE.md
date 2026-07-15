# foto3d — Método algorítmico: fotos → 3D navegable auditable

Este repositorio ES el método. Al leer este archivo tienes todas las instrucciones
para operar el pipeline sin que el usuario las repita. Sigue el algoritmo al pie
de la letra: es una máquina de estados con compuertas (gates) que NUNCA se saltan.

## Reglas de oro (no negociables)

1. **No inventes geometría ni datos.** Solo existen tres capas de información:
   - `measured`: triangulado desde las fotos por el pipeline (COLMAP/OpenMVS). Irrefutable.
   - `web`: dato externo obtenido por búsqueda web. SIEMPRE va a `input/web_facts.json`
     con URL, fecha de acceso y cita textual. Jamás se funde al modelo sin esa procedencia.
   - `user`: afirmación del usuario en `input/descripcion.md`. Se registra como afirmación,
     no como hecho verificado.
2. **Un gate fallido detiene el pipeline.** Reporta el motivo y la acción correctiva
   (ej. re-captura de fotos). No "ajustes" umbrales para que pase: los umbrales viven
   en `config/thresholds.json` y solo el usuario los cambia.
3. **Toda acción se audita.** Cada script anota en `projects/<X>/audit.log.jsonl`
   (timestamp, acción, hashes de entrada/salida, resultado). Si ejecutas algo manual
   fuera de los scripts, regístralo con `python pipeline/lib_audit.py log <proyecto> "<acción>"`.
4. **El estado vive en `projects/<X>/state.json`.** Léelo SIEMPRE antes de actuar;
   te dice en qué etapa está el proyecto y qué sigue.

## Comandos del usuario → qué haces

| El usuario dice | Algoritmo |
|---|---|
| "nuevo proyecto \<código\>" | Copia `projects/_template/` → `projects/<código>/`. Pide al usuario llenar `input/descripcion.md` y poner fotos en `input/photos/`. |
| "procesa \<código\>" | Lee `state.json`, ejecuta la SIGUIENTE etapa pendiente (ver tabla de etapas), reporta métricas y resultado del gate. Si pasa, ofrece continuar con la siguiente. "procesa todo" = encadena etapas hasta gate fallido o fin. |
| "investiga \<código\>" | Lee `descripcion.md` (fabricante/modelo), busca en web fichas técnicas y dimensiones oficiales, llena `input/web_facts.json` (esquema en `schemas/provenance.schema.json`, sección facts). NUNCA escribas estos datos en otro lugar. |
| "publica \<código\>" | Ejecuta S5 (paquete web + informe). Entrega ruta a `70_web/index.html` y cómo servirlo. |
| "dibuja \<código\>" / "plano dxf/pdf" | Ejecuta S6: `python pipeline/s6_drawings.py projects/<X>` → DXF a escala real + PDF con alzado/planta/perfil/isométrica, cotas y cajetín normativos. Con "chapa" o "despliegue": añade `--chapa auto`. Detalle: `docs/DIBUJO_TECNICO.md`. |
| "boceto en \<cara\> de \<código\>" | Flujo CAD: `cad_cli.py caras` → pregunta al usuario qué cara → `plano-cara <id>` → `refs PL<n>` → muestra referencias y PIDE la geometría → `boceto` con JSON citando `@rN`. |
| "plano en cara / plano desfasado" | `cad_cli.py plano-cara <id>` / `plano-desfasado <plano> <mm>` / `plano-3p`. |
| "extruye / revoluciona / barre \<boceto\>" | `cad_cli.py extruir|revolucionar|barrer …` → sólido `out/cad/*.glb` (capa user). Ofrece dibujarlo con S6 `--fuente out/cad/<n>.glb`. |
| "componentes" / "biblioteca de componentes" / "agrega \<componente\> a la carcasa" | Biblioteca en `componentes/catalogo.json` (ESP32, buck, sensores, pulsadores, conectores de panel; capa `user`, dims nominales → verificar con calibre). `python pipeline/componentes_cli.py listar\|info\|generar\|huella\|cad-json …` → GLB/STL, DXF de taladrado, o piezas para el CAD del navegador. Con `--proyecto <X>` audita en el proyecto. Agregar componente = editar el JSON + `validar`. Detalle: `docs/COMPONENTES.md`. |
| "estado \<código\>" | Resume `state.json` + último bloque de `audit.log.jsonl` en lenguaje claro. |
| "verifica entorno" | Ejecuta `tools/check_env.ps1` y reporta qué falta con instrucciones de `docs/INSTALACION.md`. |

## Etapas (máquina de estados)

| Etapa | Script | Produce | Gate |
|---|---|---|---|
| S0 Intake | `python pipeline/s0_intake.py projects/<X>` | `work/00_intake/` informe calidad fotos + hashes | G1: nº fotos, resolución, nitidez |
| S1 SfM | `python pipeline/s1_sfm.py projects/<X>` | `work/10_sfm/` poses + nube dispersa (COLMAP) | G2: % registradas, error reproyección |
| S2 Malla | `python pipeline/s2_dense_mesh.py projects/<X>` | `out/model.glb` malla texturizada (OpenMVS) | G3: malla válida y completa |
| S3 Splat (opcional) | manual, ver `pipeline/s3_splat.md` | `out/scene.spz` o `.ply` 3DGS | — |
| S4 Procedencia | `python pipeline/s4_provenance.py projects/<X>` | `out/provenance.json` 3 capas + escala | G4: discrepancia escala dentro de umbral |
| S5 Paquete | `python pipeline/s5_package.py projects/<X>` | `70_web/` visor navegable + `INFORME.md` | G5: archivos completos |
| S6 Dibujo (desde S2_OK, repetible) | `python pipeline/s6_drawings.py projects/<X>` | `out/drawings/` DXF escala real + PDF (vistas, cotas, marco, chapa) | G6: archivos + escala certificada (no muta la etapa S0–S5) |
| CAD (herramienta, sin gate) | `python pipeline/cad_cli.py projects/<X> <cmd>` | `cad/cad.json`, `out/cad/*.glb\|.stl\|.dxf` | — capa `user`, auditado |

Detalle completo del algoritmo y los gates: `docs/METODO.md`.

## Escala métrica (cómo se resuelve en v1)

COLMAP produce escala arbitraria. El flujo v1: el usuario incluye un objeto de
dimensión conocida en escena (declarada en `descripcion.md` campo `referencia_escala`),
mide esa distancia en el visor (modo medición), y registra el factor en
`descripcion.md` campo `factor_escala`. S4 lo aplica y compara dimensiones medidas
vs. declaradas/web → discrepancia % en `provenance.json`. Si supera el umbral G4,
se reporta, no se oculta.

## Qué NO hacer

- No proceses fotos que no estén en `input/photos/` del proyecto.
- No edites archivos dentro de `work/` a mano (son artefactos reproducibles).
- No declares un proyecto "publicado" sin `INFORME.md` generado por S5.
- No uses datos de un proyecto en otro.
- Si COLMAP/OpenMVS no están instalados, NO simules sus salidas: reporta y guía
  la instalación (`docs/INSTALACION.md`).

## Convención de proyectos

Código estilo Yolotech: `YTnnnn-<nombre>` o libre del usuario. Un objeto físico = un proyecto.
