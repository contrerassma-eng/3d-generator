# Módulo desviador Omniwheel (CV-OMW) — ejes perpendiculares con tangente común

Diseño del módulo desviador omnidireccional del `conveyone-simulator`
(`docs/omniwheel.md` de ese repo: CV-OMW, 24"×24", filas de avance +
filas transversales, motores UniDrive 60 W, correa síncrona interior)
resuelto como conjunto paramétrico `foto3d-cad`.

- Generador: `cad/ensambles/gen_omniwheel.mjs` → `cad/ensambles/omni_modulo.json`
- Componentes: `rueda_omni_70_doble` (rueda del usuario) y `rueda_omni_120_doble`
  (rueda mayor derivada), en `componentes/catalogo.json`
- Ensamble en biblioteca: `ens_omni_modulo` (se abre con 🔌 Comp. en el CAD)

## La rueda base (capa `user`, del snapshot del usuario)

Origen: `omniwheel10.snapshot.1.zip` (Autodesk Inventor: `Omni-Wheel.iam`,
`Base Wheel.iam`, `Roller assembly.iam` + piezas). Los `.ipt/.iam` son binarios;
del **caché gráfico OGS** de los `.iam` se midieron dos cotas exactas
(platos **Ø55.0**, rodillo barril **Ø20.0**) y el resto se derivó
geométricamente. Todo queda declarado `confianza: verificar` — medir con
calibre antes de fabricar.

| Cota | Valor | Procedencia |
|---|---|---|
| Platos/arañas | Ø55 × 3 | medido (caché OGS, exacto) |
| Rodillo (barril) | Ø20 máx × 18 | medido Ø / largo derivado |
| Radio de centros de rodillos | rc = 25 | derivado: rc = R − r_rodillo |
| **Rodadura** | **Ø70** (R35 = 25 + 10) | derivado |
| Rodillos por corona | 6 × 2 coronas, desfase 30° | foto + arco 2π·25/6 = 26.2 > 18 |
| Ancho total | 50 | 3 + 20 + 4 + 20 + 3 |
| Pasador de rodillo | Ø3 + rodamiento 719/3-2Z, remaches 3×6 | archivos del snapshot |
| Bore | Ø15 (adaptado al módulo; el original es hobby) | diseño |

Los rodillos reales son **abombados** (perfil torneado al radio de rodadura
para envolvente continua Ø70); en el catálogo se modelan como cilindros.

## La rueda mayor derivada (el truco del diseño)

Pedido: *crear otra rueda de mayor diámetro para tener ejes perpendiculares
con la misma tangente de transporte, sin interferencia de centros ni ejes.*

Si todas las ruedas tocan el plano de transporte `Z = TANG`, el centro de una
rueda de radio `R` queda en `z = TANG − R`. Usando **diámetros distintos por
familia**, los ejes quedan a **alturas distintas** y pueden cruzarse en planta:

```
ΔZ = R₂ − R₁  ≥  r_ejeA + r_ejeB + luz_mín
R₂ ≥ 35 + 7.5 + 7.5 + 5 = 55   →  se adopta R₂ = 60 (Ø120)
luz real en el cruce = 25 − 7.5 − 7.5 = 10 mm
```

| Cota | rueda_omni_120_doble |
|---|---|
| Rodadura | Ø120 (R60), centro 25 mm más bajo que la Ø70 |
| Rodillos | 2 coronas × 8, Ø26 máx × 28, desfase 22.5°, rc = 47 |
| Platos | Ø94 (envolvente mínima entre coronas 60·cos 22.5° = 55.4 > 47) |
| Ancho | 62 · bore Ø15, chaveta 5×5 (misma que la Ø70) |

## El módulo (24"×24", tangente Z=170)

- **Ejes A — AVANCE**: 4 ejes Ø15 **transversales** (Y) en X = ±76.2, ±228.6,
  z = 135, con 4 ruedas **Ø70** cada uno (Y = ±76.2, ±228.6) → 16 contactos 4×4.
- **Ejes B — EYECCIÓN**: 3 ejes Ø15 **longitudinales** (X) en Y = 0, ±152.4,
  z = 110, con 3 ruedas **Ø120** cada uno (X = 0, ±152.4) → 9 contactos 3×3.
- Retícula de contactos a **tresbolillo paso 6"** (contacto más próximo 107.8):
  cualquier caja ≥ 300×200 apoya siempre en ≥ 4 ruedas, todas a la misma tangente.
- 7 motores UniDrive 60 W 24 VDC (1 por eje) + 1 adicional de BOM, correa
  síncrona interior; fotocélula a 0.82·L para el modo `stop` (90°).

### Verificaciones (gates del generador — abortan si fallan)

`gen_omniwheel.mjs` calcula y exige `luz ≥ 5 mm` en todo par crítico:

| Verificación | Valor |
|---|---|
| Tangente común | zA+R1 = zB+R2 = 170 |
| Luz vertical entre ejes cruzados (12 cruces) | **10.0** |
| Eje A ↔ disco rueda Ø120 (axial X) | 37.7 |
| Eje B ↔ cara rueda Ø70 (axial Y) | 43.7 |
| Rueda Ø70 ↔ rueda Ø120 en planta (X) | 10.2 |
| Rueda Ø120 ↔ rueda Ø120 vecina | 32.4 |
| Rueda Ø120 ↔ bandeja de fondo | 10.0 |

## Cómo regenerar / ver

```bash
node cad/ensambles/gen_omniwheel.mjs                      # ensamble + gates
python pipeline/componentes_cli.py generar rueda_omni_70_doble   # GLB/STL
python pipeline/componentes_cli.py generar rueda_omni_120_doble
cd cad && python -m http.server 8080                      # 📂 Abrir omni_modulo.json
```
