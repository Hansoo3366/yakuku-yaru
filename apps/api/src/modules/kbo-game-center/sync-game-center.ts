import { syncLog } from '../../lib/sync-log.js';
import {
  fetchKboGameCenterList,
  fetchKboLineupAnalysis,
  fetchKboPitcherAnalysis,
  type KboLineupPlayer,
} from './kbo-game-center.client.js';
import { fetchKboPlayersBySearchWord } from '../kbo-players/kbo-player.client.js';
import { upsertPlayer } from '../kbo-players/player.repository.js';
import { isGameListLineupConfirmed } from './kbo-lineup-status.js';
import {
  findKboGameIdForGameCenterGame,
  listKboGameCenterTargetDates,
  listKboTeamIdsByCode,
  replaceGameLineup,
  updateGameLineupConfirmed,
  updatePitcherAnalysis,
  upsertGameStartingPitcher,
  upsertPitcherFromGameCenter,
} from './game-center.repository.js';

const KST_TIME_ZONE = 'Asia/Seoul';

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

function getKboPlayerImageUrl(seasonYear: number, kboPlayerId: string | number) {
  return `https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/kbo/${seasonYear}/${kboPlayerId}.png`;
}

async function enrichLineupPlayersWithSearchIds(input: {
  seasonYear: number;
  teamCode: string;
  players: KboLineupPlayer[];
  searchCache: Map<string, ReturnType<typeof fetchKboPlayersBySearchWord>>;
  teamIdsByShortName: Map<string, number>;
}) {
  const teamShortName = KBO_TEAM_CODE_TO_SHORT_NAME[input.teamCode];

  if (!teamShortName) {
    return input.players;
  }

  const enrichedPlayers: KboLineupPlayer[] = [];

  for (const player of input.players) {
    if (player.kboPlayerId) {
      enrichedPlayers.push(player);
      continue;
    }

    const cacheKey = player.name.trim();
    const searchPromise =
      input.searchCache.get(cacheKey) ?? fetchKboPlayersBySearchWord(cacheKey);

    input.searchCache.set(cacheKey, searchPromise);

    const matches = await searchPromise.catch(() => []);
    const match = matches.find(
      (candidate) =>
        candidate.name === player.name &&
        candidate.teamShortName === teamShortName,
    );

    if (!match) {
      enrichedPlayers.push(player);
      continue;
    }

    await upsertPlayer(match, input.teamIdsByShortName);

    enrichedPlayers.push({
      ...player,
      kboPlayerId: Number(match.kboPlayerId),
      profileImageUrl:
        player.profileImageUrl ??
        getKboPlayerImageUrl(input.seasonYear, match.kboPlayerId),
    });
  }

  return enrichedPlayers;
}

export async function syncKboGameCenter(input?: {
  mode?: KboGameCenterSyncMode;
  dates?: string[];
}) {
  const teamIdsByCode = await listKboTeamIdsByCode();
  const teamIdsByShortName = new Map<string, number>();

  for (const [teamCode, shortName] of Object.entries(KBO_TEAM_CODE_TO_SHORT_NAME)) {
    const teamId = teamIdsByCode.get(teamCode);

    if (teamId) {
      teamIdsByShortName.set(shortName, teamId);
    }
  }

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
  const lineupPlayerSearchCache = new Map<
    string,
    ReturnType<typeof fetchKboPlayersBySearchWord>
  >();

  syncLog(
    'kbo-game-center',
    `시작 — 날짜 ${dates.length}개, 모드 ${input?.mode ?? (input?.dates?.length ? 'dates' : 'today')}`,
  );

  for (let dateIndex = 0; dateIndex < dates.length; dateIndex += 1) {
    const date = dates[dateIndex];
    syncLog(
      'kbo-game-center',
      `날짜 ${dateIndex + 1}/${dates.length} ${date} 경기 목록 조회 중…`,
    );
    const games = await fetchKboGameCenterList(date);
    parsed += games.length;
    syncLog(
      'kbo-game-center',
      `날짜 ${date} — ${games.length}경기 처리 중…`,
    );

    for (const game of games) {
      const gameId = await findKboGameIdForGameCenterGame(game, teamIdsByCode);

      if (!gameId) {
        syncLog(
          'kbo-game-center',
          `  ${game.G_ID} ${game.AWAY_NM} vs ${game.HOME_NM} — DB 경기 매칭 실패 (건너뜀)`,
        );
        skipped += 1;
        continue;
      }

      matched += 1;
      syncLog(
        'kbo-game-center',
        `  ${game.G_ID} ${game.AWAY_NM} vs ${game.HOME_NM} — 선발·라인업 동기화`,
      );

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
        const seasonYear = Number(game.G_DT.slice(0, 4));
        const lineupAnalysis = await fetchKboLineupAnalysis({
          seasonYear,
          gameExternalId: game.G_ID,
        });
        const awayLineup = await enrichLineupPlayersWithSearchIds({
          seasonYear,
          teamCode: game.AWAY_ID,
          players: lineupAnalysis.away,
          searchCache: lineupPlayerSearchCache,
          teamIdsByShortName,
        });
        const homeLineup = await enrichLineupPlayersWithSearchIds({
          seasonYear,
          teamCode: game.HOME_ID,
          players: lineupAnalysis.home,
          searchCache: lineupPlayerSearchCache,
          teamIdsByShortName,
        });

        await updateGameLineupConfirmed({
          gameId,
          isConfirmed:
            lineupAnalysis.isConfirmed ||
            isGameListLineupConfirmed(game.LINEUP_CK),
        });

        lineupUpserts += await replaceGameLineup({
          gameId,
          teamId: awayTeamId,
          players: awayLineup,
        });
        lineupUpserts += await replaceGameLineup({
          gameId,
          teamId: homeTeamId,
          players: homeLineup,
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
