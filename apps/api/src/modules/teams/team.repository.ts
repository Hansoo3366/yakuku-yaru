import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import {
  getTeamChampionshipHistory,
  type TeamChampionshipHistory,
} from './championship-history.js';

export type TeamRow = RowDataPacket & {
  id: number;
  name: string;
  short_name: string;
  primary_color: string | null;
  ticket_url: string | null;
  created_at: Date;
};

export type Team = {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string | null;
  ticketUrl: string | null;
  championshipHistory: TeamChampionshipHistory;
};

export function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    primaryColor: row.primary_color,
    ticketUrl: row.ticket_url,
    championshipHistory: getTeamChampionshipHistory(row.short_name),
  };
}

const baseColumns = `id, name, short_name, primary_color, ticket_url, created_at`;

export async function listTeams() {
  const [rows] = await db.query<TeamRow[]>(
    `SELECT ${baseColumns}
     FROM teams
     ORDER BY id ASC`,
  );

  return rows.map(toTeam);
}

export async function findTeamById(id: number) {
  const [rows] = await db.query<TeamRow[]>(
    `SELECT ${baseColumns}
     FROM teams
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? toTeam(rows[0]) : null;
}
