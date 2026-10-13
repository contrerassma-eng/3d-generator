"""Verificación numérica — lente mecánica REV B vs Bloque OMNI v4.
Todas las fórmulas explícitas; entradas marcadas [user]/[web]/[supuesto A VERIFICAR]."""
import math
g = 9.81
print("=== 1. CINEMÁTICA ===")
for D in (0.050, 0.064):
    for v in (1.0, 1.5):
        n = 60*v/(math.pi*D); w = v/(D/2)
        print(f"D={D*1000:.0f} mm v={v} m/s -> n={n:.1f} rpm, omega={w:.1f} rad/s")

print("\n=== 2. GEOMETRÍA DEL LECHO EN LA ZONA ZP2026 (598 mm, paso 74.75) ===")
zona = 598.0
for p in (76.2, 74.75):
    span = 7*p; first = (zona-span)/2
    print(f"paso {p}: span 7p={span:.2f} mm; 1er eje a {first:.3f} del borde de zona; "
          f"ejes en {[round(first+i*p,2) for i in range(8)]}")
print("posiciones de rodillos retirados (paso 74.75):", [round(37.375+i*74.75,3) for i in range(8)])
print("desfase extremo si paso 76.2:", round((7*76.2-7*74.75)/2,3), "mm; luz eje1-rodillo vecino:", round(74.75-(7*76.2-7*74.75)/2,2))
for D in (50, 64):
    print(f"luz entre envolventes de rueda Ø{D} a paso 74.75: {74.75-D:.2f} mm; a 76.2: {76.2-D:.2f}")
for L in (500, 300):
    print(f"caja L={L}: ejes bajo caja a 74.75 = {L/74.75:.2f} -> {math.floor(L/74.75)}..{math.ceil(L/74.75)+0}")

print("\n=== 3. CORREAS HTD 5M 28T (Dp = z·p/π) ===")
Dp = 28*5/math.pi
print(f"Dp = {Dp:.2f} mm ; π·Dp = {math.pi*Dp:.2f} mm")
for L, C_obj in ((445, 152.4), (445, 149.5), (440, 149.5)):
    C = (L - math.pi*Dp)/2
    print(f"correa {L}-5M: C = {C:.2f} mm ; objetivo {C_obj} -> error {C-C_obj:+.2f} mm")
for half in (76.2, 74.75):
    C = (355 - math.pi*Dp)/2; h = math.sqrt(C**2 - half**2)
    print(f"355-5M motor centrado, semipaso {half}: C={C:.2f}, caída h={h:.2f} mm")
# lazo de 3 poleas (motor + 2 ejes centrales), poleas iguales -> L = perímetro triángulo de centros + π·Dp
for L in (500, 505, 510):
    s = (L - math.pi*Dp - 149.5)/2  # cada diagonal
    h = math.sqrt(max(s**2 - 74.75**2, 0))
    ang_top = math.degrees(math.atan2(h, 74.75))
    wrap_top = 180 - ang_top; wrap_motor = 180 - (180 - 2*ang_top)
    print(f"lazo 3 poleas {L}-5M paso 74.75: diagonal={s:.2f}, h={h:.2f}; abrazo ejes={wrap_top:.0f}° ({28*wrap_top/360:.1f} dientes), motor={wrap_motor:.0f}° ({28*wrap_motor/360:.1f} dientes)")

print("\n=== 4. FUERZAS: reparto ±45°, fricción necesaria, a_max ===")
mu_r = 0.03  # [REV B supuesto]
def fam(m, a):
    Freq = m*a + mu_r*m*g; Ffam = Freq/math.sqrt(2); T = Ffam*0.025
    return Freq, Ffam, T
for m in (5.0, 2.5, 0.5):
    for a in (1.0, 2.0, 3.0):
        Freq, Ffam, T = fam(m, a)
        print(f"m={m} a={a}: Freq={Freq:.2f} N, F_fam={Ffam:.2f} N, T_contacto/fam(r=25)={T:.3f} N·m, "
              f"μ_req = F_fam/(W/2) = {Ffam/(m*g/2):.3f}")
print("a_max con familias compartiendo el peso a partes iguales: a_max = μ·g/√2 − μr·g")
for mu in (0.3, 0.4, 0.5, 0.6):
    amax = mu*g/math.sqrt(2) - mu_r*g; amax_fis = (mu-mu_r)*g
    print(f"  μ={mu}: a_max={amax:.2f} m/s²  (FISICA_PRIMEROS_PRINCIPIOS decía {amax_fis:.2f}); "
          f"parada desde 1.5: {1.5**2/(2*amax)*1000:.0f} mm; desde 1.0: {1.0**2/(2*amax)*1000:.0f} mm")
print("cinemática mecanum 45°: v_x=(vA+vB)/2, v_y=(vB−vA)/2 -> desvío con vA=−vB=1.5: v_lat=1.5 m/s")
print("velocidad de rodadura libre del rodillo en desvío: λ=(vB−vA)/√2 =", round(3.0/math.sqrt(2),2), "m/s ->",
      f"rodillo Ø18: {3.0/math.sqrt(2)/(math.pi*0.018)*60:.0f} rpm sobre pasador liso")

print("\n=== 5. INERCIA REFLEJADA POR FAMILIA (1:1) ===")
def J_fam(m_w, k_w, n_w=16, m_shaft=0.57, r_shaft=0.00685, n_shaft=4, m_pul=0.15, r_pul=0.022, n_pul=8, J_rotor=4.8e-5):
    Jw = n_w*m_w*k_w**2; Js = n_shaft*0.5*m_shaft*r_shaft**2; Jp = n_pul*0.5*m_pul*r_pul**2
    return Jw, Js, Jp, J_rotor, Jw+Js+Jp+J_rotor
A_hex = math.sqrt(3)/2*12.7**2  # mm² hexágono AF 12.7
print(f"área hex 1/2in = {A_hex:.1f} mm² ; masa eje L=520 mm acero = {A_hex*520*7.85e-6:.3f} kg")
for label, m_w, k_w, r in (("rueda Ø50 0.10 kg k=25mm", 0.10, 0.025, 0.025), ("rueda v7 Ø64 ~0.09 kg k=28mm", 0.09, 0.028, 0.032), ("rueda Ø64 0.15 kg k=30mm", 0.15, 0.030, 0.032)):
    Jw, Js, Jp, Jr, Jt = J_fam(m_w, k_w)
    print(f"{label}: J_ruedas={Jw:.2e} J_ejes={Js:.2e} J_poleas={Jp:.2e} J_rotor={Jr:.1e} -> J_fam={Jt:.2e} kg·m²")
    for a in (2.0, 3.0):
        alpha = a/r
        print(f"   a={a} m/s² (α={alpha:.0f} rad/s²): T_inercia={Jt*alpha:.3f} N·m ; + caja 5 kg: {Jt*alpha + fam(5,a)[1]*r:.3f} N·m")
    for t_inv in (0.3, 0.5, 1.0):
        w = 1.5/r; alpha = 2*w/t_inv
        print(f"   inversión ±1.5 m/s en {t_inv} s: α={alpha:.0f} rad/s² -> T_inercia={Jt*alpha:.2f} N·m (sin caja)")
    w = 1.5/r
    print(f"   energía cinética rotacional por familia a 1.5 m/s: {0.5*Jt*w**2:.2f} J ; caja 5 kg: {0.5*5*1.5**2:.2f} J")

print("\n=== 6. TENSIÓN DE CORREA Y CARGAS RADIALES ===")
r_p = Dp/2/1000
for T in (0.6, 0.8):
    Te = T/r_p
    print(f"T={T} N·m -> Te = T/r_p = {Te:.1f} N ; carga radial por correa con Ti=1.0..1.3·Te por ramal: {2*Te:.0f}..{2*1.3*Te:.0f} N")
print("HTD 5M 9 mm: tracción admisible catálogo 208 N (Reichelt, 10 mm) [web anexo] -> Te 36 N es 17 %")
print("\n=== 7. FLEXIÓN Y FATIGA DEL HOMBRO Ø12 ===")
d = 0.012
for F, a_over in ((100, 0.015), (200, 0.015), (100, 0.040), (200, 0.040)):
    M = F*a_over; sig = 32*M/(math.pi*d**3)/1e6
    print(f"F={F} N voladizo {a_over*1000:.0f} mm: M={M:.2f} N·m, σ_nom={sig:.1f} MPa ; con Kt≈2.1 (hombro r≈0.5, D/d≈1.2): {2.1*sig:.1f} MPa")
Su = 500.0  # MPa [supuesto: acero trefilado tipo SAE1020/1045, A VERIFICAR]
Se = 0.5*Su*0.85*0.98  # Marin: ka trefilado ~0.85 (aprox), kb d=12 ~0.98
print(f"Se estimado (Su={Su} MPa A VERIFICAR) ≈ {Se:.0f} MPa -> SF fatiga con 200 N a 15 mm y Kf 2.1: {Se/(2.1*32*200*0.015/(math.pi*d**3)/1e6):.1f}")
print(f"ciclos por hora a 573 rpm: {573*60:.0f} -> 1e6 ciclos en {1e6/573/60:.1f} h : diseño a vida infinita")
tau = 16*0.8/(math.pi*d**3)/1e6
print(f"torsión Ø12 con 0.8 N·m: τ={tau:.2f} MPa (despreciable)")

print("\n=== 8. RODAMIENTOS: L10 = (C/P)^3 · 1e6 rev ===")
for name, C in (("6001-2RS (C≈5.1 kN SKF; RS Chile C3 5.4 kN)", 5100), ("F6801/61801 (C≈1.95 kN A VERIFICAR)", 1950)):
    for P in (100, 250):
        L10 = (C/P)**3*1e6; h = L10/(573*60)
        print(f"{name} P={P} N: L10={L10:.2e} rev = {h:.0f} h a 573 rpm")

print("\n=== 9. APILADO AXIAL DE PLANOS DE TRANSMISIÓN ===")
interior = 533.6; body = 400.0
for label, w_plane, n_planes in (("HTD 28-5M-09 catálogo (L=22.5) 3 planos/fam", 22.5, 3), ("HTD 28-5M-09 catálogo 6 planos (2 fam mismo lado)", 22.5, 6),
                                  ("HTD compacta 13 mm/plano, 6 planos", 13.0, 6), ("HTD 2 planos/fam (lazo 3 poleas), 4 planos ×15", 15.0, 4),
                                  ("Poly-V PJ doble Ø40×20 v4: 2 planos/fam, 4 planos ×10", 10.0, 4)):
    stack = n_planes*w_plane + (n_planes-1)*2 + 8 + 5 + 3  # planos + separación 2 + placa 8 + guarda 5 + holgura 3
    print(f"{label}: apilado ≈ {stack:.0f} mm ; zona muerta disponible {interior-body:.1f} mm -> {'CABE' if stack<=interior-body else 'NO CABE'}")

print("\n=== 10. ALTURAS EN EL HUECO DEL ZP2026 ===")
plano = 115.1
for D, extra in ((50, 0), (50, 2), (64, 0), (64, 2)):
    z_axis = plano + extra - D/2
    print(f"Ø{D} +{extra} mm: eje a z={z_axis:.1f}; fondo de rueda z={z_axis-D/2:.1f}; larguero LT_G tope 107.9 / pestaña inferior −82.6 ; tapa v4 107.1–110.1")
h_motor = 77.6
print(f"motor bajo eje (lazo 505-5M): z_motor = {plano-25-h_motor:.1f} (Ø50) ; cuerpo NEMA23 57 mm -> z {plano-25-h_motor-28.5:.1f}…{plano-25-h_motor+28.5:.1f} ; envolvente rueda Ø50 fondo 65.1 ; travesaño TR_S tope 14.1 en x=±280.2")

print("\n=== 11. VELOCIDAD CRÍTICA DEL EJE (apoyado-apoyado, L=0.52 m) ===")
E = 200e9; I = 5*math.sqrt(3)/16*(12.7/2*2/math.sqrt(3))**4*1e-12  # I hexágono = 5√3/16·a⁴, a = lado = AF/√3
a_side = 12.7/math.sqrt(3); I = 5*math.sqrt(3)/16*a_side**4*1e-12
mL = (A_hex*1e-6*7850) + 4*0.10/0.52
wn = (math.pi/0.52)**2*math.sqrt(E*I/mL)
print(f"I_hex={I*1e12:.0f} mm⁴, m/L={mL:.2f} kg/m -> ω_n={wn:.0f} rad/s = {wn*60/2/math.pi:.0f} rpm (operación 573 rpm, ratio {573/(wn*60/2/math.pi):.2f})")

print("\n=== 12. ADAPTADOR HEX 14 -> 1/2 in ===")
print(f"vértices hex 1/2in: {12.7/math.cos(math.radians(30)):.2f} mm ; vértices hex 14: {14/math.cos(math.radians(30)):.2f} ; pared en caras (14−12.7)/2 = {(14-12.7)/2:.2f} mm")

print("\n=== 13. PARADA EN ZONA A 1.5 vs 1.0 m/s ===")
for v in (1.0, 1.5):
    for a in (2.0, 3.2):
        print(f"v={v} a={a}: s_parada = v²/2a = {v**2/(2*a)*1000:.0f} mm (zona 598, caja 500)")

print("\n=== 14. MASA ESTIMADA DEL MÓDULO (A VERIFICAR en CAD) ===")
m = dict(ejes=8*0.57, ruedas=32*0.10, poleas=16*0.15, correas=8*0.03, motores=2*1.2, rodamientos=16*0.02,
         placas=2*0.594*0.181*0.004*7850, tapa=0.598*0.400*0.003*7850, base_travesanos=3.0, separadores=1.0)
print({k: round(v,2) for k,v in m.items()}, "-> total ≈", round(sum(m.values()),1), "kg")
print("frecuencia de engrane HTD 28T a 573 rpm:", round(28*573/60), "Hz")
