import axios from 'axios';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

// Intenta usar Spotify API con Client Credentials si están configuradas.
// Si no hay credenciales o falla, como fallback usa `yt-dlp` para obtener metadata y thumbnail.
export async function getInfo(req, res) {
  const query = (req.query.query || '').trim();

  // 1) Intentar Spotify (Client Credentials)
  const SPOT_ID = process.env.SPOTIFY_CLIENT_ID;
  const SPOT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  if (SPOT_ID && SPOT_SECRET && query) {
    try {
      // Obtener token
      const tokenRes = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: { username: SPOT_ID, password: SPOT_SECRET },
      });
      const token = tokenRes.data.access_token;
      // Buscar track
      const s = encodeURIComponent(query);
      const search = await axios.get(`https://api.spotify.com/v1/search?q=${s}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const items = search.data.tracks.items;
      if (items && items.length > 0) {
        const t = items[0];
        return res.json({
          source: 'spotify',
          title: t.name,
          artists: t.artists.map(a => a.name).join(', '),
          album: t.album.name,
          image: (t.album.images && t.album.images[0]) ? t.album.images[0].url : null,
          url: t.external_urls.spotify,
          duration_ms: t.duration_ms
        });
      }
    } catch (e) {
      console.warn('Spotify lookup failed, falling back to yt-dlp:', e.message);
    }
  }

  // 2) Fallback: usar yt-dlp (debe existir en la raíz como yt-dlp o yt-dlp.exe)
  if (!query) return res.status(400).json({ error: 'query required' });
  try {
    // Ejecutar yt-dlp para buscar la mejor coincidencia en YouTube
    // Usamos ytsearch1: para obtener 1 resultado
    const exe = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const pathExe = `${process.cwd().replace(/\\/g, '/')}/${exe}`;
    const safeQuery = query.replace(/"/g, '');
    const fullCmd = `${pathExe} "ytsearch1:${safeQuery}" --print-json --no-warnings --no-playlist`;
    const { stdout } = await execAsync(fullCmd, { timeout: 10000, maxBuffer: 10 * 1024 * 1024 });
    // yt-dlp puede imprimir varias líneas, tomamos la primera que sea JSON
    const firstLine = stdout.trim().split(/\r?\n/).find(l => l.startsWith('{'));
    if (firstLine) {
      const info = JSON.parse(firstLine);
      // Construir thumbnail para YouTube si no viene
      let image = info.thumbnail || null;
      if (!image && info.id && info.webpage_url && info.webpage_url.includes('youtube')) {
        image = `https://img.youtube.com/vi/${info.id}/maxresdefault.jpg`;
      }
      return res.json({
        source: 'youtube',
        title: info.title,
        artists: info.uploader || '',
        album: null,
        image,
        url: info.webpage_url,
        duration: info.duration
      });
    }
    return res.status(404).json({ error: 'no result' });
  } catch (e) {
    console.error('yt-dlp fallback failed:', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}

export default { getInfo };
