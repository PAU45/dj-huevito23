const { spawn } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const { logger, findExecutable, cleanupChildProcs } = require('./utils');
const { sendNowPlayingMessage, startProgressInterval, updateNowPlayingMessage, stopProgressInterval } = require('./embed');
const { MessageFlags } = require('discord.js');

// Map de reproducciones fallback por guild
const fallbacks = new Map();

async function fetchYtDlpMetadata(ytDlpPath, url, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const metaArgs = ['-j', '--no-warnings', '--no-playlist', url];
      logger.debug('yt-dlp metadata args', metaArgs);
      const metaProc = spawn(ytDlpPath, metaArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      let metaOut = '';
      let metaErr = '';
      if (metaProc.stdout) metaProc.stdout.on('data', d => metaOut += d.toString());
      if (metaProc.stderr) metaProc.stderr.on('data', d => metaErr += d.toString());
      await new Promise((res) => metaProc.on('close', res));
      if (metaOut) {
        const first = metaOut.split(/\r?\n/).find(l => l && l.trim());
        if (first) {
          try { return JSON.parse(first); } catch (e) { logger.debug('parse metadata error', e && e.message ? e.message : e); }
        }
      }
      if (metaErr) logger.debug('yt-dlp metadata stderr:', metaErr.trim());
    } catch (e) {
      logger.debug('yt-dlp metadata fetch failed', e && e.message ? e.message : e);
    }
    if (attempt < retries) await new Promise(r => setTimeout(r, 250));
  }
  return null;
}

async function playWithYtDlp(message, queryOrUrl, player) {
  const channel = message.channel;
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return channel.send('❌ Debes estar en un canal de voz para reproducir.');

  let url = queryOrUrl;
  let usingSearch = false;
  if (!/^https?:\/\//i.test(url)) {
    url = `ytsearch1:${queryOrUrl}`;
    usingSearch = true;
  }

  const ytDlpPath = process.env.YTDLP_PATH || await findExecutable('yt-dlp');
  if (!ytDlpPath) throw new Error('yt-dlp no encontrado. Configura YTDLP_PATH en .env o instala yt-dlp en el PATH.');

  let ytdlpMeta = null;
  try { ytdlpMeta = await fetchYtDlpMetadata(ytDlpPath, url, 1); } catch (e) { logger.debug('metadata fetch failed', e && e.message ? e.message : e); }

  const queueRef = player.nodes.get(message.guild.id) || { metadata: { channel }, guild: message.guild };
  try { const q = player.nodes.get(message.guild.id); if (q) cleanupChildProcs(q); } catch (e) {}

  let formatCandidates = [];
  try {
    if (ytdlpMeta && Array.isArray(ytdlpMeta.formats)) {
      const preferredExts = ['m4a', 'webm', 'mp3', 'opus', 'aac'];
      const candidates = ytdlpMeta.formats.filter(f => f.acodec && f.acodec !== 'none');
      candidates.sort((a,b) => {
        const ai = preferredExts.indexOf(a.ext);
        const bi = preferredExts.indexOf(b.ext);
        const aIdx = ai === -1 ? 99 : ai;
        const bIdx = bi === -1 ? 99 : bi;
        if (aIdx !== bIdx) return aIdx - bIdx;
        const abrA = a.abr || 0; const abrB = b.abr || 0;
        return abrB - abrA;
      });
      formatCandidates = candidates.map(c => c.format_id).filter(Boolean);
    }
  } catch (e) { logger.debug('formatCandidates build failed', e && e.message ? e.message : e); }
  // If metadata didn't yield candidates, prefer common non-fragment audio formats first
  if (!formatCandidates || formatCandidates.length === 0) {
    formatCandidates = ['bestaudio[ext=m4a]', 'bestaudio[ext=webm]', 'bestaudio'];
    logger.debug('No format candidates from metadata, using fallback list', formatCandidates);
  } else {
    // dedupe and ensure generic bestaudio as last resort
    formatCandidates = Array.from(new Set(formatCandidates.filter(Boolean)));
    if (!formatCandidates.includes('bestaudio')) formatCandidates.push('bestaudio');
    logger.debug('Format candidates from metadata:', formatCandidates);
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });
  await entersState(connection, VoiceConnectionStatus.Ready, 20000);

  let successful = false;
  let lastYtErr = '';
  for (const fmt of formatCandidates) {
    const args = ['-f', fmt, '-o', '-', '--no-playlist', '--no-warnings', url];
    logger.info('Attempting yt-dlp with format', fmt);
    const y = spawn(ytDlpPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    try { queueRef.metadata = queueRef.metadata || {}; queueRef.metadata.ytdlpProc = y; } catch (e) {}
    const ytdlpErrBuf = [];
    if (y.stderr) y.stderr.on('data', d => { const s = d.toString(); ytdlpErrBuf.push(s); logger.debug('yt-dlp:', s.trim()); });

    const gotData = await new Promise((resolve) => {
      let resolved = false;
      const onData = () => { if (resolved) return; resolved = true; cleanup(); resolve(true); };
      const onClose = () => { if (resolved) return; resolved = true; cleanup(); resolve(false); };
      const onError = () => { if (resolved) return; resolved = true; cleanup(); resolve(false); };
      const to = setTimeout(() => { if (resolved) return; resolved = true; cleanup(); resolve(false); }, 12000);
      function cleanup() {
        try { if (y.stdout) y.stdout.off('data', onData); } catch (e) {}
        try { y.off('close', onClose); y.off('error', onError); } catch (e) {}
        clearTimeout(to);
      }
      if (y.stdout) y.stdout.on('data', onData);
      y.on('close', onClose);
      y.on('error', onError);
    });

    if (!gotData) {
      lastYtErr = ytdlpErrBuf.join('').trim();
      try { y.kill('SIGKILL'); } catch (e) {}
      logger.warn('Format', fmt, 'did not produce data, trying next');
      continue;
    }

    const ffArgs = ['-hide_banner', '-loglevel', 'warning', '-nostdin', '-i', 'pipe:0', '-vn', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'];
    const ff = spawn(ffmpegPath, ffArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    try { queueRef.metadata = queueRef.metadata || {}; queueRef.metadata.ffProc = ff; } catch (e) {}
    const ffErrBuf = [];
    if (ff.stderr) ff.stderr.on('data', (d) => { const s = d.toString(); ffErrBuf.push(s); logger.debug('ffmpeg:', s.trim()); });
    ff.on('error', (e) => logger.error('ffmpeg spawn error:', e && e.message ? e.message : e));

    y.stdout.pipe(ff.stdin);
    const playerAudio = createAudioPlayer();
    const resource = createAudioResource(ff.stdout, { inputType: StreamType.Raw, inlineVolume: true });
    try {
      const initialVol = (queueRef && queueRef.volume) ? (queueRef.volume / 100) : 0.8;
      if (resource && resource.volume && typeof resource.volume.setVolume === 'function') resource.volume.setVolume(initialVol);
    } catch (e) { logger.debug('set initial volume failed', e && e.message ? e.message : e); }
    playerAudio.play(resource);
    connection.subscribe(playerAudio);
    // Registrar fallback activo para que los botones interactúen con él
    try {
      const fb = {
        ytdlpProc: y,
        ffProc: ff,
        playerAudio,
        resource,
        connection,
        metadata: queueRef.metadata || {},
      };
      fallbacks.set(message.guild.id, fb);
    } catch (e) { logger.debug('register fallback failed', e && e.message ? e.message : e); }

    playerAudio.on('error', e => { logger.error('Audio player error', e && e.stack ? e.stack : e); });
    playerAudio.on('stateChange', (oldS, newS) => {
      logger.debug('Audio player stateChange', oldS && oldS.status, '->', newS && newS.status);
      if (newS.status === AudioPlayerStatus.Idle) {
        try { connection.destroy(); } catch (e) { logger.debug('Error al destruir conexión:', e && e.message ? e.message : e); }
        try { cleanupChildProcs(queueRef); } catch (e) { logger.debug('cleanupChildProcs idle', e && e.message ? e.message : e); }
        try { if (queueRef.metadata && queueRef.metadata.nowPlayingMessage) safeDelete(queueRef.metadata.nowPlayingMessage); } catch (e) {}
        try { fallbacks.delete(message.guild.id); } catch (e) {}
      }
    });

    const title = ytdlpMeta && ytdlpMeta.title ? ytdlpMeta.title : (usingSearch ? queryOrUrl : url);
    const author = ytdlpMeta && (ytdlpMeta.uploader || ytdlpMeta.channel) ? (ytdlpMeta.uploader || ytdlpMeta.channel) : '';
    const durationSec = ytdlpMeta && ytdlpMeta.duration ? Number(ytdlpMeta.duration) : null;
    const thumbnail = ytdlpMeta && ytdlpMeta.thumbnail ? ytdlpMeta.thumbnail : null;
    const fakeTrack = { title, author, duration: durationSec ? Math.floor(durationSec) : 'Desconocida', durationMS: durationSec ? Math.floor(durationSec * 1000) : 0 };
    const fakeQueue = { metadata: { channel }, guild: message.guild };
    if (fakeQueue.metadata) fakeQueue.metadata.durationMS = fakeTrack.durationMS || 0;
    const nowMsg = await sendNowPlayingMessage(fakeQueue, fakeTrack, `▶️ Reproduciendo: ${title}`, thumbnail);
    if (fakeQueue.metadata) fakeQueue.metadata.nowPlayingMessage = nowMsg;
    if (fakeQueue.metadata && fakeQueue.metadata.durationMS) { fakeQueue.metadata.startedAt = Date.now(); startProgressInterval(fakeQueue); }
    await channel.send('▶️ Reproduciendo (fallback): ' + title);

    successful = true;
    break;
  }

  if (!successful) {
    logger.error('All yt-dlp formats failed:', lastYtErr);
    try { channel.send('❌ No se pudo iniciar la reproducción (yt-dlp falló en todos los formatos).'); } catch (e) {}
    try { cleanupChildProcs(queueRef); } catch (e) {}
    return;
  }
  return;
}

// Exponer controles para interacciones (pause/stop/skip/vol/loop) a través del mapa fallbacks
async function handleFallbackButton(guildId, id, interaction) {
  const fb = fallbacks.get(guildId);
  if (!fb) return false;
  try {
    if (id === 'skip' || id === 'stop') {
      try { if (fb.ytdlpProc) fb.ytdlpProc.kill('SIGKILL'); } catch (e) {}
      try { if (fb.ffProc) fb.ffProc.kill('SIGKILL'); } catch (e) {}
      try { if (fb.connection) fb.connection.destroy(); } catch (e) {}
      try { stopProgressInterval({ metadata: fb.metadata }); } catch (e) {}
      fallbacks.delete(guildId);
      await interaction.reply({ content: '⏹️ Reproducción parada (fallback).', flags: MessageFlags.Ephemeral });
      return true;
    }
    if (id === 'pause_resume') {
      const isPaused = fb.playerAudio.state.status === 'paused' || fb.playerAudio.state.status === 'idle' && fb.playerAudio._state?.status === 'paused';
      if (isPaused) {
        try { fb.playerAudio.unpause && fb.playerAudio.unpause(); } catch (e) { fb.playerAudio.play && fb.playerAudio.play(fb.resource); }
        if (fb.metadata && fb.metadata.pausedAt) {
          fb.metadata.startedAt = (fb.metadata.startedAt || Date.now()) + (Date.now() - fb.metadata.pausedAt);
          delete fb.metadata.pausedAt;
        }
        startProgressInterval({ metadata: fb.metadata });
        await interaction.reply({ content: '▶️ Reanudado (fallback).', flags: MessageFlags.Ephemeral });
      } else {
        try { fb.playerAudio.pause && fb.playerAudio.pause(); } catch (e) {}
        fb.metadata.pausedAt = Date.now();
        stopProgressInterval({ metadata: fb.metadata });
        await interaction.reply({ content: '⏸️ Pausado (fallback).', flags: MessageFlags.Ephemeral });
      }
      try { updateNowPlayingMessage({ metadata: fb.metadata }, { paused: !isPaused }); } catch (e) {}
      return true;
    }
    if (id === 'vol_down' || id === 'vol_up') {
      const delta = id === 'vol_up' ? 10 : -10;
      try {
        const vol = (fb.metadata && fb.metadata.volume) ? fb.metadata.volume : 80;
        const next = Math.max(0, Math.min(200, vol + delta));
        fb.metadata.volume = next;
        if (fb.resource && fb.resource.volume && typeof fb.resource.volume.setVolume === 'function') fb.resource.volume.setVolume(next/100);
        await interaction.reply({ content: `🔉 Volumen: ${next}%`, flags: MessageFlags.Ephemeral });
        try { updateNowPlayingMessage({ metadata: fb.metadata }); } catch (e) {}
        return true;
      } catch (e) { logger.debug('vol change failed', e && e.message ? e.message : e); }
    }
    if (id === 'loop_toggle') {
      try {
        fb.metadata.loop = !fb.metadata.loop;
        await interaction.reply({ content: `🔁 Loop ${fb.metadata.loop ? 'activado' : 'desactivado'} (fallback)`, flags: MessageFlags.Ephemeral });
        try { updateNowPlayingMessage({ metadata: fb.metadata }); } catch (e) {}
        return true;
      } catch (e) {}
    }
  } catch (e) {
    logger.error('handleFallbackButton error', e && e.stack ? e.stack : e);
  }
  return false;
}

module.exports = { playWithYtDlp, fetchYtDlpMetadata, handleFallbackButton };
