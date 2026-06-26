import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import type { ParsedKboPlayer } from './parse-player-search.js';

const KBO_PLAYER_IMAGE_BASE_URL =
  'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/kbo';

function normalizeBirthDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match ? value : null;
}

type TeamIdRow = RowDataPacket & {
  id: number;
  short_name: string;
};

export async function listTeamIdsByShortName() {
  const [rows] = await db.query<TeamIdRow[]>(
    `SELECT id, short_name
     FROM teams
     ORDER BY id ASC`,
  );

  return new Map(rows.map((row) => [row.short_name, Number(row.id)]));
}

export async function upsertPlayer(
  player: ParsedKboPlayer,
  teamIds: Map<string, number>,
) {
  if (player.isRetired) {
    await db.execute(
      `UPDATE players
       SET is_active = FALSE
       WHERE kbo_player_id = ?`,
      [player.kboPlayerId],
    );

    return 'skipped' as const;
  }

  const teamId = teamIds.get(player.teamShortName);

  if (!teamId) {
    return 'skipped' as const;
  }

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO players (
       team_id,
       kbo_player_id,
       name,
       back_number,
       position,
       height_cm,
       weight_kg,
       birth_date,
       school,
       profile_image_url,
       is_active
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       team_id = VALUES(team_id),
       name = VALUES(name),
       back_number = VALUES(back_number),
       position = VALUES(position),
       height_cm = VALUES(height_cm),
       weight_kg = VALUES(weight_kg),
       birth_date = VALUES(birth_date),
       school = VALUES(school),
       profile_image_url = COALESCE(profile_image_url, VALUES(profile_image_url)),
       is_active = TRUE`,
    [
      teamId,
      player.kboPlayerId,
      player.name,
      player.backNumber,
      player.position,
      player.heightCm,
      player.weightKg,
      normalizeBirthDate(player.birthDate),
      player.school,
      `${KBO_PLAYER_IMAGE_BASE_URL}/${new Date().getFullYear()}/${player.kboPlayerId}.png`,
    ],
  );

  return result.affectedRows === 1 ? ('inserted' as const) : ('updated' as const);
}

export async function updatePlayerSeasonHittingStats(input: {
  kboPlayerId: string;
  seasonBattingAvg: number | null;
  seasonOps: number | null;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE players
     SET season_batting_avg = ?,
         season_ops = ?
     WHERE kbo_player_id = ?`,
    [input.seasonBattingAvg, input.seasonOps, input.kboPlayerId],
  );

  return result.affectedRows;
}
