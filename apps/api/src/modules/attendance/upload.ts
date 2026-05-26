import path from 'node:path';
import crypto from 'node:crypto';
import type { Request } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';

const ATTENDANCE_PHOTO_MAX_BYTES = 20 * 1024 * 1024;
const PROFILE_PHOTO_MAX_BYTES = 1024 * 1024;

const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: env.uploadDir,
  filename: (_req, file, callback) => {
    const extension =
      IMAGE_EXTENSION_BY_MIME_TYPE[file.mimetype] ||
      path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${extension}`;
    callback(null, filename);
  },
});

function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) {
  if (!IMAGE_EXTENSION_BY_MIME_TYPE[file.mimetype]) {
    callback(
      new Error(
        'JPG, PNG, WebP, HEIC, AVIF, GIF 이미지만 업로드할 수 있습니다.',
      ),
    );
    return;
  }

  callback(null, true);
}

export const attendancePhotoUpload = multer({
  storage,
  limits: {
    fileSize: ATTENDANCE_PHOTO_MAX_BYTES,
  },
  fileFilter: imageFileFilter,
});

export const profilePhotoUpload = multer({
  storage,
  limits: {
    fileSize: PROFILE_PHOTO_MAX_BYTES,
  },
  fileFilter: imageFileFilter,
});
