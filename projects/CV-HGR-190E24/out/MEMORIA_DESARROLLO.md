# CV-HGR-190E24 — Memoria de desarrollo de chapa (expansión de material)

Kit colgante de techo para transportador **Hytrol 190-E24** — piezas RC-48V y
PD-48, según carpeta de traspaso CONVEYONE `CV-HGR-190E24-01 Rev. B` (en
`input/docs/Conveyone_Colgante_Hytrol_190E24.pdf`) con las modificaciones
**Rev. foto3d B-1** instruidas por el usuario el 2026-08-18.

| Parámetro | Valor |
|---|---|
| Material | Acero **ASTM A36**, chapa **4 mm**, corte láser (decisión usuario) |
| Cantidad | **12 × RC-48V** + **12 × PD-48** (decisión usuario) |
| Radio interior de plegado Ri | 4 mm (1×t, matriz estándar) |
| Factor K | 0.44 (típico acero al carbono a Ri=1×t) |
| Tolerancia general | ISO 2768-mK |

## 1. Método de cálculo

Desarrollo **analítico exacto** por puntos de tangencia (no copiado del
documento): cada tramo plano se mide entre las tangencias reales de los arcos
de plegado, y cada zona plegada aporta la longitud de la fibra neutra

```
BA = θ·(Ri + K·t)         (θ en radianes)
BA90 = (π/2)·(4 + 0.44·4) = 9.048 mm
BA45 = (π/4)·(4 + 0.44·4) = 4.524 mm
```

Bend deduction equivalente (contraste con el documento):

```
BD = 2·OSSB − BA          OSSB90 = Ri+t = 8       OSSB45 = tan(22.5°)·(Ri+t) = 3.314
BD90 = 6.952 mm  (doc: 6.952 ✓)                   BD45 = 2.104 mm  (doc: 2.104 ✓)
```

## 2. RC-48V — retenedor asiento en V (5 pliegues: 90·45·90·45·90)

Desarrollo del perfil (x medido desde el borde de la oreja 1):

| Tramo | Largo plano (mm) | Zona plegada | Eje del pliegue en x (mm) | Ángulo · sentido |
|---|---|---|---|---|
| Oreja 1 | 29.000 | BA 9.048 | **P1 = 33.524** | 90° ABAJO |
| Ala 1 | 21.843 | BA 4.524 | **P2 = 62.153** | 45° ARRIBA |
| Flanco 1 | 31.113 | BA 9.048 | **P3 = 100.051** (ápice) | 90° ARRIBA |
| Flanco 2 | 31.113 | BA 4.524 | **P4 = 137.950** | 45° ARRIBA |
| Ala 2 | 21.843 | BA 9.048 | **P5 = 166.579** | 90° ABAJO |
| Oreja 2 | 29.000 | — | — | — |

**Desarrollo total = 200.103 mm × 30 mm** (documento: 200.11 — Δ 0.007 mm,
redondeo). Sentidos con la cara del asiento (interior) hacia arriba;
secuencia sugerida: P3 (ápice) → P2·P4 → P1·P5.

Cortes en el desarrollo (y = 15, centro de la platina):

| Corte | Posición x (mm) | Dimensión |
|---|---|---|
| Coliso perno oreja 1 | 15.000 | 11 × 16 (ajuste ±2.5) |
| Barreno prisionero (flanco 1, centrado) | 79.971 | Ø 8.5 — roscar M10 en armado |
| Coliso perno oreja 2 | 185.103 | 11 × 16 (ajuste ±2.5) |

Extremos de la platina **semicirculares R15** centrados en los colisos
(el agujero queda exactamente a ancho/2 = 15 mm del borde, por lo que el
radio completo pasa por el centro del coliso).

### Contraste contra el documento Rev. B

- Desarrollo total: **200.103 vs 200.11 ✓** (tol. 0.05).
- Ejes interiores P2/P3/P4: **62.15 / 100.05 / 137.95 ✓** — idénticos al doc.
- BD90/BD45: **✓** idénticos.
- **Observación (no conformidad menor del doc):** las "líneas de plegado" de
  las orejas que el documento sitúa en 29.52 y 170.59 mm siguen la convención
  de línea de molde con reparto BD/2; el **eje real** del pliegue queda en
  33.52 y 166.58 mm (Δ = 4.0 mm = Ri) porque los pliegues de oreja alternan
  de mano respecto a los de la V. Los DXF/PDF emitidos marcan tangentes y
  eje verdadero; plegando contra el eje marcado la pieza sale correcta.
- El agujero del doc para el prisionero cae en x=81.1 con su convención;
  el centro real del flanco plano es x=79.97 (diferencia 1.1 mm, sin efecto
  funcional en un prisionero M10). Se emitió centrado en el flanco.

### Verificaciones funcionales (geometría formada)

- Ancho exterior total 126 mm · alto exterior 59.84 mm (ápice bajo el ala).
- Cañería Ø48.3 asentada en la V: interferencia de apriete **0.8 mm** sobre
  el plano de las orejas ✓ (idéntico al documento).
- Holgura lateral cañería–ala 1.85 mm por lado ✓.

## 3. PD-48 — placa distribuidora (plana, sin pliegues)

Rev. B-1 (instrucción usuario): **largo 130 mm** (antes 116), extremos
**semicirculares R17** centrados en los agujeros, y agujeros como **colisos
11 × 16** (antes Ø11). Separación entre ejes **96 mm sin cambio**; los
colisos quedan a 17 mm de cada borde (= ancho/2 ✓ radio completo).

| Ítem | Valor |
|---|---|
| Contorno | 130 × 34 × 4 mm, extremos R17 |
| Colisos | 2 × (11×16) en x = 17 y 113, y = 17 |

## 4. Ajustabilidad (motivo de la Rev. B-1)

La medida final en terreno no se conoce con precisión (ala real del canal,
agujeros existentes del bastidor, calibración del plegado por factor K).
Los colisos 11×16 en ambas piezas dan **±2.5 mm** de ajuste por perno en la
dirección del eje del canal, y el asiento en V ya absorbe verticalmente el
error de desarrollo (los pernos aprietan la tercera línea de contacto).
El factor K=0.44 sigue siendo estimación: plegar una probeta antes de la
serie (recomendación del documento, vigente).

## 5. Consumo de material y masas (A36, 7850 kg/m³)

| Pieza | Neto por pieza | Masa c/u | ×12 |
|---|---|---|---|
| RC-48V (desarrollo 200.1×30, e4) | ≈ 5 443 mm² | 0.171 kg | 2.05 kg |
| PD-48 (130×34 R17, e4) | ≈ 3 872 mm² | 0.122 kg | 1.46 kg |

Nesting sugerido (emitido en `out/drawings/KIT_hgr190e24_x12.dxf`, capas
CORTE / PLEGADO / TEXTO, separación 6 mm): envolvente ≈ **420 × 406 mm**
para el kit completo de 24 piezas — cabe con margen en un retazo de
500 × 500 × 4.

## 6. Archivos emitidos (`out/drawings/`)

| Archivo | Contenido |
|---|---|
| `planos_fabricacion_hgr190e24.pdf` | Carpeta completa: vistas formadas + desarrollos (4 láminas) |
| `rc48v.pdf` / `rc48v.dxf` | RC-48V vistas primer diedro + isométrica (S6, A3 1:1, escala certificada G6) |
| `HGD-02_RC-48V_desarrollo.pdf` | RC-48V sección de plegado (perfil formado 1:1 con cañería de referencia y sentido de cada pliegue) + desarrollo acotado |
| `HGD-02_RC_48V_retenedor_asiento_en_V.dxf` | RC-48V desarrollo 1:1 para láser (VISIBLE=corte, PLIEGUE=ejes, cajetín ISO) |
| `pd48.pdf` / `pd48.dxf` | PD-48 vistas (S6, A3 1:1) |
| `HGD-01_PD-48_desarrollo.pdf` | PD-48 lámina de desarrollo |
| `HGD-01_PD_48_placa_distribuidora.dxf` | PD-48 desarrollo 1:1 para láser |
| `KIT_hgr190e24_x12.dxf` | Nesting de las 24 piezas (12+12) listo para cotizar/cortar |
| `corte_hgr190e24.csv` · `agujeros_hgr190e24.csv` | Resumen de corte por pieza y tabla de barrenos circulares |

Los sólidos paramétricos están en `out/cad/rc48v.glb` y `out/cad/pd48.glb`
(capa `user`); el generador reproducible es `cad/ensambles/gen_hgr190e24.mjs`
(aborta si su desarrollo no coincide con el documento de traspaso) y las
láminas salen de `cad/ensambles/planos_hgr190e24.mjs` + `pipeline/s6_drawings.py`.
