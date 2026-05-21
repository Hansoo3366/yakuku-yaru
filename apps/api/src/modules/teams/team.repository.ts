import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type TeamRow = RowDataPacket & {
  id: number;
  name: string;
  short_name: string;
  primary_color: string | null;
  created_at: Date;
};

export type Team = {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string | null;
};

export function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    primaryColor: row.primary_color,
  };
}

export async function listTeams() {
  const [rows] = await db.query<TeamRow[]>(
    `SELECT id, name, short_name, primary_color, created_at
     FROM teams
     ORDER BY id ASC`,
  );

  return rows.map(toTeam);
}

export async function findTeamById(id: number) {
  const [rows] = await db.query<TeamRow[]>(
    `SELECT id, name, short_name, primary_color, created_at
     FROM teams
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? toTeam(rows[0]) : null;
}
