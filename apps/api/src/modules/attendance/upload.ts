import path from 'node:path';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { Request } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';

const ATTENDANCE_PHOTO_MAX_BYTES = 12 * 1024 * 1024;
const PROFILE_PHOTO_MAX_BYTES = 1024 * 1024;
const USER_UPLOAD_QUOTA_BYTES = 100 * 1024 * 1024;

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
  filename: (req, file, callback) => {
    const extension =
      IMAGE_EXTENSION_BY_MIME_TYPE[file.mimetype] ||
      path.extname(file.originalname).toLowerCase();
    const userPrefix = req.user?.id ? `${req.user.id}-` : '';
    const filename = `${userPrefix}${crypto.randomUUID()}${extension}`;
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

function hasBytes(buffer: Buffer, expected: number[], offset = 0) {
  return expected.every((value, index) => buffer[offset + index] === value);
}

function hasAscii(buffer: Buffer, expected: string, offset = 0) {
  return (
    buffer.subarray(offset, offset + expected.length).toString('ascii') ===
    expected
  );
}

function matchesDeclaredImageType(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/jpeg') {
    return hasBytes(buffer, [0xff, 0xd8, 0xff]);
  }

  if (mimeType === 'image/png') {
    return hasBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  if (mimeType === 'image/gif') {
    return hasAscii(buffer, 'GIF87a') || hasAscii(buffer, 'GIF89a');
  }

  if (mimeType === 'image/webp') {
    return hasAscii(buffer, 'RIFF') && hasAscii(buffer, 'WEBP', 8);
  }

  if (
    mimeType === 'image/avif' ||
    mimeType === 'image/heic' ||
    mimeType === 'image/heif'
  ) {
    if (!hasAscii(buffer, 'ftyp', 4)) return false;
    const brand = buffer.subarray(8, 12).toString('ascii');
    const compatibleBrands = buffer.subarray(8).toString('ascii');
    const allowedBrands =
      mimeType === 'image/avif'
        ? ['avif', 'avis']
        : ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];

    return (
      allowedBrands.includes(brand) ||
      allowedBrands.some((item) => compatibleBrands.includes(item))
    );
  }

  return false;
}

export async function assertUploadedImageFile(file: Express.Multer.File) {
  const handle = await fs.open(file.path, 'r');

  try {
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);

    if (
      !matchesDeclaredImageType(buffer.subarray(0, bytesRead), file.mimetype)
    ) {
      throw new Error('지원하는 형식의 이미지만 업로드할 수 있습니다.');
    }
  } finally {
    await handle.close();
  }
}

export async function assertUserUploadQuota(
  userId: number,
  replacingAssetUrl?: string | null,
) {
  const prefix = `${userId}-`;
  const replacingFilename = replacingAssetUrl
    ? path.basename(replacingAssetUrl)
    : null;
  const entries = await fs.readdir(env.uploadDir, { withFileTypes: true });
  const ownedFiles = entries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name.startsWith(prefix) &&
      entry.name !== replacingFilename,
  );
  const sizes = await Promise.all(
    ownedFiles.map(async (entry) => {
      const stat = await fs.stat(path.join(env.uploadDir, entry.name));
      return stat.size;
    }),
  );
  const totalBytes = sizes.reduce((sum, size) => sum + size, 0);

  if (totalBytes > USER_UPLOAD_QUOTA_BYTES) {
    throw new Error('사용자별 이미지 저장 용량을 초과했습니다.');
  }
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
