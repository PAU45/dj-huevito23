const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const playdl = require('play-dl');
require('dotenv').config();
const { logger, findExecutable, safeDelete, cleanupChildProcs, fs } = require('./lib/utils');
const { sendNowPlayingMessage, updateNowPlayingMessage, startProgressInterval, stopProgressInterval } = require('./lib/embed');
const { playWithYtDlp, handleFallbackButton } = require('./lib/ytplayer');

// Logger provisto por ./lib/utils

// Config dinámico (fuente y mensajes)
let runtimeConfig = { source: 'youtube' };
let messagesConfig = { playMessage: '▶️ Reproduciendo: **{title}** - {author}' };
function loadRuntimeConfig() {
  try {
    const data = fs.readFileSync('./backend/config/source.json', 'utf8');
    runtimeConfig = JSON.parse(data);
  } catch (e) {}
}
function loadMessagesConfig() {
  try {
    const data = fs.readFileSync('./backend/config/messages.json', 'utf8');
    messagesConfig = JSON.parse(data);
  } catch (e) {}
}
loadRuntimeConfig();
loadMessagesConfig();
fs.watchFile('./backend/config/source.json', () => loadRuntimeConfig());
fs.watchFile('./backend/config/messages.json', () => loadMessagesConfig());

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err && err.stack ? err.stack : err);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Crear player de discord-player (sin servidor externo)
const player = new Player(client, {
  ytdlOptions: {
    quality: 'highestaudio',
    highWaterMark: 1 << 25
  }
});

// Registrar extractores para YouTube, Spotify, SoundCloud, etc.
(async () => {
  try {
    // Configurar play-dl para YouTube: convertir formato Netscape a header 'name=value; ...'
    if (fs.existsSync('./youtube_cookies.txt')) {
      try {
        const raw = fs.readFileSync('./youtube_cookies.txt', 'utf-8');
        const lines = raw.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
        const kv = lines.map(l => {
          const parts = l.split('\t');
          // Netscape format: domain, flag, path, secure, expiration, name, value
          const name = parts[5];
          const value = parts[6];
          return `${name}=${value}`;
        }).filter(Boolean);
        const cookieHeader = kv.join('; ');
          await playdl.setToken({ youtube: { cookie: cookieHeader } });
          logger.info('Cookies de YouTube cargadas (convertidas)');
        } catch (ce) {
        logger.error('Error convirtiendo cookies:', ce && ce.stack ? ce.stack : ce);
      }
    }
    
    await player.extractors.loadMulti(DefaultExtractors);
    logger.info('Extractores cargados: YouTube, Spotify, SoundCloud y más');
  } catch (e) {
    logger.error('Error cargando extractores:', e && e.stack ? e.stack : e);
  }
})();

// Evento cuando empieza a reproducir una canción
player.events.on('playerStart', async (queue, track) => {
  // limpiar procesos huérfanos antes de empezar nueva pista
  try { cleanupChildProcs(queue); } catch (e) {}
  logger.info('Reproduciendo:', track.title);
  const channel = queue.metadata.channel;
  
  const tpl = messagesConfig.playMessage || '▶️ Reproduciendo: **{title}** - {author}';
  const text = tpl.replace('{title}', track.title).replace('{author}', track.author);

  // Intentar obtener imagen/metadatos enriquecidos desde backend
  let image = track.thumbnail;
  try {
    const q = encodeURIComponent(`${track.title} ${track.author}`);
    const resp = await fetch(`http://localhost:3001/api/spotify/info?query=${q}`, { method: 'GET' });
    if (resp.ok) {
      const j = await resp.json();
      if (j && j.image) image = j.image;
    }
  } catch (e) {
    logger.debug('No se obtuvo imagen enriquecida:', e && e.message ? e.message : e);
  }

  // Enviar panel 'Now Playing' con botones interactivos (embed construido en ./lib/embed)
  await sendNowPlayingMessage(queue, track, text, image);
  // setup progress tracking
  try {
    queue.metadata = queue.metadata || {};
    queue.metadata.startedAt = Date.now();
    queue.metadata.durationMS = track.durationMS || track.duration || 0;
    startProgressInterval(queue);
  } catch (e) { logger.debug('start progress failed', e && e.message ? e.message : e); }

  // Informar al backend
  try {
    await fetch('http://localhost:3001/api/player/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guild: queue.guild.id,
        title: track.title,
        author: track.author,
        image: image,
        url: track.url,
        duration: track.durationMS,
        source: track.source || runtimeConfig.source || 'youtube'
      })
    });
  } catch (e) {}
});

// Evento cuando la cola termina
player.events.on('emptyQueue', (queue) => {
  const channel = queue.metadata.channel;
  logger.info('Cola vacía en guild', queue.guild.id);
  channel.send('✅ Cola de reproducción terminada. El bot saldrá del canal en 3 minutos si no agregas más canciones.');
  try { stopProgressInterval(queue); } catch (e) {}
  setTimeout(() => {
    if (queue.tracks.size === 0 && queue.connection) {
      try { cleanupChildProcs(queue); } catch (e) {}
      queue.delete();
      channel.send('👋 Saliendo del canal por inactividad.');
    }
  }, 180000);
});

// Evento de error
player.events.on('playerError', (queue, error) => {
  logger.error('Error en reproducción:', error && error.stack ? error.stack : error);
  const channel = queue.metadata.channel;
  channel.send('❌ Esta canción no pudo reproducirse. Saltando...');
});

client.once('ready', async () => {
  logger.info(`Bot conectado como ${client.user.tag}`);
  logger.info('Usando discord-player (YouTube, Spotify, SoundCloud)');
});

// Limpiar procesos hijos cuando el proceso de node sale o recibe señal
process.on('exit', () => {
  try {
    if (player && player.nodes && typeof player.nodes.forEach === 'function') {
      player.nodes.forEach(q => { try { cleanupChildProcs(q); } catch (e) {} });
    }
  } catch (e) {}
});
process.on('SIGINT', () => { logger.info('SIGINT recibido, limpiando procesos...'); try { if (player && player.nodes && typeof player.nodes.forEach === 'function') player.nodes.forEach(q => cleanupChildProcs(q)); } catch (e) {} process.exit(0); });
process.on('SIGTERM', () => { logger.info('SIGTERM recibido, limpiando procesos...'); try { if (player && player.nodes && typeof player.nodes.forEach === 'function') player.nodes.forEach(q => cleanupChildProcs(q)); } catch (e) {} process.exit(0); });

// findExecutable provisto por ./lib/utils

// fetchYtDlpMetadata provisto por ./lib/ytplayer

// helpers y funciones de embed/ytplayer movidas a ./lib

async function changeVolume(queue, delta, interaction) {
  try {
    // intentar API de discord-player si existe
    if (queue && queue.node && typeof queue.node.volume === 'number' && typeof queue.node.setVolume === 'function') {
      const cur = queue.node.volume || 100;
      const next = Math.max(0, Math.min(200, cur + delta));
      await queue.node.setVolume(next);
      return next;
    }
    if (queue && typeof queue.setVolume === 'function') {
      const cur = queue.volume || 100;
      const next = Math.max(0, Math.min(200, cur + delta));
      await queue.setVolume(next);
      return next;
    }
    return null;
  } catch (e) {
    logger.error('changeVolume error', e && e.stack ? e.stack : e);
    return null;
  }
}

function toggleLoop(queue) {
  try {
    queue.metadata = queue.metadata || {};
    queue.metadata.loop = !queue.metadata.loop;
    return queue.metadata.loop;
  } catch (e) { logger.debug('toggleLoop', e && e.message ? e.message : e); return false; }
}

// playWithYtDlp está implementado en ./lib/ytplayer.js


// Interacción con botones (skip, pause/resume, stop)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const id = interaction.customId;
  const queue = player.nodes.get(interaction.guildId);
  if (!queue || !queue.isPlaying()) {
    // intentar controlar fallback si existe
    try {
      const handled = await handleFallbackButton(interaction.guildId, id, interaction);
      if (handled) return;
    } catch (e) { logger.debug('fallback handler error', e && e.message ? e.message : e); }
    return interaction.reply({ content: 'No hay reproductor activo.', flags: MessageFlags.Ephemeral });
  }
  
  try {
    if (id === 'skip') {
      // cleanup any leftover child processes before skipping
      try { cleanupChildProcs(queue); } catch (e) { logger.debug('cleanup before skip', e && e.message ? e.message : e); }
      queue.node.skip();
      await interaction.reply({ content: '⏭️ Saltando canción...', flags: MessageFlags.Ephemeral });
      // actualizar mensaje now playing si existe
      setTimeout(() => updateNowPlayingMessage(queue), 1000);
      stopProgressInterval(queue);
    } else if (id === 'pause_resume') {
      if (queue.node.isPaused()) {
        queue.node.resume();
        await interaction.reply({ content: '▶️ Reanudado', flags: MessageFlags.Ephemeral });
        await updateNowPlayingMessage(queue, { paused: false });
        // resume progress
        queue.metadata.startedAt = (queue.metadata.startedAt || Date.now()) + ((queue.metadata.pausedAt) ? (Date.now() - queue.metadata.pausedAt) : 0);
        delete queue.metadata.pausedAt;
        startProgressInterval(queue);
      } else {
        queue.node.pause();
        await interaction.reply({ content: '⏸️ Pausado', flags: MessageFlags.Ephemeral });
        await updateNowPlayingMessage(queue, { paused: true });
        // pause progress
        queue.metadata.pausedAt = Date.now();
        stopProgressInterval(queue);
      }
    } else if (id === 'stop') {
      // cleanup child procs first
      try { cleanupChildProcs(queue); } catch (e) { logger.debug('cleanup before stop', e && e.message ? e.message : e); }
      queue.delete();
      await interaction.reply({ content: '⏹️ Parado y desconectado', flags: MessageFlags.Ephemeral });
      try { if (queue.metadata && queue.metadata.nowPlayingMessage) await safeDelete(queue.metadata.nowPlayingMessage); } catch (e) {}
      stopProgressInterval(queue);
    } else if (id === 'vol_down' || id === 'vol_up') {
      const delta = id === 'vol_up' ? 10 : -10;
      const newV = await changeVolume(queue, delta, interaction);
      if (newV === null) await interaction.reply({ content: '🔈 Control de volumen no soportado.', flags: MessageFlags.Ephemeral });
      else await interaction.reply({ content: `🔉 Volumen: ${newV}%`, flags: MessageFlags.Ephemeral });
      await updateNowPlayingMessage(queue);
    } else if (id === 'loop_toggle') {
      const newLoop = toggleLoop(queue);
      await interaction.reply({ content: `🔁 Loop ${newLoop ? 'activado' : 'desactivado'}`, flags: MessageFlags.Ephemeral });
      await updateNowPlayingMessage(queue);
    }
  } catch (e) {
    logger.error('interaction error', e && e.stack ? e.stack : e);
    try { await interaction.reply({ content: 'Error al ejecutar comando.', flags: MessageFlags.Ephemeral }); } catch (er) {}
  }
});

// Comando !play
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!play ')) return;

  const query = message.content.slice(6).trim();
  logger.info('Comando !play recibido:', { query });
  if (!query) {
    logger.warn('No se recibió texto para buscar.');
    return message.channel.send('❌ Escribe el nombre o URL de la canción.');
  }

  try {
    if (!message.member.voice.channel) {
      return message.channel.send('❌ Debes estar en un canal de voz.');
    }

      const searchMsg = await message.channel.send('🔍 Buscando...');

    // Buscar la canción
    const searchResult = await player.search(query, {
      requestedBy: message.author,
      searchEngine: runtimeConfig.source === 'soundcloud' ? 'soundcloud' : 'youtube'
    });

    logger.debug('Resultado de búsqueda:', searchResult);
    logger.info('Tracks encontrados:', searchResult.tracks?.length || 0, 'playlist?', !!searchResult.playlist);

    if (!searchResult || !searchResult.hasTracks()) {
      logger.warn('No hubo resultados con discord-player/play-dl; intentando fallback directo con yt-dlp...');
      await safeDelete(searchMsg);
      try {
        await playWithYtDlp(message, query, player);
        return;
      } catch (errPlay) {
        logger.error('Error en playWithYtDlp fallback:', errPlay && errPlay.stack ? errPlay.stack : errPlay);
        return message.channel.send(`❌ No se encontró nada. Intenta con el nombre exacto o URL.`);
      }
    }

    // Obtener o crear cola
    let queue = player.nodes.get(message.guild.id);
    
    if (!queue) {
      queue = player.nodes.create(message.guild, {
        metadata: {
          channel: message.channel,
          client: message.guild.members.me,
          requestedBy: message.author
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 180000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 180000
      });
    }

    // Conectar a canal de voz si no está conectado
    try {
      if (!queue.connection) await queue.connect(message.member.voice.channel);
    } catch (e) {
      logger.error('Error conectando al canal de voz:', e && e.stack ? e.stack : e);
      await safeDelete(searchMsg);
      player.nodes.delete(message.guild.id);
      return message.channel.send('❌ No pude conectarme al canal de voz.');
    }

    await safeDelete(searchMsg);

    // Agregar canciones a la cola
    if (searchResult.playlist) {
      queue.addTrack(searchResult.tracks);
      logger.info('Playlist agregada:', searchResult.tracks.length);
      message.channel.send(`📝 Playlist agregada: ${searchResult.playlist.title} (${searchResult.tracks.length} canciones)`);
    } else {
      const track = searchResult.tracks[0];
      queue.addTrack(track);
      logger.info('Track agregado:', track.title);
      message.channel.send(`➕ Agregado: **${track.title}**`);
    }

    // Iniciar reproducción si no está reproduciendo
    if (!queue.isPlaying()) {
      logger.info('Iniciando reproducción...');
      await queue.node.play();
      logger.info('Reproducción iniciada.');
    }

  } catch (err) {
    logger.error('Error general en !play:', err && err.stack ? err.stack : err);
    message.channel.send('❌ Error: ' + (err && err.message ? err.message : err));
  }
});

// Comando !skip
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!skip') {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying()) return message.channel.send('❌ No hay música reproduciéndose.');
    queue.node.skip();
    logger.info('Comando !skip en guild', message.guild.id, 'por', message.author.id);
    message.channel.send('⏭️ Canción saltada.');
  }
});

// Comando !stop
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!stop') {
    const queue = player.nodes.get(message.guild.id);
    if (!queue) return message.channel.send('❌ No hay música reproduciéndose.');
    try { cleanupChildProcs(queue); } catch (e) {}
    queue.delete();
    logger.info('Comando !stop en guild', message.guild.id, 'por', message.author.id);
    message.channel.send('⏹️ Música detenida y desconectado del canal.');
  }
});

// Comando !queue
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!queue') {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying()) return message.channel.send('❌ No hay música reproduciéndose.');
    
    const currentTrack = queue.currentTrack;
    const tracks = queue.tracks.toArray();
    
    if (!currentTrack) return message.channel.send('❌ No hay música reproduciéndose.');
    
    let queueString = `**🎵 Reproduciendo ahora:**\n${currentTrack.title} - ${currentTrack.author}\n\n`;
    
    if (tracks.length === 0) {
      queueString += '**Cola:** Vacía';
    } else {
      queueString += '**📝 Próximas canciones:**\n';
      queueString += tracks.slice(0, 10).map((track, i) => 
        `${i + 1}. ${track.title}`
      ).join('\n');
      
      if (tracks.length > 10) {
        queueString += `\n\n...y ${tracks.length - 10} más`;
      }
    }
    
    logger.info('Comando !queue en guild', message.guild.id, 'por', message.author.id);
    message.channel.send(queueString);
  }
});

// Comando !pause
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!pause') {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying()) return message.channel.send('❌ No hay música reproduciéndose.');
    queue.node.pause();
    logger.info('Comando !pause en guild', message.guild.id, 'por', message.author.id);
    message.channel.send('⏸️ Música pausada.');
  }
});

// Comando !resume
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!resume') {
    const queue = player.nodes.get(message.guild.id);
    if (!queue) return message.channel.send('❌ No hay música reproduciéndose.');
    queue.node.resume();
    logger.info('Comando !resume en guild', message.guild.id, 'por', message.author.id);
    message.channel.send('▶️ Música reanudada.');
  }
});

client.login(process.env.DISCORD_TOKEN);