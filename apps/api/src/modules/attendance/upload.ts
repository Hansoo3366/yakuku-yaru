import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../../config/env.js';

const storage = multer.diskStorage({
  destination: env.uploadDir,
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    const filename = `${crypto.randomUUID()}${extension}`;
    callback(null, filename);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('이미지 파일만 업로드할 수 있습니다.'));
      return;
    }

    callback(null, true);
  },
});
