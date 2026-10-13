import math
g=9.81
print("=== A. Distancia de deslizamiento de la caja si los rodillos frenan mas rapido que mu*g: d = v^2/(2 mu g) ===")
for v in (1.0,1.5):
    for mu in (0.3,0.4,0.5):
        d=v*v/(2*mu*g)
        for L in (300,500):
            tot=d*1e3+L
            print(f"v={v} mu={mu}: d={d*1e3:.0f} mm; caja {L} -> frente+caja = {tot:.0f} mm vs zona 598 mm -> {'CABE' if tot<=598 else 'NO CABE (sobresale '+str(round(tot-598))+' mm)'}")
print()
print("=== B. Carga de bus CAN 500 kbit/s: N zonas, heartbeat 10/s + estado 20/s, trama 0.264 ms ===")
for N in (10,20,50):
    fps=N*(10+20)
    print(f"N={N}: {fps} tramas/s -> carga {fps*0.264e-3*100:.1f} %")
print()
print("=== C. OTA por CAN: imagen 1 MB a 500 kbit/s, eficiencia util ~55% (8 B utiles/132 bits + ack) ===")
for size_MB in (0.5,1.0,1.5):
    t=size_MB*1e6*8/(500e3*0.55)
    print(f"{size_MB} MB -> {t:.0f} s = {t/60:.1f} min por nodo (A VERIFICAR con protocolo real)")
print()
print("=== D. Ventana de handshake: PERMISSION retirada tarde. Caja a 1.5 m/s, zona 598, sensor a 50 mm del extremo ===")
# Si el downstream retira permiso cuando la caja ya cruzo el sensor upstream, la caja sigue hasta parar.
for lat in (0.005,0.02,0.05):
    print(f"latencia handshake {lat*1e3:.0f} ms -> avance {1.5*lat*1e3:.1f} mm antes de reaccionar")
print()
print("=== E. Ritmo maximo ZPA singulado: caja 500 + zona: tiempo por zona a 1.5 m/s ===")
for v in (1.0,1.5):
    t=0.598/v
    print(f"v={v}: una zona tarda {t*1e3:.0f} ms; con parada/arranque (a=2 m/s2, ~0.75 s x2) el ciclo se domina por rampas, no por comunicacion")
