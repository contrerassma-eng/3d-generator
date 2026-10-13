"""Adenda: (iii) aterrizaje con upstream FRENANDO sus rodillos; tabla a_max primer-deslizamiento vs μ."""
import math, numpy as np
exec(open('calc_lente_fisica.py').read().split('print("=" * 78)\nprint("A. CINEM')[0])  # sólo constantes
g=9.81; S2=math.sqrt(2); mu_r=0.03
print("=== E4. Upstream FRENA sus rodillos (ZMH/freno dinámico) en el mismo instante: la cola desliza sobre rodillos parados ===")
print("    a_neta = f·μ·g/√2 + (1−f)·μ_up·g − μr·g  (f = fracción de la caja sobre la Omni)")
def land3(v0, mu, mu_up, Lc, x_start):
    x=x_start/1000; v=v0; dt=1e-4; Lcm=Lc/1000
    while v>0:
        f=min(max(x/Lcm,0),1)
        a=f*mu*g/S2+(1-f)*mu_up*g-mu_r*g
        v-=a*dt; x+=v*dt
    return x*1000
for mu,mu_up in ((0.4,0.4),(0.3,0.3),(0.5,0.4)):
    for v0 in (1.0,1.5):
        for xs in (0,100,200,300):
            xe=land3(v0,mu,mu_up,500,xs)
            print(f"   μ={mu} μ_up={mu_up} v0={v0} inicio x={xs}: frente para en {xe:.0f} mm -> {'DENTRO' if xe<=598 else 'FUERA +%.0f'%(xe-598)} (objetivo 549±49)")
print("\n=== Tabla a_max (m/s²) por primer deslizamiento (elástico, guiñada sujeta) vs μ — caso 500x300 6 ejes y 300x250 4 ejes ===")
# reutilizo solve/contacts del script principal
src=open('calc_lente_fisica.py').read()
ns={}
exec(src.split('cases = [')[0].replace('print(','(lambda *a,**k: None)('), ns)  # define funciones sin imprimir
solve=ns['solve']; contacts=ns['contacts']
for mu in (0.3,0.4,0.5,0.6):
    row=[]
    for (L,W,xc,m,tag) in ((500,300,304.8,5.0,'500/6ej'),(500,300,266.7,5.0,'500/7ej'),(300,250,304.8,2.5,'300/4ej'),(300,250,266.7,2.5,'300/3ej')):
        pts=contacts(L,W,xc,200,[50,150,250,350])
        out=[]
        for mode in ('FORWARD','DIVERT'):
            _,_,u1,_=solve(pts,m,1.0,mode,mu,hold_yaw=True)
            Freq1=m*1.0+mu_r*m*g
            out.append((Freq1/u1)/m-mu_r*g)
        row.append(f"{tag}: F {out[0]:.2f} / D {out[1]:.2f}")
    print(f"  μ={mu}: ideal {mu*g/S2-mu_r*g:.2f} | "+" | ".join(row))
print("\n=== Velocidad admisible de línea si el aterrizaje es coordinado (caso iii) y el objetivo es frente en 549 ±49 mm ===")
for mu,mu_up in ((0.3,0.3),(0.4,0.4)):
    for v0 in (0.8,1.0,1.2,1.5):
        best=None
        for xs in range(0,400,10):
            xe=land3(v0,mu,mu_up,500,xs)
            if abs(xe-549)<=49: best=xs; break
        print(f"   μ={mu} v0={v0}: inicio de frenado más temprano que aterriza en ventana: x={best} mm" if best is not None else f"   μ={mu} v0={v0}: NO aterriza en ventana ni empezando en x=0")
