# Instalación de herramientas (Windows)

Verificar estado en cualquier momento: `powershell tools/check_env.ps1`

## 1. Python (ya instalado: 3.14)

```powershell
pip install -r requirements.txt
```

## 2. COLMAP (SfM — etapa S1)

1. Descargar release Windows: https://github.com/colmap/colmap/releases
   - Con GPU NVIDIA: variante `cuda`. Sin NVIDIA: variante `nocuda` (más lenta pero funciona).
2. Extraer en `C:\tools\colmap\`.
3. Agregar al PATH de usuario:
   ```powershell
   [Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\tools\colmap', 'User')
   ```
4. Verificar en una TERMINAL NUEVA: `colmap -h`

Nota: COLMAP 4.x integra el mapper global (GLOMAP) como `colmap global_mapper`,
mucho más rápido con igual precisión. `s1_sfm.py` lo prefiere automáticamente y
cae al mapper incremental si falla.

Instalado en esta máquina (2026-06-12): COLMAP 4.1.0 nocuda en `C:\tools\colmap\bin`,
OpenMVS v2.4.0 en `C:\tools\openmvs\vc17\x64\Release`, ambos en el PATH de usuario.
OJO: OpenMVS escribe su salida en archivos `<Herramienta>-<timestamp>.log` en el
directorio de trabajo, y `--help` retorna exit code 1 (comportamiento normal).

## 3. OpenMVS (densificación + malla — etapa S2)

1. Descargar binarios Windows: https://github.com/cdcseacave/openMVS/releases
2. Extraer en `C:\tools\openmvs\` y agregar al PATH (mismo método).
3. Verificar: `DensifyPointCloud --help`

## 4. gltfpack (compresión web — opcional pero recomendado)

```powershell
npm install -g gltfpack
```
Comprime el GLB (meshopt + texturas KTX2) típicamente 5–10×. Sin él, S2 entrega
el GLB sin comprimir (funciona igual, pesa más).

## 5. Gaussian Splatting (opcional — etapa S3, requiere GPU)

Opciones ordenadas por simpleza (detalle en `pipeline/s3_splat.md`):
- **Postshot** (GUI Windows, gratis en beta): https://www.jawset.com/
- **Brush** (open source, corre sin CUDA — Vulkan/Metal): https://github.com/ArthurBrussee/brush
- **nerfstudio/gsplat** (CLI, requiere CUDA): https://docs.nerf.studio/
- Limpieza y compresión a `.spz`/`.sog`: **SuperSplat** (navegador): https://superspl.at/editor

## GPU: qué cambia

| Componente | Sin GPU NVIDIA | Con GPU NVIDIA |
|---|---|---|
| COLMAP S1 | OK (lento en sets grandes) | Rápido |
| OpenMVS S2 | OK | Rápido |
| 3DGS S3 | Solo Brush o servicios cloud | Todas las opciones |
