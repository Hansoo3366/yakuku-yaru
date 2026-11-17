import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import type {
  PlayerRecord,
  PlayerRecordRole,
} from './kbo-player-record.client.js';

type PlayerRecordRow = RowDataPacket & {
  payload: PlayerRecord | string;
  synced_at: Date;
};

type FreeAgentPlayerKeyRow = RowDataPacket & {
  kbo_player_id: string;
  position: string;
};

/** FA 포지션으로 기록 페이지(타자·투수)를 고른다 */
export function toRecordRole(position: string): PlayerRecordRole {
  return position === '투수' ? 'pitcher' : 'hitter';
}

export async function findPlayerRecord(kboPlayerId: string) {
  const [rows] = await db.query<PlayerRecordRow[]>(
    `SELECT payload, synced_at
     FROM kbo_player_records
     WHERE kbo_player_id = ?
     LIMIT 1`,
    [kboPlayerId],
  );
  const row = rows[0];

  if (!row) return null;

  return {
    record:
      typeof row.payload === 'string'
        ? (JSON.parse(row.payload) as PlayerRecord)
        : row.payload,
    syncedAt: row.synced_at,
  };
}

export async function savePlayerRecord(
  kboPlayerId: string,
  record: PlayerRecord,
) {
  await db.execute(
    `INSERT INTO kbo_player_records (kbo_player_id, role, payload, synced_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       role = VALUES(role),
       payload = VALUES(payload),
       synced_at = CURRENT_TIMESTAMP`,
    [kboPlayerId, record.role, JSON.stringify(record)],
  );
}

/** FA 한 명의 KBO 선수 ID. 사진용 선수 연결이 안 됐으면 null */
export async function findFreeAgentPlayerKey(freeAgentId: number) {
  const [rows] = await db.query<FreeAgentPlayerKeyRow[]>(
    `SELECT p.kbo_player_id, fa.position
     FROM free_agents fa
     JOIN players p ON p.id = fa.player_id
     WHERE fa.id = ?
       AND p.kbo_player_id IS NOT NULL
     LIMIT 1`,
    [freeAgentId],
  );

  return rows[0]
    ? {
        kboPlayerId: rows[0].kbo_player_id,
        role: toRecordRole(rows[0].position),
      }
    : null;
}

/** 기록이 없거나 staleDays 일이 지난 FA. 비시즌에는 기록이 거의 바뀌지 않아 며칠에 한 번이면 된다. */
export async function listFreeAgentsNeedingRecord(
  faYear: number,
  staleDays: number,
) {
  const [rows] = await db.query<FreeAgentPlayerKeyRow[]>(
    `SELECT p.kbo_player_id, fa.position
     FROM free_agents fa
     JOIN players p ON p.id = fa.player_id
     LEFT JOIN kbo_player_records r ON r.kbo_player_id = p.kbo_player_id
     WHERE fa.fa_year = ?
       AND p.kbo_player_id IS NOT NULL
       AND (r.kbo_player_id IS NULL OR r.synced_at < CURRENT_TIMESTAMP - INTERVAL ? DAY)
     ORDER BY r.synced_at IS NOT NULL, r.synced_at`,
    [faYear, staleDays],
  );

  return rows.map((row) => ({
    kboPlayerId: row.kbo_player_id,
    role: toRecordRole(row.position),
  }));
}
