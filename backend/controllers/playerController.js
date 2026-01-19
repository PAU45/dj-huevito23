import fs from 'fs-extra';
import path from 'path';

const PLAYER_FILE = path.resolve('./backend/config/player.json');
const COMMAND_FILE = path.resolve('./backend/config/command.json');

export async function updateStatus(req, res) {
  try {
    const payload = req.body;
    await fs.ensureDir(path.dirname(PLAYER_FILE));
    await fs.writeJson(PLAYER_FILE, payload, { spaces: 2 });
    return res.json({ message: 'player updated' });
  } catch (e) {
    console.error('updateStatus error', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}

export async function getStatus(req, res) {
  try {
    if (!(await fs.pathExists(PLAYER_FILE))) return res.json({});
    const data = await fs.readJson(PLAYER_FILE);
    return res.json(data);
  } catch (e) {
    console.error('getStatus error', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}

export async function postCommand(req, res) {
  try {
    const payload = req.body;
    await fs.ensureDir(path.dirname(COMMAND_FILE));
    await fs.writeJson(COMMAND_FILE, payload, { spaces: 2 });
    return res.json({ message: 'command saved' });
  } catch (e) {
    console.error('postCommand error', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}

export async function getCommand(req, res) {
  try {
    if (!(await fs.pathExists(COMMAND_FILE))) return res.json({});
    const data = await fs.readJson(COMMAND_FILE);
    return res.json(data);
  } catch (e) {
    console.error('getCommand error', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}

export async function clearCommand(req, res) {
  try {
    if (await fs.pathExists(COMMAND_FILE)) await fs.remove(COMMAND_FILE);
    return res.json({ message: 'command cleared' });
  } catch (e) {
    console.error('clearCommand error', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}

export default { updateStatus, getStatus, postCommand, getCommand, clearCommand };
