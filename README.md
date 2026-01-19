DJ Huevito — Setup rápido

Resumen
- Bot de Discord que reproduce audio usando `discord-player` y como fallback `yt-dlp` + `ffmpeg`.
- Panel web (frontend) para subir cookies, ver el track actual y enviar comandos.

Requisitos (Windows)
- Node.js 18+ (recomendado 20+)
- yt-dlp (agregar a PATH o configurar `YTDLP_PATH`)
- ffmpeg (agregar a PATH o configurar `FFMPEG_PATH`)

Instalar `yt-dlp` en Windows
1. Descargar el ejecutable desde https://github.com/yt-dlp/yt-dlp/releases
2. Renombrar a `yt-dlp.exe` y colocarlo en una carpeta en tu `PATH` o en la raíz del proyecto.

Instalar `ffmpeg` en Windows
1. Descargar un build estático (por ejemplo de https://www.gyan.dev/ffmpeg/builds/)
2. Extraer y añadir la carpeta `bin` a tu `PATH`, o apunta `FFMPEG_PATH` al ejecutable `ffmpeg.exe`.

Variables de entorno útiles
- `DISCORD_TOKEN` — token del bot.
- `ADMIN_API_KEY` — clave que el backend espera en `x-api-key` (usada por el panel web).
- `YTDLP_PATH` — ruta absoluta a `yt-dlp.exe` (opcional si está en PATH).
- `FFMPEG_PATH` — ruta absoluta a `ffmpeg.exe` (opcional si está en PATH).
- `LOG_LEVEL` — `info` o `debug` para más trazas.

Frontend
1. Copia `REACT_APP_ADMIN_API_KEY` en el `.env` del frontend si quieres que el panel envíe la cabecera.
2. Desde `frontend/`:
   - `npm install`
   - `npm run build` (opcional) o `npm start` para desarrollo.

Backend
1. Desde la raíz:
   - `npm install` (en `backend/` si trabajas por carpetas)
   - `node backend/index.js` (o `npm start` si está script)

Cómo usar
1. Inicia backend y frontend.
2. En el panel web sube `cookies.txt` (Netscape format) en la sección Cookies.
3. Conéctate a un canal de voz y usa `!play <canción o URL>` en Discord.
4. Desde el panel puedes ver la pista actual y enviar `skip`, `pause_resume`, `stop`.

Notas técnicas y mejoras aplicadas
- El bot ahora guarda el mensaje "Now Playing" y provee botones interactivos (Skip / Pause-Resume / Stop).
- El frontend usa un cliente `api` que añade `x-api-key` automáticamente si `REACT_APP_ADMIN_API_KEY` está configurado.
- El backend valida `x-api-key` con `ADMIN_API_KEY`.
- `yt-dlp` y `ffmpeg` se registran y sus stderr se imprimen en logs cuando `LOG_LEVEL=debug`.
