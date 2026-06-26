import type {
  Game,
  TeamChampionshipHistory,
  TeamStandingsResponse,
} from '@/lib/baseball-api';

const KBO_REGULAR_SEASON_GAMES = 144;
const MIN_GAMES_FOR_PROJECTION = 40;
const DEFAULT_SIMULATIONS = 10000;
const PYTHAGOREAN_GAMMA = 1.83;
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

export type PlayoffProbabilityRow = {
  teamId: number;
  teamShortName: string;
  teamName: string;
  playoffProbability: number;
  averageRank: number;
  averageWins: number;
  currentRank: number;
  championshipHistory: TeamChampionshipHistory;
};

export type PlayoffProbabilityProjection = {
  rows: PlayoffProbabilityRow[];
  simulations: number;
  minGames: number;
  remainingGames: number;
  rankDate: string | null;
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

function kboWinPct(wins: number, losses: number) {
  const decisions = wins + losses;

  if (decisions === 0) {
    return 0;
  }

  return wins / decisions;
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

function buildTeamInputs(standings: TeamStandingsResponse, games: Game[]) {
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
    if (!hasFinalScore(game)) {
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

function buildRemainingGames(games: Game[]) {
  return games
    .filter((game) => !hasFinalScore(game))
    .map(
      (game): RemainingGame => ({
        awayTeamId: game.awayTeam.id,
        homeTeamId: game.homeTeam.id,
      }),
    );
}

function rankTeams(
  records: Map<number, { wins: number; losses: number; draws: number }>,
  teams: TeamInput[],
  pythagoreanByTeamId: Map<number, number>,
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

    const pythA = pythagoreanByTeamId.get(a.id) ?? 0.5;
    const pythB = pythagoreanByTeamId.get(b.id) ?? 0.5;

    if (pythB !== pythA) return pythB - pythA;

    return a.shortName.localeCompare(b.shortName, 'ko');
  });
}

export function calculatePlayoffProbabilityProjection(
  standings: TeamStandingsResponse | null,
  games: Game[],
  simulations = DEFAULT_SIMULATIONS,
): PlayoffProbabilityProjection | null {
  if (!standings?.items.length || standings.items.length < 10) {
    return null;
  }

  if (standings.items.some((item) => item.games < MIN_GAMES_FOR_PROJECTION)) {
    return null;
  }

  const teams = buildTeamInputs(standings, games);

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
  const remainingGames = buildRemainingGames(games);
  const seed = hashSeed(
    `${standings.rankDate ?? ''}:${standings.items
      .map((item) => `${item.teamId}-${item.wins}-${item.losses}-${item.draws}`)
      .join('|')}`,
  );
  const random = createRandom(seed);
  const playoffCounts = new Map(teams.map((team) => [team.id, 0]));
  const rankSums = new Map(teams.map((team) => [team.id, 0]));
  const winSums = new Map(teams.map((team) => [team.id, 0]));

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

    for (const game of remainingGames) {
      const away = teamById.get(game.awayTeamId);
      const home = teamById.get(game.homeTeamId);

      if (!away || !home) {
        continue;
      }

      const awayPyth = pythagoreanByTeamId.get(away.id) ?? 0.5;
      const homePyth = pythagoreanByTeamId.get(home.id) ?? 0.5;
      const awayWinProbability = applyHomeAdvantage(log5(awayPyth, homePyth));
      const awayWinWithDraw = awayWinProbability * (1 - TIE_RATE);
      const homeWinWithDraw = (1 - awayWinProbability) * (1 - TIE_RATE);
      const roll = random();
      const awayRecord = records.get(away.id);
      const homeRecord = records.get(home.id);

      if (!awayRecord || !homeRecord) {
        continue;
      }

      if (roll < awayWinWithDraw) {
        awayRecord.wins += 1;
        homeRecord.losses += 1;
      } else if (roll < awayWinWithDraw + homeWinWithDraw) {
        homeRecord.wins += 1;
        awayRecord.losses += 1;
      } else {
        awayRecord.draws += 1;
        homeRecord.draws += 1;
      }
    }

    const ranked = rankTeams(records, teams, pythagoreanByTeamId);

    ranked.forEach((team, index) => {
      const rank = index + 1;
      const record = records.get(team.id);

      rankSums.set(team.id, (rankSums.get(team.id) ?? 0) + rank);
      winSums.set(team.id, (winSums.get(team.id) ?? 0) + (record?.wins ?? 0));

      if (rank <= 5) {
        playoffCounts.set(team.id, (playoffCounts.get(team.id) ?? 0) + 1);
      }
    });
  }

  const currentRankByTeamId = new Map(
    standings.items.map((item) => [item.teamId, item.rank]),
  );
  const championshipHistoryByTeamId = new Map(
    standings.items.map((item) => [item.teamId, item.championshipHistory]),
  );

  return {
    rows: teams
      .map((team) => ({
        teamId: team.id,
        teamShortName: team.shortName,
        teamName: team.name,
        playoffProbability: (playoffCounts.get(team.id) ?? 0) / simulations,
        averageRank: (rankSums.get(team.id) ?? 0) / simulations,
        averageWins: Math.min(
          KBO_REGULAR_SEASON_GAMES,
          (winSums.get(team.id) ?? 0) / simulations,
        ),
        currentRank: currentRankByTeamId.get(team.id) ?? 0,
        championshipHistory:
          championshipHistoryByTeamId.get(team.id) ??
          ({
            currentTitles: 0,
            targetTitle: 1,
            lastTitleYear: null,
          } satisfies TeamChampionshipHistory),
      }))
      .sort((a, b) => {
        if (b.playoffProbability !== a.playoffProbability) {
          return b.playoffProbability - a.playoffProbability;
        }

        return a.averageRank - b.averageRank;
      }),
    simulations,
    minGames: MIN_GAMES_FOR_PROJECTION,
    remainingGames: remainingGames.length,
    rankDate: standings.rankDate,
  };
}
