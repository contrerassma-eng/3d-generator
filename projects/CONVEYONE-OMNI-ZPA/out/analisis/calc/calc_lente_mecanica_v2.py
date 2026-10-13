"""Lente mecánica — verificación numérica REV B vs Bloque OMNI v4 (ZP2026).
Fórmulas explícitas. Entradas: [user]=REV B/handoff/repo, [web]=research_*.md, [sup]=supuesto A VERIFICAR."""
import math
g = 9.81
def sec(t): print("\n" + "=" * 8 + " " + t + " " + "=" * 8)

sec("1 CINEMÁTICA n = 60·v/(π·D)")
for D in (0.050, 0.064):
    for v in (1.0, 1.5):
        print(f"D={D*1000:.0f} v={v}: n={60*v/(math.pi*D):.0f} rpm, ω={v/(D/2):.1f} rad/s")

sec("2 LECHO EN ZONA ZP2026 (598 mm; rodillos vecinos a 37.375 del borde de zona) [user: BLOQUE_OMNI_v1]")
zona = 598.0
for p in (76.2, 74.75):
    first = (zona - 7*p)/2
    d_vecino = first + 37.375            # eje 1 al rodillo vecino de la zona anterior
    print(f"paso {p}: 7p={7*p:.2f}; eje1 a {first:.2f} del borde; eje1–rodillo vecino {d_vecino:.2f} mm; "
          f"luz Ø50/Ø50 {d_vecino-50:.1f} mm; luz Ø64/Ø50 {d_vecino-57:.1f} mm; misma familia 2p={2*p:.2f}")
print(f"REV B 24 in = 609.6 vs zona 598: sobra {609.6-598:.1f} mm -> NO cabe como zona entera")
for D in (50, 64):
    for p in (74.75, 76.2):
        print(f"  luz entre envolventes Ø{D} a paso {p}: {p-D:.2f} mm")
for L in (500, 300, 250):
    print(f"caja L={L}: ejes bajo caja (paso 74.75) = {L/74.75:.2f} -> {math.floor(L/74.75)}..{math.floor(L/74.75)+1}; "
          f"reparto A/B peor caso: {math.ceil((math.floor(L/74.75)+1)/2)}:{(math.floor(L/74.75)+1)//2} ó {math.ceil(math.floor(L/74.75)/2)}:{math.floor(L/74.75)//2}")

sec("3 CORREAS HTD 5M: Dp = z·p/π ; poleas iguales L = 2C + π·Dp")
for z in (20, 22, 24, 26, 28):
    Dp = z*5/math.pi
    print(f"{z}T: Dp={Dp:.2f} De≈{Dp-1.14:.2f} (De = Dp − 2·0.57 [sup: catálogo REV A 28T De 43.42])")
Dp28 = 28*5/math.pi
for L, C_obj, tag in ((445, 152.4, "REV B paso 76.2"), (445, 149.5, "paso 74.75"), (440, 149.5, "paso 74.75"), (440, 152.4, "paso 76.2")):
    C = (L - math.pi*Dp28)/2
    print(f"{L}-5M 28T: C={C:.2f}; objetivo {C_obj} ({tag}) -> error {C-C_obj:+.2f} mm")
for half in (76.2, 74.75):
    C = (355 - math.pi*Dp28)/2; h = math.sqrt(C**2 - half**2)
    print(f"355-5M motor centrado, semipaso {half}: C={C:.2f}, caída motor h={h:.2f} mm")
print("frecuencia de engrane 28T a 573 rpm =", round(28*573/60), "Hz ; a 448 rpm (Ø64) =", round(28*448/60), "Hz")
# altura del dorso de correa sobre la polea vs plano de rodadura
for D_r, z in ((50, 28), (50, 24), (50, 20), (64, 28), (64, 24), (64, 20)):
    Dp = z*5/math.pi; z_axis = 115.1 - D_r/2
    top_belt = z_axis + Dp/2 + 3.2      # dorso ≈ línea primitiva + (3.8 espesor − 0.57) [sup: HTD 5M 3.8 mm]
    print(f"rueda Ø{D_r}, polea {z}T: dorso de correa sobre la polea a z={top_belt:.1f} vs plano 115.1 -> "
          f"{115.1-top_belt:+.1f} mm bajo el plano; tapa e3 necesita ≥ {3+2:.0f} mm -> {'OK' if 115.1-top_belt>=5 else 'NO CABE TAPA'}")

sec("4 TORQUE DE CONTACTO POR FAMILIA (mecanum 45°)")
mu_r = 0.03  # [user REV B]
print("REV B: F_fam = F_req/√2 ; T_REVB = F_fam·r   |  balance de potencia: T = F_fam·r·cos45 = F_req·r/2")
for m in (5.0, 2.5, 0.5):
    for a in (1.0, 2.0, 3.0):
        Freq = m*a + mu_r*m*g; Ffam = Freq/math.sqrt(2)
        print(f"m={m} a={a}: F_req={Freq:.2f} N F_fam={Ffam:.2f} N | T_REVB={Ffam*0.025:.3f} | T_física(Ø50)={Freq*0.025/2:.3f} | T_física(Ø64)={Freq*0.032/2:.3f} N·m"
              f" | μ_req = F_fam/(W/2) = {Ffam/(m*g/2):.3f}")
print("→ REV B sobreestima el torque de contacto ×√2 = 1.41 (conservador). Cifra 0.203 -> 0.143 N·m (Ø50)")

sec("5 TRACCIÓN: a_max = μ·g/√2 − μr·g  (cada familia lleva W/2 y empuja a 45°)")
for mu in (0.3, 0.4, 0.5, 0.6):
    amax = mu*g/math.sqrt(2) - mu_r*g
    print(f"μ={mu}: a_max={amax:.2f} m/s² (FISICA decía (μ−μr)g={(mu-mu_r)*g:.2f}: sobreestima ×{((mu-mu_r)*g)/amax:.2f}) ; "
          f"s_parada 1.5 m/s={1.5**2/(2*amax)*1000:.0f} mm ; 1.0 m/s={1.0**2/(2*amax)*1000:.0f} mm")
print("Zona 598: espacio para frenar desde entrada = 598 − latencia·v ; caja 500 debe quedar dentro → s_parada + v·t_lat ≤ 598")
for v in (1.0, 1.5):
    for mu in (0.3, 0.4, 0.5):
        amax = mu*g/math.sqrt(2) - mu_r*g
        s = v**2/(2*amax)*1000 + v*0.020*1000
        print(f"  v={v} μ={mu}: s_total(20 ms latencia)={s:.0f} mm -> {'OK' if s<=598 else 'EXCEDE ZONA'}")

sec("6 GUIÑADA Y DERIVA LATERAL POR REPARTO A/B DESIGUAL (FORWARD)")
for L, nA, nB in ((500, 4, 3), (300, 2, 2), (300, 2, 1), (250, 2, 1)):
    n = nA+nB; Fy_over_Fx = (nA-nB)/n
    print(f"caja {L}: {nA}A+{nB}B -> F_y/F_x = (nA−nB)/n = {Fy_over_Fx:.2f} (deriva lateral {Fy_over_Fx*100:.0f} % de la fuerza de avance)")
I5 = 5*(0.5**2+0.3**2)/12
for a in (1.0, 2.0):
    Freq = 5*a + mu_r*5*g; Ffam = Freq/math.sqrt(2)
    M = Ffam*math.sin(math.pi/4)*0.07475     # Δx centroides ≈ 1 paso
    alpha = M/I5; t = 1.5/a
    print(f"m=5 a={a}: M_yaw={M:.3f} N·m, I={I5:.3f} kg·m², α={alpha:.2f} rad/s², giro en t={t:.2f}s ≈ {math.degrees(0.5*alpha*t**2):.0f}° (sin guías, sin fricción de rodillos: cota superior)")

sec("7 INERCIA REFLEJADA POR FAMILIA (1:1) y par en inversión")
A_hex = math.sqrt(3)/2*12.7**2
m_shaft = A_hex*560*7.85e-6
print(f"área hex 1/2in = {A_hex:.1f} mm² ; masa eje L=560 mm acero = {m_shaft:.3f} kg")
def J_fam(m_w, k_w, r_pul, m_pul, n_pul, n_w=16, n_shaft=4, J_rotor=4.8e-5):
    Jw = n_w*m_w*k_w**2; Js = n_shaft*0.5*m_shaft*0.00685**2; Jp = n_pul*0.5*m_pul*r_pul**2
    return Jw, Js, Jp, J_rotor, Jw+Js+Jp+J_rotor
cases = (("Ø50 china 0.10 kg k=20 [sup REV B]", 0.10, 0.020, 0.025, 0.022, 0.15, 6),
         ("v7 Ø64 0.08 kg k=24 [sup: 26.5 g cuerpo + rodillos A VERIFICAR]", 0.08, 0.024, 0.032, 0.020, 0.06, 4),
         ("Ø64 0.15 kg k=26 (peor caso)", 0.15, 0.026, 0.032, 0.020, 0.10, 4))
for label, m_w, k_w, r, r_p, m_p, n_p in cases:
    Jw, Js, Jp, Jr, Jt = J_fam(m_w, k_w, r_p, m_p, n_p)
    print(f"{label}: J_ruedas={Jw:.2e} J_ejes={Js:.2e} J_poleas={Jp:.2e} J_rotor={Jr:.1e} -> J_fam={Jt:.2e} kg·m²")
    for a in (2.0, 3.0):
        alpha = a/r; Freq = 5*a + mu_r*5*g
        print(f"   a={a} (α={alpha:.0f} rad/s²): T_inercia={Jt*alpha:.3f} + T_caja(física)={Freq*r/2:.3f} = {Jt*alpha+Freq*r/2:.3f} N·m ; con T_REVB: {Jt*alpha+Freq/math.sqrt(2)*r:.3f}")
    for v, t_inv in ((1.5, 0.3), (1.5, 0.5), (1.0, 0.3), (1.0, 0.5)):
        w = v/r; alpha = 2*w/t_inv
        print(f"   inversión ±{v} m/s en {t_inv} s: α={alpha:.0f} rad/s² -> T_inercia={Jt*alpha:.2f} N·m (sin caja)")
    w = 1.5/r
    print(f"   E_cin rotacional familia a 1.5 m/s: {0.5*Jt*w**2:.2f} J ; a 1.0: {0.5*Jt*(1.0/r)**2:.2f} J ; caja 5 kg a 1.5: {0.5*5*1.5**2:.2f} J")

sec("8 TENSIÓN DE CORREA, CARGA RADIAL, POLY-V")
for z, T in ((28, 0.6), (28, 0.8), (24, 0.8), (20, 0.8)):
    r_p = z*5/math.pi/2/1000
    Te = T/r_p
    print(f"HTD {z}T, T={T} N·m: Te={Te:.1f} N ; Ti≈Te..1.3Te [sup Gates] -> carga radial 2·Ti = {2*Te:.0f}..{2*1.3*Te:.0f} N por correa ; "
          f"vs 208 N admisible 5M-10 mm [web Reichelt, digest anexo] -> {Te/208*100:.0f} % (9 mm ≈ {Te/(208*0.9)*100:.0f} %)")
print("Motor REV B (2 correas 355 a ±45°): resultante ≈ 2·Ti·√2 ≈", round(2*36*1.414), "N a ~25 mm de la brida (2 poleas apiladas) ; rating radial NEMA 23: A VERIFICAR (no en fichas descargadas)")
# Poly-V PJ: capacidad por fricción con abrazo θ
mu_pv = 0.3   # [sup A VERIFICAR: goma/acero seco]
for theta_deg in (90, 120, 180):
    theta = math.radians(theta_deg); mu_eff = mu_pv/math.sin(math.radians(20))   # PJ ángulo 40° [sup]
    ratio = math.exp(mu_eff*theta)
    Te = 0.8/0.020
    F2 = Te/(ratio-1); F1 = F2+Te
    print(f"Poly-V PJ Ø40, abrazo {theta_deg}°: F1/F2=e^(μ'θ)={ratio:.1f} (μ'={mu_eff:.2f}) ; Te=40 N -> F2={F2:.0f} N, F1={F1:.0f} N; con SF 2 en Te: F1+F2 ≈ {2*(F2*2+Te):.0f}..{(F1+F2)*2:.0f} N radial")
print("o-ring PU 3/16 (BF21): par transmisible no documentado ('validar deslizamiento o duplicar anillos') [user TRANSFER-BF21]")

sec("9 FLEXIÓN/FATIGA DEL HOMBRO Ø12 (σ = 32M/πd³)")
d = 0.012
for F, a_over in ((100, 0.015), (200, 0.015), (200, 0.025)):
    M = F*a_over; sig = 32*M/(math.pi*d**3)/1e6
    print(f"F={F} N a {a_over*1000:.0f} mm: M={M:.2f} N·m σ_nom={sig:.1f} MPa ; Kt≈2.1 [sup hombro r≈0.5, D/d 1.2] -> {2.1*sig:.1f} MPa")
Su = 440.0  # [sup: SAE 1020 trefilado ~440 MPa A VERIFICAR]
Se = 0.5*Su*0.85*0.98
print(f"Se ≈ 0.5·Su·ka·kb = {Se:.0f} MPa (Su={Su} A VERIFICAR) -> SF fatiga (200 N, 25 mm, Kf 2.1) = {Se/(2.1*32*200*0.025/(math.pi*d**3)/1e6):.1f}")
print(f"ciclos/h a 573 rpm = {573*60}; 1e6 ciclos en {1e6/573/60:.0f} h -> diseño a vida infinita")
print(f"torsión Ø12 con 0.8 N·m: τ = 16T/πd³ = {16*0.8/(math.pi*d**3)/1e6:.2f} MPa ; torsión hex J≈0.1154·AF⁴={0.1154*12.7**4:.0f} mm⁴ -> giro en 0.5 m = {math.degrees(0.8*0.5/(80e9*0.1154*12.7**4*1e-12)):.3f}°")
print(f"vértices hex 1/2in = {12.7/math.cos(math.radians(30)):.2f} mm -> rebaje a Ø12 quita {12.7/math.cos(math.radians(30))-12:.2f} mm en vértices y {12.7-12:.2f} en caras")

sec("10 RODAMIENTOS L10 = (C/P)^3·1e6 rev")
for name, C in (("6001-2RS C≈5.1 kN [web: RS Chile C3 5.4 kN, REV B]", 5100), ("F6801/61801 C≈1.9 kN [sup A VERIFICAR]", 1900)):
    for P, n in ((100, 573), (250, 573), (250, 448)):
        L10 = (C/P)**3*1e6; h = L10/(n*60)
        print(f"{name} P={P} N n={n}: L10={h:.0f} h")

sec("11 APILADO AXIAL EN LA ZONA MUERTA (interior 533.6 − activo)")
for body in (400.0, 350.0, 270.0):
    dead = 533.6 - body
    for label, w, n in (("HTD 28-5M-09 catálogo L=22.5, 3 planos/fam ×2 fam", 22.5, 6),
                        ("HTD 3 planos/fam, familias en lados opuestos (3 planos)", 22.5, 3),
                        ("HTD lazo 3 poleas (2 planos/fam) ×2, poleas recortadas 15", 15.0, 4),
                        ("HTD serpentín 1 plano/fam ×2, poleas 15", 15.0, 2),
                        ("Poly-V PJ doble Ø40×20 v4: 4 planos ×10", 10.0, 4)):
        stack = n*w + (n-1)*3 + 8 + 5 + 5   # planos + luz 3 + placa 8 + separador 5 + guarda 5
        print(f"activo {body:.0f} (muerto {dead:.1f}): {label}: {stack:.0f} mm -> {'CABE' if stack <= dead else 'NO CABE'}")

sec("12 ALTURAS EN EL HUECO DEL ZP2026 (plano 115.1; LT_G tope 108, pestaña inf −82.6; TR_S tope 14.1 en x=±280.2)")
for D, extra in ((50, 0), (50, 2), (64, 0), (64, 2)):
    z_axis = 115.1 + extra - D/2
    print(f"Ø{D} +{extra}: eje z={z_axis:.1f}; fondo rueda {z_axis-D/2:.1f}; polea 28T top {z_axis+24:.1f} / 24T {z_axis+20.5:.1f} / Ø40 {z_axis+20:.1f}")
for D, h in ((50, 77.3), (64, 77.3), (64, 100)):
    z_axis = 115.1 - D/2; zm = z_axis - h
    print(f"Ø{D} motor a h={h} bajo eje: eje motor z={zm:.1f}; cuerpo NEMA23 57 -> z {zm-28.5:.1f}…{zm+28.5:.1f}; fondo rueda {z_axis-D/2:.1f} -> luz {z_axis-D/2-(zm+28.5):.1f} mm ; pestaña inf −82.6 -> luz {zm-28.5+82.6:.1f}")
p = 74.75
ejes = [round(-3.5*p + i*p, 1) for i in range(8)]
print("ejes x (paso 74.75, zona centrada):", ejes)
print("familia A (1,3,5,7):", ejes[0::2], "-> motor centrado entre centrales en x =", round((ejes[2]+ejes[4])/2, 1))
print("familia B (2,4,6,8):", ejes[1::2], "-> motor en x =", round((ejes[3]+ejes[5])/2, 1), "; distancia entre motores =", round((ejes[3]+ejes[5])/2-(ejes[2]+ejes[4])/2, 1), "mm vs cuerpo 57 -> luz", round((ejes[3]+ejes[5])/2-(ejes[2]+ejes[4])/2-57, 1))
print("lazo de 3 poleas (motor + 2 ejes centrales, poleas iguales): abrazo motor = 2·atan(h/74.75)")
for h in (77.3, 100, 120):
    ang = math.degrees(math.atan(h/74.75)); wrap_m = 2*ang; wrap_a = 180 - ang
    print(f"  h={h}: abrazo motor {wrap_m:.0f}° = {28*wrap_m/360:.1f} dientes ; ejes {wrap_a:.0f}° = {28*wrap_a/360:.1f} dientes (mín 6 en engrane [sup Gates])")

sec("13 VELOCIDAD CRÍTICA DEL EJE (apoyado-apoyado, L=0.56 m, hex + 4 ruedas)")
a_side = 12.7/math.sqrt(3); I = 5*math.sqrt(3)/16*a_side**4*1e-12
E = 200e9
for m_w in (0.10, 0.15):
    mL = A_hex*1e-6*7850 + 4*m_w/0.56
    wn = (math.pi/0.56)**2*math.sqrt(E*I/mL)
    print(f"I_hex={I*1e12:.0f} mm⁴, m/L={mL:.2f} kg/m (ruedas {m_w} kg) -> n_crit={wn*60/2/math.pi:.0f} rpm ; ratio 573/n_crit={573/(wn*60/2/math.pi):.2f}")
print("desbalance: separador PVC ID 20.9 sobre vértices 14.66 -> excentricidad hasta 3.1 mm ; masa tubo 3/4 SCH40 ≈ 0.6 kg/m [sup] -> "
      f"fuerza a 573 rpm por 40 mm de tubo: m·e·ω² = {0.6*0.04*0.0031*60**2:.2f} N (bajo) pero golpeteo/ruido")

sec("14 ADAPTADOR HEX 14 → 1/2 in")
print(f"pared en caras (14−12.7)/2 = {(14-12.7)/2:.2f} mm ; v4: 14.4/12.85 -> {(14.4-12.85)/2:.2f} mm ; v7 hex 14.5 -> {(14.5-12.85)/2:.3f} mm")
print(f"vértices hex 14 = {14/math.cos(math.radians(30)):.2f} ; vértices hex 12.7 = {12.7/math.cos(math.radians(30)):.2f}")

sec("15 DESVÍO 90°: recorrido y tiempo")
for W, d_b, vl, a in ((300, 400, 1.0, 2.0), (300, 400, 1.5, 2.0), (300, 270, 1.0, 2.0), (250, 270, 1.0, 2.0), (300, 400, 1.0, 1.0)):
    s = (d_b + W)/2/1000 + 0.05
    t_acc = vl/a; s_acc = 0.5*a*t_acc**2
    t = (2*t_acc + (s-2*s_acc)/vl) if s > 2*s_acc else 2*math.sqrt(s/a)
    print(f"W={W} lecho={d_b} v_lat={vl} a={a}: recorrido {s*1000:.0f} mm -> t≈{t:.2f} s (+ cruce de zona muerta 133 mm en rodadura libre: a=−μr·g={mu_r*g:.2f} m/s²)")

sec("16 MASA DEL MÓDULO (estimación, A VERIFICAR en CAD)")
m = dict(ejes=8*m_shaft, ruedas=32*0.09, poleas=10*0.10, correas=2*0.05, tensores=6*0.05, motores=2*1.1, rodamientos=16*0.02,
         placas=2*0.594*0.18*0.004*7850, tapa=0.598*0.36*0.003*7850, tapa_ciega=0.598*0.13*0.003*7850, travesanos=2*0.5*0.05*0.006*7850, separadores=0.8, guarda=1.0)
print({k: round(v, 2) for k, v in m.items()}, "-> total ≈", round(sum(m.values()), 1), "kg (Flowsort SLD 15–100 kg [web])")

sec("17 POTENCIA MECÁNICA Y ENERGÍA DE INVERSIÓN")
for v, a in ((1.5, 2.0), (1.0, 2.0)):
    P = (5*a + mu_r*5*g)*v
    print(f"m=5 v={v} a={a}: P_caja={P:.1f} W ; T_motor a n: {P/2/(v/0.025):.3f} N·m/familia (física) ")
