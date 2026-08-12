# Paquete de fabricación LBP530-18 — índice por receptor

Proyecto YOLO · 4 líneas × (CV-LBP-5000 + CV-GT-800) · banda Movex 530 18 in.
Todo generado del modelo paramétrico (`gen_lbp530.mjs`) el 2026-08-12 en UNA
corrida — si un archivo tiene otra fecha interna, es defecto: regenerar todo.

| Si usted es… | Use | Contenido |
|---|---|---|
| **Taller de corte láser** | `dxf_lbp530_5m/` · `dxf_lbp530_gt08/` | DXF R12 a escala 1:1 por pieza (LBD-nn / GTD-nn), `_corte.csv` para cotizar, `_agujeros.csv` de verificación, `_LEEME.txt` con materiales y reglas del paquete |
| **Maestranza (plegado/soldadura)** | `planos_fabricacion_lbp530_5m.pdf` · `_gt08.pdf` | Lámina de vistas por pieza fabricada (LB-nn / GT-nn) con material, tolerancia ISO 2768-mK y notas de proceso |
| **Tornería** | `planos_ejes_lbp530.pdf` | LBP530-EJ-01 eje motriz · EJ-02 eje tensor · EJ-03 corte de barras y lista de compra · EJ-04 rodillo de retorno (ajustes H8/p6, Ø35 H7) |
| **Armado y montaje** | `manual_partes_lbp530_5m.pdf` (boletín CV-MP-01) · `_gt08.pdf` (CV-MP-02) | Manual de partes y montaje: figuras de despiece con globos, tablas de partes, tornillería y pares de apriete, 9 etapas de montaje, índice de planos |
| **Compras** | `bom_lbp530_5m.csv` · `bom_lbp530_gt08.csv` · `bom_proyecto.csv` · `compra_movex.csv` | BOM por equipo (el ÍTEM es el globo del manual), consolidado ×4 líneas y cruce artículo por artículo contra la cotización Movex 26012937 |
| **Cliente / gerencia** | `plano_conjunto_lbp530_5m.pdf` · `_gt08.pdf` (LBP530-GA-01/02) | Plano de conjunto A2: planta + elevación + isométrica, cotas auto-medidas del modelo, globos de conjuntos principales |

Numeración única en todo el proyecto: **ÍTEM** (BOM = globos del manual y GA) ·
**LBD/GTD-nn** corte láser · **LB/GT-nn** lámina de vistas · **LBP530-EJ-nn**
familia de ejes · **LBP530-GA-nn** conjuntos. Una pieza tiene UN número por
familia y los artefactos se citan entre sí por esos números.

Los archivos `_despiece_*.json`, `_planos.json` y `bom_*.json` son artefactos
máquina-a-máquina (trazabilidad de la cadena de generación): no editarlos a mano.
