import fs from 'fs-extra';
import path from 'path';

const MSG_FILE = path.resolve('./backend/config/messages.json');

export async function saveMessages(req, res) {
  try {
    const payload = req.body;
    await fs.ensureDir(path.dirname(MSG_FILE));
    await fs.writeJson(MSG_FILE, payload, { spaces: 2 });
    return res.json({ message: 'Mensajes guardados.' });
  } catch (e) {
    console.error('saveMessages error', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}

export default { saveMessages };
