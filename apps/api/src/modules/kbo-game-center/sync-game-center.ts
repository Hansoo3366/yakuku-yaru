import {
  fetchKboGameCenterList,
  fetchKboLineupAnalysis,
  fetchKboPitcherAnalysis,
} from './kbo-game-center.client.js';
import {
  findKboGameIdByExternalId,
  listKboGameCenterTargetDates,
  listKboTeamIdsByCode,
  replaceGameLineup,
  updateGameLineupConfirmed,
  updatePitcherAnalysis,
  upsertGameStartingPitcher,
  upsertPitcherFromGameCenter,
} from './game-center.repository.js';

const KST_TIME_ZONE = 'Asia/Seoul';

export type KboGameCenterSyncMode = 'today' | 'week' | 'month';

function getKstDateParts(reference = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(reference);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
}

function formatSqlDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(mode: KboGameCenterSyncMode, reference = new Date()) {
  const { year, month, day } = getKstDateParts(reference);

  if (mode === 'month') {
    return {
      from: `${year}-${String(month).padStart(2, '0')}-01 00:00:00`,
      to:
        month === 12
          ? `${year + 1}-01-01 00:00:00`
          : `${year}-${String(month + 1).padStart(2, '0')}-01 00:00:00`,
    };
  }

  const today = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+09:00`);
  const from = new Date(today);
  const to = new Date(today);

  if (mode === 'week') {
    from.setDate(from.getDate() - 3);
    to.setDate(to.getDate() + 8);
  } else {
    to.setDate(to.getDate() + 1);
  }

  return {
    from: `${formatSqlDate(from)} 00:00:00`,
    to: `${formatSqlDate(to)} 00:00:00`,
  };
}

function normalizePitcherName(value: string | null | undefined) {
  const name = value?.trim();
  return name || null;
}

export async function syncKboGameCenter(input?: {
  mode?: KboGameCenterSyncMode;
  dates?: string[];
}) {
  const teamIdsByCode = await listKboTeamIdsByCode();
  const dates =
    input?.dates?.length
      ? input.dates
      : await listKboGameCenterTargetDates(
          getDateRange(input?.mode ?? 'today'),
        );
  let parsed = 0;
  let matched = 0;
  let pitcherUpserts = 0;
  let pitcherStatUpserts = 0;
  let lineupUpserts = 0;
  let skipped = 0;

  for (const date of dates) {
    const games = await fetchKboGameCenterList(date);
    parsed += games.length;

    for (const game of games) {
      const gameId = await findKboGameIdByExternalId(game.G_ID);

      if (!gameId) {
        skipped += 1;
        continue;
      }

      matched += 1;

      const pitcherInputs = [
        {
          side: 'away' as const,
          teamCode: game.AWAY_ID,
          kboPlayerId: game.T_PIT_P_ID,
          name: normalizePitcherName(game.T_PIT_P_NM),
        },
        {
          side: 'home' as const,
          teamCode: game.HOME_ID,
          kboPlayerId: game.B_PIT_P_ID,
          name: normalizePitcherName(game.B_PIT_P_NM),
        },
      ];
      const syncedPitchers = new Map<'away' | 'home', {
        playerId: number;
        teamId: number;
        kboPlayerId: number;
      }>();

      for (const pitcher of pitcherInputs) {
        if (!pitcher.kboPlayerId || !pitcher.name) {
          skipped += 1;
          continue;
        }

        const teamId = teamIdsByCode.get(pitcher.teamCode);

        if (!teamId) {
          skipped += 1;
          continue;
        }

        const playerId = await upsertPitcherFromGameCenter({
          teamId,
          kboPlayerId: pitcher.kboPlayerId,
          name: pitcher.name,
        });

        syncedPitchers.set(pitcher.side, {
          playerId,
          teamId,
          kboPlayerId: pitcher.kboPlayerId,
        });

        await upsertGameStartingPitcher({
          gameId,
          teamId,
          playerId,
          isConfirmed: game.START_PIT_CK === 1,
        });

        pitcherUpserts += 1;
      }

      const awayPitcher = syncedPitchers.get('away');
      const homePitcher = syncedPitchers.get('home');

      if (awayPitcher && homePitcher) {
        const pitcherAnalysis = await fetchKboPitcherAnalysis({
          seasonYear: Number(game.G_DT.slice(0, 4)),
          awayTeamCode: game.AWAY_ID,
          homeTeamCode: game.HOME_ID,
          awayPitcherId: awayPitcher.kboPlayerId,
          homePitcherId: homePitcher.kboPlayerId,
        });

        if (pitcherAnalysis.away) {
          await updatePitcherAnalysis({
            gameId,
            teamId: awayPitcher.teamId,
            playerId: awayPitcher.playerId,
            analysis: pitcherAnalysis.away,
          });
          pitcherStatUpserts += 1;
        }

        if (pitcherAnalysis.home) {
          await updatePitcherAnalysis({
            gameId,
            teamId: homePitcher.teamId,
            playerId: homePitcher.playerId,
            analysis: pitcherAnalysis.home,
          });
          pitcherStatUpserts += 1;
        }
      }

      const awayTeamId = teamIdsByCode.get(game.AWAY_ID);
      const homeTeamId = teamIdsByCode.get(game.HOME_ID);

      if (awayTeamId && homeTeamId) {
        const lineupAnalysis = await fetchKboLineupAnalysis({
          seasonYear: Number(game.G_DT.slice(0, 4)),
          gameExternalId: game.G_ID,
        });

        await updateGameLineupConfirmed({
          gameId,
          isConfirmed: lineupAnalysis.isConfirmed,
        });

        lineupUpserts += await replaceGameLineup({
          gameId,
          teamId: awayTeamId,
          players: lineupAnalysis.away,
        });
        lineupUpserts += await replaceGameLineup({
          gameId,
          teamId: homeTeamId,
          players: lineupAnalysis.home,
        });
      }
    }
  }

  return {
    dateCount: dates.length,
    parsed,
    matched,
    pitcherUpserts,
    pitcherStatUpserts,
    lineupUpserts,
    skipped,
  };
}
