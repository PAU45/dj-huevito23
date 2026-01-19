# EDITA estas variables si tu repo remoto es distinto
$remote = "https://github.com/PAU45/dj-huevito.git"
$mirrorDir = "$PWD\dj-huevito-mirror.git"

if (Test-Path $mirrorDir) { Remove-Item -Recurse -Force $mirrorDir }

Write-Host "Clonando mirror..."
git clone --mirror $remote $mirrorDir
if ($LASTEXITCODE -ne 0) { Write-Error 'git clone --mirror falló'; exit 1 }

Set-Location $mirrorDir

Write-Host "Ejecutando git-filter-repo para eliminar rutas..."
# Rutas a borrar del historial
$paths = @(
	'backend/youtube_cookies.txt'
	'cookies.b64'
	'node_modules/ffmpeg-static/ffmpeg.exe'
)

# Crear fichero temporal con rutas (una por línea)
$pathsFile = Join-Path $PWD 'paths-to-remove.txt'
$paths | Out-File -FilePath $pathsFile -Encoding utf8

# Intentar git filter-repo (si está disponible como subcomando)
$filterCmd = 'git filter-repo --invert-paths --paths-from-file ' + $pathsFile
Write-Host "Intentando: $filterCmd"
cmd /c $filterCmd
if ($LASTEXITCODE -ne 0) {
	Write-Host "git filter-repo no funcionó como subcomando. Intentando con Python module 'git_filter_repo'..."
	# Usar python -m git_filter_repo con --paths-from-file
	Write-Host "Intentando: python -m git_filter_repo --invert-paths --paths-from-file $pathsFile"
	& python -m git_filter_repo --invert-paths --paths-from-file $pathsFile
	if ($LASTEXITCODE -ne 0) { Write-Error 'git filter-repo falló. Instala git-filter-repo (pip install --user git-filter-repo) o usa BFG.'; Remove-Item $pathsFile -ErrorAction SilentlyContinue; exit 1 }
}

# Limpiar fichero temporal
Remove-Item $pathsFile -ErrorAction SilentlyContinue

Write-Host "Forzando push del mirror limpio al remoto..."
git push --force --mirror $remote

Write-Host "Hecho. Ahora elimina tu clone local y clona de nuevo el repo remoto."