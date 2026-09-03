#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lente accionamiento: puntos de operación, par en motor, corriente/potencia, inversión,
regeneración, pérdida de pasos, relación de transmisión. Todas las entradas están rotuladas
por capa: [user]=handoff/REV B, [web]=research_*.md (URL en el informe), [sup]=hipótesis
de cálculo declarada (A VERIFICAR)."""
import math
g = 9.81
print("="*78); print("§1 PUNTOS DE OPERACIÓN  n = 60·v/(π·D)   [user: v=1.0/1.5 m/s; D=50 REV B; D=64 rueda v7 repo]")
for D in (0.050, 0.064):
    for v in (1.0, 1.5):
        n = 60*v/(math.pi*D); w = v/(D/2)
        print(f"  D={D*1000:.0f} mm v={v} m/s -> n={n:6.1f} rpm  ω={w:5.1f} rad/s  "
              f"pulsos@2000µp={n/60*2000/1000:5.1f} kpps  f_elec(200 pasos, 4/ciclo)={n/60*50:5.0f} Hz")

print("\n§2 PAR DE CONTACTO POR FAMILIA (5 kg, μr=0.03 [user REV B])")
m=5.0; mur=0.03
for a in (1.0, 2.0, 3.0):
    Freq = m*a + mur*m*g; Ffam = Freq/math.sqrt(2)
    for D in (0.050, 0.064):
        r=D/2
        T_revb = Ffam*r                 # fórmula REV B (T = F_fam·r)
        T_corr = Ffam*r*math.cos(math.radians(45))   # balance de potencia (lente_mecanica): T = F_fam·r·cos45
        print(f"  a={a} D={D*1000:.0f}: F_req={Freq:5.2f} N F_fam={Ffam:5.2f} N  T_REVB={T_revb:.3f}  T_corregido={T_corr:.3f} N·m")

print("\n§3 INERCIA REFLEJADA (1:1) J_fam = 16·m_w·k² + 4·(½·m_eje·r_hex²) + n_pol·½·m_pol·r_pol² + J_rotor")
m_eje = 0.614   # kg, hex 1/2in L=560 mm (lente_mecanica) [calculo]
r_hex = 0.00685 # radio equivalente hex 1/2 in [calculo]
J_rotor_57CM23 = 0.48e-4  # kg·m² [web: Leadshine CM datasheet 0.48 kg·cm²]
J_rotor_CSM22326 = 0.70e-4
cases = [("Ø50 china 100 g k=20 mm [user REV B sensib.]", 0.10, 0.020, 0.025, 6, 0.15, 0.022),
         ("v7 Ø64 ~80 g k=24 mm [sup A VERIFICAR: 26.5 g cuerpo + rodillos]", 0.08, 0.024, 0.032, 4, 0.06, 0.020),
         ("Ø64 150 g k=26 mm (peor caso)", 0.15, 0.026, 0.032, 4, 0.10, 0.020),
         ("Ø50 200 g k=20 mm (REV B 'aun duplicando')", 0.20, 0.020, 0.025, 6, 0.15, 0.022)]
res = {}
for lab, mw, k, r, npol, mpol, rpol in cases:
    Jw = 16*mw*k**2; Js = 4*0.5*m_eje*r_hex**2; Jp = npol*0.5*mpol*rpol**2
    Jf = Jw+Js+Jp+J_rotor_57CM23
    res[lab] = (Jf, r)
    print(f"  {lab}: J_ruedas={Jw:.2e} J_ejes={Js:.2e} J_poleas={Jp:.2e} J_rotor={J_rotor_57CM23:.1e} -> J_fam={Jf:.2e} kg·m²")
print("  Nota: J_rotor 23HS45/23HE45 NO ENCONTRADO (research_motores §4); se usa 57CM23 0.48 kg·cm² como orden de magnitud.")

print("\n§4 PAR TOTAL EN MOTOR: aceleración a (caja) y INVERSIÓN ±v en t_inv (sin caja: la caja desliza)")
for lab,(Jf,r) in res.items():
    for a in (2.0,):
        alpha = a/r; Tin = Jf*alpha
        Fc = (m*a+mur*m*g)/math.sqrt(2); Tc_revb = Fc*r; Tc_corr = Fc*r*math.cos(math.radians(45))
        print(f"  {lab[:34]:34s} a={a}: α={alpha:5.1f} rad/s² T_in={Tin:.3f}  T_caja REVB={Tc_revb:.3f} corr={Tc_corr:.3f}  "
              f"Σ(REVB)={Tin+Tc_revb:.3f}  Σ(corr)={Tin+Tc_corr:.3f} N·m")
    for v in (1.0, 1.5):
        for tinv in (0.3, 0.5, 1.0):
            alpha = 2*v/r/tinv; print(f"      inversión ±{v} m/s en {tinv} s: α={alpha:6.0f} rad/s² -> T_inercia={Jf*alpha:.3f} N·m", end="")
        print()

print("\n§5 PAR MÁXIMO QUE UNA CAJA PUEDE IMPONER A UNA FAMILIA (límite de fricción: F ≤ μ·N_fam, N_fam=m·g/2)")
for mu in (0.3, 0.5, 0.8):
    for D in (0.050, 0.064):
        r=D/2; Nf = m*g/2; T = mu*Nf*r*math.cos(math.radians(45)); Trevb = mu*Nf*r
        print(f"  μ={mu} D={D*1000:.0f}: F_max={mu*Nf:5.2f} N -> T_max(corr)={T:.3f} N·m  (fórmula REV B: {Trevb:.3f})")

print("\n§6 MARGEN PULL-OUT STEPPER (research_motores tabla 2a-1, lecturas ±5 %)")
pullout = {  # N·m a (382/400 rpm, 573 rpm)
 "23HE45-4204S 36V DM556T 4.1A (lazo abierto)": (1.97, 1.40),
 "23HS30-2804S 48V DM542T 2.69A": (1.54, 1.17),
 "23HS30-2804S 36V": (1.26, 0.92),
 "Leadshine 57CM23 48V 5A": (1.7, 1.47),
 "Leadshine 57CM26 48V 5A": (1.6, 1.18),
 "CS-M22323 closed-loop 48V": (1.95, 1.70),
 "NEMA34 34HE46 + CL86T 48V": (2.8, 2.0),
}
demand = {"caja 2 m/s² + inercia 100 g (REVB)": 0.203+0.078,
          "inversión 1.5 m/s 0.5 s rueda 150 g + caja deslizando μ0.5": None}
Jworst = res["Ø64 150 g k=26 mm (peor caso)"][0]; Jlight = res["v7 Ø64 ~80 g k=24 mm [sup A VERIFICAR: 26.5 g cuerpo + rodillos]"][0]
J50 = res["Ø50 china 100 g k=20 mm [user REV B sensib.]"][0]
def dem(J, r, v, tinv, mu=0.5): return J*(2*v/r/tinv) + mu*(m*g/2)*r*math.cos(math.radians(45))
print("  Demanda de diseño (par de pico en inversión + caja deslizando μ=0.5 [sup]):")
D50 = dem(J50, 0.025, 1.5, 0.5); D50b = dem(J50, 0.025, 1.5, 0.3); D50c=dem(J50,0.025,1.0,0.3)
print(f"    Ø50/100 g: 1.5 m/s t_inv 0.5 s -> {D50:.2f} N·m ; 0.3 s -> {D50b:.2f} ; 1.0 m/s 0.3 s -> {D50c:.2f}")
D64 = dem(Jworst, 0.032, 1.5, 0.5); D64b = dem(Jworst, 0.032, 1.5, 0.3); D64l = dem(Jlight,0.032,1.5,0.5)
print(f"    Ø64/150 g: 1.5 m/s 0.5 s -> {D64:.2f} ; 0.3 s -> {D64b:.2f} ; Ø64/80 g 0.5 s -> {D64l:.2f}")
for k,(t400,t573) in pullout.items():
    print(f"  {k:46s}: pull-out 573 rpm {t573:.2f} -> margen vs 0.8={t573/0.8:.2f}x vs {D50:.2f}={t573/D50:.2f}x ; "
          f"400 rpm {t400:.2f} -> vs {D50c:.2f}={t400/D50c:.2f}x")

print("\n§7 MODELO ELÉCTRICO SIMPLE DEL STEPPER 23HS45 (R=0.88 Ω, L=3.4 mH [web]) : X=ω_e·L ; I_max≈V/√(R²+X²) (sin back-EMF)")
R=0.88; L=3.4e-3
for n in (382, 448, 573):
    fe = n/60*50; we = 2*math.pi*fe; X = we*L
    s = f"  n={n} rpm f_e={fe:4.0f} Hz X={X:5.1f} Ω : "
    for V in (24,36,48): s += f"V={V}: I_max≈{V/math.sqrt(R*R+X*X):.2f} A  "
    print(s)
print("  -> a 573 rpm sólo 48 V permite acercarse a los 4.2 A nominales; a 24 V la corriente (y el par) cae a ~55 %.")
print("  L/R =", f"{L/R*1000:.1f} ms vs periodo de paso completo a 573 rpm =", f"{1000/(573/60*200):.2f} ms")

print("\n§8 PÉRDIDAS EN COBRE DEL STEPPER (independientes de la carga): P_cu = 2·I_rms²·R, I_rms = I_pk/√2")
for Ipk in (3.0, 4.2, 5.6):
    Irms = Ipk/math.sqrt(2); print(f"  I_pk={Ipk} A -> I_rms={Irms:.2f} A  P_cu={2*Irms**2*R:.1f} W ; con idle 50 %: {2*(Irms/2)**2*R:.1f} W")

print("\n§9 POTENCIA MECÁNICA Y CORRIENTE DE BUS ESTIMADA POR MOTOR (η_mec correa/rodam. 0.90 [sup]; η_driver+motor: stepper ~0.6 [sup], BLDC/servo ~0.8 [sup])")
for T,n,lab in ((0.30,573,"régimen 5 kg 2 m/s² Ø50 (0.30 N·m)"), (0.8,573,"criterio REV B 0.8 N·m @573"),
                (0.8,382,"0.8 N·m @382"), (D50,573,f"pico inversión {D50:.2f} N·m @573")):
    w = n*2*math.pi/60; Pm = T*w
    P_st = Pm/0.9/0.6 + 15.5; P_bl = Pm/0.9/0.8
    print(f"  {lab:38s}: P_mec={Pm:5.1f} W | stepper: P_bus≈{P_st:5.1f} W -> {P_st/24:.2f} A@24V {P_st/48:.2f} A@48V | "
          f"BLDC/servo: P_bus≈{P_bl:5.1f} W -> {P_bl/24:.2f} A@24V {P_bl/48:.2f} A@48V")

print("\n§10 REGENERACIÓN: energía por frenado y capacidad de bus para no superar V_ov")
for lab,J,r in (("Ø50/100 g",J50,0.025),("Ø64/150 g",Jworst,0.032)):
    for v in (1.0,1.5):
        Erot = 0.5*J*(v/r)**2; Ebox = 0.5*m*v**2
        print(f"  {lab} v={v}: E_rot familia={Erot:.2f} J ; E_caja 5 kg={Ebox:.2f} J ; total por DIVERT (2 familias rot + caja)={2*Erot+Ebox:.1f} J")
for V1,V2,lab in ((48,60,"48 V -> OV 60 V (DM556T/iSV)"),(48,52,"48 V -> chopper 52 V (Interroll)"),(24,28,"24 V -> 28 V (ZoneLogix din. brake)")):
    for E in (2.0, 8.0):
        C = 2*E/(V2**2-V1**2); print(f"  {lab}: absorber {E} J sin chopper exige C={C*1000:.1f} mF", end="; ")
    print()
print("  -> capacidades de mF no existen en drivers (µF): la energía la disipa el propio motor/driver o hace falta chopper/clamp [calculo].")

print("\n§11 ECOSISTEMA MDR: velocidad y par en el eje de rueda según motor y relación i (i>1 = multiplicación desde el motor)")
uni = {"UniDrive One 24V (350 rpm, 14 in·lbf=1.58 N·m cont., 25 lbf·in=2.82 arranque) [web]": (350, 14*0.1130, 25*0.1130),
       "UniDrive Signature UD100 24V (560 rpm, 15 in·lbf=1.70) [web]": (560, 15*0.1130, None),
       "UniDrive CORE 48V (700 rpm, 15 in·lbf=1.70, sin electrónica) [web]": (700, 15*0.1130, None),
       "Interroll EC5000 50W 9:1 (767 rpm eje, 0.63 nom / 1.58 acc / 2.54 arranque) [web]": (767, 0.63, 2.54),
       "Interroll EC5000 50W 13:1 (531 rpm, 0.91/2.29/3.66) [web]": (531, 0.91, 3.66),
       "Pulseroller PGD-Ai-48 11:1 (637.5 rpm, 0.75 nom / 1.86 holding) [web]": (637.5, 0.75, 1.86),
       "Pulseroller PGD-Ai-48 15:1 (466.7 rpm, 1.02 / 2.54) [web]": (466.7, 1.02, 2.54),
       "iSV57T-180 servo (3000 rpm, 0.6 nom / 1.1 pico) [web]": (3000, 0.6, 1.1),
       "IDS-C60AP-48V400W / JMC iHSV60 48V (3000 rpm, 1.27 nom) [web]": (3000, 1.27, None)}
eta=0.90
for lab,(nmax,Tn,Ts) in uni.items():
    print(f"  {lab}")
    for D in (0.050, 0.064):
        v11 = nmax*math.pi*D/60
        need15 = 60*1.5/(math.pi*D); need10 = 60*1.0/(math.pi*D)
        i15 = need15/nmax; i10 = need10/nmax
        s = f"     D={D*1000:.0f}: 1:1 -> v_max={v11:.2f} m/s, T_eje={Tn*eta:.2f} N·m"
        if i15>1: s += f" | para 1.5 m/s: multiplicar i={i15:.2f} -> T_eje={Tn*eta/i15:.2f} nom" + (f"/{Ts*eta/i15:.2f} arranque" if Ts else "")
        else: s += f" | 1.5 m/s: reducir i={1/i15:.2f} -> T_eje={Tn*eta/i15:.2f} nom" + (f"/{Ts*eta/i15:.2f} pico" if Ts else "")
        if i10>1: s += f" | 1.0 m/s: i={i10:.2f} -> T_eje={Tn*eta/i10:.2f}"
        else: s += f" | 1.0 m/s: reducir {1/i10:.2f} -> T_eje={Tn*eta/i10:.2f}"
        print(s)

print("\n§12 BLOQUE OMNI v4 del repo: carrete motor Ø68 -> polea eje Ø40 (o-rings/PJ) [user repo]: i = 68/40")
i = 68/40
for D in (0.050,0.064):
    print(f"  UniDrive One 350 rpm × {i:.2f} = {350*i:.0f} rpm en eje -> v = {350*i*math.pi*D/60:.2f} m/s (D={D*1000:.0f}); T_eje cont = {1.58*0.9/i:.2f} N·m, arranque {2.82*0.9/i:.2f}")
print("  ZP2026 propio: carrete Ø68 -> rodillo Ø50 (diámetro de garganta A VERIFICAR): n_rodillo≈", f"{350*68/50:.0f} rpm -> v≈{350*68/50*math.pi*0.05/60:.2f} m/s")

print("\n§13 RELACIÓN ≠ 1:1 PARA STEPPER: con T(n)≈T0·(n0/n) (zona tras el codo) el par reflejado al eje NO cambia con i;")
print("     lo que cambia es la inercia reflejada (J/i²) y la frecuencia de pulsos. Ejemplo 23HE45 36 V:")
for i,(n_mot) in ((1.0,573),(1.5,382),(0.667,860)):
    T_mot = 1.40*573/n_mot if n_mot>=573 else 1.97  # aprox lineal
    print(f"  i={i:.2f} (motor {n_mot:.0f} rpm): T_mot≈{T_mot:.2f} -> T_eje≈{T_mot*i*0.95:.2f} N·m; J_fam reflejada ×{1/i**2:.2f}")

print("\n§14 CICLO DE ARRANQUES: límite UniDrive/ZoneLogix '25 starts/stops per minute at max current limit' [web]")
print("  un DIVERT = 1 familia: stop + start(-) + stop + start(+) = 4 eventos; FORWARD ZPA singulación = 1-2 eventos/caja")
for cajas_min in (10, 20, 40):
    print(f"  {cajas_min} cajas/min con 50 % desviadas: eventos/min por motor ≈ {cajas_min*1 + cajas_min*0.5*4:.0f} (>25 -> fuera de spec)")

print("\n§15 POTENCIA POR MÓDULO OMNI (2 motores) para el balance 48/24 V")
print(f"  2× stepper 23HS45 + DM556T a 48 V: régimen ≈ 2×{(0.30*60/0.9/0.6+15.5):.0f} W = {2*(0.30*60/0.9/0.6+15.5):.0f} W ; pico inversión ≈ 2×{(D50*60/0.9/0.6+15.5):.0f} W = {2*(D50*60/0.9/0.6+15.5):.0f} W ; reposo (idle 50 %) ≈ 2×{2*(4.2/2/math.sqrt(2))**2*R+5:.0f} W")
print(f"  2× UniDrive One 24 V: nominal 2×2 A = 4 A (96 W); stall 2×4 A = 8 A (192 W) [web]")
print(f"  2× EC5000 48 V 50 W: nominal 2×1.7 A = 3.4 A; arranque 2×3.8 A = 7.6 A [web]")
print(f"  2× IDS-C60AP 48 V 400 W: nominal 2×10 A = 20 A a 3000 rpm; a 573 rpm/0.8 N·m estimado 2×{0.8*60/0.8/48:.1f} A [calculo]")
