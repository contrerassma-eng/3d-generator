import math
g=9.81; D=0.050; r=D/2
print("=== A. Cinematica rueda Ø50 (1:1) ===")
for v in (1.0,1.5):
    n=60*v/(math.pi*D); print(f"v={v} m/s -> n={n:.1f} rpm, w={v/r:.0f} rad/s, 1 ms = {v:.1f} mm")

print("\n=== B. Cadena de latencia (parametrica) y distancia recorrida a v ===")
# componentes: sensor (A VERIFICAR hoja de datos; 1 ms placeholder), filtro glitch HW 1 ms, ISR+ciclo logica 1 ms, comando driver STEP/DIR ~0.1 ms, 1 periodo de paso a 19.1 kpps 0.05 ms
lat = {"sensor(placeholder)":1.0,"filtro_glitch":1.0,"ISR+ciclo_logica":1.0,"cmd_driver_STEP/DIR":0.1,"periodo_paso@19kpps":0.05}
tl=sum(lat.values()); print("latencia electrica total (stepper) = %.2f ms ->"%tl, {v: round(v*tl,1) for v in (1.0,1.5)}, "mm")
tl_mdr = tl-0.15+15  # si driver tipo MDR con 'RUN->arranque <=15 ms' (Itoh, web) como cota
print("latencia con driver tipo MDR (<=15 ms Itoh, web) = %.1f ms ->"%tl_mdr, {v: round(v*tl_mdr,1) for v in (1.0,1.5)}, "mm")

print("\n=== C. Distancia de parada d = v*t_lat + v^2/(2a) ===")
for v in (1.0,1.5):
    for a in (2.0,2.5,3.0,5.0):
        for tlat in (0.005,0.020):
            d=v*tlat+v*v/(2*a)
            print(f" v={v} a={a} t_lat={tlat*1000:.0f}ms -> d_parada={d*1000:.0f} mm, t={tlat+v/a:.2f} s")
print("limite por deslizamiento a_max=(mu-mur)g, mur=0.03:")
for mu in (0.3,0.4,0.5):
    a=(mu-0.03)*g; print(f" mu={mu}: a_max={a:.2f} m/s2; d(1.0)={1.0**2/(2*a)*1000:.0f} mm; d(1.5)={1.5**2/(2*a)*1000:.0f} mm")

print("\n=== D. Ventana de contencion en zona L_z con caja L_c ===")
for Lz in (598.0,609.6):
    for Lc in (500,300):
        print(f" L_zona={Lz} L_caja={Lc}: ventana = {Lz-Lc:.1f} mm; a 1.0 m/s = {(Lz-Lc)/1000/1.0*1000:.0f} ms; a 1.5 = {(Lz-Lc)/1000/1.5*1000:.0f} ms")

print("\n=== E. Aterrizaje en ventana disparado por S0 (borde upstream, x=0) ===")
# objetivo: frente en x_target = Lz - (Lz-Lc)/2 (centro de ventana); perfil: v cte hasta x_start, luego decel a
Lz=598.0
for Lc in (500,300):
    x_t = Lz-(Lz-Lc)/2
    for v in (1.0,1.5):
        for a in (2.0,2.5,3.0):
            tlat=0.005
            d_dec = v*tlat + v*v/(2*a)
            x_start = x_t/1000 - d_dec
            t_tot = (max(x_start,0))/v + tlat + v/a
            land = (max(x_start,0) + d_dec)*1000
            ok = "OK" if Lc<=land<=Lz else "FUERA"
            print(f" Lc={Lc} v={v} a={a}: x_target={x_t:.0f} mm, d_dec={d_dec*1000:.0f} mm, inicio decel en x={x_start*1000:.0f} mm, frente aterriza en {land:.0f} mm [{ok}], t_posicionar={t_tot:.2f} s; margen +{Lz-land:.0f}/-{land-Lc:.0f} mm")

print("\n=== E2. Aterrizaje en 2 etapas: decel a v_creep y luego posicionar por odometria/S1 ===")
for v in (1.0,1.5):
    for vc in (0.3,0.5):
        a=2.0; x_t=549.0/1000
        d1=(v*v-vc*vc)/(2*a); t1=(v-vc)/a
        d2=vc*vc/(2*a); t2=vc/a
        d_creep = x_t - d1 - d2
        t_creep = d_creep/vc if d_creep>0 else float('nan')
        print(f" v={v} v_creep={vc}: d_decel={d1*1000:.0f} mm ({t1:.2f} s), tramo creep={d_creep*1000:.0f} mm ({t_creep:.2f} s), parada final {d2*1000:.0f} mm; total={(t1+t_creep+t2):.2f} s; error por 5 ms de jitter a v_creep = {vc*5:.1f} mm")

print("\n=== F. Paridad de ejes bajo la caja (lecho 8 ejes, paso 76.2, primer eje a 38.1) ===")
axes=[38.1+i*76.2 for i in range(8)]  # 1..8, impares=A
fam=['A' if i%2==0 else 'B' for i in range(8)]
def under(xc,Lc):
    lo,hi=xc-Lc/2,xc+Lc/2
    idx=[i for i,x in enumerate(axes) if lo<=x<=hi]
    A=[axes[i] for i in idx if fam[i]=='A']; B=[axes[i] for i in idx if fam[i]=='B']
    cA=sum(A)/len(A) if A else float('nan'); cB=sum(B)/len(B) if B else float('nan')
    return idx,len(A),len(B),cA-cB
for Lc in (500,300):
    for xc in (304.8, 266.7, 342.9):
        idx,nA,nB,dx=under(xc,Lc)
        print(f" Lc={Lc} centro en x={xc}: ejes {[i+1 for i in idx]} (A={nA},B={nB}) -> desfase centroides A-B = {dx:.1f} mm ; tramo caja [{xc-Lc/2:.1f},{xc+Lc/2:.1f}]")
print(" centro geometrico del modulo (8 ejes) =", (axes[0]+axes[-1])/2, "-> entre ejes 4 y 5")

print("\n=== G. Par de guinada (fuerza) segun FISICA: M = F_fam*sin45*dx ===")
for m,a in ((5,2.0),(2.5,2.0)):
    Freq=m*a+0.03*m*g; Ffam=Freq/math.sqrt(2)
    for dx in (0.0762,0.0):
        M=Ffam*math.sin(math.pi/4)*dx
        I = m*(0.5**2+0.3**2)/12 if m==5 else m*(0.3**2+0.25**2)/12
        alpha=M/I if I>0 else 0
        print(f" m={m} a={a}: F_fam={Ffam:.2f} N, dx={dx*1000:.0f} mm -> M_yaw={M:.3f} N.m, I={I:.4f} kg.m2, alpha={alpha:.2f} rad/s2, giro en 0.5 s = {0.5*alpha*0.25*180/math.pi:.1f} deg")

print("\n=== H. Tiempo de desvio lateral (perfil trapezoidal, salida = medio lecho + media caja) ===")
for W in (300,250):
    for extra,lbl in ((0,"sin franja"),(133.4,"cruzando franja muerta 133.4")):
        s=(400+W)/2+extra
        for v in (1.0,1.5):
            for a in (2.0,3.0):
                d_acc=v*v/(2*a)
                if d_acc*1000 < s: t=v/a+(s/1000-d_acc)/v
                else: t=math.sqrt(2*s/1000/a)
                print(f" W={W} {lbl}: s={s:.0f} mm v={v} a={a}: t={t:.2f} s")
print(" coast sobre franja muerta (v^2/(2 mu g)):", {mu: {v: round(v*v/(2*mu*g)*1000) for v in (1.0,1.5)} for mu in (0.2,0.3,0.5)}, "mm")

print("\n=== I. Tiempos de ciclo por zona y capacidad ===")
for v in (1.0,1.5):
    t_pass=(598+500)/1000/v; t_gap=(500+100)/1000/v
    print(f" v={v}: paso completo caja 500 por zona 598 = {t_pass:.2f} s; cadencia caja500+gap100 = {t_gap:.2f} s -> {3600/t_gap:.0f} cajas/h flujo continuo")
# ciclo desvio Omni: recibir+posicionar (E) + decidir 0.01 + inversion/arranque + desvio (H, W=300 sin franja a=2) + confirmacion 0.2 + PERM_UP re-habilitar
for v in (1.0,1.5):
    t_pos = {1.0:0.79,1.5:0.66}[v]; t_div={1.0:0.60,1.5:0.61}[v]
    t_cycle=t_pos+0.01+t_div+0.2+0.1
    print(f" v={v}: ciclo desvio Omni ~ {t_cycle:.2f} s -> {3600/t_cycle:.0f} desvios/h max (sin considerar zona receptora)")

print("\n=== J. Timeouts propuestos (3x nominal, min 1 s) ===")
for v in (1.0,1.5):
    t_arr=(598+500)/1000/v; t_div=(350+133)/1000/v+v/2
    print(f" v={v}: T_ARRIVAL nominal {t_arr:.2f} s -> timeout {max(1.0,3*t_arr):.1f} s ; T_DIVERT nominal {t_div:.2f} s -> timeout {max(1.0,3*t_div):.1f} s ; T_S0_TO_S1 nominal {(540)/1000/v:.2f} s")

print("\n=== K. Odometria: pasos/mm y detectabilidad de deslizamiento ===")
steps_rev=2000  # 2000 micropasos/rev (research_motores)
mm_per_step=math.pi*50/steps_rev
print(f" {mm_per_step:.4f} mm/paso a 2000 pasos/rev; 540 mm S0->S1 = {540/mm_per_step:.0f} pasos; deslizamiento 2% = {0.02*540:.1f} mm = {0.02*540/mm_per_step:.0f} pasos")
print(f" a 573 rpm: {573/60*steps_rev:.0f} pps; a 382 rpm: {382/60*steps_rev:.0f} pps")

print("\n=== L. Caja oculta entre sensores ===")
for s1 in (540,560):
    print(f" S0 en 0, S1 en {s1}: caja de largo < {s1} mm cabe entre ambos sin verse -> S&R obligatorio o 3er sensor; caja 300 oculta: si")
