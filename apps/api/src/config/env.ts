import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPort: Number(process.env.API_PORT ?? 4000),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  database: {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    name: process.env.MYSQL_DATABASE ?? 'yakuku_yaru',
    user: process.env.MYSQL_USER ?? 'yakuku',
    password: process.env.MYSQL_PASSWORD ?? 'yakuku_password',
  },
};
