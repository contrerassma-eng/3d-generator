import math
print("=== 1. Recorrido de caja por latencia (v=1.0 y 1.5 m/s) ===")
for v in (1.0,1.5):
    for t_ms in (1,2,5,10,20,50,100,200):
        print(f"v={v} m/s  t={t_ms:>4} ms -> {v*t_ms:.1f} mm")
print()
print("=== 2. Cinemática UniDrive One a 1:1 con rodillo/rueda Ø50 ===")
D=0.050
for n in (350,560,570,573,700):
    print(f"n={n} rpm -> v = pi*D*n/60 = {math.pi*D*n/60:.3f} m/s")
print(f"n para 1.5 m/s = 60*1.5/(pi*0.05) = {60*1.5/(math.pi*D):.1f} rpm ; para 1.0 m/s = {60*1.0/(math.pi*D):.1f} rpm")
print(f"relacion de correa necesaria para 1.5 m/s con motor 350 rpm: {573/350:.2f}:1 (multiplicadora)")
print()
print("=== 3. Tiempo de trama CAN 2.0A 8 bytes (Wikipedia formula 8n+44+floor((34+8n-1)/4)) ===")
n=8
bits=8*n+44+(34+8*n-1)//4
print(f"bits max con stuffing = {bits}")
for br in (125e3,250e3,500e3,1e6):
    print(f"  {br/1e3:.0f} kbit/s -> {bits/br*1e3:.3f} ms por trama; 20 zonas x 1 trama = {20*bits/br*1e3:.1f} ms de bus si todas hablan a la vez")
print()
print("=== 4. Tiempo de trama RS-485 Modbus RTU (8 bytes datos + 8 overhead ~ 16 bytes, 11 bits/char) ===")
for baud in (19200,115200,500000,1e6):
    t=16*11/baud
    tsil=3.5*11/baud
    print(f"  {baud:>8.0f} bd -> trama {t*1e3:.2f} ms + silencio 3.5 char {tsil*1e3:.2f} ms")
print()
print("=== 5. Latencia Ethernet en cadena de switches store-and-forward (100 Mbit/s) ===")
# trama 64 bytes -> 512 bits + 8 preamble + 12 IFG = 672 bit times = 6.72 us at 100 Mbit/s
for size in (64,128,256):
    bits=(size+8+12)*8
    tf=bits/100e6
    for hops in (5,10,20,50):
        print(f"  trama {size} B: {tf*1e6:.2f} us/salto -> {hops} saltos = {hops*tf*1e6:.0f} us (sin cola)")
print()
print("=== 6. Distancia entre cajas necesaria para ZPA a 1.5 m/s (singulacion) ===")
zona=0.598  # zona ZP2026
for L in (0.3,0.5):
    gap=zona-L
    print(f"  caja {L*1e3:.0f} mm en zona {zona*1e3:.0f} mm -> holgura {gap*1e3:.0f} mm = {gap/1.5*1e3:.0f} ms a 1.5 m/s, {gap/1.0*1e3:.0f} ms a 1.0 m/s")
print()
print("=== 7. Presupuesto de parada (ejemplo) a 1.5 m/s: sensor 1 ms + filtro 3 ms + logica 2 ms + driver 2 ms + rampa ===")
for a in (2,3,5):
    t_r=1.5/a; d_r=0.5*1.5*t_r
    lat=0.008
    print(f"  a={a} m/s2: rampa {t_r*1e3:.0f} ms / {d_r*1e3:.0f} mm; + latencia 8 ms ({1.5*lat*1e3:.0f} mm) = {d_r*1e3+1.5*lat*1e3:.0f} mm de parada")
print()
print("=== 8. Costo orientativo por zona (USD, solo control; precios de research_*) ===")
rows={
 "A: ZoneLogix Plus (precio NO ENCONTRADO) + UniDrive": None,
 "B: CZC ESP32 DIN prototipo (StamPLC 42.9 / Waveshare ~50 EUR)": 45,
 "B: CZC PCB propia producto (A VERIFICAR; estimacion no admitida)": None,
 "D: ConveyLinx-Ai2 (Radwell 604.10 nuevo; 651.82 otra fuente)": 604.10,
 "D: Interroll MultiControl (Ultimation 314.95, 4 zonas) por zona": 314.95/4,
 "D: Itoh IB-E03B (~658, 2 zonas) por zona": 658/2,
 "D: Interroll ZoneControl (173.80, 1 zona)": 173.80,
}
for k,v in rows.items():
    print(f"  {k}: {'A VERIFICAR' if v is None else f'{v:.2f} USD/zona'}")
print(f"  Gateway cabecera Anybus AB7318 CAN->EIP: 1216.50 USD por linea; prorrateo en 20 zonas = {1216.5/20:.1f} USD/zona")
print()
print("=== 9. Corriente CAN/RS-485 zonas: numero de nodos y longitud (CiA 301) ===")
print("  CANopen 500 kbit/s -> 100 m; 250 kbit/s -> 250 m; 127 nodos. 20 zonas x 0.6 m = 12 m + Omni; linea de 50 zonas ~ 30 m")
print(f"  20 zonas ZP2026 de 598 mm = {20*0.598:.1f} m ; 50 zonas = {50*0.598:.1f} m")
print()
print("=== 10. Handshake discreto: tiempo de propagacion opto + filtro tipo 3 IEC 61131-2 ===")
print("  entrada opto tipica 0.1-1 ms; filtro 1-3 ms; salida high-side <0.1 ms -> <5 ms extremo a extremo (A VERIFICAR con componentes elegidos)")
print()
print("=== 11. Caida 24 V logica derivada de 48 V con DDR UVLO 33 V ===")
print("  margen 48-33.6 = 14.4 V; con 2.5 mm2, 20 A: 14.4/(2*7.41e-3*20) = ", round(14.4/(2*7.41e-3*20),1), "m de trunk antes de UVLO (carga concentrada)")
