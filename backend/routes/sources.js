import express from 'express';
import { changeSource } from '../controllers/sourcesController.js';
const router = express.Router();

router.post('/change', changeSource);

export default router;
