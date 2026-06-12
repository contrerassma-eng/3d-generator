# Diagnostico de entorno foto3d - instrucciones de instalacion en docs/INSTALACION.md
# (solo ASCII: PowerShell 5.1 lee .ps1 sin BOM como ANSI)
$results = @()

function Test-Tool($name, $stage, $required) {
    $found = Get-Command $name -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        Herramienta = $name
        Etapa       = $stage
        Estado      = if ($found) { 'OK' } else { if ($required) { 'FALTA (requerido)' } else { 'falta (opcional)' } }
        Ruta        = if ($found) { $found.Source } else { '' }
    }
}

$results += Test-Tool 'python'             'todas'         $true
$results += Test-Tool 'colmap'             'S1 SfM'        $true
$results += Test-Tool 'glomap'             'S1 (acelera)'  $false
$results += Test-Tool 'InterfaceCOLMAP'    'S2 malla'      $true
$results += Test-Tool 'DensifyPointCloud'  'S2 malla'      $true
$results += Test-Tool 'ReconstructMesh'    'S2 malla'      $true
$results += Test-Tool 'TextureMesh'        'S2 malla'      $true
$results += Test-Tool 'gltfpack'           'S2 compresion' $false
$results += Test-Tool 'node'               'gltfpack/npm'  $false

$results | Format-Table -AutoSize

# Modulos Python del intake
$py = python -c "import importlib.util as u; print(','.join(m for m in ['PIL','numpy','cv2'] if not u.find_spec(m)))" 2>$null
if ($py) { Write-Host "Modulos Python faltantes: $py  ->  pip install -r requirements.txt" -ForegroundColor Yellow }
else     { Write-Host "Modulos Python (Pillow, numpy, OpenCV): OK" -ForegroundColor Green }

$missing = $results | Where-Object { $_.Estado -like '*requerido*' }
if ($missing) {
    Write-Host "" ; Write-Host "Faltan herramientas requeridas. Ver docs/INSTALACION.md" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "" ; Write-Host "Entorno completo para el pipeline S0-S5." -ForegroundColor Green
}
