# Para ejecutar en PowerShell

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "DJ Huevito: Configuracion para Deploy en Render" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "CAMBIOS REALIZADOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. backend/index.js modificado:" -ForegroundColor Green
Write-Host "   - Ahora lanza bot.js como proceso hijo" -ForegroundColor White
Write-Host "   - El backend abre puerto 3001 (Render lo ve)" -ForegroundColor White
Write-Host "   - El bot corre en background" -ForegroundColor White
Write-Host "   - Auto-reinicia bot si falla" -ForegroundColor White
Write-Host ""

Write-Host "2. RENDER_DEPLOYMENT.md creado" -ForegroundColor Green
Write-Host "   - Guia completa de configuracion" -ForegroundColor White
Write-Host "   - Build/Start commands exactos" -ForegroundColor White
Write-Host "   - Variables de entorno necesarias" -ForegroundColor White
Write-Host ""

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "PROXIMOS PASOS EN RENDER" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. BUILD COMMAND:" -ForegroundColor Yellow
Write-Host "bash -lc 'npm ci && cd frontend && npm ci && npm run build && cd ../backend && npm ci'" -ForegroundColor Cyan
Write-Host ""

Write-Host "2. START COMMAND:" -ForegroundColor Yellow
Write-Host "node backend/index.js" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. ENVIRONMENT VARIABLES:" -ForegroundColor Yellow
Write-Host "DISCORD_TOKEN = [tu token]" -ForegroundColor Cyan
Write-Host "ADMIN_API_KEY = [tu clave API]" -ForegroundColor Cyan
Write-Host "PORT = 3001" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "PRUEBA LOCAL" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$testLocal = Read-Host "Quieres probar localmente? (S/N)"

if ($testLocal -eq "S" -or $testLocal -eq "s") {
    Write-Host ""
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm ci 2>$null
    cd backend
    npm ci 2>$null
    cd ..
    
    Write-Host "Dependencias instaladas" -ForegroundColor Green
    Write-Host ""
    Write-Host "Iniciando backend (que lanzara bot como hijo)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Esperando que el bot se conecte..." -ForegroundColor Cyan
    Write-Host ""
    
    node backend/index.js
}
else {
    Write-Host ""
    Write-Host "Listos para deploy en Render" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pasos finales:" -ForegroundColor Yellow
    Write-Host "1. git add ." -ForegroundColor Gray
    Write-Host "2. git commit -m 'Add bot as child process'" -ForegroundColor Gray
    Write-Host "3. git push origin main" -ForegroundColor Gray
    Write-Host "4. En Render: Manual Deploy" -ForegroundColor Gray
    Write-Host ""
}
