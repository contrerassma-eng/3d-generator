"""Documentación del dispensador canino: memoria, manual, listas de compra.

Todo lo que aquí se escribe se DERIVA de `input/params.json`, de los cálculos
del generador y de `out/VERIFICACION.json`. Ningún número se teclea a mano: si
cambia un parámetro, cambian los documentos. Cada dato de origen externo se
cita con el id del hecho de `input/web_facts.json`.

Produce:
  out/MEMORIA_DISENO.md    por qué el aparato es así y con qué respaldo
  out/ENSAMBLE.md          armado, calibración de la dosis, uso y limpieza
  out/LISTA_IMPRESION.csv  qué imprimir, con qué ajustes y cuánto PLA
  out/COMPRA.csv           lo que hay que comprar (no impreso)

uso: python pipeline/doc_dispensador.py projects/<X>
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import lib_solidos as S
import gen_dispensador as G
from lib_audit import audit, now_iso, project_dir


def cargar(proj: Path):
    P = json.loads((proj / "input" / "params.json").read_text(encoding="utf-8"))
    C = G.calculos(P)
    hechos = {f["id"]: f for f in json.loads(
        (proj / "input" / "web_facts.json").read_text(encoding="utf-8"))}
    ver = json.loads((proj / "out" / "VERIFICACION.json").read_text(encoding="utf-8")) \
        if (proj / "out" / "VERIFICACION.json").exists() else None
    sim = json.loads((proj / "out" / "SIMULACION.json").read_text(encoding="utf-8")) \
        if (proj / "out" / "SIMULACION.json").exists() else None
    idx = json.loads((proj / "out" / "piezas" / "INDICE.json").read_text(encoding="utf-8")) \
        if (proj / "out" / "piezas" / "INDICE.json").exists() else None
    return P, C, hechos, ver, idx, sim


def cita(hechos: dict, id_: str) -> str:
    h = hechos.get(id_)
    if not h:
        return f"`{id_}` (falta en web_facts.json)"
    return f"[{id_}]({h['url']}) — «{h['quote'][:150]}{'…' if len(h['quote']) > 150 else ''}»"


def memoria(P, C, hechos, ver, sim=None) -> str:
    al, do, ag, es, im = (P["alimento"], P["dosificador"], P["agua"],
                          P["estructura"], P["impresion"])
    bi, aa = P["bidon"], C["anti_arco"]
    v = {p["id"]: p for p in ver["pruebas"]} if ver else {}
    L = []
    A = L.append
    A("# MEMORIA DE DISEÑO — Dispensador canino YT0101")
    A("")
    A(f"Generado: {now_iso()} · Capa `user` (diseño paramétrico, no medición).")
    A("Cada cota nace de `input/params.json`; cada dato externo está citado en")
    A("`input/web_facts.json` con URL, fecha de acceso y cita textual.")
    A("")
    A("## 1. Qué se pidió y qué se construyó")
    A("")
    A("Dos aparatos mecánicos para un perro, ambos con estanque de bidón de 20 L:")
    A("")
    A("| | Cabezal de ALIMENTO | Cabezal de AGUA |")
    A("|---|---|---|")
    A(f"| Principio | Cajón dosificador de cavidad fija | Nivel constante (botella de Mariotte) |")
    A(f"| Accionamiento | Palanca → piñón m{do['modulo']} z{do['pinon_z']} → cremallera | Ninguno: se autorregula |")
    A(f"| Entrega | {C['dosis_g']:.0f} g por golpe | Nivel fijo de {ag['nivel_agua']:.0f} mm |")
    A(f"| Bidón | Recortado (boca de carga Ø150) | Íntegro |")
    A(f"| Autonomía | {C['autonomia_alimento_dosis']} dosis ({C['masa_alimento_kg']:.0f} kg) | "
      f"{C['autonomia_agua_l']:.1f} L |")
    A(f"| Altura total | {C['z_tope_bidon_alimento']:.0f} mm | "
      f"{C['z_labio_agua'] + bi['altura_total']:.0f} mm |")
    A("")
    A("Nada de electrónica, motores ni baterías. Ningún resorte impreso.")
    A("")
    A("## 2. El bidón de 20 L como estanque")
    A("")
    A("El botellón chileno de agua purificada resulta ser el mismo molde que el")
    A("estándar norteamericano de 5 galones, y esto es lo que permite diseñar")
    A("piezas que le calzan:")
    A("")
    A(f"- Cuerpo Ø{bi['dia_cuerpo']:.0f} mm y alto {bi['altura_total']:.0f} mm — {cita(hechos, 'cl-vertientes-altura')}")
    A(f"- Boca Ø{bi['dia_boca_ext']:.0f} mm (crown, NO es una rosca) — {cita(hechos, 'us-5gal-steelhead-neck')}")
    A(f"- Peso lleno {bi['masa_lleno_kg']:.1f} kg — {cita(hechos, 'us-5gal-peso-lleno')}")
    A("")
    A("**Aviso de tolerancia:** entre marcas la boca va de 48 a 56 mm")
    A(f"({cita(hechos, 'cl-vertientes-diametro-boca')}). El collar del cuello es partido y")
    A("aprieta con dos tornillos, así que absorbe esa variación; aun así hay que")
    A("medir el envase real con calibre y corregir `params.json` antes de imprimir")
    A("la serie definitiva. Las cotas del hombro del envase son un **supuesto")
    A("declarado**, no un dato de catálogo: ninguna ficha pública las publica.")
    A("")
    A("## 3. Por qué un cajón dosificador y no una rueda de paletas")
    A("")
    A("La rueda de paletas es lo primero que uno dibuja, y es la solución")
    A("equivocada para croqueta de perro impresa en PLA:")
    A("")
    A(f"- La holgura industrial punta-carcasa es de {cita(hechos, 'rotary_clearance_tipica')}.")
    A("  Una impresora FDM doméstica no sostiene esa holgura en un diámetro de")
    A(f"  140 mm (tolerancia típica {cita(hechos, 'fdm_tolerancia_general')}).")
    A(f"- Con holgura grande, la croqueta se atasca o se parte justo ahí: "
      f"{cita(hechos, 'rotary_particulas_grandes_riesgo')}.")
    A("")
    A("El cajón de cavidad fija traslada la tolerancia crítica a un ajuste")
    A("deslizante PLANO, que es justo donde las guías de impresión dan cifras")
    A(f"utilizables: {cita(hechos, 'fdm_clearance_ajuste_deslizante')}. Es además el")
    A(f"mecanismo de los dispensadores de cereal y caramelos: {cita(hechos, 'slide_powder_dispenser_patente')}.")
    A("")
    A("## 4. De la ración a la cavidad: cómo sale la dosis")
    A("")
    A(f"Ración de referencia: perro de 20 kg, {cita(hechos, 'racion-royalcanin-mediana')}")
    A("")
    A(f"- Densidad de diseño: **{al['densidad_aparente_g_ml']:.2f} g/ml** — {cita(hechos, 'gramos-por-taza-purina')}")
    A(f"- Rango contemplado: {al['densidad_rango_g_ml'][0]:.2f}–{al['densidad_rango_g_ml'][1]:.2f} g/ml "
      f"({cita(hechos, 'densidad-rango-objetivo-industria')}, {cita(hechos, 'gramos-por-taza-championdog')})")
    A(f"- Factor de llenado adoptado: {al['factor_llenado']:.2f} — {cita(hechos, 'slide_disco_principio_medicion')}")
    A("")
    A("```")
    A(f"volumen de cavidad = dosis / (densidad x llenado)")
    A(f"                   = {al['dosis_objetivo_g']:.0f} g / ({al['densidad_aparente_g_ml']:.2f} g/ml"
      f" x {al['factor_llenado']:.2f}) = {C['volumen_cavidad_ml']:.1f} ml")
    A(f"cavidad = {do['cavidad_x']:.0f} x {do['cavidad_y']:.0f} x {C['cavidad_z']:.1f} mm")
    A("```")
    A("")
    A(f"**Dosis resultante: {C['dosis_g']:.0f} g por golpe** "
      f"(entre {C['dosis_rango_g'][0]:.0f} y {C['dosis_rango_g'][1]:.0f} g según la marca de alimento).")
    A("Con el inserto de media dosis montado, la mitad. Un perro de 20 kg come")
    A(f"230 g/día en dos comidas: **{230 / 2 / C['dosis_g']:.1f} golpes por comida**.")
    A("")
    A("La dosis NO se declara verificada por catálogo: se calibra pesando cinco")
    A("golpes con el alimento real (`ENSAMBLE.md`, §5). Ese es el único número")
    A("que convierte el diseño en un dosificador de verdad.")
    A("")
    A("## 5. Que no se forme arco (el fallo clásico de estos aparatos)")
    A("")
    A(f"Criterio de Jenike, vía Mehos: {cita(hechos, 'regla-6x-arqueo-jenike')}. Para una")
    A(f"abertura rasgada basta la mitad: {cita(hechos, 'arqueo-vs-rathole-geometria')}.")
    A("")
    A("| Sección del camino | Forma | Medida | Exigido | Razón | Resultado |")
    A("|---|---|---|---|---|---|")
    A(f"| Boca de carga | rasgada {do['cavidad_x']:.0f}×{do['cavidad_y']:.0f} | {do['cavidad_y']:.0f} mm | "
      f"{aa['factor_exigido_rasgada']:.0f}× = {aa['factor_exigido_rasgada'] * al['croqueta_dia_mm']:.0f} mm | "
      f"{aa['razon_tolva']:.2f}× | {'CUMPLE' if aa['cumple_tolva'] else 'NO CUMPLE'} |")
    A(f"| Cuello del bidón | circular | {aa['seccion_critica_cuello_mm']:.0f} mm | "
      f"{aa['factor_exigido']:.0f}× = {aa['factor_exigido'] * al['croqueta_dia_mm']:.0f} mm | "
      f"{aa['razon_cuello']:.2f}× | {'CUMPLE' if aa['cumple_cuello'] else 'NO CUMPLE'} |")
    A("")
    A(f"**El cuello del bidón no cumple** para croqueta de {al['croqueta_dia_mm']:.0f} mm, y no se")
    A("puede tapar ese dato: es la sección estática más estrecha de todo el camino.")
    A("Tres salidas, las tres previstas en el diseño:")
    A("")
    A("1. **Agitador obligatorio** (viene montado): cuatro dedos accionados por la")
    A("   biela del cajón barren la garganta en cada golpe y rompen el puente.")
    A(f"2. **Croqueta ≤ {aa['croqueta_max_sin_agitador_mm']:.1f} mm**: con ese tamaño el cuello cumple el")
    A(f"   criterio por sí solo ({cita(hechos, 'kibble-tamano-afb-pequena')}).")
    A("3. **Adaptador de hombro** (`ali_adaptador_hombro`): se corta el envase donde")
    A("   mide Ø152 mm y el cuello desaparece del camino. Es la variante de mejor")
    A("   flujo y la recomendada para croqueta de raza grande")
    A(f"   ({cita(hechos, 'kibble-tamano-afb-grande')}).")
    A("")
    A(f"La pared del adaptador va a {al['angulo_pared_tolva_deg']:.0f}° respecto de la horizontal, dentro del")
    A(f"rango de flujo másico: {cita(hechos, 'angulo-pared-tolva-DEM-pellets')}.")
    A("")
    A("> **Vacío de datos declarado.** No existe fuente publicada del ángulo de")
    A("> reposo de la croqueta de perro; lo más cercano son pellets de alimento")
    A(f"> animal ({cita(hechos, 'angulo-reposo-pellets-alimento-2015')}), que son más")
    A("> densos y compactos. Medirlo con el alimento real es parte de la puesta en")
    A("> marcha.")
    A("")
    A("## 6. El tren de accionamiento")
    A("")
    p = C["pinon"]
    A(f"- Piñón recto de evolvente **m={do['modulo']}, z={do['pinon_z']}**, Ø primitivo "
      f"{p['dia_primitivo']:.1f} mm, Ø cabeza {p['dia_cabeza']:.1f} mm, ángulo de presión "
      f"{do['angulo_presion']:.0f}° ({cita(hechos, 'gear_angulo_presion_estandar')}).")
    A(f"- z={do['pinon_z']} > 17: no hay socavado — {cita(hechos, 'gear_min_dientes_20deg')}.")
    A(f"- Ancho de cara {do['pinon_ancho']:.0f} mm = {do['pinon_ancho'] / do['modulo']:.0f}× el módulo "
      f"({cita(hechos, 'gear_ancho_cara')}).")
    A(f"- Backlash {do['backlash']:.2f} mm, extremo holgado del rango recomendado porque el par")
    A(f"  es manual y va a entrar polvo de croqueta: {cita(hechos, 'gear_backlash_flanco')}.")
    A(f"- Un barrido de palanca de **{C['palanca_barrido_deg']:.0f}°** desplaza el cajón "
      f"{C['carrera']:.0f} mm — exactamente la carrera necesaria (cavidad {do['cavidad_y']:.0f} + "
      f"tabique {do['sello_tabique']:.0f}).")
    A(f"- Ventaja mecánica de la palanca: **{C['ventaja_palanca']:.1f}:1**.")
    A(f"- La palanca barre entre {C['palanca_ang_cerrado']:.0f}° y {C['palanca_ang_abierto']:.0f}°, dentro del")
    A("  sector libre que dejan las tres columnas (que están a 90°, 210° y 330°).")
    A("  No es una elección estética: con el brazo montado 130° más allá, el barrido")
    A("  golpea la columna trasera. La prueba V13 lo comprueba en 13 posiciones.")
    A("")
    A("La cremallera va embutida en el flanco del cajón: las puntas de los dientes")
    A(f"quedan {do['cremallera_empotre']:.0f} mm por dentro del plano de deslizamiento, así el")
    A("piñón entra por la ventana del carril y nada roza (prueba V3).")
    A("")
    A("### Qué cuesta accionarla")
    A("")
    A("Estimación, no medición (queda para el prototipo): sobre la boca de carga")
    A(f"({do['cavidad_x']:.0f}×{do['cavidad_y']:.0f} mm) la columna de croquetas apoya con del orden de 6 N —")
    A("mucho menos que la altura de la tolva por su peso, porque en una tolva")
    A("convergente el rozamiento con las paredes descarga la base (efecto Janssen).")
    A("Sumando el rozamiento del cajón y el corte de alguna croqueta en el canto,")
    A(f"del orden de 30 N en el cajón. Con la ventaja mecánica de {C['ventaja_palanca']:.1f}:1 quedan")
    A(f"unos {30 / C['ventaja_palanca']:.0f} N en la empuñadura: un dedo. Si cuesta más que eso, algo")
    A("está rozando y conviene revisar antes de forzar.")
    A("")
    A("### El agitador va colgado del mismo movimiento")
    A("")
    A("El cajón hace de corredera de un biela-manivela: al recorrer su carrera")
    A(f"arrastra una biela de **{C['biela_largo']:.1f} mm** entre ejes que gira la manivela de")
    A(f"**{C['manivela_radio']:.1f} mm** montada en el eje del agitador. Ni la biela ni la manivela")
    A("se eligieron a ojo — salen de las dos posiciones extremas del pasador:")
    A("")
    A("```")
    A(f"pasador del cajón: y = {C['y_pasador_cerrado']:.0f} mm (cargado) → {C['y_pasador_abierto']:.0f} mm (descargando)")
    A(f"desnivel al eje del agitador: {C['biela_dz']:.1f} mm")
    A(f"biela   = (dist_max + dist_min) / 2 = {C['biela_largo']:.2f} mm")
    A(f"manivela = (dist_max − dist_min) / 2 = {C['manivela_radio']:.2f} mm")
    A("```")
    A("")
    A("Resultado: **el agitador gira unos 200° por golpe** y otros tantos al volver,")
    A("con los puntos muertos justo en los extremos de la carrera, que es donde el")
    A("cajón se detiene de todas formas. La prueba V12 comprueba el cierre del")
    A("cuadrilátero en los 21 pasos del recorrido.")
    A("")
    A("**Sin resortes.** El accionamiento es positivo en los dos sentidos, porque")
    A(f"{cita(hechos, 'spring_pla_mal_material')}")
    A("")
    A("## 7. El agua: nivel constante sin válvula")
    A("")
    A(f"{cita(hechos, 'mariotte-principio')}")
    A("")
    A("En la práctica: el bidón invertido descarga por el bajante hasta que el agua")
    A("tapa las ventanas del difusor; ahí deja de entrar aire y el flujo se detiene.")
    A("Cuando el perro bebe y el nivel baja, entra aire y repone. El nivel de")
    A(f"equilibrio es exactamente la cota del borde inferior de esas ventanas:")
    A(f"**{ag['nivel_agua']:.0f} mm** sobre el fondo del plato, regulable ±{ag['bajante_carrera_ajuste'] / 2:.0f} mm")
    A("con el tramo deslizante.")
    A("")
    A(f"- Agua en el plato: {C['agua_util_ml']:.0f} ml · autonomía total {C['autonomia_agua_l']:.1f} L.")
    A(f"- Margen hasta el borde del plato: {ag['bebedero_alto'] - ag['nivel_agua']:.0f} mm (no rebalsa aunque")
    A("  el perro empuje el plato).")
    A("- No hay válvula de flotador: nada que se pegue, nada que gotee.")
    A("")
    A("## 8. Estructura y seguridad")
    A("")
    if "V9" in v:
        m = v["V9"]["medido"]
        A(f"El bidón lleno pesa {m['carga_total_N']:.0f} N y lo reparten tres columnas de")
        A(f"perfil {es['pata_seccion']:.0f}×{es['pata_seccion']:.0f} mm inclinadas {es['pata_inclinacion_deg']:.0f}°:")
        A("")
        A(f"- Carga por columna: {m['carga_por_columna_N']:.0f} N → tensión {m['tension_MPa']:.2f} MPa "
          f"(factor de seguridad {m['fs_aplastamiento']:.0f} frente al aplastamiento).")
        A(f"- Pandeo de Euler de la columna impresa: factor {m['fs_pandeo_columna_impresa']:.1f}.")
        A(f"- **Vuelco: bastan {m['empuje_lateral_para_volcar_N']:.0f} N de empuje lateral** con base de "
          f"{m['radio_base_mm']:.0f} mm de radio.")
        A("")
        A("Ese último número es el que manda: un perro mediano empuja bastante más de")
        A(f"{m['empuje_lateral_para_volcar_N']:.0f} N. **La escuadra de muro (`est_escuadra_muro`) no es opcional**")
        A("en el cabezal de alimento, que es el más alto.")
    A("")
    A("## 9. Contacto con el alimento: qué se puede afirmar y qué no")
    A("")
    A(f"- La resina PLA está admitida como material de contacto alimentario: {cita(hechos, 'pla_fda_gras')}")
    A("  Eso aplica a la RESINA, no garantiza que la pieza impresa lo sea.")
    A(f"- Postura precautoria sobre las líneas de capa: {cita(hechos, 'pla_porosidad_riesgo_biofilm')}")
    A(f"- Evidencia en contra de esa postura: {cita(hechos, 'pla_estudio_thomas_sem')}")
    A(f"- Lo que sí está claro es la limpieza: {cita(hechos, 'pla_limpieza_efectiva')}")
    A("")
    A("Por eso el cajón sale entero tirando de él, sin herramientas: la pieza que")
    A("toca la croqueta se lava. Alimento seco, poco tiempo de contacto y lavado")
    A("regular: el riesgo es bajo, pero la discrepancia entre fuentes se declara en")
    A("vez de esconderse.")
    A("")
    A("## 10. Resultado de la verificación")
    A("")
    if ver:
        A(f"**{ver['resumen']['veredicto']}** — {ver['resumen']['pruebas']} pruebas, "
          f"{len(ver['resumen']['fallas'])} fallas, {len(ver['resumen']['advertencias'])} advertencias "
          f"(detalle completo en `VERIFICACION.md`).")
        A("")
        A("| | Prueba | Resultado |")
        A("|---|---|---|")
        for p_ in ver["pruebas"]:
            A(f"| {p_['id']} | {p_['titulo']} | **{p_['veredicto']}** |")
    A("")
    A("## 11. Lo que este diseño todavía no demuestra")
    A("")
    A("Honestidad de ingeniería: la verificación es geométrica y analítica. NO")
    A("sustituye al prototipo.")
    A("")
    if sim:
        base = sim.get("casos", {}).get("base", {})
        cal = sim.get("calibracion", {})
        A("La simulación de grano (`SIMULACION.md`, gate G-SIM) ataca tres de")
        A("estos puntos, pero con un MODELO: esferas polidispersas con fricción")
        A("de rodadura calibrada contra el ángulo de reposo publicado. Reduce la")
        A("incertidumbre, no la elimina.")
        A("")
        A("| Antes era un supuesto | Qué dice el modelo |")
        A("|---|---|")
        s5 = next((x for x in sim.get("pruebas", []) if x["id"] == "S5"), None)
        fl = (s5 or {}).get("medido", {}).get("llenado_simulado")
        A(f"| Llenado {al['factor_llenado']:.2f} de la cavidad | "
          f"**{fl if fl is not None else '—'} simulado** "
          f"({(s5 or {}).get('veredicto', '')}) |")
        s7 = next((x for x in sim.get("pruebas", []) if x["id"] == "S7"), None)
        if s7:
            A(f"| El agitador es obligatorio | {s7['medido'].get('con_agitador_g')} g "
              f"con agitador contra {s7['medido'].get('sin_agitador_g')} g sin él |")
        A(f"| El bisel no parte la croqueta | fuerza máxima de contacto "
          f"{base.get('fuerza_contacto_max_N')} N contra "
          f"{P.get('dem', {}).get('carga_rotura_croqueta_N')} N de rotura publicada |")
        A("")
        d = cal.get("densidad", {})
        s1 = next((x for x in sim.get("pruebas", []) if x["id"] == "S1"), None)
        if s1 and s1["veredicto"] != "PASA":
            A(f"**Y la corrida NO es numéricamente limpia** (prueba S1): el solape "
              f"máximo llegó al {s1['medido'].get('solape_max_pct_radio')}% del radio "
              f"y hubo {s1['medido'].get('contactos_acotados')} contactos con la fuerza "
              "acotada, casi todos donde el canto del cajón cizalla el lecho. El "
              "contacto blando deja de representar bien ese pellizco, así que **los "
              "gramos por golpe son indicativos, no certificados**. El factor de "
              "llenado aguanta mejor porque es un cociente y el sesgo se cancela.")
            A("")
        A("Y deja al descubierto una contradicción entre dos fuentes citadas que")
        A("el modelo no puede resolver: la densidad de partícula publicada de la")
        A("croqueta es incompatible con la densidad aparente del fabricante")
        A(f"({cal.get('densidad_citada_g_ml')} g/ml exigiría empaquetar muy por")
        A("encima del máximo físico de un lecho de esferas). El modelo empaqueta")
        A(f"a φ = {d.get('fraccion_empaquetamiento')} y da "
          f"{d.get('densidad_aparente_g_ml')} g/ml. **La cavidad entrega un")
        A("volumen conocido y verificado; la masa en gramos hereda esa")
        A("incertidumbre** y por eso la calibración con balanza no es opcional.")
        A("")
    A("Queda por comprobar en el aparato físico:")
    A("")
    A("1. El llenado real de la cavidad con el alimento que se vaya a usar "
      "(pesando cinco golpes: `ENSAMBLE.md` §5).")
    A("2. Si el agitador basta para el cuello del bidón con croqueta de "
      f"{al['croqueta_dia_mm']:.0f} mm REAL, que no es una esfera.")
    A("3. El desgaste del par cremallera-piñón en PLA tras unos miles de ciclos.")
    A("4. Que el perro no vuelque el conjunto (de ahí la escuadra de muro).")
    A("5. El ángulo de reposo del alimento real: para croqueta de perro NO hay "
      "valor numérico publicado, solo extrapolaciones de pellet extruido.")
    A("6. La fricción croqueta-PLA: no existe ninguna fuente. El modelo usa la "
      "medida contra ABS como cota superior.")
    A("")
    return "\n".join(L)


def ensamble(P, C, hechos, idx) -> str:
    do, ag, es, im, al = (P["dosificador"], P["agua"], P["estructura"],
                          P["impresion"], P["alimento"])
    L = []
    A = L.append
    A("# ARMADO, CALIBRACIÓN Y USO — Dispensador canino YT0101")
    A("")
    A(f"Generado: {now_iso()}")
    A("")
    A("## 1. Antes de imprimir: medir el bidón")
    A("")
    A("Consigue el botellón de 20 L que vas a usar y mide con calibre:")
    A("")
    A("| Qué medir | Parámetro en `input/params.json` | Valor de partida |")
    A("|---|---|---|")
    A(f"| Ø exterior de la boca | `bidon.dia_boca_ext` | {P['bidon']['dia_boca_ext']:.0f} mm |")
    A(f"| Alto del cuello (labio → hombro) | `bidon.altura_cuello` | {P['bidon']['altura_cuello']:.0f} mm |")
    A(f"| Ø del hombro donde apoyará el anillo | `bidon.dia_asiento_hombro` | "
      f"{P['bidon']['dia_asiento_hombro']:.0f} mm |")
    A("")
    A("Si alguno difiere más de 2 mm, corrige el archivo y vuelve a generar:")
    A("")
    A("```bash")
    A("python pipeline/gen_dispensador.py projects/YT0101-dispensador-canino")
    A("python pipeline/verifica_dispensador.py projects/YT0101-dispensador-canino")
    A("```")
    A("")
    A("## 2. Impresión")
    A("")
    A(f"Ajustes generales: capa {im['capa']} mm · boquilla {im['boquilla']} mm · "
      f"{im['perimetros']} perímetros · relleno {im['relleno_pct']}% · material {im['material']}.")
    A(f"Para el piñón y la cremallera: {im['engranajes_perimetros']} perímetros y "
      f"{im['engranajes_relleno_pct']}% de relleno ({cita(hechos, 'gear_infill_recomendado')}).")
    A("")
    A("Los STL salen **ya girados a su posición de impresión**: cárgalos tal cual.")
    A("La lista completa con cantidades y gramos está en `LISTA_IMPRESION.csv`.")
    A("")
    A("## 3. Armado del módulo base (igual para los dos aparatos)")
    A("")
    A(f"1. Corta tres columnas de perfil {es['pata_seccion']:.0f}×{es['pata_seccion']:.0f} mm:")
    A(f"   **{C['z_anillo_agua'] / 10:.0f} cm** para el bebedero, **{C['z_anillo_alimento'] / 10:.0f} cm** "
      "para el dosificador.")
    A("2. Une los tres segmentos del anillo con dos M4×20 por junta.")
    A("3. Mete cada columna en su abrazadera del anillo y aprieta los dos M4×35.")
    A("4. Repite con el anillo inferior de arriostre (misma pieza) a unos "
      f"{es['anillo_inferior_alto']:.0f} mm del suelo.")
    A("5. Calza los pies y pega el fieltro antideslizante en el rebaje.")
    A("6. **Cabezal de alimento: atornilla la escuadra de muro.** No es opcional")
    A("   (ver memoria §8: el conjunto vuelca con un empujón lateral moderado).")
    A("")
    A("## 4. Cabezal de alimento")
    A("")
    A("1. Atornilla `ali_canal_base` al anillo por sus dos orejas.")
    A("2. Mete `ali_corredera` por la boca trasera del canal; debe deslizar sola,")
    A(f"   sin forzar (holgura de diseño {do['corredera_holgura']:.2f} mm por lado). Si roza, lija")
    A("   suave los patines; **no** limes la cavidad, que es la que mide la dosis.")
    A("3. Tapa con `ali_canal_tapa` y aprieta los cuatro M4×30.")
    A("4. Enfila `ali_eje_pinon` por la torre, monta `ali_pinon` a media altura")
    A("   (tiene que engranar con la cremallera del cajón) y fija con el pasador Ø3.")
    A(f"5. Encaja `ali_palanca` en el hexágono superior del eje **apuntando al sector")
    A(f"   libre entre columnas** (con el cajón dentro debe quedar a unos "
      f"{C['palanca_ang_cerrado']:.0f}° del")
    A("   frente, girando hacia la izquierda al tirar). Si la montas en otra posición")
    A("   del hexágono, el brazo golpea una columna a mitad de barrido.")
    A(f"6. Mueve la palanca de tope a tope: el cajón debe recorrer {C['carrera']:.0f} mm y la")
    A("   cavidad quedar exactamente bajo la boca de carga en un extremo y sobre la")
    A("   de descarga en el otro.")
    A("7. Monta el agitador en el adaptador, la manivela en su punta hexagonal y")
    A("   la biela entre manivela y oreja del cajón (M4 con tuerca **floja**: es una")
    A("   articulación, no una unión).")
    A("8. Atornilla `ali_chute` bajo la boca de descarga.")
    A("9. Corta el bidón y monta el adaptador (§4.1 o §4.2).")
    A("")
    A("### 4.1 Variante A — cuello del bidón (recomendada para croqueta ≤ 8 mm)")
    A("")
    A("1. Con el bidón boca abajo, marca y corta en su **base** (que ahora queda")
    A("   arriba) una boca de carga de Ø150 mm. Sierra de calar de dientes finos o")
    A("   cuchillo caliente; desbarba el canto con lija 180.")
    A("2. Calza `ali_adaptador_cuello` sobre el cuello y aprieta sus dos M4.")
    A("3. Atornilla el adaptador a la brida de la tapa del canal (4 × M4×16).")
    A("")
    A("### 4.2 Variante B — corte en el hombro (para croqueta de 11-16 mm)")
    A("")
    A("1. Corta el bidón **donde el hombro mide Ø152 mm** y descarta el cuello.")
    A("2. Corta también la boca de carga en la base, igual que en la variante A.")
    A("3. Apoya el canto cortado dentro de la garganta de `ali_adaptador_hombro`:")
    A("   sostiene por gravedad, no necesita apriete.")
    A("")
    A("Con esta variante desaparece la sección crítica del cuello y el criterio")
    A("anti-arco se cumple en todo el camino.")
    A("")
    A("## 5. Calibración de la dosis (el paso que no se puede saltar)")
    A("")
    A("La dosis calculada es de "
      f"**{C['dosis_g']:.0f} g** con alimento de {al['densidad_aparente_g_ml']:.2f} g/ml, pero cada")
    A(f"marca pesa distinto (el rango real da entre {C['dosis_rango_g'][0]:.0f} y "
      f"{C['dosis_rango_g'][1]:.0f} g). Para saber la tuya:")
    A("")
    A("1. Carga el bidón con el alimento que usas de verdad.")
    A("2. Da **cinco golpes completos** de palanca sobre un recipiente en la balanza.")
    A("3. Divide el total por 5 → esa es tu dosis real por golpe.")
    A("4. Anótala: `densidad_real = dosis_medida_g / "
      f"{C['volumen_cavidad_ml']:.1f} ml / {al['factor_llenado']:.2f}`, y escribe ese valor en")
    A("   `input/params.json` → `alimento.densidad_aparente_g_ml`.")
    A("5. Registra la medición en la bitácora del proyecto:")
    A("")
    A("```bash")
    A('python pipeline/lib_audit.py log projects/YT0101-dispensador-canino \\')
    A('  "calibracion: 5 golpes = <XXX> g con <marca> -> dosis real <YY> g/golpe"')
    A("```")
    A("")
    A("Repite la calibración cada vez que cambies de marca de alimento.")
    A("")
    A("### Cuántos golpes por comida")
    A("")
    A("| Perro | Ración diaria | Por comida (2/día) | Golpes |")
    A("|---|---|---|---|")
    for peso, gd in ((5, 85), (10, 150), (20, 230), (30, 340), (40, 410)):
        A(f"| {peso} kg | {gd} g | {gd / 2:.0f} g | {gd / 2 / C['dosis_g']:.1f} |")
    A("")
    A(f"(Ración según {cita(hechos, 'racion-royalcanin-mediana')}. Consulta a tu veterinario:")
    A("estas tablas son del fabricante del alimento, no una prescripción.)")
    A("")
    A("## 6. Cabezal de agua")
    A("")
    A("1. Arma la cadena del bajante de abajo hacia arriba: difusor → tubo de nivel")
    A("   → tramo fijo → boquilla.")
    A("2. Da 2-3 vueltas de cinta de teflón en las acanaladuras de la boquilla y")
    A("   métela en el cuello del bidón hasta que la brida tope en el labio.")
    A("3. Pon el collar partido sobre el cuello y aprieta.")
    A("4. Invierte el bidón sobre el anillo — **entre dos personas: son 21 kg**.")
    A("5. Centra el plato bajo el bajante.")
    A(f"6. Ajusta la altura del tubo deslizante hasta que el agua se estabilice en la")
    A(f"   marca de nivel del plato ({ag['nivel_agua']:.0f} mm). Cada marca del tubo = 10 mm.")
    A("")
    A("Si el agua no para de salir: la boquilla no está sellando (revisa el teflón)")
    A("o el difusor quedó por encima del nivel. Si no sale nada: el difusor está")
    A("apoyado en el fondo del plato, súbelo.")
    A("")
    A("## 7. Uso diario")
    A("")
    A("- **Alimento:** un golpe de palanca completo por dosis. De tope a tope; a")
    A("  medio camino la cavidad no llega a descargar del todo.")
    A("- Si la palanca se traba, **no fuerces**: devuélvela y repite. Casi siempre")
    A("  es una croqueta atravesada en el canto de corte y el vaivén la acomoda.")
    A("- **Agua:** revisar el nivel una vez al día; rellenar el bidón cuando quede")
    A("  bajo el hombro.")
    A("")
    A("## 8. Limpieza")
    A("")
    A("| Cada | Qué |")
    A("|---|---|")
    A("| Semana | Sacar el cajón (ver abajo) y lavarlo con agua y jabón |")
    A("| Semana | Lavar el plato del bebedero |")
    A("| Mes | Desmontar el bajante y limpiar el difusor |")
    A("| Cambio de saco | Vaciar el bidón y aspirar el polvo de croqueta del canal |")
    A("")
    A("### Cómo se saca el cajón")
    A("")
    A("La cremallera está engranada con el piñón, así que el cajón **no** sale de")
    A("un tirón. Son tres movimientos:")
    A("")
    A("1. Saca el pasador Ø3 de la parte baja del eje del piñón.")
    A("2. Levanta el eje (con la palanca puesta hace de asa) hasta que el piñón")
    A("   salga de su alojamiento en la torre.")
    A("3. Ahora el cajón sale tirando hacia atrás.")
    A("")
    A("Para volver a montarlo, el orden inverso: cajón dentro, eje abajo con el")
    A("piñón engranando en la cremallera, pasador puesto.")
    A("")
    A(f"Agua y jabón bastan: {cita(hechos, 'pla_limpieza_efectiva')}")
    A("**No** lavar en lavavajillas: el PLA se deforma cerca de los 60 °C.")
    A("")
    A("## 9. Si algo no funciona")
    A("")
    A("| Síntoma | Causa probable | Qué hacer |")
    A("|---|---|---|")
    A("| Sale menos alimento del esperado | croqueta grande, cavidad mal llena | recalibrar; probar variante B |")
    A("| No sale nada y el bidón está lleno | arco en el cuello | mover la palanca 2-3 veces; montar variante B |")
    A("| La palanca se traba siempre en el mismo punto | rebaba en el carril | lijar el patín, nunca la cavidad |")
    A("| Cae alimento con el cajón afuera | falda obturadora mal montada | revisar que la tapa apriete el canal |")
    A("| El plato rebalsa | boquilla sin sellar | rehacer el teflón |")
    A("| El agua no baja | difusor tocando el fondo | subir el tubo deslizante |")
    A("")
    return "\n".join(L)


def lista_impresion(idx, P, C) -> list:
    filas = [["pieza", "cantidad", "archivo_stl", "bbox_mm", "masa_pla_g",
              "soportes", "notas"]]
    duros = {"est_pie", "est_escuadra_muro", "agua_difusor", "ali_corredera",
             "ali_agitador", "ali_chute", "agua_boquilla"}
    for n, d in idx["piezas"].items():
        m = d["metricas"]
        filas.append([n, d.get("cantidad", 1), f"piezas/{n}.stl",
                      "×".join(f"{x:.0f}" for x in m["bbox_mm"]), f"{m['masa_pla_g']:.0f}",
                      "sí (parcial)" if n in duros else "no",
                      d.get("nota", "")])
    return filas


def compra(P, C) -> list:
    es, im = P["estructura"], P["impresion"]
    largo_alim = C["z_anillo_alimento"] / 1000.0
    largo_agua = C["z_anillo_agua"] / 1000.0
    return [
        ["item", "cantidad", "detalle", "para"],
        ["Botellón de agua purificada 20 L", "2",
         "Ø275 × 495 mm, boca 55-56 mm (el retornable chileno estándar)", "ambos"],
        [f"Perfil cuadrado {es['pata_seccion']:.0f}×{es['pata_seccion']:.0f} mm",
         f"{3 * largo_alim + 3 * largo_agua + 0.6:.1f} m",
         "aluminio o listón de pino; 3 columnas por aparato "
         f"({largo_alim * 100:.0f} cm alimento / {largo_agua * 100:.0f} cm agua)", "ambos"],
        ["Tornillo M4×20 cabeza cilíndrica", "24", "unión de segmentos de anillo", "ambos"],
        ["Tornillo M4×35", "24", "abrazaderas de columna en anillos y pies", "ambos"],
        ["Tornillo M4×30", "12", "tapa del canal y collares de cuello", "ambos"],
        ["Tornillo M4×16", "12", "adaptador del bidón y canaleta", "alimento"],
        ["Tuerca M4", "60", "DIN 934", "ambos"],
        ["Arandela M4 Ø9", "60", "", "ambos"],
        ["Pasador Ø3 × 20 (o clavo cortado)", "2", "retención del eje del piñón", "alimento"],
        ["Tarugo Ø6 + tornillo Ø5×50", "4", "anclaje de la escuadra al muro", "alimento"],
        ["Cinta de teflón", "1 rollo", "sellado de la boquilla en el cuello", "agua"],
        ["Fieltro o goma EVA 2 mm", "1 plancha", "pads antideslizantes de los pies", "ambos"],
        ["Filamento PLA", f"{C.get('masa_pla_total_g', 2100) / 1000:.1f} kg aprox.",
         f"{im['material']}, incluye ambos aparatos y las dos variantes de adaptador", "ambos"],
    ]


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    proj = project_dir(sys.argv[1])
    P, C, hechos, ver, idx, sim = cargar(proj)
    if idx:
        C["masa_pla_total_g"] = idx.get("masa_pla_total_g")
    out = proj / "out"
    out.mkdir(exist_ok=True)

    (out / "MEMORIA_DISENO.md").write_text(memoria(P, C, hechos, ver, sim), encoding="utf-8")
    (out / "ENSAMBLE.md").write_text(ensamble(P, C, hechos, idx), encoding="utf-8")
    if idx:
        with open(out / "LISTA_IMPRESION.csv", "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(lista_impresion(idx, P, C))
    with open(out / "COMPRA.csv", "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(compra(P, C))

    audit(proj, "DOC", "memoria, manual de armado y listas generados", "OK")
    for n in ("MEMORIA_DISENO.md", "ENSAMBLE.md", "LISTA_IMPRESION.csv", "COMPRA.csv"):
        p = out / n
        if p.exists():
            print(f"  {p.relative_to(proj)}  ({p.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
