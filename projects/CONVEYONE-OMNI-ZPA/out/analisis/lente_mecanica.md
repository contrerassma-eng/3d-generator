# Lente mecánica — Auditoría de REV B y reconciliación con el Bloque OMNI v4 del repo

Proyecto Conveyone (Chile), ingeniero: Sergio Contreras. Fecha: 2026-09-03.
Capas: `user` (handoff, REV B, prompts, documentos del repo), `web` (research_*.md, con URL y fecha 2026-09-03), `calculo` (fórmulas explícitas; script `wf/calc_lente_mecanica_v2.py`, salida en `wf/calc_lente_mecanica_v2.out`). Todo dato que no tenga fuente se marca **A VERIFICAR**.

---

## 1. Conclusiones (10 líneas)

1. REV B y el Bloque OMNI v4 son **la misma arquitectura** (8 ejes hex 1/2 in con puntas Ø12, familias A/B alternadas, 4 ruedas/eje, 1 motor por familia, caja tipo Flowsort en el hueco de una zona) con **seis parámetros en conflicto**: paso (76,2 vs 74,75), largo (609,6 vs 598), rueda (Ø50 china hex 14 vs v7 Ø64 impresa hex 14,5), rodamiento (6001-2RS vs F6801ZZ), transmisión (HTD 5M 28T en 3 planos vs Poly-V PJ serpentín en 2 planos) y motor (NEMA 23 vs UniDrive 24 V). Se pueden reconciliar en **un solo CAD paramétrico** sin cambiar la filosofía de ninguno.
2. **Incompatibilidad geométrica dura de REV B**: con rueda Ø50 y polea 28T (brida Ø48) el dorso de la correa queda **0,5 mm sobre el plano de rodadura (115,1)**; no cabe tapa ni guarda bajo el plano. Con Ø64 (eje a 83,1) sobran 6,5–12,9 mm. Por eso v4 funciona y REV B, tal como está, no [A7].
3. **REV B no cabe en una zona del ZP2026**: 24 in = 609,6 > 598 mm (+11,6). Con paso 74,75 u 76,2 el lecho sí cabe (luz rueda–rodillo vecino 24,8 / 19,7 mm); la longitud del módulo debe congelarse en **598** [A5][A6].
4. **Apilado axial**: las 3 poleas/familia de REV B (6 planos de 22,5 mm si ambas familias van al mismo lado) suman ≈168 mm > 133,6 mm de zona muerta: **no cabe**. Un serpentín de una correa por familia (HTD o Poly-V) ocupa 51–67 mm y cabe [A12].
5. **Tracción**: el lecho mecanum sólo puede frenar/acelerar la caja con a_max = μ·g/√2 − μr·g (1,8–3,2 m/s² para μ 0,3–0,5), √2 menor que un lecho de rodillos. A **1,5 m/s la parada dentro de la zona (598) falla si μ < 0,35**; a **1,0 m/s** cabe con μ = 0,3 (300 mm). FISICA_PRIMEROS_PRINCIPIOS sobreestima a_max ×1,45 y REV B sobreestima el par de contacto ×1,41 (conservador) [A9][A10][A11].
6. Par en el motor: caja 5 kg a 2 m/s² + inercia de 16 ruedas = **0,22–0,30 N·m** por familia; inversión ±1,5 m/s en 0,3 s añade 0,28–0,57 N·m de inercia. El criterio REV B "≥0,6 N·m a 573 rpm" sigue siendo válido como envolvente, pero el **par de inversión**, no la caja, es lo que dimensiona [A13][A14].
7. **Rueda**: no existe mecanum comercial Ø50–65 con cubo hex 14 ni 1/2 in en las fuentes revisadas (research_tribologia §2.4). El adaptador hex 14→1/2 in tiene paredes de 0,65–0,83 mm: **eliminarlo** haciendo el barreno de la rueda v7 directamente hex 12,7 (+0,15) [A16][A17].
8. **Rodamiento**: 6001-2RS (C ≈ 5,1–5,4 kN) da L10 > 200 000 h; F6801 (C A VERIFICAR ≈ 1,9 kN) da ≈13 000 h con 250 N. Ambos sirven; el 6001 es obligatorio si el eje del motor descarga dos correas sobre un eje central (200 N) [A18].
9. Separadores de PVC 3/4 in SCH40 sobre el hex (ID 20,9 vs vértices 14,66): excéntricos hasta 3,1 mm, no centran, no fijan cota axial con precisión (tolerancia acumulada ±2 mm sobre 4 ruedas) → **sustituir por separadores con barreno hexagonal** (impresos PA-CF o mecanizados) [A19].
10. **Decisión mecánica recomendada**: adoptar la caja v4 (placas 4 mm + travesaños + colisas + tapa con ventanas + tapa ciega), rueda v7 Ø64 con barreno hex 12,7, paso 74,75, 598 mm, serpentín de **una correa HTD 5M por familia** (poleas ≤ 24T) con tensor, NEMA 23 sobre placa ranurada con eje intermedio o carga radial verificada, 6001-2RS en el lado de transmisión, +0…+3 mm de sobreelevación por colisa, **v = 1,0 m/s como velocidad de diseño de acumulación** y 1,5 m/s como objetivo condicionado al ensayo de μ [A24].

---

## 2. Análisis

### 2.1 Qué dice cada fuente (capa `user`)

| Parámetro | REV B (MEMORIA_REV_B.txt) | Bloque OMNI v4 (BLOQUE_OMNI_v4_INTERPRETACION_FLOWSORT.md) | Handoff §2 |
|---|---|---|---|
| Ejes / paso | 8 ejes a 76,2 mm; largo útil 24 in = 609,6 | 8 ejes a **74,75** (posiciones exactas de los rodillos retirados); largo = zona **598** | 8 ejes, 76,2 mm, 609,6 mm |
| Familias | A impares / B pares, 4 ejes por motor | pares = derechos, impares = izquierdos | idem |
| Ruedas | Ø50 china, hex 14, 4/eje a 100 mm (50/150/250/350) en 400 activos | **v7 Ø64 × 36,6** impresa PA-CF, hex 14,5, 4/eje a paso **78** (y = −39/39/117/195), cargadas a un lado | Ø50, 4/eje, 400 activos, "ancho axial real y cubo A VERIFICAR" |
| Eje | hex 1/2 in AF, puntas torneadas Ø12 | hex 1/2 in (vértices 14,66), rebaje Ø12 × 10 | idem |
| Rodamiento | 6001-2RS 12×28×8, asiento en placa | **F6801ZZ** 12×21×5 brida Ø23,2 embutido en riel 4 mm | 6001-2RS |
| Transmisión | HTD 5M 28T/28T 1:1, 355 + 445-5M-09, poleas fuera del rodamiento, 3 planos axiales | **Poly-V PJ**, poleas dobles Ø40×20, motor→2 centrales, centrales→extremos, 4 planos en 40 mm, motor en placa 8 mm con colisas | HTD 5M 28T |
| Motor | 2× NEMA 23 (≥0,6 N·m a 573 rpm), bus 48 V | **2× UniDrive 24 V** reales del ZP2026 | NEMA 23 prototipo |
| Ancho | 400 activos + 133,4 relleno pasivo hasta 21 in | 4 filas + transmisión en y −160…+220; zona muerta −266,8…−160 libre (106,8) | 400 + 533,4 |
| Estructura | placa lateral con alojamiento de rodamiento | caja Flowsort: 2 placas 594×4, travesaños pletina 50×6 en pestañas inferiores (z −82,6), colisas 9×25, tapa e3 a 107,1–110,1 con 32–48 ventanas, tapa ciega 2 paneles | guarda lateral desmontable |
| Nivel | no tratado | rodadura 115,1 exacta + colisa para +2 Flowsort | — |
| Velocidad | 1,5 m/s → 572,96 rpm | (UniDrive: 350/700 rpm máx según ficha [web]) | 1,5 m/s; prompt: "por lo menos 1 m/s" |

Fuentes `user`: MEMORIA_REV_B.txt págs. 1–8; BLOQUE_OMNI_v4_INTERPRETACION_FLOWSORT.md (v3, v3.2, v4, v4.1); BLOQUE_OMNI_v1.md (cotas medidas del ZP2026: paso 74,75, interior 533,6, plano 115,1, LT_G 190,5 alto / tope 108 / pestaña inferior −82,6, TR_S x = ±280,2 tope 14,1); MECANUM64V7.md; HANDOFF §2, §17.

Nota: el ZP2026 real mide **533,6** entre largueros (medido en GLB) y no 533,4 (21 in): diferencia 0,2 mm, irrelevante pero conviene usar la cota medida.

### 2.2 Geometría del lecho en el hueco de una zona del ZP2026

```
paso 76,2 : 7p = 533,40 ; eje1 a 32,30 del borde de zona ; eje1–rodillo vecino 69,68 ; luz Ø50/Ø50 19,7 ; Ø64/Ø50 12,7
paso 74,75: 7p = 523,25 ; eje1 a 37,38 ; eje1–rodillo vecino 74,75 ; luz Ø50/Ø50 24,8 ; Ø64/Ø50 17,8
REV B 24 in = 609,6 vs zona 598 → sobra 11,6 mm
luz entre envolventes de ruedas vecinas: Ø50 → 24,75 (74,75) / 26,2 (76,2) ; Ø64 → 10,75 / 12,2
```
(cálculo §2 del script; zona 598 y rodillo vecino a 37,375 del borde: BLOQUE_OMNI_v1.md, capa `user`).

- El módulo **debe medir 598** para reemplazar exactamente una zona; los 609,6 de REV B provienen de "dos pies útiles" del prompt 1 y no del ZP2026. Con 598 caben ambos pasos; el 74,75 tiene la ventaja de dejar el primer/último eje exactamente donde estaba el rodillo retirado (transición uniforme rodillo→rueda→rodillo, paso constante para la caja) y de reutilizar el patrón de sensores/soportes de la zona. El 76,2 sólo aporta el entrecentro 152,4 de la correa 445-5M; con 74,75 la 440-5M da C = 150,0 (+0,5 mm) — misma familia de correa.
- Luz entre ruedas Ø64 vecinas (10,75 mm) es suficiente pero obliga a que las ventanas de la tapa dejen material entre ejes (v4 verificó 28,4 mm en X con 6 ruedas; con 4 ruedas hay más).
- Ejes bajo la caja (paso 74,75): 500 mm → 6–7 ejes (reparto A/B 4:3 ó 3:3); 300 mm → 4–5 (3:2 ó 2:2); 250 mm → 3–4 (2:2 ó 2:1). La regla industrial "≥3 rodillos bajo el bulto" (Interroll, Rulmeca — research_tribologia §3 #24–26) se cumple justo para 250 mm.

### 2.3 Alturas: el conflicto rueda Ø50 / polea Ø48 / tapa

```
Ø50: eje z = 90,1 ; polea 28T (Dp 44,56) → dorso de correa a z ≈ 115,6 (+3,2 sobre línea primitiva) → 0,5 mm SOBRE el plano 115,1
Ø50 + polea 24T → 2,7 mm bajo el plano ; Ø50 + 20T → 5,9 mm ; Ø64 + 28T → 6,5 mm ; Ø64 + Ø40 (PJ) → v4: tapa 107,1–110,1 verificada
```
(script §3; espesor HTD 5M 3,8 mm y línea primitiva 0,57 mm: supuesto de catálogo, A VERIFICAR con la correa comprada).

Consecuencias:
- REV B ubica las poleas "fuera del rodamiento", en la zona muerta, con dorso de correa al nivel del plano de rodadura. Cualquier guarda o tapa sobre ellas queda **por encima** del plano de transporte, formando un escalón lateral de ≥5 mm en los 133 mm de "relleno pasivo". Eso contradice la idea de relleno como "mesa muerta o rodillos pasivos" a nivel (REV B §5) y crea un borde contra el que puede chocar una caja que derive.
- Con Ø64 (v7) el eje baja 7 mm y todo el tren cabe bajo una tapa de 3 mm con 3,1–6,5 mm de holgura (v4: "riel a z = 104, bajo la tapa 107,1 con 3,1 de holgura").
- Si se insiste en Ø50, las poleas deben ser ≤ 20T HTD 5M (Dp 31,8) o Poly-V Ø≤32: la tensión efectiva sube ×1,4 (Te = 50 N para 0,8 N·m) y las cargas radiales también.

Larguero LT_G: tope a 108 → la tapa v4 (107,1–110,1) queda 2,1 sobre el larguero y 5 bajo el plano; el ZP2026 lleva sus rodillos 7,1 mm sobre el larguero, así que una tapa a 110,1 no restringe más que el bastidor existente.

### 2.4 Esfuerzos de contacto, tracción y parada (verificación de REV B y de FISICA_PRIMEROS_PRINCIPIOS)

**Cinemática de la mecanum a 45°** (cálculo): la rueda sólo ejerce fuerza sobre la caja a lo largo del eje del rodillo `u = (cos45, sin45)`; por balance de potencia `T·ω = F_fam·(v_caja·u)` con `v_caja·u = ω·r·cos45` ⇒ **T = F_fam·r·cos45 = F_req·r/2**. REV B usa `T = F_fam·r` (sin el cos45): **sobreestima ×√2**. Resultado: 5 kg a 2 m/s² → 0,143 N·m/familia (Ø50) / 0,184 (Ø64) en vez de 0,203. Es conservador; se mantiene como envolvente pero se anota.

| m (kg) | a (m/s²) | F_req = m·a + μr·m·g (N) | F_fam = F_req/√2 (N) | T REV B (N·m) | T física Ø50 | T física Ø64 | μ_req = F_fam/(W/2) |
|---|---|---|---|---|---|---|---|
| 5 | 1 | 6,47 | 4,58 | 0,114 | 0,081 | 0,104 | 0,19 |
| 5 | 2 | 11,47 | 8,11 | 0,203 | 0,143 | 0,184 | 0,33 |
| 5 | 3 | 16,47 | 11,65 | 0,291 | 0,206 | 0,264 | 0,48 |
| 2,5 | 2 | 5,74 | 4,06 | 0,101 | 0,072 | 0,092 | 0,33 |
| 0,5 | 2 | 1,15 | 0,81 | 0,020 | 0,014 | 0,018 | 0,33 |

(μr = 0,03 según REV B; Rulmeca da 0,06–0,08 de rodadura para cartón: research_tribologia §3 #1 → μr de REV B es optimista ×2, pero el término es pequeño.)

**Tracción**: cada familia carga W/2 y su fuerza va a 45°: `F_fam ≤ μ·W/2` ⇒ **a_max = μ·g/√2 − μr·g**.

| μ | a_max (m/s²) | FISICA decía (μ−μr)·g | s_parada 1,5 m/s | s_parada 1,0 m/s | s + 20 ms latencia a 1,5 | a 1,0 |
|---|---|---|---|---|---|---|
| 0,3 | 1,79 | 2,65 (×1,48) | 630 mm | 280 mm | **660 > 598** | 300 OK |
| 0,4 | 2,48 | 3,63 | 454 | 202 | 484 OK | 222 OK |
| 0,5 | 3,17 | 4,61 | 354 | 158 | 384 OK | 178 OK |

- μ PU/goma–cartón corrugado **no existe en fuente primaria** (research_tribologia §1, §4): rango defendible 0,3–0,5; hay que **medirlo** (plano inclinado TAPPI T815) con los rodillos reales del v7 y cartón seco/húmedo. Es el parámetro que gobierna la velocidad admisible del módulo.
- El lecho de rodillos ZP2026 no tiene la penalización √2 (frena con μ·g). La zona Omni es, por construcción, la **zona con menor capacidad de frenado de la línea**; el sensor de zona debe colocarse más atrás que en las zonas normales (ZoneLogix PRO: "heavier loads at higher speeds require greater distance to stop", research_tribologia #67).
- Con "por lo menos 1 m/s" (prompt 1) el lecho para en 300 mm incluso con μ = 0,3; con 1,5 m/s (REV B) requiere μ ≥ 0,35 medido. De aquí la recomendación de 1,0 m/s como velocidad de diseño y 1,5 como objetivo condicionado.

**Guiñada/deriva** (FORWARD con reparto A/B desigual, script §6): 500 mm con 4A+3B → fuerza lateral parásita 14 % de la de avance; 250–300 mm con 2A+1B → 33 %. Momento de guiñada con centroides A/B desfasados un paso: 0,24–0,43 N·m sobre I = 0,142 kg·m² → cota superior de giro 49–110° durante la aceleración si nada lo impide (los rodillos pasivos y la fricción lo amortiguan; la literatura confirma que con 2 motores la guiñada no es controlable: Keek 2021, BIBA EP2874923B1 — research_diverters §3 #41, #64). Mitigaciones mecánicas: guía lateral fija en el lado muerto (a nivel de tapa ciega), paso menor, o aceptar y medir en prototipo. FISICA ya lo señalaba; se confirma.

**Desvío a 90°** (script §15): recorrido ≈ (ancho lecho + ancho caja)/2 + 50 → 0,8–0,9 s con a = 2 m/s² y v_lat 1,0; con a = 1 m/s² 1,26 s. Si el desvío es hacia el lado de la zona muerta, la caja debe cruzar 133 mm en rodadura libre (decel. μr·g ≈ 0,3–0,8 m/s²): factible pero indeseable → **desviar hacia el lado donde las ruedas llegan al larguero** (v4: borde de rueda 213,3 vs cara interior 266,8: 53 mm de rodamiento+riel; REV B: 0 mm si las poleas están en el lado muerto). Tiempo de referencia industrial: Interroll HPD 0,3 s/90° de giro, F-RAT ciclo 1,10 s (research_diverters §3 #21, #31).

### 2.5 Inercia reflejada y par en el motor (1:1)

```
J_fam = 16·m_w·k² + 4·½·m_eje·r² + n_pol·½·m_pol·r_pol² + J_rotor   (m_eje = 0,614 kg para L = 560 hex 1/2 in)
Ø50 0,10 kg k=20 [REV B]      : J_fam = 9,6e-4 kg·m² → a=2: T_in 0,077 + T_caja 0,143 = 0,22 N·m ; inversión ±1,5 m/s en 0,3 s: 0,39 N·m
v7 Ø64 0,08 kg k=24 [A VERIF] : J_fam = 8,9e-4        → a=2: 0,056 + 0,184 = 0,24 N·m        ; inversión 0,3 s: 0,28 ; 0,5 s: 0,17
Ø64 0,15 kg k=26 (peor caso)  : J_fam = 1,8e-3        → a=2: 0,113 + 0,184 = 0,30 N·m        ; inversión 0,3 s: 0,57 ; 0,5 s: 0,34
E_cin rotacional por familia a 1,5 m/s: 1,0–2,0 J ; caja 5 kg: 5,6 J (se disipa en el driver/bus en cada frenado: relevante para el chopper a 48 V, research_motores §2e)
```
- REV B "0,04–0,06 N·m de inercia a 2 m/s²" es coherente (0,056–0,077).
- Lo que dimensiona el motor no es la caja sino la **inversión** en DIVERT (una familia pasa de +v a −v): 0,3–0,6 N·m sólo de inercia a 1,5 m/s en 0,3 s. A 1,0 m/s baja a 0,19–0,38. El criterio REV B "≥0,6 N·m a 573 rpm, ideal ≥0,8" cubre el caso con rueda ligera; con rueda de 150 g y 0,3 s no. La curva del 23HS45 no está publicada sobre 420 rpm; clase 2–3 N·m da 1,1–1,5 N·m de pull-out a 573 rpm (research_motores §1): margen 1,4–1,9× sobre 0,8 — suficiente para prototipo, no certificable.
- Masa real de la rueda v7: 26,5 g por cuerpo (53,0 g por par de ruedas, MECANUM64V7.md) **más 6 rodillos + 6 pasadores**: A VERIFICAR con balanza (rodillos "los suyos", material no declarado).

### 2.6 Transmisión: HTD 3 planos (REV B) vs Poly-V serpentín (v4) vs o-rings (ZP2026/BF21)

**Apilado axial** (script §11; zona muerta = 533,6 − ancho activo):

| Esquema | Planos | Apilado ≈ (mm) | 400 activos (133,6) | 350 (183,6) |
|---|---|---|---|---|
| HTD 28-5M-09 catálogo (L 22,5) 3 planos/fam, ambas familias al mismo lado (REV B literal) | 6 | 168 | **NO CABE** | cabe |
| HTD 3 planos/fam, familias en lados opuestos | 3 por lado | 92 | cabe, pero **ambos lados** pierden ≥92 mm de rueda | — |
| HTD lazo de 3 poleas (motor + 2 centrales) + 445/440 a extremos, poleas recortadas a 15 | 4 | 87 | cabe | cabe |
| **HTD serpentín 1 correa/familia + tensores** | 2 | 51 | cabe | cabe |
| Poly-V PJ doble Ø40×20 (v4) | 4 × 10 | 67 | cabe (v4 verificado) | cabe |

**Comportamiento ante inversiones frecuentes** (cada DIVERT = 2 inversiones de una familia; 25 arranques/min es el límite que publica UniDrive/ZoneLogix para MDR — research_tribologia #71/#73):

| Criterio | HTD 5M (síncrona) | Poly-V PJ (fricción, serpentín v4) | O-rings PU (ZP2026 / BF21) |
|---|---|---|---|
| Deslizamiento en inversión | ninguno (positiva); backlash de diente ~0 | posible en el pico de par si Ti es baja; requiere Ti ≥ Te·SF en el ramal flojo | probable; par transmisible no documentado ("validar deslizamiento o duplicar anillos", TRANSFER-BF21) |
| Tensión y carga radial (0,8 N·m) | Te 36 N (28T) / 50 N (20T); Fr ≈ 2·Ti = 72–131 N por correa | Te 40 N (Ø40); F1+F2 ≈ 66 N con abrazo 90° (μ' 0,88 supuesto) → 130 N con SF 2 | pretensión 10–12 % elástica, sin tensor; Fr no calculable sin ficha |
| Vida en inversiones | fatiga de diente; a 573 rpm = 267 Hz de engrane; correas 5M 9 mm admiten 208 N [web Reichelt] → 17–27 % | desgaste de nervios en cada patinaje; retensado periódico | estiramiento permanente; cambio periódico |
| Alineación | exige coplanaridad ≤ ~0,5 mm y paralelismo (bridas); 3 planos = 3 tolerancias | tolera desalineación; 1 plano por correa | muy tolerante |
| Ruido | silbido de engrane (267 Hz a 1,5 m/s; 209 Hz con Ø64) | bajo | bajo |
| Mantenimiento | sin retensado (bajo estiramiento); acceso por tapa ciega v4 | tensor; retensado | recambio |
| Sincronismo entre ejes | exacto | pequeñas derivas (aceptables para el lecho: la caja promedia) | derivas |
| Disponibilidad Chile | 28T/355/445-5M-09: "confirmar stock" (REV B §6); Poly-V PJ sí (CP Goma, Transmifuerza — digest anexo) | PJ y PK en stock local | sí |

Juicio: la inversión frecuente y la ausencia de retensado favorecen **HTD en serpentín de un plano por familia** (correa con dientes hacia las poleas de eje, abrazándolas por abajo, con tensores lisos sobre el dorso entre ejes, motor abajo). Poly-V (v4) es la alternativa válida si se prefiere silencio y stock local, con Ti verificada por cálculo y tensor. O-rings quedan descartados para el tren motriz de 4 ejes en serie con inversión.

**Motor REV B con dos correas 355**: el eje del NEMA 23 recibe 2 poleas apiladas (2 planos) y ≈100 N resultantes a ~25 mm de la brida; la carga radial admisible del NEMA 23 **no aparece en las fichas descargadas (A VERIFICAR; típicamente decenas de N a 20 mm)**. Con serpentín hay una sola polea (≈70–90 N a ~15 mm). Si la ficha no lo cubre: eje intermedio con dos rodamientos y acoplamiento al motor, o motor con salida soportada (BLDC con reductor, UniDrive CORE — research_motores §2c/§2d).

**Abrazo** (lazo de 3 poleas motor + 2 centrales): con h = 77,3 el motor abraza 92° = 7,1 dientes; con h = 120 → 116° = 9 dientes (mínimo usual 6, A VERIFICAR en catálogo Gates). En serpentín el abrazo de cada polea de eje depende de la posición del tensor: gate ≥ 6 dientes.

**Correas**: paso 74,75 → misma familia 149,5 → 440-5M (C = 150,0, +0,5) o 445-5M (+3,0, absorbido por tensor). Motor centrado a 355-5M → h = 77,26 (76,2: 75,83).

### 2.7 Eje, hombro Ø12, rodamiento, separadores, adaptadores

- **Hombro Ø12**: σ = 32M/(πd³): 100 N a 15 mm → 8,8 MPa (REV B, verificado); 200 N a 25 mm (polea más alejada por apilado) → 29,5 MPa; con Kt ≈ 2,1 → 62 MPa. Se ≈ 0,5·Su·ka·kb ≈ 183 MPa (Su = 440 MPa, acero trefilado SAE 1020 **A VERIFICAR con certificado de la barra**) → **SF fatiga ≈ 3,0** en el peor caso, > 5 con 15 mm. Vida infinita (34 380 ciclos/h). Condiciones: radio de acuerdo ≥ 0,5 mm en el hombro, tornear las puntas **concéntricas al hexágono** (los vértices 14,66 pasan a Ø12: se quitan 2,66 en vértice y 0,70 en cara — el asiento nace en la barra, no en un casquillo).
- Torsión: 2,4 MPa en Ø12; giro del hex 0,1° en 0,5 m: despreciable. Velocidad crítica (apoyado-apoyado, 560 mm, 4 ruedas): 3600–3950 rpm → ratio 0,15: sin problema.
- **6001-2RS vs F6801**: L10 = (C/P)³: 6001 (C 5,1–5,4 kN) → > 200 000 h con 250 N; F6801 (C ≈ 1,9 kN **A VERIFICAR**) → ≈13 000 h con 250 N, 200 000 h con 100 N. El F6801 embutido en placa de 4 mm (v4) es más barato y compatible con corte láser; el 6001 requiere placa ≥ 6–8 mm o cajera. Recomendación: 6001-2RS en el **lado de transmisión** (recibe correa + peso), F6801-2RS o 6001 en el lado libre; 2RS (sellado) preferible a ZZ por polvo de cartón.
- **Separadores PVC** (REV B y v4): ID 20,9 sobre vértices 14,66 → excentricidad hasta 3,1 mm; masa desbalanceada pequeña (0,27 N a 573 rpm por tramo de 40 mm) pero golpeteo/ruido y **cota axial imprecisa** (corte ±0,5 mm × 5 tramos). Sustituir por separadores con barreno hexagonal (PA-CF impreso, como los bujes v4, o tubo mecanizado) y fijar la posición axial de la polea con collar sobre el Ø12 referido al rodamiento, no a la pila de separadores.
- **Adaptador hex 14 → 1/2 in**: pared 0,65 mm (14/12,7) ó 0,78–0,83 (v4: 14,4/12,85; v7: 14,5/12,85). Inviable en metal, frágil impreso. La rueda v7 es paramétrica: **barreno hex 12,85 directo** elimina 32 piezas. Si se compra rueda china hex 14 (modelo no identificado en ninguna fuente), habría que pasar a barra hex 14 (disponibilidad Chile A VERIFICAR).

### 2.8 Rueda: china Ø50 hex 14 vs v7 Ø64 impresa vs compra industrial

| Opción | Datos | Carga declarada | Compatibilidad con 8 ejes / 598 | Fuente |
|---|---|---|---|---|
| China Ø50 hex 14 (REV B) | modelo, ancho, masa, dureza: desconocidos | ninguna | sí (eje a 90,1) pero **tapa imposible con polea ≥ 24T** | research_tribologia §2.4: "NO ENCONTRADO en mecanum Ø50–65 con hex 14 / 1/2 in" |
| Hobby Ø60 (RobotDigg/DFRobot) | Ø60 × 31, 86 g, PP/PE o silicona, cubo 4–6,7 mm | 10–15 kg/set | cubo inservible | research_tribologia §3 #94–95 |
| **v7 Ø64 impresa PA-CF** (usuario) | Ø64 × 36,6, hex 14,5 pasante, 6 rodillos 33,5·Ø18 a 46°, 26,5 g cuerpo | ninguna (diseño propio); carga estática por rueda 3,1 N (REV B) | sí (eje a 83,1), tapa verificada (v4) | MECANUM64V7.md |
| Industrial AndyMark 4 in HD | Ø100, hex 1/2 in, 9 rodillos uretano | 200 lb/rueda | **no**: Ø100 > paso 74,75; exigiría ≤5 ejes | research_tribologia #96 |
| Omni Rotacaster Ø50 (no mecanum) | Ø50 × 27,5, cubo 1/2 in, 35/60/95A | 5/15/25 kg/rueda | geometría de ejes perpendiculares (CV-OMW), no ±45° | research_tribologia #84 |

Conclusión: para el concepto de 8 ejes a ~75 mm sólo caben ruedas Ø50–65, y la única con documentación completa es la **v7 del propio usuario**. Su carga (3 N estática, impactos de borde de caja a 1,5 m/s) está muy por debajo de lo que soportan pasadores Ø3,2 y PA-CF; el riesgo real es desgaste/fluencia de rodillos y ruido, a medir. La compra industrial se reserva para un rediseño con menos ejes y mayor paso (fuera de REV B).

### 2.9 Integración en el ZP2026: lo que v4 ya resolvió y REV B no trata

- Apoyo en 2 travesaños (pletina 50×6) sobre las pestañas inferiores del LT_G (z −82,6) con colisas verticales 9×25 → nivel 115,1 nominal + ajuste (Flowsort recomienda +2 mm sobre TOR: manual V5.2 §4.4, capa `web` citada en v4). Gate: rueda +0…+3 mm sobre rodillos vecinos, ajustable en sitio.
- Travesaños TR_S del ZP2026 en x = ±280,2 (tope 14,1): el motor NEMA 23 centrado entre ejes centrales cae en x = ∓37,3 (paso 74,75), lejos de los TR_S; cuerpo z −15,7…41,3 (Ø50) ó −22,7…34,3 (Ø64) → luz al fondo de rueda 17–24 mm y a la pestaña inferior 60–67 mm: **cabe**. Los dos motores quedan a 74,7 mm entre centros (luz 17,7 entre cuerpos de 57) en planos y distintos.
- Cara interior del larguero: v4 deja 0,8 mm de luz de tapa a la cara (266) y 53 mm entre el borde de la última rueda (213,3) y la cara interior en el lado de rodamientos: la caja que sale a 90° por ese lado cruza 53 mm sobre riel + F6801 + tapa. REV B (poleas en el lado muerto) permitiría llevar la última rueda a ~10 mm del larguero en el lado de salida.
- Escalerilla, controlador y fuente del ZP2026 deben moverse (v3.2: corte |x| < 310, controlador a x+330, fuente a x−450).
- Tapa: ventanas por rueda con +2 mm de holgura (v4: 46,3 × 40,6 para Ø64); ISO 13857 (research_potencia §1 #10): aberturas ≤ 4 mm exigen 2 mm de distancia; el hueco rueda–ventana de 2 mm no atrapa dedos; evitar huecos de 8–25 mm junto a rueda girando. Tapa ciega del lado muerto = guarda de correas (cierre completo, desmontable con herramienta).
- Masa estimada del módulo: ≈ 30 kg (script §16; Flowsort SLD/DLD declara 15–100 kg — research_diverters #5). Izaje con 4 cáncamos M8 (v4).

### 2.10 Arquitectura mecánica única con parámetros abiertos

```mermaid
flowchart LR
  subgraph P[Parámetros abiertos]
    D[D_rueda: 50 / 64]
    p[paso: 74.75 / 76.2]
    W[ancho activo: 270…400 y paso transversal 78…100]
    B[rodamiento: 6001-2RS / F6801-2RS]
    T[transmisión: HTD serpentín / Poly-V serpentín]
    M[motor: NEMA 23 (prototipo) / BLDC-servo 48 V / UniDrive]
    v[v_diseño: 1.0 (acumulación) / 1.5 (objetivo)]
  end
  subgraph F[Congelado]
    L[largo 598 = 1 zona ZP2026]
    E[eje hex 1/2 in, puntas Ø12, 8 ejes A/B]
    C[caja Flowsort: placas + travesaños + colisas + tapa ventanas + tapa ciega]
    Z[rodadura 115.1 +0…+3]
    R[rueda v7 con barreno hex 12.85, sin adaptador]
  end
  P --> G[Gates G-M1…G-M14] --> CAD[CAD paramétrico bloque_omni_v5]
  F --> CAD
```

**Cotas a congelar en CAD y sus compuertas verificables** (el generador debe abortar si falla):

| Gate | Cota / condición | Criterio | Cómo se verifica |
|---|---|---|---|
| G-M1 | rpm de eje a v_diseño | n = 60·v/(π·D) dentro de la curva del motor con T ≥ T_inv | curva medida en banco (capa `measured`) |
| G-M2 | largo 598, 8 ejes centrados | luz rueda–rodillo vecino ≥ 15 mm; luz a TR_S ≥ 5 mm | geometría CAD |
| G-M3 | nivel de rodadura | tope de rueda = 115,1 + (0…+3) ajustable | colisas; medición en sitio con regla |
| G-M4 | tren bajo la tapa | dorso de correa/polea ≤ tapa − 2 mm; tapa ≤ 115,1 − 5 | CAD (v4 gate "lomo de motor 50,4 < riel 52") |
| G-M5 | apilado axial | Σ planos + placa + guarda ≤ zona muerta disponible | CAD |
| G-M6 | carga radial en eje de motor | Fr(Ti, abrazo) ≤ rating de ficha a la distancia real | ficha del motor (A VERIFICAR) o eje intermedio |
| G-M7 | rodamientos | L10 ≥ 20 000 h con Ti real | cálculo con C de catálogo |
| G-M8 | hombro Ø12 | SF fatiga ≥ 3 con Kf ≥ 2 y Fr real; r ≥ 0,5 | cálculo + plano |
| G-M9 | poleas | coplanaridad ≤ 0,5 mm; abrazo ≥ 6 dientes | CAD + montaje (regla/laser) |
| G-M10 | ruedas | TIR ≤ 0,5 mm en Ø; cota axial ±0,5 | separadores hex + collar; medición |
| G-M11 | parada | v²/(2·a_max) + v·t_lat ≤ 598 − margen, con μ medido | ensayo plano inclinado + FAT |
| G-M12 | par motor | T_caja + T_inercia(inversión t_inv) ≤ T_motor(n) / 1,5 | cálculo con masa medida de rueda |
| G-M13 | tapa | hueco rueda–ventana ≤ 4 mm ó ≥ 25 mm; material entre ventanas ≥ 10 mm | CAD |
| G-M14 | guardas | aberturas de tapa ciega/guarda según ISO 13857 (e ≤ 4 → 2 mm; 20–30 mm → 850/200 mm) | plano |

### 2.11 Datos del proveedor / del usuario que faltan (A VERIFICAR)

1. Masa real de la rueda v7 completa (cuerpo + 6 rodillos + pasadores + tornillos) y material/dureza de los rodillos.
2. μ rodillo v7 – cartón corrugado (seco, húmedo, con cinta) medido.
3. Carga radial/axial admisible del NEMA 23 elegido a la distancia de la polea (ficha del modelo concreto; no está en 23HS45/23HE45 descargadas).
4. C dinámica y C0 del F6801-2RS/ZZ (catálogo SKF/NSK/NTN 61801) y del 6001-2RS comprado (RS Chile C3: 5,4 kN — único dato web).
5. Certificado de la barra hex 1/2 in trefilada (grado, Su, tolerancia AF, rectitud).
6. Espesor real de la correa HTD 5M y ancho real de polea 28T/24T/20T disponibles en Chile (De/Df/L de cubo).
7. Posición del sensor de zona del ZP2026 respecto al borde de zona y su soporte (no medido en el GLB).
8. Modelo, ancho, cubo, carga y sentido L/R de la "rueda china Ø50 hex 14" si se mantiene esa opción (ninguna fuente la identifica).

### 2.12 Decisiones mecánicas recomendadas (justificación y alternativa)

| # | Decisión | Justificación | Alternativa |
|---|---|---|---|
| D1 | Largo 598 = una zona; 8 ejes a **74,75** centrados | cabe en el hueco, transición uniforme rodillo→rueda, paso de familia 149,5 → 440-5M | 76,2 dentro de 598 (luz 19,7) para conservar 445-5M |
| D2 | **Rueda v7 Ø64** con barreno hex 12,85 (sin adaptador) | única rueda documentada; libera 7 mm bajo el plano para el tren y la tapa; elimina 32 adaptadores de pared < 1 mm | Ø50 sólo con polea ≤ 20T y sin tapa a nivel (o rueda china identificada) |
| D3 | Eje hex 1/2 in con puntas Ø12 × 10 torneadas concéntricas, r ≥ 0,5 | REV B = v4; SF fatiga ≥ 3 en peor caso | Ø12 en casquillo (peor: dos ajustes) |
| D4 | **6001-2RS lado transmisión**, F6801-2RS o 6001 lado libre | L10 >10× con las dos correas/ tensor; sellado por polvo | F6801 ambos lados si Fr ≤ 100 N (v4) |
| D5 | Separadores con **barreno hexagonal** (PA-CF/mecanizado) + collar en Ø12 | concentricidad, cota axial, ruido | PVC SCH40 sólo para prototipo de mesa |
| D6 | **4 ruedas/eje**; paso transversal parámetro 78–100; grupo cargado al lado de **salida** (flush, ≤ 15 mm al larguero) | REV B y v4 coinciden en 4; salida sin cruzar zona muerta | 5 ruedas a 78 si el ensayo muestra pandeo del fondo |
| D7 | Transmisión: **una correa HTD 5M por familia en serpentín** (poleas de eje ≤ 24T, tensores lisos en dorso, motor abajo), 1 plano/familia | inversiones sin deslizamiento, sin retensado, 51 mm de apilado, cabe bajo tapa con Ø64 | Poly-V PJ serpentín v4 (silencio, stock local) con Ti calculada y tensor |
| D8 | Motores NEMA 23 (prototipo) en placa de 8 mm con colisas de tensado 6,5×18 (v4), interfaz de placa **agnóstica** (patrón NEMA 23 y patrón UniDrive/BLDC intercambiable) | condición del usuario; v4 ya tiene la placa | eje intermedio con 2 rodamientos si Fr excede el rating del motor |
| D9 | Caja tipo Flowsort v4: 2 placas 594×4, travesaños 50×6 en pestañas inferiores, colisas 9×25, cáncamos | resuelve nivel, izaje, ajuste y fijación al ZP2026 (Ø8,2 / M8) | placas 6–8 mm si se opta por 6001 embutido en ambas |
| D10 | Tapa 3 mm a 107,1–110,1 con ventana por rueda (+2 mm) + **tapa ciega desmontable = guarda** del lado muerto | v4.1 verificada; cumple ISO 13857 en huecos ≤ 4 | guarda lateral independiente sobre el larguero (REV B) — queda sobre el plano |
| D11 | Sobreelevación nominal +0, colisa 0…+3 (Flowsort +2) | transición rodillo→rueda | fijar +2 sin ajuste (peor) |
| D12 | Zona muerta (133 mm si activo 400): tapa ciega a nivel de tapa (−5 del plano) + **guía lateral** opcional sobre ella | evita que la caja pise el tren; contiene la deriva por reparto A/B | rodillos pasivos a nivel (imposible con tren debajo en Ø50) |
| D13 | **v_diseño = 1,0 m/s** para acumulación; 1,5 m/s sólo con μ ≥ 0,35 medido y sensor adelantado | parada dentro de 598 con μ = 0,3; par de inversión −45 % | 1,5 m/s con G-M11 aprobado por ensayo |
| D14 | Rampa de inversión t_inv ≥ 0,3 s (parada + arranque), parametrizable | T_inercia 0,28–0,57 N·m a 1,5 m/s; 0,19–0,38 a 1,0 | inversión más corta si el motor medido lo permite |

---

## 3. Afirmaciones numeradas

- [A1] (dato, user) REV B fija: 8 ejes a 76,2, 4 ruedas Ø50/eje en 400 mm activos, hex 1/2 in con puntas Ø12, 6001-2RS, HTD 5M 28T 1:1 con 355/445-5M-09, poleas fuera del rodamiento, 1,5 m/s → 572,96 rpm. — MEMORIA_REV_B.txt págs. 1–8.
- [A2] (dato, user) El Bloque OMNI v4 fija: paso 74,75, largo 598, rueda v7 Ø64×36,6 hex 14,5, F6801ZZ embutido en riel 4 mm, Poly-V PJ doble Ø40×20 en 2 planos/familia, 2 UniDrive 24 V, apoyo en travesaños 50×6 sobre pestañas inferiores z −82,6, tapa a 107,1–110,1. — BLOQUE_OMNI_v4_INTERPRETACION_FLOWSORT.md.
- [A3] (dato, user) Cotas medidas del ZP2026: paso 74,75, interior 533,6, rodadura 115,1, LT_G alto 190,5 tope 108, TR_S x ±280,2 tope 14,1. — BLOQUE_OMNI_v1.md, v3.2.
- [A4] (calculo) n = 60·v/(π·D): Ø50 → 382/573 rpm a 1,0/1,5 m/s; Ø64 → 298/448 rpm. — script §1.
- [A5] (calculo) 609,6 (REV B) − 598 (zona) = +11,6 mm: REV B no cabe como zona entera. — script §2.
- [A6] (calculo) Con 8 ejes a 76,2 centrados en 598: eje 1 a 32,3 del borde, distancia al rodillo vecino 69,7 → luz 19,7 (Ø50) / 12,7 (Ø64); a 74,75: 74,75 → luz 24,8 / 17,8. — script §2.
- [A7] (calculo) Ø50 + polea 28T: dorso de correa a z ≈ 115,6 = 0,5 mm sobre el plano 115,1 → sin tapa posible; Ø50 + 24T: 2,7 bajo; Ø50 + 20T: 5,9; Ø64 + 28T: 6,5. Supuesto espesor HTD 3,8 / línea primitiva 0,57 (A VERIFICAR). — script §3.
- [A8] (calculo) Torque de contacto por familia: T = F_fam·r·cos45 = F_req·r/2; REV B usa F_fam·r → sobreestima ×1,41. 5 kg a 2 m/s²: 0,143 N·m (Ø50) / 0,184 (Ø64) vs 0,203 REV B. — script §4.
- [A9] (calculo) a_max = μ·g/√2 − μr·g = 1,79 / 2,48 / 3,17 m/s² para μ 0,3/0,4/0,5; FISICA_PRIMEROS_PRINCIPIOS usa (μ−μr)·g → sobreestima ×1,45–1,48. — script §5.
- [A10] (calculo) Parada + 20 ms de latencia: 1,5 m/s → 660 (μ 0,3, excede 598) / 484 / 384 mm; 1,0 m/s → 300 / 222 / 178 mm. — script §5.
- [A11] (dato, web) μ PU/goma–cartón no existe en fuente primaria; rango 0,3–0,5 (tablas de trincaje, Container Handbook / LoadLok); rodadura cartón 0,06–0,08 (Rulmeca BL3). — research_tribologia_reglas.md §1, §3 #1, #10, #12.
- [A12] (calculo) Apilado axial: REV B literal (6 planos × 22,5 + luces + placa + guarda) ≈ 168 mm > 133,6; serpentín 1 plano/familia ≈ 51; Poly-V v4 ≈ 67; lazo 3 poleas ≈ 87. — script §11.
- [A13] (calculo) J_fam = 0,89–1,8 e-3 kg·m²; T_inercia a 2 m/s² 0,056–0,113 N·m (REV B: 0,04–0,06 coherente); T total 5 kg a 2 m/s² 0,22–0,30 N·m. — script §7.
- [A14] (calculo) Inversión ±1,5 m/s en 0,3 s: 0,28–0,57 N·m de inercia por familia; a 1,0 m/s: 0,19–0,38; E_cin rotacional 1,0–2,0 J + caja 5,6 J por frenado. — script §7.
- [A15] (dato, web) NEMA 23 clase 2–3 N·m: pull-out 1,1–1,5 N·m a 573 rpm (23HE45 36 V ≈1,4; 23HS30 48 V 1,12; 57CM23 48 V ≈1,45); 23HS45-4204S sin curva sobre 420 rpm ni a 48 V. — research_motores_drivers.md §1, §2a.
- [A16] (dato, web) No se encontró mecanum comercial Ø50–65 con cubo hex 14 ni 1/2 in; el salto industrial es Ø100 (AndyMark, 1/2 in hex, 200 lb/rueda), incompatible con paso 74,75. — research_tribologia_reglas.md §1 #12, §3 #96.
- [A17] (calculo) Adaptador hex 14→1/2 in: pared (14−12,7)/2 = 0,65 mm; v4 14,4/12,85 → 0,78; v7 14,5/12,85 → 0,83. — script §14.
- [A18] (calculo) L10 = (C/P)³: 6001 (C 5,1 kN) con 250 N → 247 000 h; F6801 (C ≈ 1,9 kN, A VERIFICAR) con 250 N → 12 800 h, con 100 N → 200 000 h. — script §10; C del 6001 C3 5,4 kN: REV B/RS Chile.
- [A19] (calculo) Separador PVC 3/4 SCH40 ID 20,9 sobre vértices 14,66 → excentricidad hasta 3,1 mm; fuerza de desbalance 0,27 N por tramo de 40 mm a 573 rpm (baja) pero sin centrado ni cota axial precisa. — script §13.
- [A20] (calculo) Hombro Ø12: 100 N a 15 mm → 8,8 MPa (REV B verificado); 200 N a 25 mm → 29,5 MPa nominal, 62 MPa con Kt 2,1; Se ≈ 183 MPa (Su 440 A VERIFICAR) → SF ≈ 3,0; τ torsión 2,4 MPa; n_crit 3600–3950 rpm. — script §9, §13.
- [A21] (calculo) Tensión HTD: Te = T/r_p = 36 N (28T, 0,8 N·m) / 50 N (20T); Fr ≈ 2·Ti = 72–131 N por correa = 17–27 % de 208 N admisible (5M-10 mm, Reichelt, digest anexo); motor REV B con 2 correas ≈ 102 N a ~25 mm. — script §8.
- [A22] (calculo) Deriva lateral parásita en FORWARD por reparto A/B: 500 mm 4A+3B → 14 %; 250–300 mm 2A+1B → 33 %; M_yaw 0,24–0,43 N·m → cota superior de giro 49–110° sin guías. — script §6; concuerda con Keek 2021 / BIBA EP2874923B1 (research_diverters #41, #64).
- [A23] (calculo) Desvío 90°: 0,8–0,9 s (a 2 m/s², v_lat 1,0–1,5) para 300 mm; +133 mm de rodadura libre si la salida está en el lado muerto (decel 0,3–0,8 m/s²). — script §15.
- [A24] (decision) Arquitectura única: caja v4 + rueda v7 hex 12,85 + paso 74,75/598 + HTD serpentín 1 plano/familia + 6001 lado transmisión + NEMA 23 en placa agnóstica + tapa/tapa ciega + colisa +0…+3 + v_diseño 1,0 m/s. — §2.10–2.12.
- [A25] (riesgo) Poleas Ø48 con rueda Ø50 hacen imposible cerrar el tren bajo el plano de rodadura: el "relleno pasivo a nivel" de REV B no es compatible con la transmisión en la zona muerta. — [A7].
- [A26] (riesgo) A 1,5 m/s la zona Omni es la de menor capacidad de frenado de la línea (√2 menos que rodillos) y la parada en una zona depende de μ ≥ 0,35 no medido. — [A9][A10][A11].
- [A27] (dato, web) Flowsort monta el desviador +2 mm sobre TOR y usa Poly-V con motores PGD024 (40 W, ratio 11, 528,9 rpm → 1,55 m/s en Ø58) y 2 motores por módulo; Interroll HPD 2 motores 5,2 A/9 A. — research_diverters_comerciales.md §2.1, §3 #6–#9, #34; v4 (manual V5.2 §4.4).
- [A28] (dato, web) Distancias de seguridad ISO 13857: e ≤ 4 mm → 2 mm; ranura 20–30 mm → 850 mm (200 mm si ≤ 65 mm de largo). — research_potencia_seguridad.md §1 #10, tabla 152.
- [A29] (dato, user) El usuario dijo "40 o 35 centímetros" de ancho activo (U3); REV B fijó 400 sin discutir 350. Con 350 el apilado REV B literal (168) cabe en 183,6. — digest_transmisiones.md §4 #8; script §11.
- [A30] (calculo) Masa del módulo ≈ 30 kg (ejes 4,9, placas 6,7, tapa 5,1, ruedas 2,9, motores 2,2, travesaños 2,4, resto) A VERIFICAR en CAD; Flowsort SLD/DLD 15–100 kg. — script §16; research_diverters #5.

---

## 4. Alternativas descartadas y por qué

| Alternativa | Por qué se descarta (evidencia) |
|---|---|
| REV B literal: 3 planos HTD por familia, ambas familias en la zona muerta de 133 mm | no cabe (168 > 133,6) [A12]; dorso de correa sobre el plano [A7] |
| Familias en lados opuestos (v1/v3, un motor por cara) con poleas fuera del rodamiento | ambos lados pierden ≥ 90 mm de rueda: la caja no puede salir flush por ningún lado; la deriva lateral no tiene borde de apoyo |
| Rueda china Ø50 hex 14 | modelo inexistente en fuentes [A16]; adaptador de 0,65 mm [A17]; obliga a poleas ≤ 20T y deja el tren al nivel del plano [A7] |
| Mecanum industrial Ø100 (AndyMark) | Ø100 > paso 74,75; exigiría ≤ 5 ejes y otra memoria [A16] |
| O-rings entre ejes (ZP2026/BF21) para el tren motriz | par no documentado, deslizamiento en inversión, sin tensor; BF21 lo declara pendiente de validar |
| Separadores PVC SCH40 | excéntricos y sin cota axial [A19] |
| Relleno pasivo a nivel (rodillos/mesa) en la zona muerta | incompatible con el tren debajo en Ø50 [A25]; en Ø64 exigiría tapa a −5 del plano de todos modos |
| Lazo de 3 poleas motor + 2 centrales (HTD) | cabe (87 mm) pero abrazo del motor 92° (7 dientes) con h = 77 y 4 planos; el serpentín lo supera en apilado y abrazo |
| 1,5 m/s como velocidad única de diseño | parada en zona no garantizada con μ < 0,35 [A10]; par de inversión ×1,5 [A14]; NEMA 23 sin curva a 573 rpm [A15] |
| Módulo CV-OMW (ejes perpendiculares, omnis Ø70/Ø120) y TRANSFER-BF21 (omnis giradas + o-rings) | otra arquitectura (7 motores / eje común); no es lo congelado en REV B; se mantienen como referencia, no como base |

---

## 5. Preguntas que sólo el usuario puede responder

1. ¿Confirma **Ø64 v7** (v4, 02-09) o mantiene **Ø50** (REV B)? Si Ø50: ¿qué rueda concreta (modelo, ancho, cubo, carga)?
2. ¿Puede cambiar el barreno de la v7 a hex 12,85 (1/2 in) para eliminar el adaptador? ¿O prefiere barra hex 14 (disponibilidad en Chile)?
3. Ancho activo: ¿400 o 350 mm (dijo "40 o 35")? ¿Y las ruedas cargadas hacia el lado de **salida** del desvío o hacia el lado opuesto?
4. ¿La salida lateral es siempre hacia un mismo lado por módulo (módulos LH/RH en espejo) o debe poder ser a ambos lados?
5. ¿Acepta 1,0 m/s como velocidad de diseño de acumulación en la zona Omni (con 1,5 condicionada a ensayo de μ)?
6. ¿Puede medir μ rodillo v7–cartón (plano inclinado) y la masa real de una rueda v7 completa?
7. ¿HTD (síncrona, sin retensado) o Poly-V (silencio, stock local) para el serpentín? ¿Tiene ya poleas/correas compradas?
8. ¿Qué modelo exacto de NEMA 23 y driver comprará (para la carga radial admisible y la curva a 380–450 rpm)?
9. ¿Está permitido mover escalerilla, controlador y fuente del ZP2026 (v3.2) en el prototipo?
10. ¿Se admite una guía lateral fija sobre la tapa ciega del lado muerto para contener la deriva por reparto A/B?
11. Certificado/grado de la barra hex 1/2 in trefilada disponible.

---

## 6. Riesgos abiertos

1. **μ real rodillo–cartón** desconocido: gobierna a_max, parada en zona y velocidad admisible [A9–A11].
2. **Deriva y guiñada** por reparto A/B desigual (33 % en cajas de 250–300 mm) sin control con 2 motores [A22]; posible necesidad de guía o alineador aguas abajo.
3. **Carga radial en el eje del NEMA 23** no documentada; con dos correas (REV B) probablemente excedida → eje intermedio [A21].
4. **Par de inversión** con rueda de 150 g y t_inv 0,3 s a 1,5 m/s (0,57 N·m) roza el criterio REV B y el pull-out del NEMA 23 a 573 rpm [A14][A15].
5. **F6801**: C dinámica A VERIFICAR; con 250 N la vida cae a ≈13 000 h [A18].
6. **Disponibilidad en Chile** de poleas 20–28T HTD 5M con cubo hex/collar y correas 440/445/355-5M-09 (REV B ya lo señala).
7. **Rueda impresa PA-CF** en servicio industrial: desgaste/fluencia de rodillos, humedad del nylon, impactos de borde a 1,5 m/s; ninguna carga declarada.
8. **Energía regenerativa** de cada frenado (5,6 J caja + 1–2 J rotacional por familia) sobre bus 48 V con drivers que disparan a 60 V (research_motores §2e).
9. **Transición rodillo→rueda**: sobreelevación +0…+3 y luz 17,8–24,8 mm entre rodillo vecino y rueda; cajas vacías de 0,5 kg pueden "flotar" (fuerza normal 0,4 N/rueda).
10. **Seguridad de aberturas** (ISO 13857) en tapa y tapa ciega; E-stop y evaluación formal pendientes (handoff §13).
11. **Modularidad**: el bloque desplaza escalerilla/controlador/fuente del ZP2026; el diseño de conectores UPSTREAM/DOWNSTREAM debe prever ese reposicionamiento (fuera de esta lente).

---

### Anexo — Script de verificación

`wf/calc_lente_mecanica_v2.py` (Python 3, sin dependencias). Salida completa en `wf/calc_lente_mecanica_v2.out`. Extracto de las líneas citadas:

```
D=50 v=1.5: n=573 rpm ; D=64 v=1.5: n=448 rpm ; D=64 v=1.0: n=298 rpm
paso 74.75: eje1–rodillo vecino 74.75 ; luz Ø64/Ø50 17.8 mm ; REV B 609.6 vs 598 -> sobra 11.6
rueda Ø50, polea 28T: dorso de correa a z=115.6 vs plano 115.1 -> -0.5 mm (NO CABE TAPA) ; Ø64+28T: +6.5 OK
m=5 a=2.0: T_REVB=0.203 | T_física(Ø50)=0.143 | T_física(Ø64)=0.184 N·m | μ_req 0.331
μ=0.3: a_max=1.79 (FISICA 2.65: ×1.48) ; s_parada 1.5 m/s=630 mm ; v=1.5 μ=0.3: 660 mm EXCEDE ZONA ; v=1.0 μ=0.3: 300 OK
v7 Ø64 0.08 kg: J_fam=8.9e-04 ; a=2: 0.239 N·m ; inversión ±1.5 en 0.3 s: 0.28 N·m ; Ø64 0.15 kg: 0.57 N·m
HTD 28T 0.8 N·m: Te=35.9 N ; Fr 72..93 N ; motor REV B 2 correas ≈ 102 N a ~25 mm
F=200 N a 25 mm: σ_nom=29.5 MPa ; Kt 2.1 -> 61.9 ; SF fatiga = 3.0
6001 P=250: L10=246936 h ; F6801 P=250: 12768 h
activo 400: HTD 3 planos/fam ×2 fam: 168 mm NO CABE ; serpentín 1 plano/fam: 51 CABE ; Poly-V v4: 67 CABE
Ø64 motor h=77.3: cuerpo z −22.7…34.3 ; luz al fondo de rueda 16.8 ; motores a 74.7 entre centros (luz 17.7)
pared adaptador (14−12.7)/2 = 0.65 mm ; v7 hex 14.5 -> 0.825 mm
masa módulo ≈ 29.5 kg
```
