Param(
  [switch]$DownloadYtdlp
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Ejecutando desde: $root"

function Ensure-Node {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js no encontrado. Instala Node >=18 y vuelve a ejecutar este script." -ForegroundColor Red
    exit 1
  }
}

Ensure-Node

if (-not (Test-Path "$root\.env")) {
  Write-Host ".env no encontrado. Por seguridad no crearé uno automáticamente." -ForegroundColor Yellow
  Write-Host "Crea manualmente .env a partir de .env.example o exporta las variables antes de ejecutar el script." -ForegroundColor Yellow
  exit 1
}

Write-Host "Instalando dependencias en la raíz..."
Push-Location $root
npm install
Pop-Location

if (Test-Path "$root\frontend") {
  Write-Host "Instalando y construyendo frontend..."
  Push-Location "$root\frontend"
  npm install --legacy-peer-deps
  npm run build
  Pop-Location
}

if (Test-Path "$root\backend") {
  Write-Host "Instalando dependencias del backend..."
  Push-Location "$root\backend"
  npm install
  Pop-Location
}

if ($DownloadYtdlp) {
  $ytPath = Join-Path $root 'yt-dlp.exe'
  Write-Host "Descargando yt-dlp a $ytPath..."
  Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile $ytPath
}

if (Test-Path "$root\backend\index.js") {
  Write-Host "Iniciando backend en ventana separada..."
  Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory "$root\backend"
} else {
  Write-Host "No se encontró backend/index.js" -ForegroundColor Yellow
}

if (Test-Path "$root\bot.js") {
  Write-Host "Iniciando bot en ventana separada..."
  Start-Process -FilePath "node" -ArgumentList "bot.js" -WorkingDirectory $root
} else {
  Write-Host "No se encontró bot.js" -ForegroundColor Yellow
}

Write-Host "Script finalizado. Revisa las ventanas nuevas para ver los logs." -ForegroundColor Green
