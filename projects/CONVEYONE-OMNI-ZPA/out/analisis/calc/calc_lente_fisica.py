"""Lente física — lecho mecanum de ejes fijos ±45° (Conveyone Omni).
Todas las fórmulas explícitas. Entradas: [user] REV B / handoff, [web] research_*.md, [sup] supuesto A VERIFICAR.
Ejes: x = avance (UPSTREAM→DOWNSTREAM), y = transversal, z = vertical. Ruedas giran sobre y.
"""
import math
import numpy as np

g = 9.81
r_w = 0.025          # [user] rueda Ø50
mu_r = 0.03          # [user] REV B (Rulmeca da 0.06-0.08 para cartón sobre rodillos: A VERIFICAR)
S2 = math.sqrt(2)
eA = np.array([1, 1]) / S2     # eje del rodillo familia A (en el plano de contacto)
eB = np.array([1, -1]) / S2    # familia B

print("=" * 78)
print("A. CINEMÁTICA DE LA RUEDA MECANUM (rodillos a ±45°)")
print("=" * 78)
print("Restricción por rueda: (v_caja + ω×r − u·x̂)·ê = 0  (sin deslizamiento a lo largo del eje del rodillo;")
print("libre perpendicular a él porque el rodillo rueda). Con ê_A=(1,1)/√2, ê_B=(1,−1)/√2, ω=0:")
print("  A: v_x + v_y = u_A ;  B: v_x − v_y = u_B  ⇒  v_x = (u_A+u_B)/2 ; v_y = (u_A−u_B)/2")
modes = [("HOLD", 0, 0), ("FORWARD", 1, 1), ("REVERSE", -1, -1), ("DIVERT lado 1", 1, -1),
         ("DIVERT lado 2", -1, 1), ("DIAGONAL_A", 1, 0), ("DIAGONAL_B", 0, 1)]
u = 1.0
for name, sa, sb in modes:
    uA, uB = sa * u, sb * u
    vx, vy = (uA + uB) / 2, (uA - uB) / 2
    # velocidad relativa caja-periferia en cada familia -> componente perpendicular a ê = giro libre del rodillo
    relA = np.array([vx - uA, vy]); relB = np.array([vx - uB, vy])
    chkA = relA @ eA; chkB = relB @ eB
    rollA = abs(relA @ np.array([-eA[1], eA[0]])); rollB = abs(relB @ np.array([-eB[1], eB[0]]))
    print(f"  {name:14s} u_A={uA:+.1f} u_B={uB:+.1f} -> v=({vx:+.2f},{vy:+.2f}) |v|={math.hypot(vx,vy):.2f}·u ; "
          f"restricción A={chkA:+.0e} B={chkB:+.0e} ; rodillos ruedan a A={rollA:.2f}·u B={rollB:.2f}·u")
print("Fuerza por rueda SOLO a lo largo de ê (el rodillo no transmite perpendicular salvo resistencia a rodadura).")
print("FORWARD: F_A ê_A + F_B ê_B = (F_A+F_B)/√2 x̂ + (F_A−F_B)/√2 ŷ ⇒ recto exige F_A=F_B=F_req/√2 (= REV B).")
print("DIVERT : F_A = −F_B = F_req/√2 ⇒ fuerza lateral F_req, componentes x se cancelan.")
for D_roller in (0.018, 0.020):
    for v in (1.0, 1.5):
        n_roll = S2 * v / (math.pi * D_roller) * 60
        print(f"  DIVERT a v_lat={v}: rodillo Ø{D_roller*1000:.0f} gira a √2·v/(π·d) = {n_roll:.0f} rpm sobre su pasador")

print("\n" + "=" * 78)
print("B. TRACCIÓN: a_max de un lecho mecanum vs rodillos planos")
print("=" * 78)
print("Por rueda: |F_i| ≤ μ·N_i y F_i ∥ ê. FORWARD: F_req = √2·F_fam, F_fam ≤ μ·N_fam.")
print("Con N_A = N_B = m·g/2: F_req,max = √2·μ·m·g/2 = μ·m·g/√2  ⇒  a_max = μ·g/√2 − μr·g")
print("(FISICA_PRIMEROS_PRINCIPIOS usó (μ−μr)·g: le falta el factor 1/√2 del rodillo a 45°.)")
print("Frenado con ruedas bloqueadas: deslizamiento sólo a lo largo de ê ⇒ a_frenado = μ·g/√2 (mismo factor).")
for mu in (0.3, 0.4, 0.5, 0.6):
    amax = mu * g / S2 - mu_r * g
    print(f"  μ={mu}: a_max = {amax:.2f} m/s² (plano: {(mu-mu_r)*g:.2f}) ; parada v²/2a: 1.0 m/s → {1.0**2/(2*amax)*1000:.0f} mm ; "
          f"1.5 m/s → {1.5**2/(2*amax)*1000:.0f} mm")
print("Con N_A ≠ N_B (nº impar de ejes bajo la caja) la familia con menos carga satura primero:")
for nA, nB in ((4, 3), (2, 1), (3, 3), (2, 2)):
    frac = min(nA, nB) / (nA + nB)
    amax = S2 * 0.4 * frac * g - mu_r * g
    print(f"  {nA}A+{nB}B ejes (carga ∝ nº ejes): N_min/mg = {frac:.3f} ⇒ a_max(μ=0.4) = √2·μ·(N_min/m) − μr·g = {amax:.2f} m/s²")

print("\n" + "=" * 78)
print("C. GUIÑADA: par libre vs. reacción del lecho (sistema sobre-restringido)")
print("=" * 78)
print("Para 2 ruedas de la misma familia en r1, r2: (ω×(r1−r2))·ê_A = ω(Δx−Δy)/√2 = 0 ⇒ ω=0 salvo Δx=Δy.")
print("⇒ Mientras NO deslizan, ≥2 ruedas de una familia (o 1 de cada) imponen ω=0: el lecho es rígido en guiñada.")
print("El par de guiñada M = F_req·Δx/2 (FORWARD) no gira la caja: lo reaccionan fuerzas tangenciales extra en las ruedas,")
print("que consumen presupuesto de fricción. La caja gira sólo cuando ese presupuesto se agota (contactos saturados).")

pitch = 76.2
axes_x = [38.1 + i * pitch for i in range(8)]           # [user] REV B / handoff, zona 609.6
fam = ["A", "B"] * 4
layouts = {"REV B y=50/150/250/350 (paso 100)": [50, 150, 250, 350],
           "Bloque v4 paso 78 (y=-39/39/117/195)+78": [-39, 39, 117, 195]}
edge = 15.0  # mm: una rueda a <15 mm del borde de la caja no cuenta como apoyo (borde/pestaña) [sup]

def contacts(L, W, xc, yc, ys):
    pts = []
    for xk, f in zip(axes_x, fam):
        if abs(xk - xc) <= L / 2 - edge:
            for yj in ys:
                if abs(yj - yc) <= W / 2 - edge:
                    pts.append((xk, yj, f))
    return pts

def solve(pts, m, a, mode, mu, hold_yaw=True, N_override=None):
    """Distribución de fuerzas de mínima energía Σ f²/N con Σf·ê = F_req y (opcional) par de guiñada nulo."""
    n = len(pts)
    N = np.full(n, m * g / n) if N_override is None else N_override
    xc = np.average([p[0] for p in pts], weights=N); yc = np.average([p[1] for p in pts], weights=N)
    E = np.array([eA if p[2] == "A" else eB for p in pts])
    X = np.array([p[0] - xc for p in pts]) / 1000; Y = np.array([p[1] - yc for p in pts]) / 1000
    Freq = m * a + mu_r * m * g
    b = np.array([Freq, 0.0]) if mode == "FORWARD" else np.array([0.0, Freq])
    rows = [E[:, 0], E[:, 1]]
    if hold_yaw:
        rows.append(X * E[:, 1] - Y * E[:, 0]); b = np.append(b, 0.0)
    A = np.vstack(rows)
    Wm = np.diag(N)
    f = Wm @ A.T @ np.linalg.solve(A @ Wm @ A.T, b)
    torque = float((X * E[:, 1] - Y * E[:, 0]) @ f)
    util = np.abs(f) / (mu * N)
    return f, torque, util.max(), N

cases = [("500x300 5kg centrada (6 ejes)", 500, 300, 304.8, 200, 5.0),
         ("500x300 5kg sobre eje 4 (7 ejes)", 500, 300, 266.7, 200, 5.0),
         ("300x250 2.5kg centrada (4 ejes)", 300, 250, 304.8, 200, 2.5),
         ("300x250 2.5kg sobre eje 4 (3 ejes)", 300, 250, 266.7, 200, 2.5),
         ("500x300 vacía 0.5kg (6 ejes)", 500, 300, 304.8, 200, 0.5)]
mu = 0.4
for lname, ys in layouts.items():
    print(f"\n--- Disposición transversal: {lname} ---")
    for cname, L, W, xc, yc0, m in cases:
        yc = yc0 if "REV B" in lname else 78
        pts = contacts(L, W, xc, yc, ys)
        nA = sum(1 for p in pts if p[2] == "A"); nB = len(pts) - nA
        xA = np.mean([p[0] for p in pts if p[2] == "A"]); xB = np.mean([p[0] for p in pts if p[2] == "B"]) if nB else float('nan')
        I = m * ((L / 1000) ** 2 + (W / 1000) ** 2) / 12
        print(f"{cname}: {len(pts)} contactos ({nA}A+{nB}B), N/contacto={m*g/len(pts):.2f} N, Δx=x_A−x_B={xA-xB:+.1f} mm, I={I:.4f} kg·m²")
        for a in (1.0, 2.0):
            for mode in ("FORWARD", "DIVERT"):
                if nB == 0:
                    print(f"   a={a} {mode}: SIN FAMILIA B EN CONTACTO -> la caja se mueve en DIAGONAL, no hay control"); continue
                f0, M0, u0, N = solve(pts, m, a, mode, mu, hold_yaw=False)
                f1, M1, u1, _ = solve(pts, m, a, mode, mu, hold_yaw=True)
                alpha = M0 / I; t = 1.0 / a  # tiempo para alcanzar 1 m/s
                th = 0.5 * alpha * t ** 2
                print(f"   a={a} {mode:7s}: M_yaw libre={M0:+.3f} N·m (α={alpha:+.2f} rad/s², giro LIBRE en t=v/a={t:.2f}s: {math.degrees(th):+.1f}°) | "
                      f"utilización máx μN: sin sujetar guiñada {u0:.2f}, con guiñada=0 {u1:.2f}")
        # a_max con guiñada sujeta (lineal en F): utilización ∝ F_req
        for mode in ("FORWARD", "DIVERT"):
            if nB == 0: continue
            _, _, u1, _ = solve(pts, m, 1.0, mode, mu, hold_yaw=True)
            Freq1 = m * 1.0 + mu_r * m * g
            Fmax = Freq1 / u1
            amax = Fmax / m - mu_r * g
            _, _, u0, _ = solve(pts, m, 1.0, mode, mu, hold_yaw=False)
            amax0 = (Freq1 / u0) / m - mu_r * g
            print(f"   a_max(μ=0.4) {mode:7s}: con guiñada sujeta = {amax:.2f} m/s² ; sin exigir ω=0 = {amax0:.2f} m/s² (teórico ideal {0.4*g/S2-mu_r*g:.2f})")

print("\n--- Fondo no plano: 300x250 sobre 3 ejes con apoyo en 3 puntos (2A + 1B), carga 2.5 kg ---")
pts = [(190.5, 150, "A"), (342.9, 250, "A"), (266.7, 150, "B")]
for share_B in (0.33, 0.15, 0.05):
    N = np.array([(1 - share_B) / 2, (1 - share_B) / 2, share_B]) * 2.5 * g
    for mode in ("FORWARD", "DIVERT"):
        _, _, u1, _ = solve(pts, 2.5, 1.0, mode, mu, hold_yaw=True, N_override=N)
        Freq1 = 2.5 * 1.0 + mu_r * 2.5 * g
        amax = (Freq1 / u1) / 2.5 - mu_r * g
        print(f"   B carga {share_B*100:.0f}% del peso, {mode:7s}: a_max(μ=0.4) = {amax:.2f} m/s²")
print("   (con B al 0 % la caja queda gobernada sólo por A ⇒ se desplaza a 45°: modo DIAGONAL involuntario)")

print("\n" + "=" * 78)
print("D. ENTRADA/SALIDA: una sola familia bajo el frente durante 1 paso")
print("=" * 78)
L = 0.5; m = 5.0
for v in (1.0, 1.5):
    t1 = pitch / 1000 / v
    print(f" v={v}: 1 paso (76.2 mm) = {t1*1000:.0f} ms con sólo el eje 1 (A) bajo el frente")
# carga sobre eje 1 cuando el frente está en el eje 2 (tributaria 0..114 mm de 500)
N1 = (114.3 / 500) * m * g
for mu in (0.4,):
    Flat = mu * N1 / S2
    arm = 0.5 / 2 - 0.114 / 2  # brazo aprox. desde el CG de la caja (CG a −136 mm del eje 1) -> 0.174 m
    arm = 0.174
    M = Flat * arm; I = m * (0.25 + 0.09) / 12
    for v in (1.0, 1.5):
        t1 = pitch / 1000 / v
        th = 0.5 * (M / I) * t1 ** 2
        print(f" desajuste de velocidad Omni/upstream ⇒ deslizamiento a 45° en eje 1: N1≈{N1:.1f} N, F_lat=μN1/√2={Flat:.1f} N, "
              f"M≈{M:.2f} N·m ⇒ giro libre en {t1*1000:.0f} ms = {math.degrees(th):.2f}° (los rodillos planos upstream lo resisten además)")
print(" Si u_A = v_línea exactamente: fuerza lateral nula (v_y = u_A − v_x = 0). El efecto es proporcional al desajuste de velocidades.")

print("\n" + "=" * 78)
print("E. CONTENCIÓN EN LA ZONA")
print("=" * 78)
for Lz in (598.0, 609.6):
    for Lc in (500, 300, 250):
        print(f" zona {Lz} caja {Lc}: ventana = {Lz-Lc:.1f} mm")
print(" Cadena de latencia [web/lente lógica]: sensor 0.5 ms (Keyence PZ-G) + lógica ≈2 ms + STEP/DIR ≈0.2 ms ≈ 3 ms; driver MDR ≤15 ms (Itoh)")
for v in (1.0, 1.5):
    for tl in (0.003, 0.018):
        print(f"   v={v}: recorrido por latencia {tl*1000:.0f} ms = {v*tl*1000:.1f} mm")
print("\n E1. Velocidad máxima si el frenado sólo puede empezar con la caja ENTERA dentro (upstream sigue empujando hasta entonces):")
print("     v_adm = √(2·a·(ventana − v·t_lat))  con a = a_max(μ) del lecho mecanum")
for mu in (0.3, 0.4, 0.5):
    a = mu * g / S2 - mu_r * g
    for win in (0.098, 0.110, 0.298):
        # resolver v = sqrt(2 a (win - v t)) iterativamente
        v = 0.5
        for _ in range(50):
            v = math.sqrt(max(2 * a * (win - v * 0.003), 0))
        print(f"   μ={mu} (a={a:.2f}): ventana {win*1000:.0f} mm ⇒ v_adm = {v:.2f} m/s")

print("\n E2. Frenado que empieza con la caja PARCIALMENTE dentro (fracción f = x/L del peso sobre la Omni).")
print("     Caso (i) upstream sigue accionando a v_línea: a_neta = f·μ·g/√2 − (1−f)·μ_up·g  (rodillos planos empujan la caja que frena)")
mu_up = 0.4  # [sup] rodillo PVC/acero sobre cartón, A VERIFICAR (Interroll: PVC 'significativamente' mejor que acero)
for mu in (0.4,):
    f_min = mu_up / (mu_up + mu / S2)
    print(f"     μ={mu}, μ_up={mu_up}: a_neta>0 sólo si f > μ_up/(μ_up+μ/√2) = {f_min:.2f} ⇒ la Omni no puede frenar hasta tener el {f_min*100:.0f}% de la caja")
print("     Caso (ii) upstream en rueda libre (motor parado, rodillos giran libres): a_neta = f·μ·g/√2 − μr·g. Integración numérica:")
def land(v0, mu, Lc, Lz, x_start):
    """Frente en x_start (mm) al iniciar frenado; devuelve x del frente al detenerse (mm)."""
    x = x_start / 1000; v = v0; dt = 1e-4; Lcm = Lc / 1000
    while v > 0:
        f = min(max(x / Lcm, 0), 1)
        a = f * mu * g / S2 - mu_r * g
        if a <= 0: a = 1e-6
        v -= a * dt; x += v * dt
    return x * 1000
for mu in (0.4, 0.5):
    for v0 in (1.0, 1.5):
        for x_start in (0, 150, 300):
            xs = land(v0, mu, 500, 598, x_start)
            print(f"     μ={mu} v0={v0} caja 500, frenado desde frente x={x_start} mm (upstream libre): frente se detiene en {xs:.0f} mm "
                  f"({'DENTRO' if xs <= 598 else 'FUERA: +' + format(xs-598, '.0f') + ' mm'} de la zona 598)")
print("\n E3. Aterrizaje coordinado (upstream = CZC que frena con el mismo perfil): d = v²/(2a) sobre ambas zonas; a = a_max mecanum sólo en la parte Omni,")
print("     pero la parte sobre rodillos planos frena con μ_up (mayor). Distancias de parada a a=2.0 m/s² (comandada):")
for v in (1.0, 1.5):
    print(f"     v={v}: {v**2/(2*2.0)*1000:.0f} mm ⇒ frenado debe empezar {v**2/(2*2.0)*1000 - 549:.0f} mm respecto al objetivo 549 (negativo = antes de entrar a la Omni)")

print("\n" + "=" * 78)
print("F. CARGA POR RUEDA, CAJAS VACÍAS, REGLA 2/3, VUELCO")
print("=" * 78)
for m, ejes, rpe in ((5.0, 6, 2), (5.0, 6, 3), (5.0, 4, 2), (2.5, 4, 2), (2.5, 3, 2), (0.5, 6, 2), (0.5, 3, 2)):
    n = ejes * rpe; N = m * g / n
    print(f" m={m} kg, {ejes} ejes × {rpe} ruedas = {n} contactos: N={N:.2f} N/rueda ; fricción disp. μ=0.4: {0.4*N:.2f} N ; "
          f"con regla 2/3 (Rulmeca) N_ef={m*g/(n*2/3):.2f} N sobre {n*2//3} ruedas")
print(" a_max no depende de la masa (F_req ∝ m, μN ∝ m): la caja vacía sólo es peor por fondo no plano y por N < umbral de indentación del rodillo.")
print(" Cargas de catálogo [web]: Rotacaster Ø50 95A 25 kg/rueda; mecanum hobby Ø60 10–15 kg/set ⇒ 3–6 N/rueda es <5 % de la capacidad.")
for b, h in ((300, 300), (300, 400), (300, 600), (250, 400)):
    print(f" vuelco lateral b={b} h={h}: a_tip = g·b/h = {g*b/h:.1f} m/s² (>> a_max 1.8–3.9 ⇒ manda el deslizamiento) [h A VERIFICAR]")

print("\n" + "=" * 78)
print("G. TIEMPO DE DESVÍO Y RITMO")
print("=" * 78)
def t_move(s, v, a):
    if v ** 2 / a >= s:  # triángulo
        return 2 * math.sqrt(s / a), math.sqrt(s * a)
    return v / a + s / v, v
for W in (300, 250):
    for label, s in (("hasta borde del cuerpo 400", (400 + W) / 2), ("cruzando franja muerta 133", (400 + W) / 2 + 133.4)):
        for v in (0.7, 1.0, 1.5):
            for a in (1.5, 2.0, 2.5):
                t, vp = t_move(s / 1000, v, a)
                print(f" W={W} {label} s={s:.0f} mm v_lat={v} a={a}: t={t:.2f} s (v pico {vp:.2f})")
print(" coast sobre franja muerta (rodillos pasivos transversales, la caja desliza): d = v²/(2·μ_up·g):")
for mu in (0.2, 0.3, 0.4):
    print(f"   μ_up={mu}: v=0.7→{0.7**2/(2*mu*g)*1000:.0f} mm ; v=1.0→{1.0**2/(2*mu*g)*1000:.0f} mm (franja 133 mm)")
print(" Ciclo Omni con desvío: recepción+aterrizaje ≈0.7–0.8 s [lente lógica] + decisión + desvío 0.6–0.7 s + liberación ≈ 1.6–1.8 s ⇒ 2000–2250/h")
print(" Paso recto sin parar: caja 500 + gap 100 a 1.0 m/s = 0.6 s ⇒ 6000/h ; a 1.5 ⇒ 9000/h (referencia F-RAT 2250 c/h, Flowsort 6000 pph [web])")

print("\n" + "=" * 78)
print("H. COMPARACIÓN FÍSICA DE ARQUITECTURAS (a_max = μ·g·k − μr·g ; k = factor geométrico)")
print("=" * 78)
print(" mecanum ±45° ejes fijos: k_fwd = k_lat = 1/√2 = 0.707 (todas las ruedas activas en ambos modos; ambas familias deben cargar igual)")
print("   fuerza de fricción movilizada / fuerza útil = √2 = 1.41 (componente parásita a 45° que la otra familia cancela)")
print(" ejes perpendiculares (CV-OMW: 16 contactos avance 4x4, 9 eyección 3x3, tresbolillo): k_fwd = N_fwd/mg, k_lat = N_lat/mg")
for nf, nl, tag in ((16, 9, "CV-OMW 4x4/3x3"), (22, 14, "TRANSFER-BF21 22/14"), (1, 1, "reparto 50/50")):
    print(f"   {tag}: k_fwd = {nf/(nf+nl):.2f} ; k_lat = {nl/(nf+nl):.2f} ; parásita = 1.0 (fuerza colineal con el movimiento)")
print(" rueda pivotante (Flowsort/HPD): k = 1.0 en la dirección de giro; giro 0.3 s/90° [web]; homing periódico [web]; 2 motores")
print(" F-RAT: superficies conmutadas, k = 1.0, ciclo 1.10 s [web]; 3 MDR")
for mu in (0.4,):
    for k, tag in ((0.707, "mecanum"), (0.64, "CV-OMW avance"), (0.36, "CV-OMW eyección"), (1.0, "pivotante/F-RAT")):
        print(f"   μ={mu} {tag:16s}: a_max = {mu*g*k - mu_r*g:.2f} m/s²")

print("\n" + "=" * 78)
print("I. RESISTENCIA A RODADURA EN DIVERT (rodillos Ø18 girando a √2·v)")
print("=" * 78)
print(" Rulmeca [web]: coef. rodadura paquete/rodillo Ø50: cartón rígido 0.06, blando 0.08. Un rodillo Ø18 tiene ~2.8× menos radio;")
print(" para la misma indentación la resistencia a rodadura crece ~∝ 1/r ⇒ μr_lat del orden de 0.1–0.2 [sup, A MEDIR]. Efecto en a_max lateral:")
for mur in (0.03, 0.10, 0.20):
    print(f"   μr_lat={mur}: a_max_lat(μ=0.4) = {0.4*g/S2 - mur*g:.2f} m/s²")
