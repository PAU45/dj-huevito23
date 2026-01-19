# Script para compilar frontend y lanzar backend + frontend local

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "DJ Huevito - Local Development Setup" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si estamos en la carpeta correcta
if (-not (Test-Path "frontend")) {
    Write-Host "ERROR: No se encontro la carpeta frontend" -ForegroundColor Red
    Write-Host "Asegúrate de estar en la raiz del proyecto" -ForegroundColor Yellow
    exit 1
}

Write-Host "1. Compilando frontend..." -ForegroundColor Yellow
cd frontend
npm run build 2>&1 | out-null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la compilacion del frontend" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "✓ Frontend compilado exitosamente" -ForegroundColor Green
cd ..

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "LOCAL DEV SERVER" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando servidor en http://localhost:3001" -ForegroundColor Cyan
Write-Host "Ir a: http://localhost:3001/setup para ingresar token" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

# Iniciar el backend
node backend/index.js
