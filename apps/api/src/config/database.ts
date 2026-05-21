import mysql from 'mysql2/promise';
import { env } from './env.js';

export const db = mysql.createPool({
  charset: 'utf8mb4',
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  waitForConnections: true,
  connectionLimit: 10,
});

export async function checkDatabaseConnection() {
  const [rows] = await db.query('SELECT 1 AS ok');

  return rows;
}
