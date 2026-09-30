import mysql from 'mysql2/promise';
import { env } from './env.js';

const KST_WALL_CLOCK_FIELDS = new Set([
  'game_date',
  'gameDate',
  'ticket_open_at',
  'ticketOpenAt',
]);

function parseKstWallClock(value: string | null) {
  if (value === null) return null;

  return new Date(`${value.replace(' ', 'T')}+09:00`);
}

export const db = mysql.createPool({
  charset: 'utf8mb4',
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  // MySQL stores audit timestamps (created_at, updated_at, etc.) in UTC.
  // KBO schedule columns are intentionally stored as Korean wall-clock time
  // and are handled separately below.
  timezone: 'Z',
  typeCast(field, next) {
    if (
      (field.type === 'DATETIME' || field.type === 'DATETIME2') &&
      KST_WALL_CLOCK_FIELDS.has(field.name)
    ) {
      return parseKstWallClock(field.string());
    }

    return next();
  },
  waitForConnections: true,
  connectionLimit: 10,
});

/** 연결 하나에서 트랜잭션으로 실행한다. 콜백이 던지면 롤백하고 에러를 그대로 다시 던진다. */
export async function withTransaction<T>(
  work: (connection: mysql.PoolConnection) => Promise<T>,
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkDatabaseConnection() {
  const [rows] = await db.query('SELECT 1 AS ok');

  return rows;
}
