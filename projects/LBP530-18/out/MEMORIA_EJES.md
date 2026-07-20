# MEMORIA DE CÁLCULO — EJES TRANSPORTADORES MOVEX 530 (proyecto LBP530-18)

Fecha: 2026-07-19 · Capa: `user` (diseño CAD paramétrico) · Datos del
fabricante: capa `web` citados en `input/web_facts.json` (brochure 530 LBP,
catálogo imperial, datasheet sprockets 525‑530 y Engineering Manual V2.0 de
Movex, movexii.com). Los valores marcados **SUPUESTO** no son datos Movex.

## 1. Alcance

4 líneas, cada una con:

| Equipo | Banda | Ancho | Largo nose-nose | Lazo de banda |
|---|---|---|---|---|
| CV‑LBP‑5000 | Movex **530 LBP** LFA (rodillos Ø12.2 POM) | 18 in (457.2) | 5000 mm | **10.79 m** |
| CV‑GT‑800 | Movex **530 GT** (friction top, goma 75 ShA) | 18 in (457.2) | 800 mm | **2.45 m** |

Arquitectura (pedido del usuario + manual Movex):
- **Nosebar en ambas puntas** (LBP: nosebar especial art. 22867/68; GT: art.
  22808/09, punta R9.5 BluLub).
- **Tracción abajo, extremo de descarga**: eje motriz a z=−400 del plano de
  banda, envoltura **135°** (Movex recomienda 140±10°); snub Ø63.5.
- Catenaria tras la motriz: sag 130 mm (rango Movex 50–150), largo ~750
  (rango 500–900). Retorno LBP por **zapatas** cada ~500; GT por rodillo Ø63.5.
- Eje tensor/deflexión abajo en el extremo de entrada (2 sprockets locos).

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

Sprockets Movex **Z24 partidos, PD 114.9 / OD 115.5, bore CUADRADO 1.5 in,
art. 158308YF** (datasheet 525‑530). Por eje motriz: LBP 5 (indent 76.2),
GT 6 (indent 38.1, paso 76.2) — manual pág. 30; **el brochure LBP dice 6/5
invertido: confirmar con Movex application engineering**. Solo el sprocket
central se fija (collarines); el resto flota (dilatación) — manual Movex.

## 3. Cargas y verificación

Velocidad de diseño: v = 20 m/min → n = v/(π·PD) = 20000/(π·114.9) ≈ **55 rpm**.

Tiro de banda LBP 5 m (acumulación llena, producto 25 kg/m):

- Producto Wp = 125 kg; banda (9.0 kg/m², lazo 10.79 m × 0.457) ≈ 44.4 kg.
- Carry (µ LFA/UHMW = 0.20, tabla 2.9 del manual): (125+20.6)·9.81·0.20 ≈ 286 N
- Acumulación LBP (rodillos, **SUPUESTO** µ_acc = 0.10): 125·9.81·0.10 ≈ 123 N
- Retorno en zapatas (0.20): ≈ 47 N
- Nosebar de descarga (estático BluLub µ≈0.18, envoltura ~180°):
  factor e^(µπ) ≈ 1.76 sobre la suma → **T1 ≈ 0.80 kN**

Verificaciones:

| Ítem | Valor | Límite | Estado |
|---|---|---|---|
| Tracción de banda | 0.80 kN / 0.457 m ≈ 1.75 kN/m | 24 kN/m (Movex) × 50% diseño = 12 | **7 %** ✔ |
| Par en el eje motriz | T = 0.75 kN × 0.0575 ≈ **43 N·m** | motor 0.37 kW @55 rpm = 64 N·m | ✔ |
| Torsión muñón Ø30 | τ = 16T/πd³ ≈ 8.1 MPa | ~58 MPa adm. SAE 1045 | SF > 7 ✔ |
| Aplastamiento chavetero 8×7×90 | ≈ 10 MPa | ~90 MPa | ✔ |
| Deflexión eje (I=b⁴/12=1.76·10⁵ mm⁴, luz 546) | ≈ 0.06 mm | ≤ 2.5 mm (**SUPUESTO** industria; Movex no publica) | ✔ |
| Potencia | P = F·v ≈ 0.27 kW | motorreductor 0.37 kW | ✔ |

GT 0.8 m: tiro < 0.15 kN — el mismo eje y motor sobran (se unifica por
repuestos: **un solo modelo de motorreductor 0.37 kW, i≈26 (n₂≈55 rpm), eje
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

1. **Confirmar con Movex** el nº de sprockets del 530 LBP 18 in (manual: 5;
   brochure: 6) y el artículo exacto del nosebar LBP (22867 K3 / 22868 K6).
2. El chavetero y la rosca de punta NO están en las primitivas del catálogo
   de componentes (limitación caja/cilindro): están en los planos EJ‑01 y en
   el ensamble `gen_lbp530.mjs`.
3. µ de acumulación LBP (0.10) es supuesto conservador; Movex publica la
   contrapresión como "muy baja" sin valor numérico para 530 LBP estándar.
4. Verificar con calibre el eje hueco real del motorreductor comprado antes
   de tornear los 8 muñones motrices (j6 nominal).
