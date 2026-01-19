import path from 'path';
import fs from 'fs-extra';

const COOKIES_DEST = path.resolve('./youtube_cookies.txt');

export async function uploadCookies(req, res) {
  // multer ya guarda el archivo con el nombre correcto
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' });
    // opcional: mover a carpeta backend/config si quieres
    await fs.move(req.file.path, COOKIES_DEST, { overwrite: true });
    return res.json({ message: 'Cookies subidas correctamente.' });
  } catch (e) {
    console.error('uploadCookies error', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}

export async function uploadCookiesBase64(req, res) {
  try {
    const b64 = req.body && req.body.b64;
    if (!b64) return res.status(400).json({ error: 'no b64' });
    const buf = Buffer.from(b64, 'base64');
    await fs.outputFile(COOKIES_DEST, buf);
    return res.json({ message: 'Cookies subidas correctamente (base64).' });
  } catch (e) {
    console.error('uploadCookiesBase64 error', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'failed' });
  }
}

export default { uploadCookies };
