"""Construye el sitio de GitHub Pages del repositorio.

Genera en el directorio destino:
- index.html — portada con la documentación del método y la lista de
  proyectos publicados.
- docs/<n>.html — cada Markdown de docs/ (+ README y CLAUDE) renderizado.
- projects/<X>/ — copia del paquete navegable 70_web/ de cada proyecto que
  lo tenga versionado (el visor Three.js con su modelo y procedencia).

No inventa contenido: solo publica lo que ya existe en el repo.

uso: python tools/build_pages.py <destino>   (lo ejecuta .github/workflows/pages.yml)
"""
from __future__ import annotations

import html
import shutil
import sys
from pathlib import Path

import markdown  # pip install markdown

REPO = Path(__file__).resolve().parent.parent

CSS = """
:root { color-scheme: light dark; }
body { font-family: system-ui, sans-serif; max-width: 60rem; margin: 2rem auto;
       padding: 0 1rem; line-height: 1.55; }
a { color: #0b62c4; } code, pre { background: rgba(127,127,127,.12);
    border-radius: 4px; padding: .1em .3em; }
pre { padding: .8em; overflow-x: auto; }
table { border-collapse: collapse; } td, th { border: 1px solid #8886;
    padding: .3em .6em; }
h1, h2 { border-bottom: 1px solid #8884; padding-bottom: .2em; }
.nav { font-size: .9em; margin-bottom: 1.5rem; }
.tag { font-size: .8em; background: rgba(127,127,127,.15); border-radius: 6px;
    padding: .1em .5em; margin-left: .4em; }
"""

PAGE = """<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title><style>{css}</style></head>
<body><p class="nav"><a href="{root}index.html">← foto3d</a></p>
{body}
</body></html>"""


def render_md(src: Path, out: Path, root: str) -> str:
    text = src.read_text(encoding="utf-8")
    body = markdown.markdown(text, extensions=["tables", "fenced_code"])
    title = next((l.lstrip("# ").strip() for l in text.splitlines()
                  if l.startswith("#")), src.stem)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(PAGE.format(title=html.escape(title), css=CSS, root=root,
                               body=body), encoding="utf-8")
    return title


def main() -> None:
    dest = Path(sys.argv[1]).resolve()
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)

    # documentación
    doc_links = []
    sources = [REPO / "README.md", REPO / "CLAUDE.md",
               *sorted((REPO / "docs").glob("*.md"))]
    for src in sources:
        if not src.exists():
            continue
        rel = f"docs/{src.stem}.html"
        title = render_md(src, dest / rel, root="../")
        doc_links.append((rel, title, src.name))

    # proyectos con paquete navegable versionado
    proj_links = []
    for pdir in sorted((REPO / "projects").glob("*/70_web")):
        name = pdir.parent.name
        if name == "_template" or not (pdir / "index.html").exists():
            continue
        shutil.copytree(pdir, dest / "projects" / name)
        proj_links.append(name)

    items = "\n".join(
        f'<li><a href="{rel}">{html.escape(t)}</a> '
        f'<span class="tag">{html.escape(n)}</span></li>'
        for rel, t, n in doc_links)
    if proj_links:
        projs = "\n".join(
            f'<li><a href="projects/{p}/index.html">{html.escape(p)}</a> '
            f'<span class="tag">visor 3D</span> — '
            f'<a href="projects/{p}/INFORME.md">informe</a></li>'
            for p in proj_links)
    else:
        projs = ("<li><em>Aún no hay proyectos publicados. Un proyecto aparece "
                 "aquí cuando su paquete <code>70_web/</code> (etapa S5) se "
                 "versiona en el repositorio.</em></li>")

    body = f"""<h1>foto3d — fotos → 3D navegable auditable</h1>
<p>Método algorítmico para reconstruir objetos en 3D a partir de fotografías,
con procedencia auditable, láminas técnicas normalizadas (DXF/PDF) y CAD
anclado a la medición.</p>
<h2>Proyectos publicados</h2><ul>{projs}</ul>
<h2>Documentación</h2><ul>{items}</ul>
<p><a href="https://github.com/contrerassma-eng/3d-generator">Repositorio en
GitHub</a></p>"""
    (dest / "index.html").write_text(
        PAGE.format(title="foto3d", css=CSS, root="", body=body).replace(
            '<p class="nav"><a href="index.html">← foto3d</a></p>', ""),
        encoding="utf-8")
    print(f"Sitio generado en {dest}: {len(doc_links)} docs, "
          f"{len(proj_links)} proyectos.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
