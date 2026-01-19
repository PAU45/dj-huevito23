import express from 'express';
import { saveMessages } from '../controllers/messagesController.js';
const router = express.Router();

router.post('/custom', saveMessages);

export default router;
