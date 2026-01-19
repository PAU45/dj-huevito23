import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
import https from 'https';
import net from 'net';

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
import cookiesRoutes from './routes/cookies.js';
import sourcesRoutes from './routes/sources.js';
import messagesRoutes from './routes/messages.js';
import spotifyRoutes from './routes/spotify.js';
import playerRoutes from './routes/player.js';
import apiKey from './middlewares/auth.js';

// Player routes are public for status and command exchange between frontend and bot
app.use('/api/player', playerRoutes);

app.use('/api/cookies', apiKey, cookiesRoutes);
app.use('/api/sources', apiKey, sourcesRoutes);
app.use('/api/messages', apiKey, messagesRoutes);
app.use('/api/spotify', apiKey, spotifyRoutes);

app.get('/', (req, res) => {
  res.send('Backend DJ Huevito funcionando');
});

// Ruta para la página de setup de token
app.get('/setup', (req, res) => {
  const setupBuildPath = path.join(frontendBuild, 'setup.html');
  const setupPublicPath = path.resolve(process.cwd(), 'frontend/public/setup.html');

  if (fs.existsSync(setupBuildPath)) {
    return res.sendFile(setupBuildPath);
  }

  if (fs.existsSync(setupPublicPath)) {
    return res.sendFile(setupPublicPath);
  }

  return res.send(`
    <h1>DJ Huevito - Token Setup</h1>
    <p>Archivo setup.html no encontrado. Por favor, asegúrate que exista en frontend/public/setup.html o que el frontend haya sido compilado.</p>
  `);
});

// Ruta para página de diagnóstico (servir desde build/public)
app.get('/diagnose', (req, res) => {
  const diagBuildPath = path.join(frontendBuild, 'diagnose.html');
  const diagPublicPath = path.resolve(process.cwd(), 'frontend/public/diagnose.html');

  if (fs.existsSync(diagBuildPath)) return res.sendFile(diagBuildPath);
  if (fs.existsSync(diagPublicPath)) return res.sendFile(diagPublicPath);

  return res.send('<h1>Diagnóstico no disponible</h1><p>Coloca frontend/public/diagnose.html o compila el frontend.</p>');
});

// Redirigir rutas equivocadas que algunos enlaces puedan generar
app.get('/frontend/public/*', (req, res) => {
  return res.redirect('/');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
  console.log('Rutas registradas: /api/player, /api/cookies, /api/sources, /api/messages, /api/spotify');
  
  // Solo iniciar bot si hay token en .env
  if (process.env.DISCORD_TOKEN) {
    console.log('DISCORD_TOKEN encontrado en .env — iniciando bot automáticamente...');
    startBotProcess();
  } else {
    console.log('⚠️  No hay DISCORD_TOKEN en .env — ingresa el token en http://localhost:3001');
  }
});

// Servir frontend estático si existe (build)
import path from 'path';
const frontendBuild = path.resolve(process.cwd(), 'frontend/build');
import fs from 'fs';
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  // Catch-all for SPA: only serve index.html for non-API GET routes.
  app.get('*', (req, res, next) => {
    if (req.path && req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(frontendBuild, 'index.html'));
  });
  console.log('Frontend estático detectado en ../frontend/build — serviendo archivos estáticos');
} else {
  console.log('No se encontró frontend build en ../frontend/build — el backend funcionará solo como API');
}

// Endpoints para obtener configuración actual
app.get('/api/config/source', (req, res) => {
  try {
    const cfg = fs.readFileSync(path.resolve('./backend/config/source.json'), 'utf8');
    return res.json(JSON.parse(cfg));
  } catch (e) {
    return res.json({ source: 'youtube' });
  }
});

app.get('/api/config/messages', (req, res) => {
  try {
    const cfg = fs.readFileSync(path.resolve('./backend/config/messages.json'), 'utf8');
    return res.json(JSON.parse(cfg));
  } catch (e) {
    return res.json({ playMessage: '' });
  }
});

// Endpoint para recibir token dinámicamente e iniciar el bot
app.post('/api/config/init-bot', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token es requerido' });
  }
  
  if (botProcess) {
    return res.status(400).json({ error: 'Bot ya está corriendo' });
  }
  
  // Establecer el token en el ambiente
  process.env.DISCORD_TOKEN = token;
  
  console.log('Token recibido desde frontend — iniciando bot...');
  startBotProcess();
  
  return res.json({ success: true, message: 'Bot iniciándose...' });
});

// Endpoint para comprobar estado del bot
app.get('/api/bot/status', (req, res) => {
  const running = !!botProcess;
  const pid = botProcess && botProcess.pid ? botProcess.pid : null;
  return res.json({ running, pid });
});

// Endpoint de diagnóstico de conectividad a Discord
app.get('/api/diagnose', async (req, res) => {
  const results = {
    node: process.version,
    tokenPresent: !!process.env.DISCORD_TOKEN,
    tokenLength: process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0,
    dns: null,
    https: null,
    tcp: null,
    timestamp: new Date().toISOString(),
  };

  // DNS lookup
  try {
    const dnsInfo = await dns.promises.lookup('gateway.discord.gg');
    results.dns = { ok: true, address: dnsInfo.address, family: dnsInfo.family };
  } catch (e) {
    results.dns = { ok: false, error: String(e) };
  }

  // HTTPS request to Discord gateway endpoint
  try {
    results.https = await new Promise((resolve) => {
      const req = https.request(
        {
          hostname: 'discord.com',
          path: '/api/v10/gateway',
          method: 'GET',
          timeout: 8000,
        },
        (r) => {
          let body = '';
          r.on('data', (c) => (body += c.toString()));
          r.on('end', () => resolve({ ok: true, statusCode: r.statusCode, body: body ? body.substring(0, 1000) : '' }));
        },
      );
      req.on('error', (err) => resolve({ ok: false, error: String(err) }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'timeout' });
      });
      req.end();
    });
  } catch (e) {
    results.https = { ok: false, error: String(e) };
  }

  // TCP connect to gateway.discord.gg:443
  try {
    results.tcp = await new Promise((resolve) => {
      const socket = net.connect({ host: 'gateway.discord.gg', port: 443 }, () => {
        socket.end();
        resolve({ ok: true });
      });
      socket.setTimeout(8000, () => {
        socket.destroy();
        resolve({ ok: false, error: 'timeout' });
      });
      socket.on('error', (err) => resolve({ ok: false, error: String(err) }));
    });
  } catch (e) {
    results.tcp = { ok: false, error: String(e) };
  }

  return res.json(results);
});

// ============================================
// GESTIÓN DEL PROCESO BOT COMO HIJO
// ============================================
import { spawn } from 'child_process';

let botProcess = null;

function startBotProcess() {
  console.log('Iniciando bot.js como proceso hijo...');

  // Asegurar que el token esté presente
  if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN no está definido en el entorno — abortando inicio del bot');
    return;
  }

  // Usar spawn con pipes para capturar stdout/stderr y reenviarlos a los logs del backend
  botProcess = spawn('node', ['bot.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
    env: { ...process.env }
  });

  console.log(`Bot process spawn requested, PID (may be null until spawned): ${botProcess.pid}`);

  if (botProcess.stdout) {
    botProcess.stdout.on('data', (chunk) => {
      process.stdout.write(`[bot stdout] ${chunk}`);
    });
  }

  if (botProcess.stderr) {
    botProcess.stderr.on('data', (chunk) => {
      process.stderr.write(`[bot stderr] ${chunk}`);
    });
  }

  botProcess.on('spawn', () => {
    console.log(`Bot process iniciado con PID ${botProcess.pid}`);
  });

  botProcess.on('error', (err) => {
    console.error('Error al iniciar bot.js:', err);
    console.log('Reintentando en 5 segundos...');
    setTimeout(startBotProcess, 5000);
  });

  botProcess.on('close', (code, signal) => {
    console.warn(`Bot process finalizó (close) con código ${code} y señal ${signal}`);
    console.log('Reintentando en 5 segundos...');
    botProcess = null;
    setTimeout(startBotProcess, 5000);
  });
}

// Manejar cierre graceful del backend (cierra bot también)
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando backend y bot...');
  if (botProcess) botProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando backend y bot...');
  if (botProcess) botProcess.kill();
  process.exit(0);
});
