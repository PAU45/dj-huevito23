import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

const APP_YML = path.resolve('./application.yml');
const SOURCE_FILE = path.resolve('./backend/config/source.json');

export async function changeSource(req, res) {
  const { source } = req.body;
  if (!source) return res.status(400).json({ error: 'source required' });
  try {
    await fs.ensureDir(path.dirname(SOURCE_FILE));
    await fs.writeJson(SOURCE_FILE, { source }, { spaces: 2 });
    if (await fs.pathExists(APP_YML)) {
      const raw = await fs.readFile(APP_YML, 'utf8');
      const doc = yaml.load(raw) || {};
      if (!doc.lavalink) doc.lavalink = {};
      if (!doc.lavalink.server) doc.lavalink.server = {};
      if (!doc.lavalink.server.sources) doc.lavalink.server.sources = {};
      doc.lavalink.server.sources.youtube = (source === 'youtube');
      if (!doc.lavalink.server.search) doc.lavalink.server.search = {};
      doc.lavalink.server.search.default = (source === 'youtube') ? 'youtube:search' : `${source}:search`;
      await fs.writeFile(APP_YML, yaml.dump(doc), 'utf8');
    }
    return res.json({ message: `Fuente cambiada a ${source}` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'failed' });
  }
}

export default { changeSource };
