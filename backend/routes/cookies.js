import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadCookies } from '../controllers/cookiesController.js';
import { uploadCookiesBase64 } from '../controllers/cookiesController.js';
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve('./'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

router.post('/upload', upload.single('cookies'), uploadCookies);
router.post('/upload-base64', uploadCookiesBase64);

export default router;
