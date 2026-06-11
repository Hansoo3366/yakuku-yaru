import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import { KBO_EXTERNAL_SOURCE } from '../kbo-schedule/kbo-game.repository.js';
import type {
  KboGameCenterGame,
  KboLineupPlayer,
  KboPitcherAnalysis,
} from './kbo-game-center.client.js';

const KBO_TEAM_CODE_TO_SHORT_NAME: Record<string, string> = {
  SS: '삼성',
  LG: 'LG',
  KT: 'KT',
  HT: 'KIA',
  HH: '한화',
  SK: 'SSG',
  OB: '두산',
  NC: 'NC',
  LT: '롯데',
  WO: '키움',
};

type DateRow = RowDataPacket & {
  ymd: string;
};

type IdRow = RowDataPacket & {
  id: number;
};

type GameIdExternalRow = RowDataPacket & {
  id: number;
  external_id: string;
};

type TeamIdRow = RowDataPacket & {
  id: number;
  short_name: string;
};

export async function listKboGameCenterTargetDates(input: {
  from: string;
  to: string;
}) {
  const [rows] = await db.query<DateRow[]>(
    `SELECT DISTINCT DATE_FORMAT(game_date, '%Y%m%d') AS ymd
     FROM games
     WHERE external_source = ?
       AND game_date >= ?
       AND game_date < ?
     ORDER BY ymd ASC`,
    [KBO_EXTERNAL_SOURCE, input.from, input.to],
  );

  return rows.map((row) => row.ymd);
}

export async function findKboGameIdByExternalId(externalId: string) {
  const [rows] = await db.query<IdRow[]>(
    `SELECT id
     FROM games
     WHERE external_source = ?
       AND external_id = ?
     LIMIT 1`,
    [KBO_EXTERNAL_SOURCE, externalId],
  );

  return rows[0]?.id ?? null;
}

export function formatGameCenterGameDate(
  gameDateYmd: string,
  gameTime: string | null | undefined,
) {
  if (!/^\d{8}$/.test(gameDateYmd)) {
    return null;
  }

  const year = gameDateYmd.slice(0, 4);
  const month = gameDateYmd.slice(4, 6);
  const day = gameDateYmd.slice(6, 8);
  const timeMatch = gameTime?.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!timeMatch) {
    return null;
  }

  const hour = String(timeMatch[1]).padStart(2, '0');
  const minute = timeMatch[2];

  return `${year}-${month}-${day} ${hour}:${minute}:00`;
}

export async function findKboGameIdForGameCenterGame(
  game: Pick<KboGameCenterGame, 'G_ID' | 'G_DT' | 'G_TM' | 'AWAY_ID' | 'HOME_ID'>,
  teamIdsByCode: Map<string, number>,
) {
  const matchedByExternalId = await findKboGameIdByExternalId(game.G_ID);

  if (matchedByExternalId) {
    return matchedByExternalId;
  }

  const awayTeamId = teamIdsByCode.get(game.AWAY_ID);
  const homeTeamId = teamIdsByCode.get(game.HOME_ID);

  if (!awayTeamId || !homeTeamId) {
    return null;
  }

  const gameDate = formatGameCenterGameDate(game.G_DT, game.G_TM);

  if (!/^\d{8}$/.test(game.G_DT)) {
    return null;
  }

  const [rows] = await db.query<GameIdExternalRow[]>(
    gameDate
      ? `SELECT id, external_id
         FROM games
         WHERE external_source = ?
           AND game_date = ?
           AND home_team_id = ?
           AND away_team_id = ?
         LIMIT 1`
      : `SELECT id, external_id
         FROM games
         WHERE external_source = ?
           AND DATE_FORMAT(game_date, '%Y%m%d') = ?
           AND home_team_id = ?
           AND away_team_id = ?
         LIMIT 1`,
    gameDate
      ? [KBO_EXTERNAL_SOURCE, gameDate, homeTeamId, awayTeamId]
      : [KBO_EXTERNAL_SOURCE, game.G_DT, homeTeamId, awayTeamId],
  );

  const matched = rows[0];

  if (!matched) {
    return null;
  }

  if (matched.external_id !== game.G_ID) {
    await db.execute(
      `UPDATE games
       SET external_id = ?
       WHERE id = ?`,
      [game.G_ID, matched.id],
    );
  }

  return matched.id;
}

export async function listKboTeamIdsByCode() {
  const [rows] = await db.query<TeamIdRow[]>(
    `SELECT id, short_name
     FROM teams
     ORDER BY id ASC`,
  );
  const teamIdsByShortName = new Map(
    rows.map((row) => [row.short_name, Number(row.id)]),
  );
  const teamIdsByCode = new Map<string, number>();

  for (const [code, shortName] of Object.entries(KBO_TEAM_CODE_TO_SHORT_NAME)) {
    const teamId = teamIdsByShortName.get(shortName);

    if (teamId) {
      teamIdsByCode.set(code, teamId);
    }
  }

  return teamIdsByCode;
}

export async function upsertKboPlayer(input: {
  teamId: number;
  kboPlayerId: string | number;
  name: string;
  position?: string | null;
  profileImageUrl?: string | null;
}) {
  const kboPlayerId = String(input.kboPlayerId);
  const profileImageUrl =
    input.profileImageUrl ?? getKboPlayerImageUrl(Number(kboPlayerId));

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO players (
       team_id,
       kbo_player_id,
       name,
       position,
       profile_image_url,
       is_active
     )
     VALUES (?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
       team_id = VALUES(team_id),
       name = VALUES(name),
       position = COALESCE(VALUES(position), position),
       profile_image_url = COALESCE(VALUES(profile_image_url), profile_image_url),
       is_active = TRUE`,
    [
      input.teamId,
      kboPlayerId,
      input.name.trim(),
      input.position ?? null,
      profileImageUrl,
    ],
  );

  return Number(result.insertId);
}

export async function upsertPitcherFromGameCenter(input: {
  teamId: number;
  kboPlayerId: number;
  name: string;
}) {
  return upsertKboPlayer({
    teamId: input.teamId,
    kboPlayerId: input.kboPlayerId,
    name: input.name,
    position: '투수',
  });
}

function getKboPlayerImageUrl(kboPlayerId: number) {
  return `https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/kbo/${new Date().getFullYear()}/${kboPlayerId}.png`;
}

function splitThrowBat(value: string | null) {
  if (!value) {
    return { throwsHand: null, batsHand: null };
  }

  const throwMatch = value.match(/[좌우]투/);
  const batMatch = value.match(/[좌우양]타/);

  return {
    throwsHand: throwMatch?.[0] ?? null,
    batsHand: batMatch?.[0] ?? null,
  };
}

export async function upsertGameStartingPitcher(input: {
  gameId: number;
  teamId: number;
  playerId: number;
  isConfirmed: boolean;
}) {
  await db.execute(
    `INSERT INTO game_starting_pitchers (
       game_id,
       team_id,
       player_id,
       is_confirmed,
       source,
       synced_at
     )
     VALUES (?, ?, ?, ?, 'kbo-game-center', NOW())
     ON DUPLICATE KEY UPDATE
       player_id = VALUES(player_id),
       is_confirmed = VALUES(is_confirmed),
       source = VALUES(source),
       synced_at = VALUES(synced_at)`,
    [input.gameId, input.teamId, input.playerId, input.isConfirmed],
  );
}

export async function updatePitcherAnalysis(input: {
  gameId: number;
  teamId: number;
  playerId: number;
  analysis: KboPitcherAnalysis;
}) {
  const { throwsHand, batsHand } = splitThrowBat(input.analysis.throwBat);

  await db.execute(
    `UPDATE players
     SET profile_image_url = COALESCE(?, profile_image_url),
         throws_hand = COALESCE(?, throws_hand),
         bats_hand = COALESCE(?, bats_hand)
     WHERE id = ?`,
    [
      input.analysis.profileImageUrl,
      throwsHand,
      batsHand,
      input.playerId,
    ],
  );

  await db.execute(
    `UPDATE game_starting_pitchers
     SET era = ?,
         war = ?,
         games = ?,
         starter_average_innings = ?,
         quality_starts = ?,
         whip = ?,
         season_record = ?,
         synced_at = NOW()
     WHERE game_id = ?
       AND team_id = ?`,
    [
      input.analysis.era,
      input.analysis.war,
      input.analysis.games,
      input.analysis.starterAverageInnings,
      input.analysis.qualityStarts,
      input.analysis.whip,
      input.analysis.seasonRecord,
      input.gameId,
      input.teamId,
    ],
  );
}

async function findPlayerIdByTeamAndName(input: {
  teamId: number;
  name: string;
  position: string | null;
}) {
  const [rows] = await db.query<IdRow[]>(
    `SELECT id
     FROM players
     WHERE team_id = ?
       AND name = ?
       AND kbo_player_id IS NULL
       AND (position <=> ?)
     ORDER BY
       is_active DESC,
       id ASC
     LIMIT 1`,
    [input.teamId, input.name, input.position],
  );

  return rows[0]?.id ?? null;
}

async function createLineupPlayerWithoutKboId(input: {
  teamId: number;
  name: string;
  position: string | null;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO players (
       team_id,
       name,
       position,
       is_active
     )
     VALUES (?, ?, ?, TRUE)`,
    [input.teamId, input.name, input.position],
  );

  return Number(result.insertId);
}

async function upsertLineupPlayer(input: {
  teamId: number;
  player: KboLineupPlayer;
}) {
  if (input.player.kboPlayerId) {
    return upsertKboPlayer({
      teamId: input.teamId,
      kboPlayerId: input.player.kboPlayerId,
      name: input.player.name,
      position: input.player.fieldPosition,
      profileImageUrl: input.player.profileImageUrl,
    });
  }

  const existingId = await findPlayerIdByTeamAndName({
    teamId: input.teamId,
    name: input.player.name,
    position: input.player.fieldPosition,
  });

  if (existingId) {
    await db.execute(
      `UPDATE players
       SET position = COALESCE(?, position),
           profile_image_url = COALESCE(?, profile_image_url)
       WHERE id = ?`,
      [
        input.player.fieldPosition,
        input.player.profileImageUrl,
        existingId,
      ],
    );

    return existingId;
  }

  return createLineupPlayerWithoutKboId({
    teamId: input.teamId,
    name: input.player.name,
    position: input.player.fieldPosition,
  });
}

export async function updateGameLineupConfirmed(input: {
  gameId: number;
  isConfirmed: boolean;
}) {
  await db.execute(
    `UPDATE games
     SET lineup_confirmed = ?
     WHERE id = ?`,
    [input.isConfirmed, input.gameId],
  );
}

export async function replaceGameLineup(input: {
  gameId: number;
  teamId: number;
  players: KboLineupPlayer[];
}) {
  if (input.players.length === 0) {
    return 0;
  }

  await db.execute(
    `DELETE FROM game_lineups
     WHERE game_id = ?
       AND team_id = ?`,
    [input.gameId, input.teamId],
  );

  for (const player of input.players) {
    const playerId = await upsertLineupPlayer({
      teamId: input.teamId,
      player,
    });

    await db.execute(
      `INSERT INTO game_lineups (
         game_id,
         team_id,
         player_id,
         batting_order,
         field_position,
         war,
         is_starter,
         source,
         synced_at
       )
       VALUES (?, ?, ?, ?, ?, ?, TRUE, 'kbo-game-center', NOW())`,
      [
        input.gameId,
        input.teamId,
        playerId,
        player.battingOrder,
        player.fieldPosition,
        player.war,
      ],
    );
  }

  return input.players.length;
}
