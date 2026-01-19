const { spawn } = require('child_process');
const fs = require('fs');

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
function timestamp() { return new Date().toISOString(); }
const logger = {
  info: (...args) => console.log('[INFO]', `[${timestamp()}]`, ...args),
  warn: (...args) => console.warn('[WARN]', `[${timestamp()}]`, ...args),
  error: (...args) => console.error('[ERROR]', `[${timestamp()}]`, ...args),
  debug: (...args) => { if (LOG_LEVEL === 'debug') console.debug('[DEBUG]', `[${timestamp()}]`, ...args); }
};

// Helper: encuentra ejecutable en PATH (windows usa 'where', unix 'which')
function findExecutable(cmd) {
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    const res = spawn(which, [cmd]);
    let out = '';
    res.stdout.on('data', (d) => out += d.toString());
    return new Promise((resolve) => {
      res.on('close', (code) => {
        if (code === 0) resolve(out.split(/\r?\n/)[0]);
        else resolve(null);
      });
    });
  } catch (e) { return null; }
}

// Helper: eliminar mensaje de forma segura (ignorar Unknown Message 10008)
async function safeDelete(msg) {
  if (!msg) return;
  try {
    await msg.delete();
  } catch (e) {
    if (e && e.code === 10008) return; // Unknown Message - ignorar
    logger.debug('safeDelete error:', e && e.message ? e.message : e);
  }
}

function renderProgressBar(pct, length) {
  const filled = Math.round(pct * length);
  const empty = length - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

function formatTime(sec) {
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = sec%60;
  if (h>0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function cleanupChildProcs(queue) {
  try {
    if (!queue || !queue.metadata) return;
    const md = queue.metadata;
    if (md.ytdlpProc) {
      try { md.ytdlpProc.kill('SIGKILL'); } catch (e) { try { md.ytdlpProc.kill(); } catch (e2) {} }
      delete md.ytdlpProc;
      logger.debug('Killed ytdlpProc');
    }
    if (md.ffProc) {
      try { md.ffProc.kill('SIGKILL'); } catch (e) { try { md.ffProc.kill(); } catch (e2) {} }
      delete md.ffProc;
      logger.debug('Killed ffProc');
    }
    if (md.progressInterval) {
      try { clearInterval(md.progressInterval); } catch (e) {}
      delete md.progressInterval;
    }
  } catch (e) { logger.debug('cleanupChildProcs error', e && e.message ? e.message : e); }
}

module.exports = { logger, findExecutable, safeDelete, renderProgressBar, formatTime, cleanupChildProcs, fs };
