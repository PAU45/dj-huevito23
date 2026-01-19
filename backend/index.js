import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

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
  const setupPath = path.resolve('../frontend/public/setup.html');
  if (fs.existsSync(setupPath)) {
    res.sendFile(setupPath);
  } else {
    res.send(`
      <h1>DJ Huevito - Token Setup</h1>
      <p>Archivo setup.html no encontrado. Por favor, asegúrate que exista en frontend/public/setup.html</p>
    `);
  }
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
const frontendBuild = path.resolve('../frontend/build');
import fs from 'fs';
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => res.sendFile(path.join(frontendBuild, 'index.html')));
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

// ============================================
// GESTIÓN DEL PROCESO BOT COMO HIJO
// ============================================
import { spawn } from 'child_process';

let botProcess = null;

function startBotProcess() {
  console.log('Iniciando bot.js como proceso hijo...');
  
  // Usar spawn para iniciar bot.js en un proceso separado
  botProcess = spawn('node', ['bot.js'], {
    stdio: 'inherit', // heredar stdout/stderr para ver logs del bot
    cwd: process.cwd() // ejecutar desde la raíz del proyecto
  });
  
  console.log(`Bot process iniciado con PID ${botProcess.pid}`);
  
  botProcess.on('error', (err) => {
    console.error('Error al iniciar bot.js:', err);
    // Reintentar después de 5 segundos si falla
    console.log('Reintentando en 5 segundos...');
    setTimeout(startBotProcess, 5000);
  });
  
  botProcess.on('exit', (code, signal) => {
    console.warn(`Bot process terminado con código ${code} y señal ${signal}`);
    console.log('Reintentando en 5 segundos...');
    // Reintentar después de 5 segundos si se cierra
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
