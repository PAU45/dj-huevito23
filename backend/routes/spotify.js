import express from 'express';
const router = express.Router();
import { getInfo } from '../controllers/spotifyController.js';

router.get('/info', getInfo);

export default router;
