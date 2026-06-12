# S3 — Gaussian Splatting (opcional, manual)

Agrega fotorrealismo al visor. Usa **las mismas fotos y poses de S1** (capa
`measured`), pero los splats son apariencia, no superficie medible: en
`provenance.json` quedan con `render_only: true`.

## Requisito de entrada

Proyecto en estado `S1_OK` o superior. Las poses COLMAP están en
`work/10_sfm/sparse/` y las fotos en `input/photos/`.

## Opción A — Postshot (GUI Windows, la más simple, requiere NVIDIA)

1. Descargar: https://www.jawset.com/
2. Importar la carpeta `input/photos/` (Postshot corre su propio SfM) o importar
   el workspace COLMAP `work/10_sfm/` para reusar las poses de S1 (preferible:
   misma geometría auditada).
3. Entrenar perfil "Splat3" hasta ~30k iteraciones.
4. Exportar como PLY.

## Opción B — Brush (open source, NO requiere CUDA: Vulkan/Metal)

https://github.com/ArthurBrussee/brush — acepta dataset formato COLMAP directo
(carpeta con `images/` + `sparse/`). Útil si no hay GPU NVIDIA.

## Opción C — nerfstudio / gsplat (CLI, CUDA)

```bash
ns-train splatfacto --data <workspace-colmap>
```

## Limpieza y compresión (obligatoria antes de publicar)

1. Abrir el PLY en **SuperSplat** (navegador): https://superspl.at/editor
2. Eliminar floaters (gaussianas sueltas por brillos/fondo) y recortar el fondo.
3. Exportar **comprimido** (`.spz` o PLY comprimido): reduce 70–90% el tamaño.

## Cierre de la etapa

1. Copiar el archivo final a `projects/<X>/out/scene.spz` (o `.ply`).
2. Registrar la acción manual (la auditoría no se salta por ser manual):
   ```powershell
   python pipeline/lib_audit.py log projects/<X> "S3 splat: <herramienta>, <iteraciones>, limpiado en SuperSplat"
   ```
3. Continuar con `python pipeline/s4_provenance.py projects/<X>` — detectará el
   splat, lo hasheará y lo incluirá en el paquete web con su etiqueta de capa.
