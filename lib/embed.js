const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { renderProgressBar, formatTime } = require('./utils');
const { safeDelete, logger } = require('./utils');

function buildControlComponents(isPaused = false) {
  const pauseLabel = isPaused ? '▶️ Resume' : '⏯️ Pause';
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('skip').setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pause_resume').setLabel(pauseLabel).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('stop').setLabel('⏹️ Stop').setStyle(ButtonStyle.Danger)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vol_down').setLabel('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vol_up').setLabel('🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('loop_toggle').setLabel('🔁').setStyle(ButtonStyle.Primary)
  );
  return [row, row2];
}

// sendNowPlayingMessage and updateNowPlayingMessage
async function sendNowPlayingMessage(queue, track, contentText, thumbnail) {
  try {
    const channel = queue.metadata.channel;
    const requestedBy = queue.metadata.requestedBy || (track.requestedBy ? track.requestedBy.username : 'Usuari@');
    function safeStr(v, max = 256) {
      if (v === undefined || v === null) return '';
      const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      return s.length > max ? s.slice(0, max - 1) + '…' : s;
    }
    const title = safeStr(track.title || contentText, 256);
    const desc = safeStr(track.author || '', 4096);
    const sourceVal = safeStr(track.source || 'youtube', 100);
    const durationVal = safeStr(track.duration || 'Desconocida', 100);
    const embed = new EmbedBuilder().setColor(0x7CFC00);
    if (title) embed.setTitle(title);
    if (desc) embed.setDescription(desc);
    embed.setTimestamp();
    if (thumbnail) embed.setThumbnail(thumbnail);
    embed.addFields([
      { name: 'Fuente', value: sourceVal || 'Desconocida', inline: true },
      { name: 'Duración', value: durationVal || 'Desconocida', inline: true }
    ]);
    const footerText = safeStr((requestedBy && requestedBy.username) || requestedBy || 'Usuari@', 2048);
    if (footerText) embed.setFooter({ text: footerText });

    const components = buildControlComponents(false);
    const msg = await channel.send({ content: contentText, embeds: [embed], components });
    queue.metadata.nowPlayingMessage = msg;
    return msg;
  } catch (e) {
    logger.error('Error enviando Now Playing message:', e && e.stack ? e.stack : e);
    return null;
  }
}

async function updateNowPlayingMessage(queue, opts = {}) {
  try {
    const msg = queue.metadata && queue.metadata.nowPlayingMessage;
    if (!msg) return;
    const isPaused = !!opts.paused;
    const embed = EmbedBuilder.from(msg.embeds[0] || new EmbedBuilder());
    if (isPaused) {
      embed.setColor(0xFF0000);
      embed.setFooter({ text: 'Pausado' });
    } else {
      embed.setColor(0x7CFC00);
      embed.setTimestamp();
    }
    try {
      const md = queue.metadata || {};
      const started = md.startedAt;
      const dur = md.durationMS || md.duration || 0;
      if (started && dur) {
        const now = Date.now();
        const elapsed = Math.max(0, now - started);
        const pct = Math.min(1, elapsed / dur);
        const bar = renderProgressBar(pct, 20);
        const elapsedLabel = formatTime(Math.floor(elapsed/1000));
        const durLabel = formatTime(Math.floor(dur/1000));
        embed.setFields([
          { name: 'Progreso', value: `${elapsedLabel} ${bar} ${durLabel}` }
        ]);
      }
    } catch (e) { logger.debug('progress render error', e && e.message ? e.message : e); }
    const components = buildControlComponents(isPaused);
    await msg.edit({ embeds: [embed], components });
  } catch (e) {
    logger.debug('No pude actualizar Now Playing:', e && e.message ? e.message : e);
  }
}

function startProgressInterval(queue) {
  try {
    stopProgressInterval(queue);
    const iv = setInterval(() => {
      try { updateNowPlayingMessage(queue); } catch (e) { logger.debug('progress interval error', e && e.message ? e.message : e); }
    }, 5000);
    queue.metadata = queue.metadata || {};
    queue.metadata.progressInterval = iv;
  } catch (e) { logger.debug('startProgressInterval', e && e.message ? e.message : e); }
}

function stopProgressInterval(queue) {
  try {
    if (queue && queue.metadata && queue.metadata.progressInterval) {
      clearInterval(queue.metadata.progressInterval);
      delete queue.metadata.progressInterval;
    }
  } catch (e) { logger.debug('stopProgressInterval', e && e.message ? e.message : e); }
}

module.exports = { sendNowPlayingMessage, updateNowPlayingMessage, buildControlComponents, startProgressInterval, stopProgressInterval };
