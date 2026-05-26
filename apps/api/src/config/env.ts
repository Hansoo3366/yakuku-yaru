import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPort: Number(process.env.API_PORT ?? 4000),
  appUrl:
    process.env.APP_URL ??
    (process.env.APP_DOMAIN ? `https://${process.env.APP_DOMAIN}` : 'http://localhost:3000'),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
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
};
