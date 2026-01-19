# Para ejecutar en PowerShell

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DJ Huevito: Configuración para Deploy en Render (Único Servicio)" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 CAMBIOS REALIZADOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ✅ backend/index.js modificado:"
Write-Host "   - Ahora lanza bot.js como proceso hijo"
Write-Host "   - El backend abre puerto 3001 (Render lo ve)"
Write-Host "   - El bot corre en background"
Write-Host "   - Auto-reinicia bot si falla"
Write-Host ""

Write-Host "2. 📄 RENDER_DEPLOYMENT.md creado"
Write-Host "   - Guía completa de configuración"
Write-Host "   - Build/Start commands exactos"
Write-Host "   - Variables de entorno necesarias"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ⚙️  PRÓXIMOS PASOS EN RENDER" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  BUILD COMMAND:" -ForegroundColor Yellow
Write-Host '   bash -lc '"'"'npm ci && cd frontend && npm ci && npm run build && cd ../backend && npm ci'"'"'' -ForegroundColor Cyan
Write-Host ""

Write-Host "2️⃣  START COMMAND:" -ForegroundColor Yellow
Write-Host "   node backend/index.js" -ForegroundColor Cyan
Write-Host ""

Write-Host "3️⃣  ENVIRONMENT VARIABLES:" -ForegroundColor Yellow
Write-Host "   DISCORD_TOKEN = [tu token nuevo]" -ForegroundColor Cyan
Write-Host "   ADMIN_API_KEY = [tu clave API]" -ForegroundColor Cyan
Write-Host "   PORT = 3001" -ForegroundColor Cyan
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🧪 PRUEBA LOCAL (OPCIONAL)" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Preguntar si quiere probar localmente
$testLocal = Read-Host "¿Quieres probar localmente? (S/N)"

if ($testLocal -eq "S" -or $testLocal -eq "s") {
    Write-Host ""
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    
    # Instalar dependencias
    npm ci 2>$null
    cd backend
    npm ci 2>$null
    cd ..
    
    Write-Host "✓ Dependencias instaladas" -ForegroundColor Green
    Write-Host ""
    Write-Host "Iniciando backend (que lanzará bot como hijo)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Esperando que el bot se conecte..." -ForegroundColor Cyan
    Write-Host ""
    
    # Iniciar backend (que lanzará bot)
    node backend/index.js
} else {
    Write-Host ""
    Write-Host "✅ Listos para deploy en Render" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pasos finales:" -ForegroundColor Yellow
    Write-Host "  1. git add ." -ForegroundColor Gray
    Write-Host "  2. git commit -m 'Add bot as child process for single service deployment'" -ForegroundColor Gray
    Write-Host "  3. git push origin main" -ForegroundColor Gray
    Write-Host "  4. En Render: Manual Deploy → Deploy latest commit" -ForegroundColor Gray
    Write-Host ""
}
