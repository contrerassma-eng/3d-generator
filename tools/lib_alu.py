# -*- coding: utf-8 -*-
"""
lib_alu.py — Biblioteca de elementos de aluminio y ferreteria para los modelos de
Inventor de Conveyone (NOLABEL-01, LINEA-OMNI-01 y lo que venga).

Todo trabaja en MILIMETROS y con coordenadas de CENTRO. Se apoya en dos primitivas
que aporta el script que la usa:

    caja(c, d, op)              caja centrada en c=[x,y,z], dimensiones d=[dx,dy,dz]
    cil(eje, c0, dia, largo, op)  cilindro desde c0 a lo largo de `eje` ('x','y','z')

Con eso arma: perfil PG40 (ranura 8) con sus ranuras reales, escuadras, tapas,
pernos avellanados DIN 7991, manillas, patas niveladoras, chapa plegada y
accesorios de robotica (cadena portacables, fotocelula, prensaestopas).

El perfil PG40 es la serie de 40 mm de modulo con ranura de 8 mm:
  - modulo 40, ranura de boca 8 mm y camara interior 16,5 x 6
  - agujero central de 10,2 mm por modulo (para tornillo de union M8)
  - 40x80 = dos modulos en el eje mayor
"""

# ---- geometria de la serie PG40 (ranura 8) ------------------------------
PG = {
    'modulo': 40.0,
    'boca': 8.0,        # ancho de la boca de la ranura
    'boca_prof': 6.0,   # profundidad de la boca
    'camara': 16.5,     # ancho de la camara interior de la ranura
    'camara_prof': 6.0,
    'nucleo': 10.2,     # agujero central del modulo
    'radio': 2.0,
}
EJES = {'x': 0, 'y': 1, 'z': 2}


class Alu:
    def __init__(self, caja, cil):
        self.caja = caja
        self.cil = cil

    # ================= perfil estructural PG40 =========================
    def pg40(self, eje, c, largo, seccion=(40, 80), ranuras=True, nucleo=True):
        """Perfil PG40 a lo largo de `eje`, seccion centrada en c (c tambien es el
        centro del largo). seccion = (a, b) en los dos ejes transversales, en el
        orden de los ejes globales que quedan. Devuelve la lista de ejes transversales."""
        i = EJES[eje]
        tr = [k for k in ('x', 'y', 'z') if k != eje]        # ejes transversales
        d = [0, 0, 0]
        d[i] = largo
        d[EJES[tr[0]]] = seccion[0]
        d[EJES[tr[1]]] = seccion[1]
        self.caja(list(c), d, 'join')
        if not ranuras:
            return tr
        # una ranura por cara y por modulo
        for k, ancho_cara, ancho_otro in ((0, seccion[0], seccion[1]), (1, seccion[1], seccion[0])):
            j = EJES[tr[k]]        # eje normal a la cara
            o = EJES[tr[1 - k]]    # eje a lo largo de la cara
            n = max(1, int(round(ancho_otro / PG['modulo'])))
            for m in range(n):
                off = -ancho_otro / 2 + PG['modulo'] * (m + 0.5)
                for s in (-1, 1):
                    # boca de la ranura
                    cb = list(c)
                    cb[j] = c[j] + s * (ancho_cara / 2 - PG['boca_prof'] / 2)
                    cb[o] = c[o] + off
                    db = [0, 0, 0]
                    db[i] = largo + 2
                    db[j] = PG['boca_prof'] + 0.1
                    db[o] = PG['boca']
                    self.caja(cb, db, 'cut')
                    # camara interior
                    cc = list(cb)
                    cc[j] = c[j] + s * (ancho_cara / 2 - PG['boca_prof'] - PG['camara_prof'] / 2)
                    dc = [0, 0, 0]
                    dc[i] = largo + 2
                    dc[j] = PG['camara_prof']
                    dc[o] = PG['camara']
                    self.caja(cc, dc, 'cut')
        if nucleo:
            n0 = max(1, int(round(seccion[0] / PG['modulo'])))
            n1 = max(1, int(round(seccion[1] / PG['modulo'])))
            for a in range(n0):
                for b in range(n1):
                    p = list(c)
                    p[EJES[tr[0]]] = c[EJES[tr[0]]] - seccion[0] / 2 + PG['modulo'] * (a + 0.5)
                    p[EJES[tr[1]]] = c[EJES[tr[1]]] - seccion[1] / 2 + PG['modulo'] * (b + 0.5)
                    p[i] = c[i] - largo / 2 - 1
                    self.cil(eje, p, PG['nucleo'], largo + 2, 'cut')
        return tr

    def tapa_perfil(self, eje, c, seccion=(40, 80), t=2.0):
        """Tapa de extremo de perfil (plastico), pegada a la cara del perfil."""
        i = EJES[eje]
        tr = [k for k in ('x', 'y', 'z') if k != eje]
        d = [0, 0, 0]
        d[i] = t
        d[EJES[tr[0]]] = seccion[0]
        d[EJES[tr[1]]] = seccion[1]
        self.caja(list(c), d, 'join')

    def escuadra(self, plano, c, lado=40, t=8, ancho=38, sg=(1, 1)):
        """Escuadra de union de dos perfiles. `plano` = par de ejes que contiene la
        escuadra, p.ej. 'xz'. c es la esquina interior y sg el sentido de cada ala."""
        e1, e2 = EJES[plano[0]], EJES[plano[1]]
        e3 = ({0, 1, 2} - {e1, e2}).pop()
        s1, s2 = sg
        for a, b, sa, sb in ((e1, e2, s1, s2), (e2, e1, s2, s1)):
            cc = list(c)
            cc[a] = c[a] + sa * lado / 2
            cc[b] = c[b] + sb * t / 2
            d = [0, 0, 0]
            d[a] = lado
            d[b] = t
            d[e3] = ancho
            self.caja(cc, d, 'join')

    # ================= ferreteria ======================================
    def avellanado(self, eje, p, m=8, largo=25, signo=-1):
        """Perno avellanado DIN 7991 (hexagono interior). p = centro de la cabeza en
        la superficie; el vastago entra en direccion `signo` sobre `eje`."""
        dc = 2 * m           # diametro de cabeza
        hc = 0.55 * m        # altura del cono
        pasos = 4
        for k in range(pasos):     # cono aproximado por discos
            dia = dc - (dc - m) * (k + 0.5) / pasos
            c0 = list(p)
            c0[EJES[eje]] = p[EJES[eje]] + signo * hc * k / pasos
            self.cil(eje, c0, dia, signo * hc / pasos, 'join')
        c0 = list(p)
        c0[EJES[eje]] = p[EJES[eje]] + signo * hc
        self.cil(eje, c0, m, signo * (largo - hc), 'join')

    def agujero_avellanado(self, eje, p, m=8, largo=30, signo=-1):
        """El agujero que le corresponde: pasante mas el cono de asiento."""
        dc = 2 * m
        hc = 0.55 * m
        for k in range(4):
            dia = dc - (dc - m) * (k + 0.5) / 4
            c0 = list(p)
            c0[EJES[eje]] = p[EJES[eje]] + signo * hc * k / 4
            self.cil(eje, c0, dia, signo * hc / 4, 'cut')
        c0 = list(p)
        c0[EJES[eje]] = p[EJES[eje]] + signo * hc
        self.cil(eje, c0, m + 1, signo * (largo - hc), 'cut')

    def manilla(self, eje_sal, c, largo=160, alto=60, dia=20, base=32):
        """Manilla tipo U (tubo de aluminio) que sale en direccion `eje_sal`.
        c = centro de su huella sobre el panel."""
        i = EJES[eje_sal]
        tr = [k for k in ('x', 'y', 'z') if k != eje_sal]
        # el largo va sobre el primer eje transversal disponible que no sea vertical
        ejl = tr[1] if tr[1] != 'z' else tr[0]
        jl = EJES[ejl]
        for s in (-1, 1):
            p = list(c)
            p[jl] = c[jl] + s * (largo / 2 - dia / 2)
            self.cil(eje_sal, p, base, alto * 0.25, 'join')          # pie
            p2 = list(p)
            p2[i] = c[i] + alto * 0.25
            self.cil(eje_sal, p2, dia, alto * 0.75, 'join')          # montante
        pb = list(c)
        pb[i] = c[i] + alto - dia / 2
        pb[jl] = c[jl] - largo / 2
        self.cil(ejl, pb, dia, largo, 'join')                        # barra

    def pata_niveladora(self, c, dia_plato=80, alto_plato=12, dia_vast=16, alto_vast=90):
        """Pata niveladora: plato apoyado en el piso (c = centro del plato, en su base)."""
        self.cil('z', list(c), dia_plato, alto_plato, 'join')
        p = list(c)
        p[2] = c[2] + alto_plato
        self.cil('z', p, dia_vast, alto_vast, 'join')

    # ================= chapa plegada ===================================
    def chapa_plegada(self, c, dims, t=2.0, pestanas=('x-', 'x+', 'y-', 'y+'), alto_p=25):
        """Panel de chapa plegada: cara principal horizontal de dims=[dx,dy] con
        espesor t y pestanas hacia abajo en los lados indicados. c = centro de la
        cara superior."""
        dx, dy = dims
        self.caja([c[0], c[1], c[2] - t / 2], [dx, dy, t], 'join')
        for p in pestanas:
            eje, sg = p[0], (1 if p[1] == '+' else -1)
            cc = list(c)
            cc[2] = c[2] - t - alto_p / 2
            if eje == 'x':
                cc[0] = c[0] + sg * (dx / 2 - t / 2)
                self.caja(cc, [t, dy, alto_p], 'join')
            else:
                cc[1] = c[1] + sg * (dy / 2 - t / 2)
                self.caja(cc, [dx, t, alto_p], 'join')

    def chapa_vertical(self, eje_normal, c, dims, t=2.0, pestanas=(), alto_p=25, sentido=-1):
        """Panel vertical de chapa plegada con pestanas hacia adentro.
        dims = (ancho sobre el eje transversal horizontal, alto)."""
        i = EJES[eje_normal]
        eh = 'y' if eje_normal == 'x' else 'x'
        j = EJES[eh]
        d = [0, 0, 0]
        d[i] = t
        d[j] = dims[0]
        d[2] = dims[1]
        self.caja(list(c), d, 'join')
        for p in pestanas:
            sg = 1 if p == '+' else -1
            cc = list(c)
            cc[j] = c[j] + sg * (dims[0] / 2 - t / 2)
            cc[i] = c[i] + sentido * (alto_p / 2)
            dd = [0, 0, 0]
            dd[i] = alto_p
            dd[j] = t
            dd[2] = dims[1]
            self.caja(cc, dd, 'join')

    # ================= accesorios de robotica ==========================
    def cadena_portacables(self, eje, c, largo, ancho=40, alto=35, eslabon=45):
        """Cadena portacables (energy chain) modelada por eslabones."""
        i = EJES[eje]
        n = max(1, int(largo / eslabon))
        for k in range(n):
            cc = list(c)
            cc[i] = c[i] - largo / 2 + eslabon * (k + 0.5)
            d = [0, 0, 0]
            d[i] = eslabon - 4
            d[EJES['z']] = alto
            otro = [e for e in ('x', 'y', 'z') if e != eje and e != 'z'][0]
            d[EJES[otro]] = ancho
            self.caja(cc, d, 'join')

    def fotocelula(self, eje, c, cuerpo=(50, 18, 32)):
        """Sensor fotoelectrico M18 con su escuadra."""
        self.caja(list(c), list(cuerpo), 'join')
        p = list(c)
        p[EJES[eje]] = c[EJES[eje]]
        self.cil(eje, p, 18, 25, 'join')

    def prensaestopa(self, eje, c, dia=25, largo=28):
        self.cil(eje, list(c), dia, largo, 'join')
        p = list(c)
        p[EJES[eje]] = c[EJES[eje]] + largo
        self.cil(eje, p, dia * 0.8, 12, 'join')

    def canaleta(self, eje, c, largo, ancho=60, alto=60, t=2):
        """Canaleta ranurada de cableado, abierta por la cara + del segundo eje
        transversal (arriba si la canaleta es horizontal)."""
        i = EJES[eje]
        tr = [k for k in ('x', 'y', 'z') if k != eje]
        ja, jb = EJES[tr[0]], EJES[tr[1]]
        d = [0, 0, 0]
        d[i], d[ja], d[jb] = largo, ancho, alto
        self.caja(list(c), d, 'join')
        h = [0, 0, 0]
        h[i], h[ja], h[jb] = largo + 2, ancho - 2 * t, alto
        cc = list(c)
        cc[jb] = c[jb] + t
        self.caja(cc, h, 'cut')
