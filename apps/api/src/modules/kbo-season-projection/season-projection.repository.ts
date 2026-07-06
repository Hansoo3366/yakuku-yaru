import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import {
  getTeamChampionshipHistory,
  type TeamChampionshipHistory,
} from '../teams/championship-history.js';
import {
  SEASON_PROJECTION_MODEL_VERSION,
  type PostseasonProjectionRow,
  type SeasonProjection,
  type SeasonProjectionRow,
} from './season-projection-calculator.js';

type ProjectionMetaRow = RowDataPacket & {
  id: number;
  season_year: number;
  rank_date: string;
  series_id: string;
  model_version: string;
  simulations: number;
  min_games: number;
  remaining_games: number;
  projected_games: number;
  generated_at: Date | string;
};

function formatDate(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function formatDateTime(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

export function emptySeasonProjection(input: {
  seasonYear: number;
  seriesId?: string;
  modelVersion?: string;
}) {
  return {
    seasonYear: input.seasonYear,
    rankDate: null,
    seriesId: input.seriesId ?? '0',
    modelVersion: input.modelVersion ?? SEASON_PROJECTION_MODEL_VERSION,
    generatedAt: null,
    status: 'regularSeason' as const,
    rows: [],
    postseasonRows: [],
    simulations: 0,
    minGames: 40,
    remainingGames: 0,
    projectedGames: 144,
  };
}

export async function replaceSeasonProjection(projection: SeasonProjection) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [snapshotResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO season_projection_snapshots (
         season_year,
         rank_date,
         series_id,
         model_version,
         simulations,
         min_games,
         remaining_games,
         projected_games,
         generated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         simulations = VALUES(simulations),
         min_games = VALUES(min_games),
         remaining_games = VALUES(remaining_games),
         projected_games = VALUES(projected_games),
         generated_at = VALUES(generated_at),
         id = LAST_INSERT_ID(id)`,
      [
        projection.seasonYear,
        projection.rankDate,
        projection.seriesId,
        projection.modelVersion,
        projection.simulations,
        projection.minGames,
        projection.remainingGames,
        projection.projectedGames,
        new Date(projection.generatedAt),
      ],
    );
    const snapshotId = Number(snapshotResult.insertId);

    await connection.execute(
      `DELETE FROM season_projection_rows
       WHERE snapshot_id = ?`,
      [snapshotId],
    );

    for (const row of projection.rows) {
      await connection.execute(
        `INSERT INTO season_projection_rows (
           snapshot_id,
           team_id,
           playoff_probability,
           average_rank,
           average_wins,
           average_draws,
           average_losses,
           expected_win_rate,
           current_win_rate,
           pythagorean_win_rate,
           schedule_adjusted_win_rate,
           current_rank
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          snapshotId,
          row.teamId,
          row.playoffProbability,
          row.averageRank,
          row.averageWins,
          row.averageDraws,
          row.averageLosses,
          row.expectedWinRate,
          row.currentWinRate,
          row.pythagoreanWinRate,
          row.scheduleAdjustedWinRate,
          row.currentRank,
        ],
      );
    }

    await connection.execute(
      `DELETE FROM season_postseason_projection_rows
       WHERE snapshot_id = ?`,
      [snapshotId],
    );

    for (const row of projection.postseasonRows) {
      await connection.execute(
        `INSERT INTO season_postseason_projection_rows (
           snapshot_id,
           team_id,
           seed,
           average_final_rank,
           korean_series_probability,
           championship_probability,
           pythagorean_win_rate,
           projected_win_rate
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          snapshotId,
          row.teamId,
          row.seed,
          row.averageFinalRank,
          row.koreanSeriesProbability,
          row.championshipProbability,
          row.pythagoreanWinRate,
          row.projectedWinRate,
        ],
      );
    }

    await connection.commit();

    return snapshotId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getLatestSeasonProjection(
  seasonYear: number,
  seriesId = '0',
  modelVersion = SEASON_PROJECTION_MODEL_VERSION,
) {
  const [metas] = await db.query<ProjectionMetaRow[]>(
    `SELECT
       id,
       season_year,
       DATE_FORMAT(rank_date, '%Y-%m-%d') AS rank_date,
       series_id,
       model_version,
       simulations,
       min_games,
       remaining_games,
       projected_games,
       generated_at
     FROM season_projection_snapshots
     WHERE season_year = ?
       AND series_id = ?
       AND model_version = ?
     ORDER BY rank_date DESC, generated_at DESC
     LIMIT 1`,
    [seasonYear, seriesId, modelVersion],
  );
  const meta = metas[0];

  if (!meta) {
    return null;
  }

  const [rows] = await db.query<
    (RowDataPacket & {
      team_id: number;
      team_short_name: string;
      team_name: string;
      playoff_probability: string | number;
      average_rank: string | number;
      average_wins: string | number;
      average_draws: string | number;
      average_losses: string | number;
      expected_win_rate: string | number;
      current_win_rate: string | number;
      pythagorean_win_rate: string | number;
      schedule_adjusted_win_rate: string | number;
      current_rank: number;
    })[]
  >(
    `SELECT
       spr.team_id,
       t.short_name AS team_short_name,
       t.name AS team_name,
       spr.playoff_probability,
       spr.average_rank,
       spr.average_wins,
       spr.average_draws,
       spr.average_losses,
       spr.expected_win_rate,
       spr.current_win_rate,
       spr.pythagorean_win_rate,
       spr.schedule_adjusted_win_rate,
       spr.current_rank
     FROM season_projection_rows spr
     INNER JOIN teams t ON t.id = spr.team_id
     WHERE spr.snapshot_id = ?
     ORDER BY spr.average_rank ASC, spr.expected_win_rate DESC`,
    [meta.id],
  );
  const [postseasonRows] = await db.query<
    (RowDataPacket & {
      team_id: number;
      team_short_name: string;
      team_name: string;
      seed: number;
      average_final_rank: string | number;
      korean_series_probability: string | number;
      championship_probability: string | number;
      pythagorean_win_rate: string | number;
      projected_win_rate: string | number;
    })[]
  >(
    `SELECT
       sppr.team_id,
       t.short_name AS team_short_name,
       t.name AS team_name,
       sppr.seed,
       sppr.average_final_rank,
       sppr.korean_series_probability,
       sppr.championship_probability,
       sppr.pythagorean_win_rate,
       sppr.projected_win_rate
     FROM season_postseason_projection_rows sppr
     INNER JOIN teams t ON t.id = sppr.team_id
     WHERE sppr.snapshot_id = ?
     ORDER BY sppr.average_final_rank ASC, sppr.championship_probability DESC`,
    [meta.id],
  );

  return {
    seasonYear: Number(meta.season_year),
    rankDate: formatDate(meta.rank_date),
    seriesId: meta.series_id,
    modelVersion: meta.model_version,
    generatedAt: formatDateTime(meta.generated_at),
    status: postseasonRows.length ? 'postseason' : 'regularSeason',
    rows: rows.map(
      (row): SeasonProjectionRow => ({
        teamId: Number(row.team_id),
        teamShortName: row.team_short_name,
        teamName: row.team_name,
        playoffProbability: Number(row.playoff_probability),
        averageRank: Number(row.average_rank),
        averageWins: Number(row.average_wins),
        averageDraws: Number(row.average_draws),
        averageLosses: Number(row.average_losses),
        projectedGames: Number(meta.projected_games),
        expectedWinRate: Number(row.expected_win_rate),
        currentWinRate: Number(row.current_win_rate),
        pythagoreanWinRate: Number(row.pythagorean_win_rate),
        scheduleAdjustedWinRate: Number(row.schedule_adjusted_win_rate),
        currentRank: Number(row.current_rank),
        championshipHistory: getTeamChampionshipHistory(
          row.team_short_name,
        ) satisfies TeamChampionshipHistory,
      }),
    ),
    postseasonRows: postseasonRows.map(
      (row): PostseasonProjectionRow => ({
        teamId: Number(row.team_id),
        teamShortName: row.team_short_name,
        teamName: row.team_name,
        seed: Number(row.seed),
        averageFinalRank: Number(row.average_final_rank),
        koreanSeriesProbability: Number(row.korean_series_probability),
        championshipProbability: Number(row.championship_probability),
        pythagoreanWinRate: Number(row.pythagorean_win_rate),
        projectedWinRate: Number(row.projected_win_rate),
        championshipHistory: getTeamChampionshipHistory(
          row.team_short_name,
        ) satisfies TeamChampionshipHistory,
      }),
    ),
    simulations: Number(meta.simulations),
    minGames: Number(meta.min_games),
    remainingGames: Number(meta.remaining_games),
    projectedGames: Number(meta.projected_games),
  } satisfies SeasonProjection;
}
