# 🎵 DJ Huevito — Configuración Final para Render (Servicio Único)

## ✅ Lo que acabo de hacer

He modificado tu proyecto para que **funcione en un único servicio de Render** sin costos adicionales:

### 1. **Modificación de `backend/index.js`**
```javascript
// Ahora el backend inicia bot.js como un proceso hijo:
app.listen(PORT, () => {
  startBotProcess(); // ← Bot se lanza automáticamente
});

// La función startBotProcess():
// - Inicia bot.js con stdio: 'inherit' (logs visibles)
// - Auto-reinicia si falla (cada 5 segundos)
// - Maneja SIGTERM/SIGINT para cierre graceful
```

**¿Por qué funciona?**
- ✅ Backend abre puerto 3001 → Render ve el servicio como **activo**
- ✅ Bot corre en background → No necesita abrir puertos
- ✅ Mismo proceso → Comparten variables, archivos, logs
- ✅ Un solo servicio → **No pagues por dos**

---

## 🔧 Configuración en Render Dashboard

### **Build Command**
```bash
bash -lc 'npm ci && cd frontend && npm ci && npm run build && cd ../backend && npm ci'
```
- Instala todas las dependencias
- Compila React frontend
- Prepara backend

### **Start Command**
```bash
node backend/index.js
```
- **Solo esto.** Nada de `bash -lc 'node backend/index.js & exec node bot.js'`
- El backend ya lanza el bot internamente

### **Environment Variables**
En **Settings → Environment**, agrega:

```
DISCORD_TOKEN=<tu_nuevo_token>
ADMIN_API_KEY=<tu_clave_api>
PORT=3001
```

⚠️ **Nota:** Asegúrate de haber rotado el token (aunque ya lo hiciste anteriormente).

---

## 🔄 Cómo Fluye Todo

```
Tu Render Service (Web — Puerto 3001)
    ↓
    ├─→ backend/index.js (Node.js)
    │   ├─ Express servidor
    │   ├─ Puerto 3001 ABIERTO ← Render ve esto
    │   ├─ Rutas API (/api/*)
    │   ├─ Sirve frontend React
    │   └─ LANZA → bot.js (proceso hijo)
    │       ├─ Discord bot
    │       ├─ discord.js client
    │       ├─ discord-player
    │       ├─ Conecta a Discord gateway
    │       └─ SI FALLA → reinicia en 5s
    │
    └─ Logs unificados en Render
```

**Resultado:** Un servicio, dos aplicaciones, sin costo extra. ✨

---

## 🚀 Pasos para Deploy

### 1. **Commit y Push**
```bash
git add .
git commit -m "Add bot.js as child process for single Render service"
git push origin main
```

### 2. **En Render Dashboard**
1. Ve a tu servicio Web
2. Ir a **Deployments**
3. Click en **Manual Deploy** → **Deploy latest commit**
4. **O** espera a que GitHub trigger el webhook (si está configurado)

### 3. **Monitorea los logs**
En **Logs**, deberías ver en orden:

```
Building...
[npm install, npm ci, npm run build...]
Build successful!

Starting...
Servidor backend escuchando en puerto 3001
Rutas registradas: /api/player, /api/cookies, ...
Frontend estático detectado en ../frontend/build
Iniciando bot.js como proceso hijo...
Bot process iniciado con PID 123
[... logs del bot ...]
Bot conectado como dj huevito#4580
```

### 4. **Verifica en Discord**
- Tu bot debe aparecer **Online**
- Prueba: `!play https://www.youtube.com/watch?v=...`
- Debe responder: `Reproduciendo...` u otro mensaje

---

## 🔍 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| Bot no aparece online | Token inválido/expirado | Genera nuevo en Dev Portal |
| Backend cae | Error en rutas | Revisa logs, busca error antes de "Bot process" |
| Frontend no se ve | Build falló | Revisa logs de build, verifica `package.json` scripts |
| Bot se reinicia constantemente | Código con errores | Revisa logs para "Error al iniciar bot.js" |
| Cookies no se guardan | Ruta API falla | Verifica `ADMIN_API_KEY` en Render env vars |

---

## 📊 Comparación: Antes vs Después

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Número de servicios** | 2 (Web + Background) | 1 (Web) |
| **Costo** | 2× precio base | 1× precio base |
| **Configuración Start** | `bash -lc '...'` (compleja) | `node backend/index.js` (simple) |
| **Bot se reinicia si falla** | Manual | Auto (cada 5s) |
| **Logs unificados** | Separados | En un solo lugar |
| **Complejidad** | Alta | Media |

---

## 💾 Archivos Modificados/Creados

```
✅ backend/index.js — Agregar spawn de bot.js
✅ RENDER_DEPLOYMENT.md — Guía de configuración
✅ QUICK_START.md — Este archivo
✅ test-render-setup.ps1 — Script para probar localmente
```

---

## 🧪 Prueba Local (Opcional)

Si quieres probar que todo funciona localmente antes de hacer push:

```powershell
# Instalar deps
npm ci
cd backend
npm ci
cd ..

# Iniciar (backend lanzará bot como hijo)
node backend/index.js
```

Deberías ver logs del backend + logs del bot en la misma terminal.

---

## ✨ Próximos Pasos Después de Deploy

1. **Verifica bot online en Discord** → Debe estar verde/online
2. **Prueba comandos** → `!play`, `!skip`, `!queue`, etc.
3. **Carga cookies** (opcional) → Ve a `https://tu-servicio.onrender.com/` → **Cookies Management**
4. **Monitorea primeras 24h** → Busca reinicies anormales en logs

---

## 📞 Si Algo Falla

1. **Lee los logs en Render** — son tu mejor amigo
2. **Busca "Error"** en los logs
3. **Verifica DISCORD_TOKEN** → ¿Es el correcto? ¿No está expirado?
4. **Revisa permisos del bot** → Debe poder conectarse a voz, ver canales, etc.

---

## 🎯 Resumen de la Solución

**Problema:** No puedes pagar por 2 servicios en Render  
**Solución:** Un servicio, dos procesos (backend + bot como hijo)  
**Resultado:** Mismo costo que 1 servicio, pero con bot incluido ✅

¡Listo para deploy! 🚀
