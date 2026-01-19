import express from 'express';
import {
  updateStatus,
  getStatus,
  postCommand,
  getCommand,
  clearCommand,
} from '../controllers/playerController.js';

const router = express.Router();

router.post('/update', updateStatus); // bot -> update current track
router.get('/status', getStatus); // frontend -> get current track
router.post('/command', postCommand); // frontend -> send command (skip/pause/resume/stop)
router.get('/command', getCommand); // bot polls -> get command
router.delete('/command', clearCommand); // bot -> clear command after processing

export default router;
