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

if (nodeEnv === 'production' && jwtSecret === 'change-me-in-local-env') {
  throw new Error('JWT_SECRET must be set in production');
}

if (nodeEnv === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
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

const sentryDsn = process.env.SENTRY_DSN?.trim() || null;

export const env = {
  nodeEnv,
  /** Sentry 오류 추적. DSN 이 없으면 꺼진다. */
  sentry: {
    dsn: sentryDsn,
    environment: process.env.SENTRY_ENVIRONMENT?.trim() || nodeEnv,
    /** 배포 이미지의 git sha. 없으면 Sentry 가 release 없이 기록한다. */
    release: process.env.SENTRY_RELEASE?.trim() || null,
  },
  apiPort: Number(process.env.API_PORT ?? 4000),
  appUrl,
  allowedOrigins,
  jwt: {
    secret: jwtSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    refreshRememberExpiresIn:
      process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN ?? '30d',
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
  errorAlert: {
    /**
     * 오류 메일 알림. 기본값: production 이면서 Sentry 를 쓰지 않을 때만 켬.
     * Sentry DSN 이 있으면 오류는 Sentry 로 가고, 메일은 ERROR_ALERT_ENABLED=true 로 따로 켜야 한다.
     */
    enabled:
      process.env.ERROR_ALERT_ENABLED === 'true' ||
      (process.env.ERROR_ALERT_ENABLED !== 'false' &&
        nodeEnv === 'production' &&
        !sentryDsn),
    /** 쉼표로 여러 명 지정 가능. 비우면 SMTP_USER로 발송 */
    recipients: (process.env.ERROR_ALERT_EMAIL || process.env.SMTP_USER || '')
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean),
    /** 같은 오류는 이 시간 동안 1번만 메일 발송 (기본 10분) */
    cooldownMs: Number(process.env.ERROR_ALERT_COOLDOWN_MS ?? 10 * 60 * 1000),
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
