import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { RowDataPacket } from 'mysql2';
import { db } from '../config/database.js';
import { env } from '../config/env.js';

type AssetRow = RowDataPacket & { asset_url: string };

function getUploadFilename(assetUrl: string) {
  const marker = '/uploads/';
  const markerIndex = assetUrl.indexOf(marker);
  const filename =
    markerIndex >= 0 ? assetUrl.slice(markerIndex + marker.length) : '';

  return filename && !filename.includes('/') && !filename.includes('\\')
    ? filename
    : null;
}

const shouldDelete = process.argv.includes('--delete');
const [rows] = await db.query<AssetRow[]>(
  `SELECT profile_image_url AS asset_url
   FROM users
   WHERE profile_image_url IS NOT NULL
   UNION
   SELECT photo_url AS asset_url
   FROM attendance_records
   WHERE photo_url IS NOT NULL`,
);
const referencedFiles = new Set(
  rows
    .map((row) => getUploadFilename(row.asset_url))
    .filter((filename): filename is string => Boolean(filename)),
);
const entries = await fs.readdir(env.uploadDir, { withFileTypes: true });
const orphanFiles = entries.filter(
  (entry) => entry.isFile() && !referencedFiles.has(entry.name),
);

if (shouldDelete) {
  await Promise.all(
    orphanFiles.map((entry) => fs.unlink(path.join(env.uploadDir, entry.name))),
  );
}

console.log(
  `[uploads] ${orphanFiles.length} orphan file(s) ${
    shouldDelete ? 'deleted' : 'found (dry run)'
  }.`,
);

await db.end();
