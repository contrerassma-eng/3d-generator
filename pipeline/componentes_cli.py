"""Biblioteca de componentes electronicos: consulta y generacion de modelos.

Componentes estandar (ESP32, buck, sensores, pulsadores, conectores de panel)
definidos como datos en componentes/catalogo.json. Todo lo generado es capa
`user` (diseno con dimensiones nominales), pensado para disenar carcasas.

comandos:
  listar [--categoria <c>]        catalogo disponible
  info <id>                       dimensiones, agujeros, cortes de panel, notas
  validar                         valida el esquema de todo el catalogo
  generar <id> [--salida <dir>] [--proyecto <X>]
                                  malla 3D -> <dir>/<id>.glb + .stl
  huella <id> [--salida <dir>] [--proyecto <X>]
                                  DXF a escala real con contorno/agujeros/cortes
  cad-json <id> [<id> ...] [--salida <archivo>] [--separacion <mm>]
                                  documento foto3d-cad: abrirlo en cad/ (boton
                                  Abrir) para modelar la carcasa alrededor
  sync-web                        copia el catalogo a cad/componentes.json para
                                  que el boton "Comp." de la interfaz web lo
                                  sirva (correr tras editar el catalogo)

--proyecto <X>: escribe en projects/<X>/out/componentes/ y registra en el
audit.log del proyecto. Sin el, escribe en componentes/out/ (fuera de git).

uso: python pipeline/componentes_cli.py <comando> [args]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import lib_componentes as C
from lib_audit import audit, project_dir, sha256_file

SALIDA_DEFECTO = C.REPO / "componentes" / "out"


def opt(args, name, default=None):
    return args[args.index(name) + 1] if name in args and \
        args.index(name) + 1 < len(args) else default


def out_dir(args) -> tuple[Path, Path | None]:
    """(directorio de salida, proyecto o None) segun --salida / --proyecto."""
    proy = opt(args, "--proyecto")
    if proy:
        proj = project_dir(proy)
        return proj / "out" / "componentes", proj
    return Path(opt(args, "--salida") or SALIDA_DEFECTO), None


def positionals(args) -> list[str]:
    pos, skip = [], False
    for a in args:
        if skip:
            skip = False
        elif a.startswith("--"):
            skip = True
        else:
            pos.append(a)
    return pos


# --------------------------------------------------------------------------

def cmd_listar(cat, args):
    filtro = opt(args, "--categoria")
    comps = [c for c in cat["componentes"] if not filtro or c["categoria"] == filtro]
    if not comps:
        sys.exit(f"Sin componentes en la categoria '{filtro}'. "
                 f"Categorias: {', '.join(C.CATEGORIAS)}")
    print(f"{len(comps)} componentes ({'todos' if not filtro else filtro}):")
    print(f"{'id':<28} {'categoria':<13} {'envolvente mm':<20} nombre")
    for c in comps:
        lo, hi = C.envolvente(c)
        dims = " x ".join(f"{v:.1f}" for v in (hi - lo))
        print(f"{c['id']:<28} {c['categoria']:<13} {dims:<20} {c['nombre']}")
    print("\nDetalle: info <id>   ·   modelo 3D: generar <id>   ·   "
          "plano de taladrado: huella <id>")


def cmd_info(cat, args):
    ids = positionals(args)
    if not ids:
        sys.exit("uso: info <id>  (ver ids con `listar`)")
    c = C.get_componente(cat, ids[0])
    print(f"{c['nombre']}  ({c['id']}, categoria {c['categoria']})")
    print(f"  {c['descripcion']}")
    if "malla" in c:  # componente de malla real (GLB): geometria fija
        bb = c.get("bbox_mm", [0, 0, 0])
        print(f"  Malla real: {c['malla']['glb']}")
        print(f"  bbox: {bb[0]:g} x {bb[1]:g} x {bb[2]:g} mm"
              + (f"  · vol {c['volumen_mm3']:.0f} mm3" if c.get("volumen_mm3") else ""))
        print(f"  Fuente: {c['fuente'].get('tipo')} — {c['fuente'].get('detalle')}")
        print("  Pieza FIJA; parametrizacion a nivel de ensamble (posicion/patron/restricciones).")
        return
    lo, hi = C.envolvente(c)
    print(f"  Envolvente: {hi[0]-lo[0]:.1f} x {hi[1]-lo[1]:.1f} x {hi[2]-lo[2]:.1f} mm"
          f"  (Z de {lo[2]:.1f} a {hi[2]:.1f})")
    print(f"  Fuente: {c['fuente'].get('tipo')} — {c['fuente'].get('detalle')}")
    print(f"  Confianza: {c.get('confianza', 'verificar')}"
          + (" → medir la unidad real antes de cortar la carcasa"
             if c.get("confianza") != "datasheet" else ""))
    print(f"  Solidos ({len(c['solidos'])}):")
    for s in c["solidos"]:
        if s["tipo"] == "caja":
            geo = "caja " + " x ".join(f"{v:g}" for v in s["dim"])
        else:
            geo = f"cilindro O{s['dia']:g} x {s['alto']:g}"
        pcb = "  [PCB]" if s.get("pcb") else ""
        print(f"    - {s.get('nombre', s['tipo']):<42} {geo}{pcb}")
    if c.get("agujeros_montaje"):
        print(f"  Agujeros de montaje ({len(c['agujeros_montaje'])}):")
        for a in c["agujeros_montaje"]:
            print(f"    - O{a['dia']:g} en ({a['pos'][0]:g}, {a['pos'][1]:g})")
    else:
        print("  Agujeros de montaje: NINGUNO (fijar por carriles/pilares)")
    for corte in c.get("cortes_panel", []):
        print(f"  Corte de panel: O{corte['dia']:g} en ({corte['pos'][0]:g}, "
              f"{corte['pos'][1]:g}) — {corte.get('nota', '')}")
    for d in c.get("despejes", []):
        print(f"  Despeje: {d['nombre']} — "
              + " x ".join(f"{v:g}" for v in d["dim"]) + f" en {d['at']}")
    if c.get("notas"):
        print(f"  Notas: {c['notas']}")


def cmd_validar(cat, args):
    errores, ids = 0, set()
    for c in cat["componentes"]:
        e = C.validar_componente(c)
        if c.get("id") in ids:
            e.append("id duplicado")
        ids.add(c.get("id"))
        for msg in e:
            print(f"ERROR {c.get('id', '?')}: {msg}")
        errores += len(e)
    if errores:
        sys.exit(f"{errores} errores en el catalogo")
    print(f"Catalogo valido: {len(cat['componentes'])} componentes, ids unicos.")


def cmd_generar(cat, args):
    ids = positionals(args)
    if not ids:
        sys.exit("uso: generar <id> [--salida <dir>] [--proyecto <X>]")
    c = C.get_componente(cat, ids[0])
    if "malla" in c:
        sys.exit(f"{c['id']} es un componente de malla real (GLB): ya tiene geometria en "
                 f"cad/{c['malla']['glb']} — no se genera desde primitivas.")
    salida, proj = out_dir(args)
    salida.mkdir(parents=True, exist_ok=True)
    mesh = C.build_mesh(c)
    glb, stl = salida / f"{c['id']}.glb", salida / f"{c['id']}.stl"
    mesh.export(glb)
    mesh.export(stl)
    lo, hi = C.envolvente(c)
    if proj is not None:
        audit(proj, "COMPONENTES", f"generar {c['id']} → out/componentes/", "OK",
              hash=sha256_file(glb), capa="user", confianza=c.get("confianza"))
    print(f"{c['nombre']}: {len(mesh.faces)} caras, envolvente "
          + " x ".join(f"{v:.1f}" for v in (hi - lo)) + " mm")
    print(f"  → {glb} (+ .stl)  · capa: user, dimensiones nominales "
          f"({c.get('confianza', 'verificar')})")


def cmd_huella(cat, args):
    ids = positionals(args)
    if not ids:
        sys.exit("uso: huella <id> [--salida <dir>] [--proyecto <X>]")
    c = C.get_componente(cat, ids[0])
    if "malla" in c:
        sys.exit(f"{c['id']} es un componente de malla real (GLB): no tiene huella de primitivas.")
    salida, proj = out_dir(args)
    path = salida / f"{c['id']}_huella.dxf"
    n = C.footprint_dxf(c, path)
    if proj is not None:
        audit(proj, "COMPONENTES", f"huella {c['id']} → out/componentes/", "OK",
              hash=sha256_file(path), capa="user")
    print(f"Huella a escala real (mm): {path}")
    print(f"  capas: CONTORNO, COMPONENTES, AGUJEROS ({n['AGUJEROS']}), "
          f"CORTE_PANEL ({n['CORTE_PANEL']}), DESPEJE, TEXTO")


def cmd_cad_json(cat, args):
    ids = positionals(args)
    if not ids:
        sys.exit("uso: cad-json <id> [<id> ...] [--salida <archivo>] [--separacion <mm>]")
    comps = [C.get_componente(cat, i) for i in ids]
    malla = [c["id"] for c in comps if "malla" in c]
    if malla:
        sys.exit(f"cad-json no admite componentes de malla real ({', '.join(malla)}): "
                 f"insertalos desde la interfaz web (boton Comp.) que carga el GLB.")
    doc = C.cad_doc(comps, float(opt(args, "--separacion") or 15))
    salida = Path(opt(args, "--salida") or SALIDA_DEFECTO / "componentes_cad.json")
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps(doc, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Documento foto3d-cad con {len(comps)} pieza(s): {salida}")
    print("  Abrir en el CAD del navegador: cd cad && python -m http.server 8080")
    print("  → http://localhost:8080 → 📂 Abrir → seleccionar el archivo.")
    print("  Ahi puedes crear la carcasa como pieza nueva y posicionar los "
          "componentes con restricciones.")


def cmd_sync_web(cat, args):
    destino = C.REPO / "cad" / "componentes.json"
    destino.write_text(C.CATALOGO.read_text(encoding="utf-8"), encoding="utf-8")
    print(f"Catalogo copiado a {destino} ({len(cat['componentes'])} componentes).")
    print("La interfaz web (cad/, boton 🔌 Comp.) lo sirve desde ahi.")


COMMANDS = {"listar": cmd_listar, "info": cmd_info, "validar": cmd_validar,
            "generar": cmd_generar, "huella": cmd_huella, "cad-json": cmd_cad_json,
            "sync-web": cmd_sync_web}


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        sys.exit(__doc__ + f"\ncomandos: {', '.join(COMMANDS)}")
    cat = C.load_catalogo()
    COMMANDS[sys.argv[1]](cat, sys.argv[2:])


if __name__ == "__main__":
    main()
