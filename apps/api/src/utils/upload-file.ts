import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

export async function deleteUploadedFile(assetUrl: string | null | undefined) {
  if (!assetUrl) return;

  const uploadsMarker = '/uploads/';
  const markerIndex = assetUrl.indexOf(uploadsMarker);
  if (markerIndex < 0) return;

  const relativePath = assetUrl.slice(markerIndex + uploadsMarker.length);
  if (!relativePath || relativePath.includes('/') || relativePath.includes('\\')) {
    return;
  }

  const uploadRoot = path.resolve(env.uploadDir);
  const targetPath = path.resolve(uploadRoot, relativePath);
  if (path.dirname(targetPath) !== uploadRoot) return;

  try {
    await fs.unlink(targetPath);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT';
  }
}
