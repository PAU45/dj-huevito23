# Script para crear archivo .env con variables Discord

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Creador de archivo .env para DJ Huevito" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este script creara un archivo .env con tus variables" -ForegroundColor Yellow
Write-Host ""

# Pedir DISCORD_TOKEN
$discordToken = Read-Host "Ingresa tu DISCORD_TOKEN"

if (-not $discordToken) {
    Write-Host "ERROR: DISCORD_TOKEN es requerido" -ForegroundColor Red
    exit 1
}

# Pedir ADMIN_API_KEY (opcional)
$apiKey = Read-Host "Ingresa tu ADMIN_API_KEY (o presiona Enter para generar una)"

if (-not $apiKey) {
    # Generar una clave aleatoria si no la proporciona
    $apiKey = -join ((33..126) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    Write-Host "Clave API generada: $apiKey" -ForegroundColor Cyan
}

# Crear contenido del .env
$envContent = @"
# Discord Bot Configuration
DISCORD_TOKEN=$discordToken
ADMIN_API_KEY=$apiKey
PORT=3001
NODE_ENV=development
"@

# Crear archivo .env en raiz del proyecto
$envPath = "$(Get-Location)\.env"

# Guardar el archivo
Set-Content -Path $envPath -Value $envContent -Encoding UTF8

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Archivo .env creado exitosamente" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ubicacion: $envPath" -ForegroundColor Cyan
Write-Host ""

# Mostrar lo que se guardó (sin revelar token)
Write-Host "Contenido del .env:" -ForegroundColor Yellow
Write-Host "DISCORD_TOKEN=****" -ForegroundColor White
Write-Host "ADMIN_API_KEY=$apiKey" -ForegroundColor White
Write-Host "PORT=3001" -ForegroundColor White
Write-Host "NODE_ENV=development" -ForegroundColor White
Write-Host ""

Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "- Este archivo NO debe ser comiteado (ya esta en .gitignore)" -ForegroundColor White
Write-Host "- En Render, configura las env vars en Dashboard → Environment" -ForegroundColor White
Write-Host ""

# Preguntar si relanzar el test
$relanzar = Read-Host "Quieres relanzar el test ahora? (S/N)"

if ($relanzar -eq "S" -or $relanzar -eq "s") {
    Write-Host ""
    Write-Host "Relanzando test..." -ForegroundColor Cyan
    Write-Host ""
    .\test-render-setup.ps1
}
