#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lente potencia 48/24 V, distribución en cadena, EMC y seguridad — Conveyone Omni-ZPA.
Todos los datos de entrada llevan su capa: [user] handoff/REV B; [web] research_*.md (URL en el informe);
[calc] derivado aquí; [A VERIFICAR] parámetro no documentado, usado sólo en sensibilidad.
"""
import math

def h(t):
    print("\n" + "=" * 100 + "\n" + t + "\n" + "=" * 100)

# ---------------------------------------------------------------- 0. Entradas
g = 9.81
r_w = 0.025            # rueda Ø50 [user REV B]
v15, v10 = 1.5, 1.0    # m/s [user REV B / prompt]
w15, w10 = v15 / r_w, v10 / r_w   # rad/s
n15, n10 = w15 * 60 / (2 * math.pi), w10 * 60 / (2 * math.pi)
print(f"omega: 1.5 m/s -> {w15:.1f} rad/s ({n15:.0f} rpm); 1.0 m/s -> {w10:.1f} rad/s ({n10:.0f} rpm)")

# Par por familia [calc lente_mecanica A13/A14]: caja 5 kg a 2 m/s² + inercia = 0.22–0.30 N·m;
# inversión ±1.5 m/s en 0.3 s: +0.28–0.57 N·m; a 1.0 m/s: 0.19–0.38
T_cont_fam = 0.30       # N·m envolvente continua (REV B criterio 0.6–0.8 en el motor)
T_rev_15 = 0.30 + 0.57  # N·m pico en inversión a 1.5 m/s (peor rueda 150 g)
T_rev_10 = 0.30 + 0.38  # a 1.0 m/s
T_REVB = 0.8            # criterio REV B "ideal ≥0.8 N·m a 573 rpm" [user]

# ---------------------------------------------------------------- 1. Potencia mecánica por familia
h("1. Potencia mecánica por familia (P = T·ω)")
for name, T in [("continua (0.30 N·m)", T_cont_fam), ("criterio REV B 0.8 N·m", T_REVB),
                ("pico inversión 1.5 m/s (0.87 N·m)", T_rev_15), ("pico inversión 1.0 m/s (0.68 N·m)", T_rev_10)]:
    print(f"  {name:38s}: P@573rpm = {T*w15:6.1f} W ; P@382rpm = {T*w10:6.1f} W")
# Potencia regenerativa media durante una inversión: energía cinética devuelta
E_caja = 0.5 * 5 * v15**2       # J caja 5 kg a 1.5 m/s
E_rot_fam = (1.0, 2.0)          # J rotacional por familia [calc lente_mecanica A14: 1.0–2.0 J]
print(f"  E_cin caja 5 kg @1.5 m/s = {E_caja:.2f} J ; @1.0 m/s = {0.5*5*v10**2:.2f} J ; E_rot familia 1.0–2.0 J")

# ---------------------------------------------------------------- 2. Balance eléctrico por accionamiento
h("2. Balance eléctrico por accionamiento (entrada DC)")
# 2a. Stepper NEMA 23 23HE45-4204S (4.2 A/fase, 0.88 Ω/fase) [web research_motores §2b] + CL57T (24–48 V, 8 A pico)
I_ph, R_ph = 4.2, 0.88
P_cu_full = 2 * I_ph**2 * R_ph            # ambas fases a corriente nominal (bipolar, chopper)
P_cu_idle = 2 * (0.5 * I_ph)**2 * R_ph    # idle 50 % [web: DM556T idle 50/90 %]
eta_drv = 0.90                            # [A VERIFICAR] rendimiento típico de puente H chopper
print(f"  Stepper: P_cobre a 4.2 A/fase = {P_cu_full:.1f} W ; en reposo (50 %) = {P_cu_idle:.1f} W")
def stepper_in(P_mech, P_cu=P_cu_full, P_fe=10.0):
    # P_fe: pérdidas en hierro/histeresis a 573 rpm [A VERIFICAR, sensibilidad 10 W]
    return (P_mech + P_cu + P_fe) / eta_drv
cases = [("HOLD (motor energizado, reposo)", 0.0, P_cu_idle),
         ("FORWARD 1.0 m/s, 0.30 N·m", T_cont_fam * w10, P_cu_full),
         ("FORWARD 1.5 m/s, 0.30 N·m", T_cont_fam * w15, P_cu_full),
         ("FORWARD 1.5 m/s, 0.8 N·m (REV B)", T_REVB * w15, P_cu_full),
         ("INVERSIÓN 1.5 m/s, 0.87 N·m", T_rev_15 * w15, P_cu_full),
         ("INVERSIÓN 1.0 m/s, 0.68 N·m", T_rev_10 * w10, P_cu_full)]
print("  --- Stepper 23HE45 + CL57T a 48 V (por familia) ---")
step = {}
for name, Pm, Pcu in cases:
    Pin = stepper_in(Pm, Pcu)
    step[name] = Pin
    print(f"  {name:36s}: P_mec {Pm:5.1f} W -> P_in ≈ {Pin:6.1f} W -> I_48V ≈ {Pin/48:4.2f} A")
# Cota superior física: el driver no puede entregar más que V_bus·I_bus; con 8 A pico de driver y ambas fases
# la potencia de fase máxima ≈ 2·(I_ph·V_ph); usamos como cota conservadora de arranque 48 V·(I_ph·√2·0.5)... no documentado:
print("  Cota de diseño adoptada por driver stepper: 2.0 A continuos, 3.0 A pico (0.3 s) a 48 V  [calc + margen; MEDIR en banco]")

# 2b. Servo integrado 48 V 400 W (IDS-C60AP-48V400W: 1.27 N·m nominal, 10 A a 3000 rpm) [web research_motores §2c]
eta_servo = 0.80  # [A VERIFICAR] rendimiento a 19 % de velocidad nominal
print("  --- Servo 48 V 400 W (por familia) ---")
for name, T in [("FORWARD 1.5 m/s 0.30 N·m", T_cont_fam), ("FORWARD 1.5 m/s 0.8 N·m", T_REVB),
                ("INVERSIÓN 1.5 m/s 0.87 N·m", T_rev_15)]:
    Pm = T * w15
    Pin = Pm / eta_servo + 8.0   # +8 W lógica/encoder [A VERIFICAR]
    print(f"  {name:36s}: P_mec {Pm:5.1f} W -> P_in ≈ {Pin:6.1f} W -> I_48V ≈ {Pin/48:4.2f} A")
print("  Servo: pico de corriente de driver 180–250 % (1 s) [web] -> cota 250 % de la nominal en falla/atasco = 25 A por motor si no se limita por parámetro")

# 2c. Opción MDR/UniDrive 24 V y 48 V [web research_ecosistemas #2, research_motores §2d]
print("  --- Motores de ecosistema MDR (datos de ficha) ---")
mdr = {
    "UniDrive One 24 V 60 W":        (24, 2.0, 4.0),   # nominal / stall
    "ZoneLogix UL 60 W 24 V":        (24, 4.0, 4.5),   # 4 A @15 in·lbf / máx
    "ZoneLogix PRO UD100 24 V":      (24, 5.6, 7.0),
    "UniDrive CORE 48 V 120 W":      (48, 3.3, None),  # arranque ">15 in·lbf" sin corriente publicada
    "Interroll EC5000 50 W 48 V":    (48, 1.7, 3.8),
    "Pulseroller PGD-Ai-48 50 W":    (48, 1.6, 4.0),
    "Interroll EC5000 50 W 24 V":    (24, 3.4, 7.5),
}
for k, (V, In, Ip) in mdr.items():
    print(f"  {k:32s}: {V} V ; I_nom {In:3.1f} A ({In*V:4.0f} W) ; I_arranque {Ip if Ip else 'A VERIFICAR'} A")

# ---------------------------------------------------------------- 3. Balance por zona
h("3. Balance por zona (control 24 V + accionamiento)")
# Control CZC: placa ESP32 DIN 24 V 0.4 A (Norvi ENET declara 24 V DC 0.4 A) [web research_controladores 2(a)] -> cota 10 W
P_ctrl = 24 * 0.4
P_sens = 2 * 24 * 0.035          # 2 sensores fotoeléctricos PNP ≈35 mA c/u [A VERIFICAR ficha del sensor]
P_hand = 4 * 24 * 0.010          # 4 salidas de handshake/LED a 10 mA [calc]
P_can = 24 * 0.05                # transceptor CAN + aislamiento [A VERIFICAR]
P24_zone = P_ctrl + P_sens + P_hand + P_can
eta_ddr = 0.91                   # DDR-120C-24 91 % [web]
I48_ctrl = P24_zone / eta_ddr / 48
print(f"  Control por zona a 24 V: ESP32 {P_ctrl:.1f} + sensores {P_sens:.1f} + handshake {P_hand:.1f} + CAN {P_can:.1f} = {P24_zone:.1f} W"
      f" -> {P24_zone/24:.2f} A @24 V ; vía DDR 48→24 (91 %) = {I48_ctrl:.2f} A @48 V")
# ZoneLogix UL/Plus sin motor: 0.2–0.3 A [web spec UL "48 W: 0.2 A sin carga; 60 W: 0.3 A"]
print("  Zona NORMAL ZoneLogix+UniDrive 24 V: tarjeta 0.3 A + motor 2.0 A nominal (4 A stall) + sensor ≈ 2.35 A nom / 4.35 A pico @24 V")
# Omni stepper 48 V
I_omni_cont = 2 * 2.0 + I48_ctrl
I_omni_peak = 2 * 3.0 + I48_ctrl
print(f"  Zona OMNI (2 steppers 48 V): continuo 2×2.0 + {I48_ctrl:.2f} = {I_omni_cont:.2f} A ({I_omni_cont*48:.0f} W) ; pico 2×3.0 + ctrl = {I_omni_peak:.2f} A ({I_omni_peak*48:.0f} W, ≤0.3 s)")
I_omni_servo_cont = 2 * (T_REVB * w15 / eta_servo + 8) / 48 + I48_ctrl
print(f"  Zona OMNI (2 servos 48 V 400 W): continuo ≈ {I_omni_servo_cont:.2f} A ; pico limitado por parámetro de driver (recomendado ≤ 4 A/motor = 8 A + ctrl)")
I_omni_24 = 2 * 2.0 + P24_zone / 24
I_omni_24_pk = 2 * 4.0 + P24_zone / 24
print(f"  Zona OMNI (2 UniDrive One 24 V): continuo 2×2.0 + ctrl = {I_omni_24:.2f} A @24 V ({I_omni_24*24:.0f} W) ; stall 2×4.0 + ctrl = {I_omni_24_pk:.2f} A")
I_norm48 = 1.7 + I48_ctrl
I_norm48_pk = 3.8 + I48_ctrl
print(f"  Zona NORMAL CZC + MDR 48 V (EC5000/PGD 50 W): {I_norm48:.2f} A nom / {I_norm48_pk:.2f} A arranque @48 V")
I_norm24 = 2.0 + P24_zone / 24
print(f"  Zona NORMAL CZC + UniDrive One 24 V: {I_norm24:.2f} A nom / {4.0 + P24_zone/24:.2f} A stall @24 V")
print(f"  Comparación con fuente de 120 W (NDR-120-48, 2.5 A) de la conversación previa: una sola Omni continua = {I_omni_cont*48:.0f} W > 120 W  -> insuficiente [confirma advertencia del digest]")

# ---------------------------------------------------------------- 4. Línea de 20 zonas: 17 NORMAL + 3 OMNI
h("4. Línea de 20 zonas (17 NORMAL + 3 OMNI), longitud 20 × 0.598 m")
L_line = 20 * 0.598
print(f"  Longitud de línea = {L_line:.2f} m (zona ZP2026 598 mm [user BLOQUE_OMNI_v1])")
# Escenario 48 V todo (Ruta B): normal MDR 48 V, Omni stepper
I48_all_nom = 17 * I_norm48 + 3 * I_omni_cont
I48_all_pk = 17 * I_norm48 + 3 * I_omni_peak  # 3 Omni invirtiendo simultáneamente (peor caso)
I48_starts = 17 * I_norm48_pk + 3 * I_omni_peak  # arranque simultáneo de todo (Search&Rescue / re-energización sin escalonar)
print(f"  48 V: nominal todo en marcha = {I48_all_nom:.1f} A ({I48_all_nom*48:.0f} W); 3 Omni invirtiendo = {I48_all_pk:.1f} A; arranque simultáneo total = {I48_starts:.1f} A")
# Escenario 24 V (Ruta A, ZoneLogix + UniDrive One; Omni con 2 UniDrive 24 V)
I24_all_nom = 17 * 2.35 + 3 * I_omni_24
I24_all_pk = 17 * 4.35 + 3 * I_omni_24_pk
print(f"  24 V: nominal todo en marcha = {I24_all_nom:.1f} A ({I24_all_nom*24:.0f} W); stall/arranque simultáneo = {I24_all_pk:.1f} A")
# Factor de simultaneidad en ZPA: en acumulación los motores están parados; en flujo continuo todos corren.
print("  Simultaneidad: ZPA en flujo = todos los motores en marcha (factor 1.0); en acumulación ≈ 0. Se dimensiona con 1.0 en nominal y arranques escalonados (S&R zona a zona).")

# ---------------------------------------------------------------- 5. Zonas por ramal según fuente y conector
h("5. Zonas por ramal por límite de corriente de fuente y de conector")
fuentes = {"SDR-480-48 (10 A, 15 A/3 s)": 10, "TDR-960-48 (20 A)": 20, "2×TDR-960-48 paralelo (20·2·0.9=36 A)": 36,
           "NDR-240-24 / SDR-240-24 (10 A)": 10, "ZoneLogix UL: fuente PELV 24 V con breaker máx 20 A": 20}
for f, I in fuentes.items():
    if "24" in f.split("(")[0] or "ZoneLogix" in f:
        nz = int(I * 0.8 / 2.35); no = int(I * 0.8 / I_omni_24)
        print(f"  {f:52s}: a 80 % → {nz} zonas NORMAL 24 V ({2.35} A) ó {no} OMNI 24 V ({I_omni_24:.2f} A)")
    else:
        nz = int(I * 0.8 / I_norm48); no = int(I * 0.8 / I_omni_cont)
        print(f"  {f:52s}: a 80 % → {nz} zonas NORMAL 48 V ({I_norm48:.2f} A) ó {no} OMNI 48 V ({I_omni_cont:.2f} A)")
print("  Conector pasante M12 L-coded: 16 A @63 V DC con 2.5 mm² [web binder] → corriente en el PRIMER conector del ramal ≤ 16 A:")
print(f"    48 V: ≤ {int(16/I_norm48)} NORMAL ó {int(16/I_omni_cont)} OMNI ó p.ej. 5 NORMAL + 2 OMNI = {5*I_norm48+2*I_omni_cont:.1f} A")
print(f"    24 V: ≤ {int(16/2.35)} NORMAL ó {int(16/I_omni_24)} OMNI")
print("  Han Q 5/0: 16 A [web harting]; PTFIX 6/12×2.5 bornes push-in: 24 A [web]; conectores > 16 A (7/8 in, M12 Power K/S) NO CONSULTADOS → A VERIFICAR")

# ---------------------------------------------------------------- 6. Caída de tensión
h("6. Caída de tensión — trunk 12 m (20 zonas), IEC 60228 clase 2 a 20 °C; ×1.2 a 70 °C")
R = {2.5: 7.41e-3, 4: 4.61e-3, 6: 3.08e-3}   # Ω/m [web Lapp/IEC 60228]
def dv_conc(S, L, I, kT=1.0):   # carga concentrada al final, ida y vuelta
    return 2 * L * I * R[S] * kT
def dv_unif(S, L, I, kT=1.0):   # carga uniformemente distribuida, alimentación en un extremo: ΔV_final = R'·L·I_total (ida y vuelta: ×2 × ½)
    return 2 * R[S] * kT * L * I / 2
def dv_center(S, L, I, kT=1.0): # alimentación al centro, mitad de corriente a cada lado, cada lado L/2 uniforme
    return dv_unif(S, L / 2, I / 2, kT)
print(f"  Presupuestos: 48 V → 42 V (ConveyLinx-Ai3-48 mín. motor) = 6 V; DDR UVLO 33.6 V = 14.4 V; 24 V: ZoneLogix 22 V mín = 2 V (24 V) / 6 V (fuente a 28 V); UniDrive One 23 V mín = 1 V (24 V) / 5 V (28 V)")
print("  --- 48 V, línea 12 m, I_total nominal %.1f A y pico %.1f A ---" % (I48_all_nom, I48_all_pk))
for S in R:
    for I, tag in [(I48_all_nom, "nom"), (I48_all_pk, "pico")]:
        print(f"   {S:>3} mm² {tag:4s}: concentrada {dv_conc(S,L_line,I):5.2f} V ; uniforme extremo {dv_unif(S,L_line,I):5.2f} V ({dv_unif(S,L_line,I,1.2):5.2f} V a 70 °C) ; alimentación al centro {dv_center(S,L_line,I):5.2f} V")
print("  --- 48 V, ramal de 10 zonas (6 m) con 8 NORMAL + 2 OMNI ---")
I_r10 = 8 * I_norm48 + 2 * I_omni_cont
for S in R:
    print(f"   {S:>3} mm²: I={I_r10:.1f} A ; uniforme extremo {dv_unif(S,6*0.598,I_r10):4.2f} V ({dv_unif(S,6*0.598,I_r10,1.2):4.2f} V a 70 °C) ; pérdida {dv_unif(S,6*0.598,I_r10)*I_r10/2:4.1f} W")
print("  --- 24 V, línea 12 m, I_total nominal %.1f A ---" % I24_all_nom)
for S in R:
    print(f"   {S:>3} mm²: uniforme extremo {dv_unif(S,L_line,I24_all_nom):5.2f} V ; al centro {dv_center(S,L_line,I24_all_nom):5.2f} V ; ramal 4 zonas (2.4 m, {4*2.35:.1f} A) {dv_unif(S,4*0.598,4*2.35):4.2f} V")
# Longitud máxima por presupuesto (uniforme, extremo)
print("  --- Longitud máx. de ramal uniforme (m) para ΔV_adm: L = ΔV/(R'·I) ---")
for S in R:
    for dV, I, tag in [(6, 20, "48 V/6 V/20 A"), (3, 20, "48 V/3 V/20 A"), (2, 20, "24 V/2 V/20 A"), (1, 10, "24 V/1 V/10 A")]:
        print(f"   {S:>3} mm² {tag:14s}: {dV/(R[S]*I):6.1f} m", end=" |")
    print()
# Resistencia de contactos en cadena (paramétrico)
print("  --- Contactos de conectores en cadena (paramétrico, A VERIFICAR R_contacto en ficha M12 L) ---")
for Rc in [2e-3, 5e-3, 10e-3]:
    # N=20 nodos pasantes; corriente en el nodo k = I_tot·(N-k)/N (uniforme) → Σ ≈ I_tot·(N+1)/2 por polo, 2 polos
    N = 20
    dv = 2 * Rc * I48_all_nom * (N + 1) / 2 / 1  # aproximación Σ_{k=0}^{N-1}(N-k)/N = (N+1)/2
    print(f"   R_contacto {Rc*1e3:4.1f} mΩ/polo × 20 pares pasantes: ΔV ≈ {dv:4.2f} V a {I48_all_nom:.1f} A (comparable al cable)")

# ---------------------------------------------------------------- 7. Inrush y conexión en caliente
h("7. Inrush")
print("  AC (por fuente, ficha): NDR-480-48 35 A/230 VAC ; SDR-480-48 80 A/230 VAC ; TDR-960-48 60 A ; DDR-240C-24 30 A ; DDR-120C-24 5 A [web]")
print("  DC hot-plug de un nodo al trunk vivo: i_pico = V/R_lazo ; τ = R_lazo·C_nodo")
for C in [470e-6, 2200e-6]:
    for Rl in [0.05, 0.2]:
        ip = 48 / Rl; tau = Rl * C; E = 0.5 * C * 48**2
        print(f"   C_nodo {C*1e6:5.0f} µF [A VERIFICAR: caps de entrada de 2 drivers + DDR], R_lazo {Rl:4.2f} Ω: i_pico {ip:5.0f} A, τ {tau*1e3:5.2f} ms, E {E:4.2f} J")
print("  → Sin limitación activa, un enchufe en caliente dispara/estresa protecciones y contactos; el e-fuse por nodo con limitación 1.2×IN (ESX10-TC) actúa como precarga [web E-T-A 'Current limitation typically 1,2 x IN'].")
print("  DDR-120C inrush 5 A y DDR-240C 30 A [web] → preferir DDR-120C por nodo (32 mm) si la lógica ≤ 120 W.")

# ---------------------------------------------------------------- 8. Regeneración
h("8. Regeneración en inversión/frenado a 48 V")
E_rev = E_caja + max(E_rot_fam) * 2   # caja + 2 familias (peor caso frenado de ambas + caja)
E_div = 2 * max(E_rot_fam)            # inversión de una familia en DIVERT (caja parada): sólo rotacional... una familia = 2 J; ambas = 4 J
t_inv = 0.3
print(f"  Energía a absorber: frenado total (caja 5.6 J + 2 familias 4 J) = {E_rev:.1f} J en {t_inv} s → P_regen media {E_rev/t_inv:.0f} W ; una familia en DIVERT: 2 J → {2/t_inv:.0f} W")
for C in [1000e-6, 2200e-6, 4700e-6, 10000e-6]:
    Vf = math.sqrt(48**2 + 2 * E_rev / C)
    print(f"   bus con C = {C*1e6:6.0f} µF y sin otras cargas: V_final = {Vf:5.1f} V  ({'> 60 V DISPARA sobretensión del driver (DM556T/iSV 60 V)' if Vf > 60 else 'OK < 60 V'})")
C_req = 2 * E_rev / (60**2 - 48**2)
C_req55 = 2 * E_rev / (55**2 - 48**2)
print(f"  C necesaria para no superar 60 V: {C_req*1e3:.1f} mF ; para no superar 55 V (ajuste máx. fuentes): {C_req55*1e3:.1f} mF → impráctico ⇒ chopper/resistencia de freno por caja Omni o cargas garantizadas en el bus")
P_chop = E_rev / t_inv
R_chop = 54**2 / P_chop
print(f"  Chopper por Omni: umbral 52–54 V (Interroll MultiControl actúa a 52 V [web]); R ≈ V²/P = 54²/{P_chop:.0f} W ≈ {R_chop:.0f} Ω ; energía por evento {E_rev:.1f} J ; a 2000 desvíos/h (2 inversiones c/u de 2 J) = {2000*2*2/3600:.1f} W medios")
print("  Cargas mínimas en el trunk que absorben la regeneración: 20 W de lógica de 20 zonas absorben 9.6 J en 0.48 s → insuficiente durante una inversión de 0.3 s si ninguna zona vecina está en marcha.")

# ---------------------------------------------------------------- 9. Selectividad DC
h("9. Selectividad de protecciones DC 48 V (escalones)")
chain = [("Fuente TDR-960-48", "20 A; limitación 105–130 %, apagado a 3 s, rearme por corte de red [web]"),
         ("Ramal (e-fuse ESX10-TC 16 A)", "limitación 1.2×IN = 19.2 A → nunca supera la limitación de la fuente (21–26 A) [web E-T-A]"),
         ("Nodo OMNI (ESX10-TC 8 A)", f"1.2×IN = 9.6 A ≥ pico Omni {I_omni_peak:.1f} A (0.3 s) ✔ ; cortocircuito en el nodo limitado a 9.6 A < 19.2 A del ramal ✔"),
         ("Nodo NORMAL (ESX10-TC 4 A)", f"1.2×IN = 4.8 A ≥ arranque MDR 48 V {I_norm48_pk:.2f} A ✔ (arranque 3.8 A ≤ 3 s: verificar curva t-I del e-fuse)"),
         ("Driver A / Driver B (ESX10-TC 3 A c/u)", "1.2×IN = 3.6 A ≥ pico 3.0 A ✔ ; falla de un driver no tumba al otro ni al control"),
         ("Control 24 V (salida DDR 5 A + e-fuse 24 V 1–2 A)", "REX12-T/CBM E4 sólo 24 V → válidos aguas abajo del DDR, no en 48 V [web]")]
for a, b in chain:
    print(f"  {a:44s}: {b}")
print("  Regla: cada escalón inferior con limitación activa ≤ el escalón superior ⇒ selectividad por limitación de corriente (no por curva térmica).")

# ---------------------------------------------------------------- 10. Seguridad: distancias y tiempos
h("10. Seguridad funcional y distancias")
print("  Tiempo de parada tras E-stop (categoría 0, corte de 48 V): relé 10–20 ms [web PNOZ s3/XPSUAF/3SK1] + contactor/STO ~10–30 ms [A VERIFICAR] + rodadura libre de la caja.")
for v in [1.0, 1.5]:
    for mu_r in [0.03]:
        d_free = v**2 / (2 * mu_r * g)
        print(f"   v={v} m/s: recorrido libre de la caja con μr=0.03 hasta detenerse ≈ {d_free:5.1f} m (las ruedas sin par no frenan la caja)")
print("  → Un corte de potencia (cat. 0) NO detiene la caja; para paro controlado (cat. 1) hace falta rampa del driver y luego corte (STO con retardo).")
print("  ISO 13857 Tabla 4 [web Troax]: e ≤ 4 mm → 2 mm ; 4–6 → 10 mm ; 6–8 → 20 mm ; 8–10 → 80 mm ; 10–12 → 100 mm ; 12–20 → 120 mm ; 20–30 → 850 mm (200 si ranura ≤ 65 mm)")
for luz, tag in [(10.75, "luz entre ruedas Ø64 vecinas (paso 74.75) [calc lente_mecanica]"), (24.75, "luz entre ruedas Ø50 vecinas"), (6.7, "banda↔rueda v4 [user BLOQUE v4]")]:
    if luz <= 4: d = 2
    elif luz <= 6: d = 10
    elif luz <= 8: d = 20
    elif luz <= 10: d = 80
    elif luz <= 12: d = 100
    elif luz <= 20: d = 120
    elif luz <= 30: d = 850
    else: d = 850
    print(f"   {tag:62s}: e = {luz:5.2f} mm → distancia de seguridad al punto peligroso ≥ {d} mm (ranura)")
# PFHd budget for PL d
print("  PL d exige PFHd 1e-7…1e-6 /h [web IDEC]; relés PL e: PNOZ s3 2.31e-9, XPSUAF13AP 1.13e-9, 3SK1111 1.7e-9 → el presupuesto lo consumen contactor/STO y pulsadores, no el relé.")

# ---------------------------------------------------------------- 11. Caja DIN: ancho de riel
h("11. Caja DIN por módulo Omni — presupuesto de ancho de riel (mm)")
items = [("ESX10-TC 48 V ×4 (nodo, drv A, drv B, reserva)", 4 * 12.5), ("DDR-120C-24", 32), ("e-fuse 24 V (REX12-T 2 canales)", 12.5),
         ("Placa ESP32 DIN (Waveshare 8DI-8RO-C ~ 145 mm) [A VERIFICAR]", 145), ("Relé de seguridad local opcional (17.5–22.5)", 22.5),
         ("Contactor/relé 48 V 2 canales corte motores (2×17.5)", 35), ("Bornes PTFIX 48 V/0 V/24 V/PE (4×~25)", 100), ("Chopper de freno (módulo propio) [A VERIFICAR]", 45)]
tot = 0
for n, w in items:
    tot += w
    print(f"   {n:64s}: {w:6.1f}")
print(f"   Total riel ≈ {tot:.0f} mm (2 rieles de 250 mm) + 2 drivers CL57T fuera del riel (dimensiones A VERIFICAR) → caja ≈ 300×300×150 o 400×300×150 mm [calc]")
print("  Disipación en caja: 2 drivers (10 % de 100 W = 10 W c/u) + DDR (9 % de 15 W) + chopper (≤ 5 W medios) + ESP32 5 W ≈ 32 W → ΔT interior ≈ 32 W / (0.3 m² · 5 W/m²K) ≈ 21 K en caja metálica cerrada sin ventilación [calc, coef. A VERIFICAR]")
