import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import { pickFreeAgentPlayer } from './parse-free-agent.js';

type FreeAgentRow = RowDataPacket & {
  id: number;
  fa_year: number;
  player_name: string;
  position: string;
  qualified_on: string;
  signed_on: string | null;
  contract_years: number | null;
  option_years: number | null;
  total_amount: number | null;
  signing_bonus: number | null;
  salary_amount: number | null;
  incentive_amount: number | null;
  note: string | null;
  profile_image_url: string | null;
  previous_team_id: number;
  previous_team_name: string;
  previous_team_short_name: string;
  new_team_id: number | null;
  new_team_name: string | null;
  new_team_short_name: string | null;
};

export type FreeAgentTeam = { id: number; name: string; shortName: string };

/** 금액은 만 원 단위. KBO 가 공개하지 않아 관리자가 채우기 전에는 비어 있다. */
export type FreeAgent = {
  id: number;
  faYear: number;
  playerName: string;
  position: string;
  profileImageUrl: string | null;
  previousTeam: FreeAgentTeam;
  newTeam: FreeAgentTeam | null;
  qualifiedOn: string;
  signedOn: string | null;
  contractYears: number | null;
  /** 2+1년의 1. 옵션이 없으면 null */
  optionYears: number | null;
  totalAmount: number | null;
  signingBonus: number | null;
  salaryAmount: number | null;
  incentiveAmount: number | null;
  note: string | null;
};

export type FreeAgentTermsInput = {
  newTeamId: number | null;
  signedOn: string | null;
  contractYears: number | null;
  optionYears: number | null;
  totalAmount: number | null;
  signingBonus: number | null;
  salaryAmount: number | null;
  incentiveAmount: number | null;
  note: string | null;
};

function toFreeAgent(row: FreeAgentRow): FreeAgent {
  return {
    id: Number(row.id),
    faYear: Number(row.fa_year),
    playerName: row.player_name,
    position: row.position,
    profileImageUrl: row.profile_image_url,
    previousTeam: {
      id: Number(row.previous_team_id),
      name: row.previous_team_name,
      shortName: row.previous_team_short_name,
    },
    newTeam:
      row.new_team_id && row.new_team_name && row.new_team_short_name
        ? {
            id: Number(row.new_team_id),
            name: row.new_team_name,
            shortName: row.new_team_short_name,
          }
        : null,
    qualifiedOn: row.qualified_on,
    signedOn: row.signed_on,
    contractYears: row.contract_years,
    optionYears: row.option_years,
    totalAmount: row.total_amount,
    signingBonus: row.signing_bonus,
    salaryAmount: row.salary_amount,
    incentiveAmount: row.incentive_amount,
    note: row.note,
  };
}

const selectColumns = `
  fa.id,
  fa.fa_year,
  fa.player_name,
  fa.position,
  DATE_FORMAT(fa.qualified_on, '%Y-%m-%d') AS qualified_on,
  DATE_FORMAT(fa.signed_on, '%Y-%m-%d') AS signed_on,
  fa.contract_years,
  fa.option_years,
  fa.total_amount,
  fa.signing_bonus,
  fa.salary_amount,
  fa.incentive_amount,
  fa.note,
  p.profile_image_url,
  fa.previous_team_id,
  pt.name AS previous_team_name,
  pt.short_name AS previous_team_short_name,
  fa.new_team_id,
  nt.name AS new_team_name,
  nt.short_name AS new_team_short_name`;

const fromClause = `
  FROM free_agents fa
  JOIN teams pt ON pt.id = fa.previous_team_id
  LEFT JOIN teams nt ON nt.id = fa.new_team_id
  LEFT JOIN players p ON p.id = fa.player_id`;

/** 가장 최근 스토브리그 연도. 명단을 한 번도 받지 않았으면 null. */
export async function findLatestFreeAgentYear() {
  const [rows] = await db.query<(RowDataPacket & { fa_year: number | null })[]>(
    'SELECT MAX(fa_year) AS fa_year FROM free_agents',
  );

  return rows[0]?.fa_year ? Number(rows[0].fa_year) : null;
}

export async function listFreeAgentYears() {
  const [rows] = await db.query<(RowDataPacket & { fa_year: number })[]>(
    'SELECT DISTINCT fa_year FROM free_agents ORDER BY fa_year DESC',
  );

  return rows.map((row) => Number(row.fa_year));
}

export async function listFreeAgents(faYear: number) {
  const [rows] = await db.query<FreeAgentRow[]>(
    `SELECT ${selectColumns}
     ${fromClause}
     WHERE fa.fa_year = ?
     ORDER BY fa.previous_team_id ASC, fa.player_name ASC`,
    [faYear],
  );

  return rows.map(toFreeAgent);
}

export async function findFreeAgentById(id: number) {
  const [rows] = await db.query<FreeAgentRow[]>(
    `SELECT ${selectColumns}
     ${fromClause}
     WHERE fa.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? toFreeAgent(rows[0]) : null;
}

export async function countFreeAgents(faYear: number) {
  const [rows] = await db.query<(RowDataPacket & { count: number })[]>(
    'SELECT COUNT(*) AS count FROM free_agents WHERE fa_year = ?',
    [faYear],
  );

  return Number(rows[0]?.count ?? 0);
}

/** 자격 공시 명단 반영. 계약 정보와 관리자가 채운 값은 건드리지 않는다. */
export async function upsertQualifiedFreeAgent(input: {
  faYear: number;
  playerName: string;
  position: string;
  previousTeamId: number;
  qualifiedOn: string;
}) {
  await db.execute(
    `INSERT INTO free_agents (fa_year, player_name, position, previous_team_id, qualified_on)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE qualified_on = VALUES(qualified_on)`,
    [
      input.faYear,
      input.playerName,
      input.position,
      input.previousTeamId,
      input.qualifiedOn,
    ],
  );
}

/** KBO 가 공시한 계약 팀·날짜. 관리자가 미리 넣었더라도 KBO 공시를 따른다. */
export async function applyFreeAgentContract(input: {
  faYear: number;
  playerName: string;
  position: string;
  newTeamId: number;
  signedOn: string;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE free_agents
     SET new_team_id = ?, signed_on = ?
     WHERE fa_year = ?
       AND player_name = ?
       AND position = ?
       AND qualified_on <= ?`,
    [
      input.newTeamId,
      input.signedOn,
      input.faYear,
      input.playerName,
      input.position,
      input.signedOn,
    ],
  );

  return result.affectedRows;
}

type UnlinkedFreeAgentRow = RowDataPacket & {
  id: number;
  player_name: string;
  position: string;
  previous_team_id: number;
  new_team_id: number | null;
};

type PlayerCandidateRow = RowDataPacket & {
  id: number;
  name: string;
  position: string | null;
  team_id: number;
  is_active: number;
};

/**
 * 사진용 선수 연결. 동명이인이 있어 포지션 그룹이 맞고, 원소속·계약 팀이 같거나
 * 그 이름·포지션의 선수가 한 명뿐일 때만 잇는다.
 * 선수 명단이 늦게 갱신될 수 있어 아직 못 이은 사람은 동기화 때마다 다시 찾는다.
 */
export async function linkFreeAgentPlayers(faYear: number) {
  const [freeAgents] = await db.query<UnlinkedFreeAgentRow[]>(
    `SELECT id, player_name, position, previous_team_id, new_team_id
     FROM free_agents
     WHERE fa_year = ?
       AND player_id IS NULL`,
    [faYear],
  );

  if (!freeAgents.length) {
    return 0;
  }

  const [players] = await db.query<PlayerCandidateRow[]>(
    `SELECT id, name, position, team_id, is_active
     FROM players
     WHERE name IN (?)`,
    [[...new Set(freeAgents.map((row) => row.player_name))]],
  );
  let linked = 0;

  for (const freeAgent of freeAgents) {
    const playerId = pickFreeAgentPlayer(
      {
        position: freeAgent.position,
        teamIds: [freeAgent.previous_team_id, freeAgent.new_team_id],
      },
      players
        .filter((player) => player.name === freeAgent.player_name)
        .map((player) => ({
          id: Number(player.id),
          position: player.position,
          teamId: Number(player.team_id),
          isActive: Boolean(player.is_active),
        })),
    );

    if (playerId) {
      await db.execute('UPDATE free_agents SET player_id = ? WHERE id = ?', [
        playerId,
        freeAgent.id,
      ]);
      linked += 1;
    }
  }

  return linked;
}

export async function updateFreeAgentTerms(
  id: number,
  input: FreeAgentTermsInput,
) {
  await db.execute(
    `UPDATE free_agents
     SET new_team_id = ?,
         signed_on = ?,
         contract_years = ?,
         option_years = ?,
         total_amount = ?,
         signing_bonus = ?,
         salary_amount = ?,
         incentive_amount = ?,
         note = ?
     WHERE id = ?`,
    [
      input.newTeamId,
      input.signedOn,
      input.contractYears,
      input.optionYears,
      input.totalAmount,
      input.signingBonus,
      input.salaryAmount,
      input.incentiveAmount,
      input.note,
      id,
    ],
  );
}
