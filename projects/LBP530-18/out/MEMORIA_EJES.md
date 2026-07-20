# MEMORIA DE CÁLCULO — EJES TRANSPORTADORES MOVEX 530 (proyecto LBP530-18)

Fecha: 2026-07-19 · Capa: `user` (diseño CAD paramétrico) · Datos del
fabricante: capa `web` citados en `input/web_facts.json` (brochure 530 LBP,
catálogo imperial, datasheet sprockets 525‑530 y Engineering Manual V2.0 de
Movex, movexii.com). Los valores marcados **SUPUESTO** no son datos Movex.

## 1. Alcance

4 líneas, cada una con:

| Equipo | Banda | Ancho | Largo nose-nose | Lazo de banda |
|---|---|---|---|---|
| CV‑LBP‑5000 | Movex **530 LBP** LFA (rodillos Ø12.2 POM) | 18 in (457.2) | 5000 mm | **10.87 m** |
| CV‑GT‑800 | Movex **530 GT** (friction top, goma 75 ShA) | 18 in (457.2) | 800 mm | **2.54 m** |

Arquitectura (pedido del usuario + manual Movex):
- **Nosebar en ambas puntas, CON RODAMIENTOS** (cotización 26012937: LBP
  P22868 h19 €38.73; GT P22862 h19 €31.00; 3 × L6 in por punta).
- **Tracción abajo, extremo de descarga**: eje motriz a z=−400 del plano de
  banda, envoltura **140.8° / 139.0°** (objetivo Movex 140±10°); snub Ø63.5.
- Catenaria tras la motriz: sag 130 mm (rango Movex 50–150), largo ~750.
- **Retorno por RODILLOS Ø63.5 de eje muerto** cada ~500 (decisión del
  usuario; el manual sugiere zapatas para LBP — desviación registrada): tubo
  con 2 rodamientos SELLADOS 6202‑2RS insertos, eje Ø15 perforado y roscado
  M8 interior en ambas puntas → **perno hexagonal M8 + golilla POR FUERA de
  la placa** fija el eje (misma solución del transfer90, en M8).
- Eje tensor/deflexión abajo en el extremo de entrada (2 sprockets locos).
- **Estructura tipo ZP2026**: soportes B_005A (chapa plegada 3 mm, 203×95,
  con nivelador) y travesaños TR_S (C 88×40×3) — reutiliza matriz/planos.
- **Guía de apoyo**: pletina 12 de canto + BAR CAP UHMW P101203‑30
  (enrollable, rollo 30 m, €6.96/m). **Guía lateral**: conical rail
  enrollable L 1¼ in P12501C (también cotizados T 1 in y T 40 mm).

## 2. Ejes (los dos únicos mecanizados de torno del proyecto)

Material: **barra cuadrada 1.5 in (38.1 mm) SAE 1045 calibrada**, muñones
torneados en las puntas a **Ø30 j6** (pedido del usuario: motorreductor de
eje hueco Ø30 montaje directo).

| | EJE MOTRIZ (LBP530‑EJ‑01) | EJE TENSOR (LBP530‑EJ‑02) |
|---|---|---|
| Cuadrado | 38.1 × 466 | 38.1 × 466 |
| Muñón lado libre | Ø30 j6 × 50 | Ø30 j6 × 50 |
| Muñón lado motriz | Ø30 j6 × 165 (rodamiento 50 + cubo Ø30 H7 × 110) | Ø30 j6 × 50 |
| Largo total | **681** | **566** |
| Chavetero | DIN 6885 A 8×7×90 (zona cubo), t1=4.0, 8 JS9 | — |
| Punta motriz | rosca M10×22 + arandela Ø40 (retención axial del reductor) | — |
| Detalles | gargantas 2.5×0.5 en transición cuadrado→Ø30; centros DIN 332‑A2.5; chaflanes 2×45°; concentricidad ≤0.05 TIR | ídem |
| Cantidad (4 líneas) | 8 | 8 |
| Corte de barra | 690 mm/u | 575 mm/u |

Ancho entre placas 470 (banda 457.2 + 2×6.4 de holgura: Δtérmica POM
0.110 mm/m·°C + 5 mm básica, manual Movex). Chumaceras **UCF206** (bore Ø30)
contra la cara exterior de las placas/mechas PL8.

Sprockets Movex de la cotización: **rueda MOLDEADA Z-32, PD 153.4 /
OD 154.8, ancho 40, bore CUADRADO 1.5 in con GRANO M8 — art. P158808YF,
€17.42**. Por eje motriz — RESUELTO con los diagramas de ambos documentos
(manual p.30 y brochure LBP p.11, que COINCIDEN):
- **530 LBP estándar (la banda cotizada P5324010018A): 5 sprockets**, en el
  grid VÁLIDO A·B·C·B·C·A = 76.2/63.35/89.05/63.35/89.05/76.2 → centrado:
  **−152.4 / −89.05 / 0 / +63.35 / +152.4**. Las demás posiciones están
  **PROHIBIDAS** (✗: caen bajo los carriles de rodillos — los dientes
  chocarían con los rodillos que asoman por la cara inferior). Poner 6 es
  físicamente imposible en la LBP estándar; **6 aplica al 530 PRO LBP**.
- **530 GT: 6 sprockets** (indent 38.1, paso 76.2) ✓.
Solo el sprocket central se fija (grano M8 + **collarines P21703Y**, 2 por
eje); el resto flota — manual Movex. Ruedas locas del tensor LBP en
posiciones válidas del grid (±152.4).

## 3. Cargas y verificación

Velocidad de diseño: v = 20 m/min → n = v/(π·PD) = 20000/(π·153.4) ≈ **41.5 rpm**.

Tiro de banda LBP 5 m (acumulación llena, producto 25 kg/m):

- Producto Wp = 125 kg; banda (9.0 kg/m², lazo 10.87 m × 0.457) ≈ 44.7 kg.
- Carry (µ LFA/UHMW = 0.20, tabla 2.9 del manual): (125+20.6)·9.81·0.20 ≈ 286 N
- Acumulación LBP (rodillos, **SUPUESTO** µ_acc = 0.10): 125·9.81·0.10 ≈ 123 N
- Retorno en rodillos (rodante, ~0.05): ≈ 12 N
- Nosebar de descarga (estático BluLub µ≈0.18, envoltura ~180°):
  factor e^(µπ) ≈ 1.76 sobre la suma → **T1 ≈ 0.80 kN**

Verificaciones:

| Ítem | Valor | Límite | Estado |
|---|---|---|---|
| Tracción de banda | 0.80 kN / 0.457 m ≈ 1.75 kN/m | 24 kN/m (Movex) × 50% diseño = 12 | **7 %** ✔ |
| Par en el eje motriz | T = 0.75 kN × 0.0767 ≈ **58 N·m** | motor 0.37 kW @41.5 rpm = 85 N·m | ✔ |
| Torsión muñón Ø30 | τ = 16T/πd³ ≈ 10.9 MPa | ~58 MPa adm. SAE 1045 | SF > 5 ✔ |
| Aplastamiento chavetero 8×7×90 | ≈ 10 MPa | ~90 MPa | ✔ |
| Deflexión eje (I=b⁴/12=1.76·10⁵ mm⁴, luz 546) | ≈ 0.06 mm | ≤ 2.5 mm (**SUPUESTO** industria; Movex no publica) | ✔ |
| Potencia | P = F·v ≈ 0.27 kW | motorreductor 0.37 kW | ✔ |

GT 0.8 m: tiro < 0.15 kN — el mismo eje y motor sobran (se unifica por
repuestos: **un solo modelo de motorreductor 0.37 kW, i≈35 (n₂≈42 rpm), eje
hueco Ø30 H7, con brazo de torque, para los 8 equipos**).

## 4. Planos emitidos

- `out/drawings/planos_ejes_lbp530.pdf` — 3 láminas ISO (EJ‑01 motriz acotado
  completo, EJ‑02 tensor, EJ‑03 corte de barras + lista de compra).
- `out/drawings/eje_motriz_lbp530_18.{dxf,pdf}` y `eje_tensor_…` — láminas S6
  (vistas 1er diedro + isométrica, DXF a escala real 1:1 para taller/CNC).
- 3D: `out/cad/cv_lbp_5000.glb`, `out/cad/cv_gt_800.glb` (conjuntos completos
  con banda representada según manual Movex), `out/cad/eje_*.glb` y
  `out/componentes/eje_*_lbp530_18.glb|stl` (biblioteca).

Fuente paramétrica: `cad/ensambles/gen_lbp530.mjs` (regenerar con
`node cad/ensambles/gen_lbp530.mjs`).

## 5. Pendientes / advertencias (no se ocultan)

1. RESUELTO: 530 LBP estándar = 5 sprockets/eje en el grid A·B·C·B·C·A
   (manual p.30 y brochure p.11 coinciden; 6 es solo PRO LBP). NUEVA
   advertencia: el nosebar cotizado **P22868 se describe "per 530 PRO LBP"**
   y la banda cotizada es LBP estándar — confirmar compatibilidad con Movex
   (Sylvain Dufour) antes de emitir la OC.
2. El chavetero y la rosca de punta NO están en las primitivas del catálogo
   de componentes (limitación caja/cilindro): están en los planos EJ‑01 y en
   el ensamble `gen_lbp530.mjs`.
3. µ de acumulación LBP (0.10) es supuesto conservador; Movex publica la
   contrapresión como "muy baja" sin valor numérico para 530 LBP estándar.
4. Verificar con calibre el eje hueco real del motorreductor comprado antes
   de tornear los 8 muñones motrices (j6 nominal).

## 6. Cotización MOVEX 26012937 (09‑07‑2026, EUR, EXW) — input/docs/

| Art. | Descripción | Cotizado | Necesario 4 líneas | €/u |
|---|---|---|---|---|
| P5324010018A | Banda 530 LBP 18 in LFA | 90.3 m | 43.5 m | 174.85/m |
| P5323010018A | Banda 530 GT 18 in LFA | 18 m | 10.2 m | 243.18/m |
| P158808YF | Rueda moldeada Z‑32 □1.5 in c/grano M8 | 152 | 60 | 17.42 |
| P21703Y | Collarín referencia 1.5×1.5 in | 60 | 32 | 2.32 |
| P22868 | Nosebar 530 LBP h19 c/rodamientos L6 in | 51 | 24 | 38.73 |
| P22862 | Transfer plate c/rodamientos h19 L6 in | 51 | 24 | 31.00 |
| P101203‑30 | Bar cap UHMW 17.53×19.05 (rollo 30 m) | 360 m | según obra | 6.96/m |
| P12201C/P12401C/P12501C | Conical rail T1"/T40/L1¼ | 156/105/105 m | según layout | 17.14/18.63/23.08/m |

Lo cotizado excede lo necesario de las 4 líneas (~2× en banda): repuesto o
futuras líneas — decisión comercial del usuario, se registra sin ocultar.
