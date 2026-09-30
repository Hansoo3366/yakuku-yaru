import type { Game } from '../games/game.repository.js';
import type { TeamChampionshipHistory } from '../teams/championship-history.js';
import type { TeamStandingRow } from '../kbo-team-rank/team-rank.repository.js';

export const KBO_REGULAR_SEASON_GAMES = 144;
export const MIN_GAMES_FOR_PROJECTION = 40;
export const DEFAULT_PROJECTION_SIMULATIONS = 100000;
export const SEASON_PROJECTION_MODEL_VERSION =
  'season-rank-current60-pyth40-144-postseason-v2';

const PYTHAGOREAN_GAMMA = 1.83;
const CURRENT_WIN_RATE_WEIGHT = 0.6;
const PYTHAGOREAN_WIN_RATE_WEIGHT = 0.4;
const TIE_RATE = 0.02;
const HOME_ADVANTAGE_LOGIT = 0.1;

type TeamInput = {
  id: number;
  name: string;
  shortName: string;
  wins: number;
  losses: number;
  draws: number;
  runsFor: number;
  runsAgainst: number;
};

type RemainingGame = {
  awayTeamId: number;
  homeTeamId: number;
};

export type SeasonProjectionInput = {
  seasonYear: number;
  rankDate: string | null;
  seriesId: string;
  items: TeamStandingRow[];
};

export type SeasonProjectionRow = {
  teamId: number;
  teamShortName: string;
  teamName: string;
  playoffProbability: number;
  averageRank: number;
  averageWins: number;
  averageDraws: number;
  averageLosses: number;
  projectedGames: number;
  expectedWinRate: number;
  currentWinRate: number;
  pythagoreanWinRate: number;
  scheduleAdjustedWinRate: number;
  currentRank: number;
  championshipHistory: TeamChampionshipHistory;
};

export type PostseasonProjectionRow = {
  teamId: number;
  teamShortName: string;
  teamName: string;
  seed: number;
  averageFinalRank: number;
  koreanSeriesProbability: number;
  championshipProbability: number;
  pythagoreanWinRate: number;
  projectedWinRate: number;
  championshipHistory: TeamChampionshipHistory;
};

export type SeasonProjection = {
  seasonYear: number;
  rankDate: string;
  seriesId: string;
  modelVersion: string;
  generatedAt: string;
  status: 'regularSeason' | 'postseason';
  rows: SeasonProjectionRow[];
  postseasonRows: PostseasonProjectionRow[];
  simulations: number;
  minGames: number;
  remainingGames: number;
  projectedGames: number;
};

function clamp(value: number, min = 0.01, max = 0.99) {
  return Math.max(min, Math.min(max, value));
}

function pythagoreanWinPct(
  runsFor: number,
  runsAgainst: number,
  gamma = PYTHAGOREAN_GAMMA,
) {
  const rs = Math.pow(Math.max(runsFor, 1), gamma);
  const ra = Math.pow(Math.max(runsAgainst, 1), gamma);

  return rs / (rs + ra);
}

function log5(pA: number, pB: number) {
  const denominator = pA + pB - 2 * pA * pB;

  if (Math.abs(denominator) < 1e-9) {
    return 0.5;
  }

  return (pA - pA * pB) / denominator;
}

function logit(value: number) {
  const p = clamp(value);

  return Math.log(p / (1 - p));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function applyHomeAdvantage(awayWinProbability: number) {
  return sigmoid(logit(awayWinProbability) - HOME_ADVANTAGE_LOGIT);
}

function headToHeadWinProbability(
  teamAWinRate: number,
  teamBWinRate: number,
  teamAHome: boolean,
) {
  const teamAAwayWinProbability = applyHomeAdvantage(
    log5(teamAWinRate, teamBWinRate),
  );

  return teamAHome
    ? 1 - applyHomeAdvantage(log5(teamBWinRate, teamAWinRate))
    : teamAAwayWinProbability;
}

function kboWinPct(wins: number, losses: number) {
  const decisions = wins + losses;

  if (decisions === 0) {
    return 0;
  }

  return wins / decisions;
}

function projectedTeamWinPct(currentWinRate: number, pythagoreanWinRate: number) {
  return (
    CURRENT_WIN_RATE_WEIGHT * currentWinRate +
    PYTHAGOREAN_WIN_RATE_WEIGHT * pythagoreanWinRate
  );
}

function hashSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hasFinalScore(game: Game) {
  return typeof game.homeScore === 'number' && typeof game.awayScore === 'number';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 순위 기준일(KST) 다음 날 0시. 이보다 앞선 경기는 순위표에 이미 반영된 경기다. */
function getRankDateCutoff(rankDate: string) {
  return Date.parse(`${rankDate}T00:00:00+09:00`) + DAY_MS;
}

function getGameTime(game: Game) {
  return new Date(game.gameDate).getTime();
}

function isUnplayedScheduledGame(game: Game) {
  return (
    game.status !== 'finished' &&
    game.status !== 'cancelled' &&
    !hasFinalScore(game)
  );
}

function buildTeamInputs(
  standings: SeasonProjectionInput,
  games: Game[],
  rankDateCutoff: number,
) {
  const runTotals = new Map<
    number,
    { runsFor: number; runsAgainst: number; scoredGames: number }
  >();

  for (const item of standings.items) {
    runTotals.set(item.teamId, {
      runsFor: 0,
      runsAgainst: 0,
      scoredGames: 0,
    });
  }

  for (const game of games) {
    // 순위표와 같은 범위(기준일까지의 정규시즌)만 득실점에 넣는다. 포스트시즌 점수는 섞지 않는다.
    if (
      game.status !== 'finished' ||
      !hasFinalScore(game) ||
      getGameTime(game) >= rankDateCutoff
    ) {
      continue;
    }

    const home = runTotals.get(game.homeTeam.id);
    const away = runTotals.get(game.awayTeam.id);

    if (!home || !away || game.homeScore == null || game.awayScore == null) {
      continue;
    }

    home.runsFor += game.homeScore;
    home.runsAgainst += game.awayScore;
    home.scoredGames += 1;
    away.runsFor += game.awayScore;
    away.runsAgainst += game.homeScore;
    away.scoredGames += 1;
  }

  const teams: TeamInput[] = [];

  for (const item of standings.items) {
    const runs = runTotals.get(item.teamId);

    if (!runs || runs.scoredGames === 0) {
      return null;
    }

    teams.push({
      id: item.teamId,
      name: item.teamName,
      shortName: item.teamShortName,
      wins: item.wins,
      losses: item.losses,
      draws: item.draws,
      runsFor: runs.runsFor,
      runsAgainst: runs.runsAgainst,
    });
  }

  return teams;
}

/**
 * 정규시즌 잔여 경기. 일정표에는 우천 취소 경기(재편성 경기가 따로 생긴다)와
 * 정규시즌 뒤의 포스트시즌 경기도 들어 있으므로, 기준일 이후의 예정 경기를 날짜순으로 보며
 * 팀마다 "144 - 이미 치른 경기"까지만 센다.
 */
function buildRemainingGames(
  games: Game[],
  teams: TeamInput[],
  rankDateCutoff: number,
) {
  const openSlots = new Map(
    teams.map((team) => [
      team.id,
      Math.max(
        0,
        KBO_REGULAR_SEASON_GAMES - (team.wins + team.losses + team.draws),
      ),
    ]),
  );
  const remaining: RemainingGame[] = [];
  const upcoming = games
    .filter(
      (game) =>
        isUnplayedScheduledGame(game) && getGameTime(game) >= rankDateCutoff,
    )
    .sort((a, b) => getGameTime(a) - getGameTime(b));

  for (const game of upcoming) {
    const awaySlots = openSlots.get(game.awayTeam.id) ?? 0;
    const homeSlots = openSlots.get(game.homeTeam.id) ?? 0;

    if (awaySlots <= 0 || homeSlots <= 0) {
      continue;
    }

    openSlots.set(game.awayTeam.id, awaySlots - 1);
    openSlots.set(game.homeTeam.id, homeSlots - 1);
    remaining.push({
      awayTeamId: game.awayTeam.id,
      homeTeamId: game.homeTeam.id,
    });
  }

  return remaining;
}

function buildScheduleAdjustedWinRates(
  remainingGames: RemainingGame[],
  teams: TeamInput[],
  projectedWinRateByTeamId: Map<number, number>,
  fillerGamesByTeamId: Map<number, number>,
  fillerWinProbByTeamId: Map<number, number>,
) {
  const scheduleSums = new Map(
    teams.map((team) => [team.id, { probabilitySum: 0, games: 0 }]),
  );

  for (const game of remainingGames) {
    const awayProjected = projectedWinRateByTeamId.get(game.awayTeamId) ?? 0.5;
    const homeProjected = projectedWinRateByTeamId.get(game.homeTeamId) ?? 0.5;
    const awayWinProbability = applyHomeAdvantage(
      log5(awayProjected, homeProjected),
    );
    const homeWinProbability = 1 - awayWinProbability;
    const awaySchedule = scheduleSums.get(game.awayTeamId);
    const homeSchedule = scheduleSums.get(game.homeTeamId);

    if (awaySchedule) {
      awaySchedule.probabilitySum += awayWinProbability;
      awaySchedule.games += 1;
    }

    if (homeSchedule) {
      homeSchedule.probabilitySum += homeWinProbability;
      homeSchedule.games += 1;
    }
  }

  for (const team of teams) {
    const filler = fillerGamesByTeamId.get(team.id) ?? 0;

    if (filler <= 0) {
      continue;
    }

    const schedule = scheduleSums.get(team.id);
    const winProbability = fillerWinProbByTeamId.get(team.id) ?? 0.5;

    if (schedule) {
      schedule.probabilitySum += winProbability * filler;
      schedule.games += filler;
    }
  }

  return new Map(
    teams.map((team) => {
      const schedule = scheduleSums.get(team.id);

      return [
        team.id,
        schedule?.games
          ? schedule.probabilitySum / schedule.games
          : (projectedWinRateByTeamId.get(team.id) ?? 0.5),
      ];
    }),
  );
}

function inferProjectionGamesByTeamId(
  teams: TeamInput[],
  remainingGames: RemainingGame[],
) {
  const remainingByTeamId = new Map(teams.map((team) => [team.id, 0]));

  for (const game of remainingGames) {
    remainingByTeamId.set(
      game.awayTeamId,
      (remainingByTeamId.get(game.awayTeamId) ?? 0) + 1,
    );
    remainingByTeamId.set(
      game.homeTeamId,
      (remainingByTeamId.get(game.homeTeamId) ?? 0) + 1,
    );
  }

  return new Map(
    teams.map((team) => {
      const played = team.wins + team.losses + team.draws;
      const remaining = remainingByTeamId.get(team.id) ?? 0;

      return [team.id, played + remaining];
    }),
  );
}

function rankTeams(
  records: Map<number, { wins: number; losses: number; draws: number }>,
  teams: TeamInput[],
  projectedWinRateByTeamId: Map<number, number>,
) {
  return [...teams].sort((a, b) => {
    const recordA = records.get(a.id);
    const recordB = records.get(b.id);

    if (!recordA || !recordB) {
      return 0;
    }

    const pctA = kboWinPct(recordA.wins, recordA.losses);
    const pctB = kboWinPct(recordB.wins, recordB.losses);

    if (pctB !== pctA) return pctB - pctA;
    if (recordB.wins !== recordA.wins) return recordB.wins - recordA.wins;

    const projectedA = projectedWinRateByTeamId.get(a.id) ?? 0.5;
    const projectedB = projectedWinRateByTeamId.get(b.id) ?? 0.5;

    if (projectedB !== projectedA) return projectedB - projectedA;

    return a.shortName.localeCompare(b.shortName, 'ko');
  });
}

function isRegularSeasonComplete(standings: SeasonProjectionInput) {
  return standings.items.every(
    (item) => item.wins + item.losses + item.draws >= KBO_REGULAR_SEASON_GAMES,
  );
}

function simulateWinner(
  teamA: TeamInput,
  teamB: TeamInput,
  teamAHome: boolean,
  projectedWinRateByTeamId: Map<number, number>,
  random: () => number,
) {
  const teamAWinProbability = headToHeadWinProbability(
    projectedWinRateByTeamId.get(teamA.id) ?? 0.5,
    projectedWinRateByTeamId.get(teamB.id) ?? 0.5,
    teamAHome,
  );

  return random() < teamAWinProbability ? teamA : teamB;
}

function simulateWildCardSeries(
  fourthSeed: TeamInput,
  fifthSeed: TeamInput,
  projectedWinRateByTeamId: Map<number, number>,
  random: () => number,
) {
  const fourthWinProbability = headToHeadWinProbability(
    projectedWinRateByTeamId.get(fourthSeed.id) ?? 0.5,
    projectedWinRateByTeamId.get(fifthSeed.id) ?? 0.5,
    true,
  );

  for (let game = 0; game < 2; game += 1) {
    const roll = random();
    const fourthWinWithDraw = fourthWinProbability * (1 - TIE_RATE);
    const fifthWinWithDraw = (1 - fourthWinProbability) * (1 - TIE_RATE);

    if (
      roll < fourthWinWithDraw ||
      roll >= fourthWinWithDraw + fifthWinWithDraw
    ) {
      return fourthSeed;
    }
  }

  return fifthSeed;
}

function simulateBestOfSeries(input: {
  favorite: TeamInput;
  challenger: TeamInput;
  winsNeeded: number;
  homePattern: boolean[];
  projectedWinRateByTeamId: Map<number, number>;
  random: () => number;
}) {
  let favoriteWins = 0;
  let challengerWins = 0;

  for (const favoriteHome of input.homePattern) {
    const winner = simulateWinner(
      input.favorite,
      input.challenger,
      favoriteHome,
      input.projectedWinRateByTeamId,
      input.random,
    );

    if (winner.id === input.favorite.id) {
      favoriteWins += 1;
    } else {
      challengerWins += 1;
    }

    if (favoriteWins >= input.winsNeeded) {
      return input.favorite;
    }

    if (challengerWins >= input.winsNeeded) {
      return input.challenger;
    }
  }

  return favoriteWins >= challengerWins ? input.favorite : input.challenger;
}

function calculatePostseasonProjection(
  standings: SeasonProjectionInput,
  teams: TeamInput[],
  projectedWinRateByTeamId: Map<number, number>,
  pythagoreanByTeamId: Map<number, number>,
  simulations: number,
) {
  if (!isRegularSeasonComplete(standings)) {
    return [];
  }

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const seeds = standings.items
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
    .map((standing) => teamById.get(standing.teamId))
    .filter((team): team is TeamInput => Boolean(team));

  if (seeds.length < 5) {
    return [];
  }

  const seedByTeamId = new Map(seeds.map((team, index) => [team.id, index + 1]));
  const standingByTeamId = new Map(
    standings.items.map((item) => [item.teamId, item]),
  );
  const random = createRandom(
    hashSeed(
      `postseason:${standings.rankDate}:${standings.items
        .map(
          (item) =>
            `${item.teamId}-${item.rank}-${item.wins}-${item.losses}-${item.draws}`,
        )
        .join('|')}`,
    ),
  );
  const finalRankSums = new Map(seeds.map((team) => [team.id, 0]));
  const koreanSeriesCounts = new Map(seeds.map((team) => [team.id, 0]));
  const championshipCounts = new Map(seeds.map((team) => [team.id, 0]));

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    const wildCardWinner = simulateWildCardSeries(
      seeds[3],
      seeds[4],
      projectedWinRateByTeamId,
      random,
    );
    const wildCardLoser =
      wildCardWinner.id === seeds[3].id ? seeds[4] : seeds[3];
    const semiPlayoffWinner = simulateBestOfSeries({
      favorite: seeds[2],
      challenger: wildCardWinner,
      winsNeeded: 3,
      homePattern: [true, true, false, false, true],
      projectedWinRateByTeamId,
      random,
    });
    const semiPlayoffLoser =
      semiPlayoffWinner.id === seeds[2].id ? wildCardWinner : seeds[2];
    const playoffWinner = simulateBestOfSeries({
      favorite: seeds[1],
      challenger: semiPlayoffWinner,
      winsNeeded: 3,
      homePattern: [true, true, false, false, true],
      projectedWinRateByTeamId,
      random,
    });
    const playoffLoser =
      playoffWinner.id === seeds[1].id ? semiPlayoffWinner : seeds[1];
    const koreanSeriesWinner = simulateBestOfSeries({
      favorite: seeds[0],
      challenger: playoffWinner,
      winsNeeded: 4,
      homePattern: [true, true, false, false, false, true, true],
      projectedWinRateByTeamId,
      random,
    });
    const koreanSeriesLoser =
      koreanSeriesWinner.id === seeds[0].id ? playoffWinner : seeds[0];

    [
      { team: koreanSeriesWinner, finalRank: 1 },
      { team: koreanSeriesLoser, finalRank: 2 },
      { team: playoffLoser, finalRank: 3 },
      { team: semiPlayoffLoser, finalRank: 4 },
      { team: wildCardLoser, finalRank: 5 },
    ].forEach(({ team, finalRank }) => {
      finalRankSums.set(team.id, (finalRankSums.get(team.id) ?? 0) + finalRank);
    });

    koreanSeriesCounts.set(
      koreanSeriesWinner.id,
      (koreanSeriesCounts.get(koreanSeriesWinner.id) ?? 0) + 1,
    );
    koreanSeriesCounts.set(
      koreanSeriesLoser.id,
      (koreanSeriesCounts.get(koreanSeriesLoser.id) ?? 0) + 1,
    );
    championshipCounts.set(
      koreanSeriesWinner.id,
      (championshipCounts.get(koreanSeriesWinner.id) ?? 0) + 1,
    );
  }

  return seeds
    .map((team): PostseasonProjectionRow => {
      const standing = standingByTeamId.get(team.id);

      return {
        teamId: team.id,
        teamShortName: team.shortName,
        teamName: team.name,
        seed: seedByTeamId.get(team.id) ?? standing?.rank ?? 0,
        averageFinalRank: (finalRankSums.get(team.id) ?? 0) / simulations,
        koreanSeriesProbability:
          (koreanSeriesCounts.get(team.id) ?? 0) / simulations,
        championshipProbability:
          (championshipCounts.get(team.id) ?? 0) / simulations,
        pythagoreanWinRate: pythagoreanByTeamId.get(team.id) ?? 0.5,
        projectedWinRate: projectedWinRateByTeamId.get(team.id) ?? 0.5,
        championshipHistory:
          standing?.championshipHistory ??
          ({
            currentTitles: 0,
            targetTitle: 1,
            lastTitleYear: null,
          } satisfies TeamChampionshipHistory),
      };
    })
    .sort((a, b) => {
      if (a.averageFinalRank !== b.averageFinalRank) {
        return a.averageFinalRank - b.averageFinalRank;
      }

      return b.championshipProbability - a.championshipProbability;
    });
}

export function calculateSeasonProjection(
  standings: SeasonProjectionInput | null,
  games: Game[],
  simulations = DEFAULT_PROJECTION_SIMULATIONS,
): SeasonProjection | null {
  if (!standings?.items.length || standings.items.length < 10) {
    return null;
  }

  if (!standings.rankDate) {
    return null;
  }

  if (standings.items.some((item) => item.games < MIN_GAMES_FOR_PROJECTION)) {
    return null;
  }

  const rankDateCutoff = getRankDateCutoff(standings.rankDate);
  const teams = buildTeamInputs(standings, games, rankDateCutoff);

  if (!teams) {
    return null;
  }

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const pythagoreanByTeamId = new Map(
    teams.map((team) => [
      team.id,
      pythagoreanWinPct(team.runsFor, team.runsAgainst),
    ]),
  );
  const projectedWinRateByTeamId = new Map(
    teams.map((team) => {
      const currentWinRate = kboWinPct(team.wins, team.losses);
      const pythagoreanWinRate = pythagoreanByTeamId.get(team.id) ?? 0.5;

      return [
        team.id,
        projectedTeamWinPct(currentWinRate, pythagoreanWinRate),
      ];
    }),
  );
  const remainingGames = buildRemainingGames(games, teams, rankDateCutoff);
  const knownGamesByTeamId = inferProjectionGamesByTeamId(teams, remainingGames);
  const projectedGames = KBO_REGULAR_SEASON_GAMES;
  const leagueAverageProjectedWinRate =
    teams.reduce(
      (sum, team) => sum + (projectedWinRateByTeamId.get(team.id) ?? 0.5),
      0,
    ) / teams.length;
  const fillerGamesByTeamId = new Map(
    teams.map((team) => {
      const knownGames = knownGamesByTeamId.get(team.id) ?? 0;
      const filler = projectedGames - knownGames;

      return [team.id, Math.max(0, filler)];
    }),
  );
  const fillerWinProbByTeamId = new Map(
    teams.map((team) => [
      team.id,
      log5(
        projectedWinRateByTeamId.get(team.id) ?? 0.5,
        leagueAverageProjectedWinRate,
      ),
    ]),
  );
  const scheduleAdjustedByTeamId = buildScheduleAdjustedWinRates(
    remainingGames,
    teams,
    projectedWinRateByTeamId,
    fillerGamesByTeamId,
    fillerWinProbByTeamId,
  );
  const seed = hashSeed(
    `${standings.rankDate}:${standings.items
      .map((item) => `${item.teamId}-${item.wins}-${item.losses}-${item.draws}`)
      .join('|')}`,
  );
  const random = createRandom(seed);
  const rankSums = new Map(teams.map((team) => [team.id, 0]));
  const winSums = new Map(teams.map((team) => [team.id, 0]));
  const drawSums = new Map(teams.map((team) => [team.id, 0]));
  const lossSums = new Map(teams.map((team) => [team.id, 0]));
  const playoffCounts = new Map(teams.map((team) => [team.id, 0]));
  // 경기별 승리 확률은 시뮬레이션마다 같으므로 한 번만 계산한다. (난수 사용 순서는 그대로라 결과가 같다)
  const remainingGameOdds = remainingGames.flatMap((game) => {
    if (!teamById.has(game.awayTeamId) || !teamById.has(game.homeTeamId)) {
      return [];
    }

    const awayWinProbability = applyHomeAdvantage(
      log5(
        projectedWinRateByTeamId.get(game.awayTeamId) ?? 0.5,
        projectedWinRateByTeamId.get(game.homeTeamId) ?? 0.5,
      ),
    );
    const awayWinWithDraw = awayWinProbability * (1 - TIE_RATE);
    const homeWinWithDraw = (1 - awayWinProbability) * (1 - TIE_RATE);

    return [
      {
        awayTeamId: game.awayTeamId,
        homeTeamId: game.homeTeamId,
        awayWinBelow: awayWinWithDraw,
        homeWinBelow: awayWinWithDraw + homeWinWithDraw,
      },
    ];
  });
  const fillerOdds = teams.flatMap((team) => {
    const filler = fillerGamesByTeamId.get(team.id) ?? 0;

    if (filler <= 0) {
      return [];
    }

    const winProbability = fillerWinProbByTeamId.get(team.id) ?? 0.5;
    const winWithDraw = winProbability * (1 - TIE_RATE);
    const lossWithDraw = (1 - winProbability) * (1 - TIE_RATE);

    return [
      {
        teamId: team.id,
        filler,
        winBelow: winWithDraw,
        lossBelow: winWithDraw + lossWithDraw,
      },
    ];
  });

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    const records = new Map(
      teams.map((team) => [
        team.id,
        {
          wins: team.wins,
          losses: team.losses,
          draws: team.draws,
        },
      ]),
    );

    for (const game of remainingGameOdds) {
      const roll = random();
      const awayRecord = records.get(game.awayTeamId);
      const homeRecord = records.get(game.homeTeamId);

      if (!awayRecord || !homeRecord) {
        continue;
      }

      if (roll < game.awayWinBelow) {
        awayRecord.wins += 1;
        homeRecord.losses += 1;
      } else if (roll < game.homeWinBelow) {
        homeRecord.wins += 1;
        awayRecord.losses += 1;
      } else {
        awayRecord.draws += 1;
        homeRecord.draws += 1;
      }
    }

    for (const odds of fillerOdds) {
      const record = records.get(odds.teamId);

      if (!record) {
        continue;
      }

      for (let game = 0; game < odds.filler; game += 1) {
        const roll = random();

        if (roll < odds.winBelow) {
          record.wins += 1;
        } else if (roll < odds.lossBelow) {
          record.losses += 1;
        } else {
          record.draws += 1;
        }
      }
    }

    const ranked = rankTeams(records, teams, projectedWinRateByTeamId);

    ranked.forEach((team, index) => {
      const rank = index + 1;
      const record = records.get(team.id);

      rankSums.set(team.id, (rankSums.get(team.id) ?? 0) + rank);
      winSums.set(team.id, (winSums.get(team.id) ?? 0) + (record?.wins ?? 0));
      drawSums.set(team.id, (drawSums.get(team.id) ?? 0) + (record?.draws ?? 0));
      lossSums.set(
        team.id,
        (lossSums.get(team.id) ?? 0) + (record?.losses ?? 0),
      );

      if (rank <= 5) {
        playoffCounts.set(team.id, (playoffCounts.get(team.id) ?? 0) + 1);
      }
    });
  }

  const standingByTeamId = new Map(
    standings.items.map((item) => [item.teamId, item]),
  );
  const postseasonRows = calculatePostseasonProjection(
    standings,
    teams,
    projectedWinRateByTeamId,
    pythagoreanByTeamId,
    simulations,
  );

  return {
    seasonYear: standings.seasonYear,
    rankDate: standings.rankDate,
    seriesId: standings.seriesId,
    modelVersion: SEASON_PROJECTION_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    status: postseasonRows.length ? 'postseason' : 'regularSeason',
    rows: teams
      .map((team) => {
        const averageWins = Math.min(
          projectedGames,
          (winSums.get(team.id) ?? 0) / simulations,
        );
        const averageDraws = Math.min(
          projectedGames,
          (drawSums.get(team.id) ?? 0) / simulations,
        );
        const averageLosses = Math.min(
          projectedGames,
          (lossSums.get(team.id) ?? 0) / simulations,
        );
        const standing = standingByTeamId.get(team.id);

        return {
          teamId: team.id,
          teamShortName: team.shortName,
          teamName: team.name,
          playoffProbability: (playoffCounts.get(team.id) ?? 0) / simulations,
          averageRank: (rankSums.get(team.id) ?? 0) / simulations,
          averageWins,
          averageDraws,
          averageLosses,
          projectedGames,
          expectedWinRate: kboWinPct(averageWins, averageLosses),
          currentWinRate: standing?.winRate ?? 0,
          pythagoreanWinRate: pythagoreanByTeamId.get(team.id) ?? 0.5,
          scheduleAdjustedWinRate:
            scheduleAdjustedByTeamId.get(team.id) ??
            projectedWinRateByTeamId.get(team.id) ??
            0.5,
          currentRank: standing?.rank ?? 0,
          championshipHistory:
            standing?.championshipHistory ??
            ({
              currentTitles: 0,
              targetTitle: 1,
              lastTitleYear: null,
            } satisfies TeamChampionshipHistory),
        };
      })
      .sort((a, b) => {
        if (a.averageRank !== b.averageRank) {
          return a.averageRank - b.averageRank;
        }

        return b.expectedWinRate - a.expectedWinRate;
      }),
    postseasonRows,
    simulations,
    minGames: MIN_GAMES_FOR_PROJECTION,
    remainingGames: remainingGames.length,
    projectedGames,
  };
}
