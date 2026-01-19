# Configuración de Render para DJ Huevito (Servicio Único)

## 📋 Resumen de la Solución
Debido a la limitación de presupuesto (no puedes tener múltiples servicios), usamos una arquitectura de **servicio único** donde:
- El **backend Express** corre en el Puerto 3001 (Render lo ve como servicio activo)
- El **bot Discord** se inicia como **proceso hijo** dentro del backend
- Ambos comparten el mismo entorno, variables y logs

## 🔧 Configuración en Render

### 1. **Build Command** (en el dashboard de Render)
```bash
bash -lc 'npm ci && cd frontend && npm ci && npm run build && cd ../backend && npm ci'
```

**Qué hace:**
- Instala dependencias raíz
- Instala y compila frontend (React → `frontend/build/`)
- Instala dependencias backend
- La carpeta `backend/build` se sirve como archivos estáticos desde el backend

### 2. **Start Command** (en el dashboard de Render)
```bash
node backend/index.js
```

**IMPORTANTE:** No uses `bash -lc 'node backend/index.js & exec node bot.js'` — eso causaba que Render matara el proceso porque `exec` reemplaza el shell.

### 3. **Environment Variables** (en el dashboard de Render)
Agrega estas variables en **Settings → Environment**:

```
DISCORD_TOKEN=tu_token_aqui
ADMIN_API_KEY=tu_clave_api_aqui
PORT=3001
```

**Opcional (para restaurar cookies en deploy):**
```
COOKIE_B64=base64_de_youtube_cookies
```

## 📊 Cómo Funciona

```
┌─────────────────────────────────────────┐
│   RENDER WEB SERVICE (Puerto 3001)      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   backend/index.js (PID 1)      │   │
│  │  - Express en puerto 3001 ✓     │   │
│  │  - Rutas API (/api/*)           │   │
│  │  - Sirve frontend estático      │   │
│  │  - Detecta Discord token        │   │
│  │                                 │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │   bot.js (proceso hijo) │   │   │
│  │  │  - Cliente Discord      │   │   │
│  │  │  - Reproductor música   │   │   │
│  │  │  - Conexión a gateway   │   │   │
│  │  │  - Auto-reinicio si cae │   │   │
│  │  └─────────────────────────┘   │   │
│  │  → Reinicia bot cada 5s si falla│   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

## ✅ Ventajas

1. **Un solo servicio** → Sin costos adicionales ✓
2. **Mismo entorno** → Variables compartidas, mismo filesystem ✓
3. **Logs unificados** → Todo en `Logs` de Render ✓
4. **Auto-reinicio del bot** → Si falla, se relanza en 5s ✓
5. **Cierre graceful** → Render puede detener todo correctamente ✓

## 🔍 Verificación en Render Logs

Después de hacer deploy, deberías ver en **Logs**:

```
Servidor backend escuchando en puerto 3001
Rutas registradas: /api/player, /api/cookies, /api/sources, /api/messages, /api/spotify
Frontend estático detectado en ../frontend/build — sirviendo archivos estáticos
Iniciando bot.js como proceso hijo...
Bot process iniciado con PID [number]
[logs del bot...]
Bot conectado como dj huevito#XXXX
```

## ⚠️ Troubleshooting

### El bot no se inicia
1. Verifica que `DISCORD_TOKEN` esté en Environment Variables (no el viejo)
2. Revisa los logs en Render para "Error al iniciar bot.js"
3. Asegúrate de que `bot.js` existe en la raíz

### El backend no se inicia
1. Revisa los logs para errores de `npm ci` o problemas de dependencias
2. Verifica que `backend/config/source.json` y `backend/config/messages.json` existen (si no, crea valores por defecto)

### El frontend no se sirve
1. Verifica en logs: "Frontend estático detectado" (debe aparecer)
2. Si no aparece, probablemente `npm run build` falló
3. Revisa que `package.json` en frontend tenga script `build`

## 🚀 Próximos Pasos

1. **Commitea los cambios:**
   ```bash
   git add backend/index.js
   git commit -m "Add bot.js as child process in backend startup"
   git push origin main
   ```

2. **Redeploy en Render:**
   - Ve a tu servicio en Render
   - Click en **Manual Deploy** → **Deploy latest commit**
   - O simplemente espera a que GitHub accione el webhook (si lo configuraste)

3. **Verifica en Discord:**
   - Tu bot debe aparecer **Online** en Discord
   - Prueba con `!play URL` o `!queue`

4. **Prueba las cookies (opcional):**
   - Ve a `https://tu-dominio.onrender.com/`
   - Sección **Cookies Management**
   - Sube tu `youtube_cookies.json`

## 📝 Notas

- El proceso bot se reinicia automáticamente cada 5 segundos si falla.
- Los logs del bot aparecen en los mismos logs del backend.
- Si Render necesita detener el servicio, tanto el backend como el bot se cierran gracefully.
- Todas las variables de entorno se heredan al proceso hijo (bot accede a `process.env.DISCORD_TOKEN`, etc.)
