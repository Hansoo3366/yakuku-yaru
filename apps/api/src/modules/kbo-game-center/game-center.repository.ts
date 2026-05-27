import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import { KBO_EXTERNAL_SOURCE } from '../kbo-schedule/kbo-game.repository.js';
import type { KboLineupPlayer, KboPitcherAnalysis } from './kbo-game-center.client.js';

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

export async function upsertPitcherFromGameCenter(input: {
  teamId: number;
  kboPlayerId: number;
  name: string;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO players (
       team_id,
       kbo_player_id,
       name,
       position,
       profile_image_url,
       is_active
     )
     VALUES (?, ?, ?, '투수', ?, TRUE)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
       team_id = VALUES(team_id),
       name = VALUES(name),
       position = COALESCE(position, VALUES(position)),
       profile_image_url = COALESCE(profile_image_url, VALUES(profile_image_url)),
       is_active = TRUE`,
    [
      input.teamId,
      String(input.kboPlayerId),
      input.name.trim(),
      getKboPlayerImageUrl(input.kboPlayerId),
    ],
  );

  return Number(result.insertId);
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
}) {
  const [rows] = await db.query<IdRow[]>(
    `SELECT id
     FROM players
     WHERE team_id = ?
       AND name = ?
     ORDER BY is_active DESC, id DESC
     LIMIT 1`,
    [input.teamId, input.name],
  );

  return rows[0]?.id ?? null;
}

async function createLineupPlayer(input: {
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

async function findOrCreateLineupPlayer(input: {
  teamId: number;
  player: KboLineupPlayer;
}) {
  const existingId = await findPlayerIdByTeamAndName({
    teamId: input.teamId,
    name: input.player.name,
  });

  if (existingId) {
    return existingId;
  }

  return createLineupPlayer({
    teamId: input.teamId,
    name: input.player.name,
    position: input.player.fieldPosition,
  });
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
    const playerId = await findOrCreateLineupPlayer({
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
