import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = process.env.JWT_SECRET?.trim() || 'change-me-in-local-env';
const proxySharedSecret = process.env.PROXY_SHARED_SECRET?.trim() || '';

if (nodeEnv === 'production' && jwtSecret === 'change-me-in-local-env') {
  throw new Error('JWT_SECRET must be set in production');
}

if (nodeEnv === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

if (nodeEnv === 'production' && !/^[a-f0-9]{64}$/i.test(proxySharedSecret)) {
  throw new Error(
    'PROXY_SHARED_SECRET must be a 64-character hexadecimal value in production',
  );
}

const appUrl =
  process.env.APP_URL?.trim() ||
  (process.env.APP_DOMAIN
    ? `https://${process.env.APP_DOMAIN}`
    : 'http://localhost:3000');

function normalizeOrigin(value: string) {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

const allowedOrigins = Array.from(
  new Set(
    [
      appUrl,
      ...(process.env.CORS_ORIGINS ?? '').split(','),
      ...(nodeEnv === 'production'
        ? []
        : ['http://localhost:3000', 'http://127.0.0.1:3000']),
    ]
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  ),
);

export const env = {
  nodeEnv,
  apiPort: Number(process.env.API_PORT ?? 4000),
  appUrl,
  allowedOrigins,
  proxySharedSecret,
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    rememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN ?? '30d',
  },
  uploadDir: path.resolve(apiRoot, process.env.UPLOAD_DIR ?? 'uploads'),
  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '',
  },
  database: {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    name: process.env.MYSQL_DATABASE ?? 'yakuku_yaru',
    user: process.env.MYSQL_USER ?? 'yakuku',
    password: process.env.MYSQL_PASSWORD ?? 'yakuku_password',
  },
  kboSync: {
    userAgent: process.env.KBO_USER_AGENT?.trim() || null,
    enabled:
      process.env.KBO_SYNC_ENABLED === 'true' ||
      (process.env.KBO_SYNC_ENABLED !== 'false' &&
        (process.env.NODE_ENV ?? 'development') === 'production'),
    /** 매일 01:05 KST — 주간 롤링(전 7일~후 14일) */
    weekCron:
      process.env.KBO_SYNC_WEEK_CRON ??
      process.env.KBO_SYNC_CRON ??
      '5 1 * * *',
    /** 매시간 — 오늘(KST) 경기만 */
    todayCron: process.env.KBO_SYNC_TODAY_CRON ?? '0 * * * *',
    /** 매일 01:30 KST — 저장된 DB 데이터로 시즌 예상 순위 생성 */
    projectionCron: process.env.KBO_PROJECTION_CRON ?? '30 1 * * *',
    projectionSimulations: Number(
      process.env.KBO_PROJECTION_SIMULATIONS ?? 100_000,
    ),
    onStart: process.env.KBO_SYNC_ON_START !== 'false',
    startDelayMs: Number(process.env.KBO_SYNC_START_DELAY_MS ?? 20_000),
  },
};
