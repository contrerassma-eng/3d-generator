# Bloque OMNI v8 — ENSAMBLE POR STEP DE COMPONENTE, con tornilleria completa.
#
# Sergio (05-09): "You must use each step file for the belts, for the plate,
# for each component like wheels... bolts, nuts, washers, motors, belts...
# with all details."
#
# Como funciona:
#   PASO 1 (--componentes): genera UN STEP POR COMPONENTE en componentes_step/.
#   PASO 2 (ensamble): NO modela nada. IMPORTA cada .step y lo INSTANCIA en su
#   sitio. Lo que se ve en el ensamble es exactamente el archivo de la pieza.
#
# Lo que cambia respecto de la v7:
#   - las 32 ruedas entran desde m64v9_ensamble_der/izq.step (el STEP de la
#     rueda que ya validamos), no re-modeladas;
#   - el motor entra desde el STEP oficial de StepperOnline;
#   - las correas son HTD 5M-09 CON DIENTES REALES sobre su trazado;
#   - aparece toda la TORNILLERIA: DIN 912 e ISO 10642 con rosca metrica
#     helicoidal real, tuercas DIN 934 con rosca interior real, arandelas
#     planas DIN 125 y grower DIN 127;
#   - la chapa va PLEGADA CON RADIO (interior R4 en 4 mm, R8 en 8 mm), no con
#     alas pegadas a tope, y cada pieza lleva anotado su desarrollo.

import cadquery as cq
import numpy as np
from math import degrees, acos, cos, radians
import os, sys, time, shutil

import tren_motriz as tm
import placas_flowsort as pf
import placas_v8 as p8
import componentes as C

OUT = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(OUT, 'componentes_step')
os.makedirs(DIR, exist_ok=True)
P = lambda n: os.path.join(OUT, n)
S = lambda n: os.path.join(DIR, n + '.step')

Y_BRIDA = pf.Y_RAIL_INT
HUB_LARGO = 13.0
DESARROLLOS = {}


# ======================= PASO 1: componentes =======================
def tubo(ro, ri, ya, yb):
    w = cq.Workplane("XZ").circle(ro)
    if ri:
        w = w.circle(ri)
    return w.extrude(yb - ya).translate((0, yb, 0))


def rodamiento_f6801():
    """F6801ZZ 12x21x5 modelado a cota (aros, tapas ZZ y chaflanes)."""
    s = tubo(21.0 / 2, 17.4 / 2, 0, 5.0)
    s = s.union(tubo(23.2 / 2, 17.4 / 2, -1.0, 0))
    s = s.union(tubo(15.0 / 2, 12.0 / 2, 0, 5.0))
    for f in (0.3, 4.2):
        s = s.union(tubo(17.3 / 2, 15.1 / 2, f, f + 0.5))
    return s


def tensor():
    """rodillo tensor liso sobre perno M8."""
    s = tubo(pf.IDLER_D / 2, 4.1, -pf.IDLER_W / 2, pf.IDLER_W / 2)
    return s.union(tubo(9.0, 4.1, pf.IDLER_W / 2, pf.IDLER_W / 2 + 6.0))


def exportar_componentes():
    t0 = time.time()
    print('--- PASO 1: un STEP por componente ---')
    # chapa plegada
    r, des = p8.riel(-1)
    DESARROLLOS['RIEL'] = des
    cq.exporters.export(r, S('CHAPA_RIEL_4mm'))
    print(f'  CHAPA_RIEL_4mm            desarrollo {des:6.1f} mm')
    for nm, f in (('CHAPA_ESCUADRA_4mm', p8.escuadra),
                  ('CHAPA_PLACA_BASE_4mm', p8.placa_base),
                  ('CHAPA_CUNA_MOTOR_8mm', p8.cuna_motor),
                  ('CHAPA_TRAVESANO_4mm', p8.travesano),
                  ('CHAPA_TAPA_CIEGA_3mm', p8.tapa_ciega)):
        s, des = f()
        DESARROLLOS[nm] = des
        cq.exporters.export(s, S(nm))
        print(f'  {nm:25s} desarrollo {des:6.1f} mm')
    s, vx, vy, des = p8.tapa_superior()
    DESARROLLOS['CHAPA_TAPA_SUPERIOR_3mm'] = des
    cq.exporters.export(s, S('CHAPA_TAPA_SUPERIOR_3mm'))
    print(f'  CHAPA_TAPA_SUPERIOR_3mm   desarrollo {des:6.1f} mm · '
          f'ventana {vx:.1f}x{vy:.1f}')

    # transmision
    cq.exporters.export(tm.eje_hex(), S('EJE_HEX_1_2_pulgada'))
    cq.exporters.export(pf.separadores(0).translate((-pf.X_EJES[0], 0, -pf.Z_EJE)),
                        S('SEPARADORES_HEX_eje'))
    cq.exporters.export(tm.polea_htd(0.0), S('POLEA_HTD5M_20T_hex'))
    cq.exporters.export(tm.polea_htd(0.0, 'D', 'fuera'),
                        S('POLEA_HTD5M_20T_motor'))
    cq.exporters.export(tm.polea_htd(0.0, 'D', 'dentro')
                        .union(tubo(11.0, tm.M_EJE_D / 2 + 0.02,
                                    tm.POL_W / 2 + tm.POL_PEST,
                                    tm.POL_W / 2 + tm.POL_PEST + HUB_LARGO)),
                        S('POLEA_HTD5M_20T_motor_cubo_largo'))
    cq.exporters.export(rodamiento_f6801(), S('RODAMIENTO_F6801ZZ'))
    cq.exporters.export(tensor(), S('TENSOR_rodillo'))
    print('  transmision: eje, separadores, 2 poleas, rodamiento, tensor')

    # correas con dientes reales
    for h in ('der', 'izq'):
        s, n, L = C.correa_htd(pf.envolvente(h))
        cq.exporters.export(s, S(f'CORREA_HTD5M_09_{h}'))
        print(f'  CORREA_HTD5M_09_{h}: {n} dientes · perimetro {L:.1f} mm')

    # motor oficial y ruedas: se COPIAN tal cual sus STEP
    shutil.copy(os.path.join(OUT, 'NEMA24_UP', 'NEMA-24_stepperOnline.STEP'),
                S('MOTOR_NEMA24_stepperOnline'))
    for h in ('der', 'izq'):
        src = os.path.join(OUT, f'm64v9_ensamble_{h}.step')
        if not os.path.exists(src):
            src = os.path.join(OUT, '..', 'mecanum64v9', f'm64v9_ensamble_{h}.step')
        shutil.copy(src, S(f'RUEDA_MECANUM64_v9_{h}'))
    print('  motor oficial + las 2 ruedas mecanum v9 (copiados de su STEP)')
    print(f'--- componentes listos en {time.time()-t0:.0f} s ---')


# ======================= PASO 2: ensamble =======================
CACHE = {}


def comp(nombre):
    """importa el STEP del componente (una sola vez) y lo devuelve."""
    if nombre not in CACHE:
        CACHE[nombre] = cq.importers.importStep(S(nombre)).val()
    return CACHE[nombre]


def orientar(u):
    u = np.array(u, float)
    u /= np.linalg.norm(u)
    z = np.array([0.0, 0.0, 1.0])
    if np.allclose(u, z):
        return cq.Location()
    if np.allclose(u, -z):
        return cq.Location(cq.Vector(0, 0, 0), cq.Vector(1, 0, 0), 180)
    ax = np.cross(z, u)
    ang = degrees(acos(float(np.clip(np.dot(z, u), -1, 1))))
    return cq.Location(cq.Vector(0, 0, 0), cq.Vector(*ax), ang)


def loc(p, u):
    return cq.Location(cq.Vector(*p)) * orientar(u)


CUENTA = {}


def _add(a, nombre_step, etiqueta, L):
    a.add(comp(nombre_step), name=etiqueta, loc=L)
    CUENTA[nombre_step] = CUENTA.get(nombre_step, 0) + 1


def union_atornillada(a, tag, p, u, espesor, tornillo, d, tuerca=True):
    """Pone la union completa: arandela plana + tornillo por la cara de fuera,
    y por la de dentro arandela plana + grower + tuerca (como el manual del
    Flowsort, que pide grower en los grupos motrices).
    p = punto de la cara exterior, u = normal saliente."""
    m = int(d)
    ta = C.NORMA[d][7]
    _add(a, f'ARANDELA_DIN125_M{m}', f'{tag}_ar1', loc(p, u))
    _add(a, tornillo, f'{tag}_tor', loc(np.array(p) + np.array(u) * ta, u))
    if tuerca:
        q = np.array(p) - np.array(u) * espesor
        _add(a, f'ARANDELA_DIN125_M{m}', f'{tag}_ar2', loc(q, -np.array(u)))
        _add(a, f'ARANDELA_GROWER_DIN127_M{m}', f'{tag}_gr',
             loc(q - np.array(u) * ta, -np.array(u)))
        _add(a, f'TUERCA_DIN934_M{m}', f'{tag}_tue',
             loc(q - np.array(u) * (ta + C.NORMA[d][7] * 1.1), -np.array(u)))


def ensamble(con_ruedas=True):
    a = cq.Assembly(name='bloque_omni_v8')
    yN, yP = pf.Y_RAIL_N, pf.Y_RAIL_P

    _add(a, 'CHAPA_PLACA_BASE_4mm', 'placa_base', cq.Location())
    for i, xt in enumerate(pf.X_TRAV):
        _add(a, 'CHAPA_TRAVESANO_4mm', f'travesano_{i}',
             cq.Location(cq.Vector(xt, 0, 0)))
    # riel cercano tal cual; el lejano es la MISMA pieza girada 180 sobre Z
    _add(a, 'CHAPA_RIEL_4mm', 'riel_N', cq.Location())
    _add(a, 'CHAPA_RIEL_4mm', 'riel_P',
         cq.Location(cq.Vector(0, yN + yP, 0)) *
         cq.Location(cq.Vector(0, 0, 0), cq.Vector(0, 0, 1), 180) *
         cq.Location(cq.Vector(0, -(yN + yP), 0)) *
         cq.Location(cq.Vector(0, yN + yP, 0)))

    for sy in (-1, 1):
        gir = (cq.Location() if sy < 0 else
               cq.Location(cq.Vector(0, yN + yP, 0)) *
               cq.Location(cq.Vector(0, 0, 0), cq.Vector(0, 0, 1), 180))
        u_out = np.array([0.0, -1.0, 0.0]) * (1 if sy < 0 else -1)
        yext = (yN - pf.RAIL_T / 2) if sy < 0 else (yP + pf.RAIL_T / 2)
        for j, x in enumerate(p8.X_ESC):
            _add(a, 'CHAPA_ESCUADRA_4mm', f'escuadra_{"N" if sy<0 else "P"}{j}',
                 gir * cq.Location(cq.Vector(x, 0, 0)) if sy < 0 else
                 cq.Location(cq.Vector(0, yN + yP, 0)) *
                 cq.Location(cq.Vector(0, 0, 0), cq.Vector(0, 0, 1), 180) *
                 cq.Location(cq.Vector(-x, 0, 0)))
            # M6x20 riel <-> escuadra (2 por escuadra)
            for z in p8.Z_COL_ESC:
                xx = x if sy < 0 else -x
                union_atornillada(a, f'M6ra_{"N" if sy<0 else "P"}{j}_{z:.0f}',
                                  (xx if sy < 0 else x, yext, z), u_out,
                                  2 * pf.RAIL_T, 'TORNILLO_DIN912_M6x20', 6.0)
            # M6x25 escuadra <-> base (2 por escuadra), desde arriba
            y_h = pf.y_pie_escuadra(sy)
            for dx in p8.DX_ESC:
                union_atornillada(a, f'M6eb_{"N" if sy<0 else "P"}{j}_{dx:.0f}',
                                  ((x if sy < 0 else -x) + dx, y_h,
                                   pf.Z_BASE1 + pf.RAIL_T), (0, 0, 1),
                                  2 * pf.RAIL_T, 'TORNILLO_DIN912_M6x25', 6.0)

    # travesanos: M8 a la base y M8 a las pestanas del conveyor
    for i, xt in enumerate(pf.X_TRAV):
        for y in pf.Y_BASE_TRAV:
            union_atornillada(a, f'M8bt{i}_{y:.0f}', (xt, y, pf.Z_BASE1),
                              (0, 0, 1), pf.Z_BASE1 - (pf.Z_PESTANA + 2.0),
                              'TORNILLO_DIN912_M8x25', 8.0)
        for sy in (-1, 1):
            union_atornillada(a, f'M8tp{i}_{sy}',
                              (xt, sy * (pf.CARA_INT + 2.0), pf.Z_PESTANA + 2.0),
                              (0, 0, 1), 12.0, 'TORNILLO_DIN912_M8x35', 8.0)

    # motores, cunas y transmision
    for h in ('der', 'izq'):
        xm = pf.X_MOTOR[h]
        _add(a, 'MOTOR_NEMA24_stepperOnline', f'motor_NEMA24_{h}',
             cq.Location(cq.Vector(xm, Y_BRIDA + 11.95, pf.ZM)) *
             cq.Location(cq.Vector(0, 0, 0), cq.Vector(1, 0, 0), 90) *
             cq.Location(cq.Vector(-30.0, -30.0, 0)))
        _add(a, 'CHAPA_CUNA_MOTOR_8mm', f'cuna_motor_{h}',
             cq.Location(cq.Vector(xm, 0, 0)))
        for dx in (-46.0, 0.0, 46.0):
            union_atornillada(a, f'M6cb_{h}_{dx:.0f}',
                              (xm + dx, pf.Y_CUNA + 22.0,
                               pf.Z_BASE1 + pf.MOT_PLACA_T), (0, 0, 1),
                              pf.MOT_PLACA_T + pf.RAIL_T,
                              'TORNILLO_DIN912_M6x20', 6.0, tuerca=False)
        # M5x10 de la brida del motor, desde fuera del riel (rosca ciega)
        for dx in (-25.0, 25.0):
            for dz in (-25.0, 25.0):
                union_atornillada(a, f'M5mot_{h}_{dx:.0f}_{dz:.0f}',
                                  (xm + dx, pf.Y_RAIL_EXT, pf.ZM + dz),
                                  (0, -1, 0), 0, 'TORNILLO_DIN912_M5x8', 5.0,
                                  tuerca=False)
        pol = ('POLEA_HTD5M_20T_motor_cubo_largo'
               if abs(tm.G[h]) > abs(tm.G['der']) else 'POLEA_HTD5M_20T_motor')
        _add(a, pol, f'polea_motor_{h}', cq.Location(cq.Vector(xm, tm.G[h], pf.ZM)))
        _add(a, f'CORREA_HTD5M_09_{h}', f'correa_{h}',
             cq.Location(cq.Vector(0, tm.G[h], 0)))
        for j, (xt, zt) in enumerate(pf.TENSORES[h]):
            _add(a, 'TENSOR_rodillo', f'tensor_{h}{j}',
                 cq.Location(cq.Vector(xt, tm.G[h], zt)))
            union_atornillada(a, f'M8ten_{h}{j}',
                              (xt, pf.Y_RAIL_EXT, zt), (0, -1, 0),
                              pf.RAIL_T, 'TORNILLO_DIN912_M8x35', 8.0)

    for k in range(pf.NEJES):
        x, h = pf.X_EJES[k], pf.mano(k)
        _add(a, 'EJE_HEX_1_2_pulgada', f'eje_{k}',
             cq.Location(cq.Vector(x, 0, pf.Z_EJE)))
        _add(a, 'SEPARADORES_HEX_eje', f'separadores_{k}',
             cq.Location(cq.Vector(x, 0, pf.Z_EJE)))
        _add(a, 'POLEA_HTD5M_20T_hex', f'polea_eje_{k}',
             cq.Location(cq.Vector(x, tm.G[h], pf.Z_EJE)))
        _add(a, 'TORNILLO_DIN912_M4x10', f'prisionero_polea_{k}',
             loc((x + 11.0, tm.G[h] - tm.POL_W / 2 - tm.POL_PEST - 3.0, pf.Z_EJE),
                 (1, 0, 0)))
        _add(a, 'RODAMIENTO_F6801ZZ', f'F6801_{k}N',
             cq.Location(cq.Vector(x, pf.Y_RAIL_EXT, pf.Z_EJE)))
        _add(a, 'RODAMIENTO_F6801ZZ', f'F6801_{k}P',
             cq.Location(cq.Vector(x, pf.Y_RAIL_P + pf.RAIL_T / 2, pf.Z_EJE)) *
             cq.Location(cq.Vector(0, 0, 0), cq.Vector(0, 0, 1), 180))
        if con_ruedas:
            for i, y in enumerate(pf.Y_RUEDAS):
                _add(a, f'RUEDA_MECANUM64_v9_{h}', f'rueda_{k}{i}',
                     cq.Location(cq.Vector(x, y, pf.Z_EJE)) *
                     cq.Location(cq.Vector(0, 0, 0), cq.Vector(1, 0, 0), -90))

    # tapas y sus avellanados
    _add(a, 'CHAPA_TAPA_SUPERIOR_3mm', 'tapa_superior', cq.Location())
    ya = {(-1): pf.Y_RAIL_N - pf.RAIL_T / 2 - chapa_off(),
          (1): pf.Y_RAIL_P + pf.RAIL_T / 2 + chapa_off()}
    for x in p8.X_TAPA:
        for sy in (-1, 1):
            _add(a, 'TORNILLO_ISO10642_M5x10', f'M5tapa_{sy}_{x:.0f}',
                 cq.Location(cq.Vector(x, ya[sy], pf.Z_TAPA_BOT + pf.TAPA_T)))
    for i in range(2):
        xc = -149.0 + i * 298.0
        _add(a, 'CHAPA_TAPA_CIEGA_3mm', f'tapa_ciega_{i}',
             cq.Location(cq.Vector(xc, 0, 0)))
        for dx in (-110.0, 0.0, 110.0):
            for y in (-146.0, -260.0):
                _add(a, 'TORNILLO_ISO10642_M5x10', f'M5ciega_{i}_{dx:.0f}_{y:.0f}',
                     cq.Location(cq.Vector(xc + dx, y, pf.Z_TAPA_BOT + pf.TAPA_T)))
    return a


def chapa_off():
    return pf.ALA - 4.0        # centro del tramo plano del ala plegada


def chapa_R():
    import chapa as ch
    return ch.R_PLEG


if __name__ == '__main__':
    if '--componentes' in sys.argv or not os.path.exists(S('CHAPA_RIEL_4mm')):
        exportar_componentes()
    t0 = time.time()
    a = ensamble(con_ruedas=True)
    print(f'--- PASO 2: ensamble por instancias ({time.time()-t0:.0f} s) ---')
    tot = 0
    for k in sorted(CUENTA):
        print(f'  {k:38s} x{CUENTA[k]:4d}')
        tot += CUENTA[k]
    print(f'  TOTAL {tot} piezas de {len(CUENTA)} referencias distintas')
    t0 = time.time()
    a.save(P('bloque_omni_v8.step'))
    print(f'bloque_omni_v8.step OK · {os.path.getsize(P("bloque_omni_v8.step"))/1e6:.1f} MB'
          f' · {time.time()-t0:.0f} s')
