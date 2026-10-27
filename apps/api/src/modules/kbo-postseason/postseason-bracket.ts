/**
 * 정규시즌 최종 순위(시드)와 포스트시즌 경기 결과로 대진표를 만든다.
 * 와일드카드(4위·5위) → 준플레이오프(3위) → 플레이오프(2위) → 한국시리즈(1위) 순으로 올라간다.
 */

export type PostseasonSeriesId = '4' | '3' | '5' | '7';

export type PostseasonTeam = {
  teamId: number;
  shortName: string;
  name: string;
  /** 정규시즌 순위. 순위 데이터가 없으면 null */
  seed: number | null;
};

export type PostseasonGameInput = {
  id: number;
  seriesId: PostseasonSeriesId;
  gameDate: string;
  status: 'scheduled' | 'finished' | 'cancelled';
  homeTeam: Omit<PostseasonTeam, 'seed'>;
  awayTeam: Omit<PostseasonTeam, 'seed'>;
  homeScore: number | null;
  awayScore: number | null;
};

export type PostseasonGame = Omit<PostseasonGameInput, 'seriesId'>;

export type PostseasonRoundStatus = 'waiting' | 'upcoming' | 'in_progress' | 'finished';

export type PostseasonRound = {
  seriesId: PostseasonSeriesId;
  name: string;
  shortName: string;
  /** 시리즈를 가져가는 데 필요한 승수. 와일드카드는 상위 팀 1승, 하위 팀 2승 */
  winsNeeded: { higher: number; lower: number };
  higher: PostseasonTeam | null;
  lower: PostseasonTeam | null;
  /** 상대가 정해지지 않았을 때 보여 줄 자리 이름 (예: "와일드카드 승자") */
  higherPlaceholder: string;
  lowerPlaceholder: string;
  higherWins: number;
  lowerWins: number;
  draws: number;
  winnerTeamId: number | null;
  status: PostseasonRoundStatus;
  games: PostseasonGame[];
};

export type PostseasonBracket = {
  seasonYear: number;
  /** 포스트시즌 경기가 하나라도 잡혔는지 */
  active: boolean;
  rounds: PostseasonRound[];
  champion: PostseasonTeam | null;
};

type SeedTeam = PostseasonTeam & { seed: number };

const ROUNDS: {
  seriesId: PostseasonSeriesId;
  name: string;
  shortName: string;
  higherSeed: number;
  winsNeeded: { higher: number; lower: number };
}[] = [
  { seriesId: '4', name: '와일드카드 결정전', shortName: 'WC', higherSeed: 4, winsNeeded: { higher: 1, lower: 2 } },
  { seriesId: '3', name: '준플레이오프', shortName: '준PO', higherSeed: 3, winsNeeded: { higher: 3, lower: 3 } },
  { seriesId: '5', name: '플레이오프', shortName: 'PO', higherSeed: 2, winsNeeded: { higher: 3, lower: 3 } },
  { seriesId: '7', name: '한국시리즈', shortName: 'KS', higherSeed: 1, winsNeeded: { higher: 4, lower: 4 } },
];

/** 와일드카드는 2경기까지라 상위 팀이 1승 또는 2무를 거두면 올라간다 */
const WILD_CARD_MAX_GAMES = 2;

function withSeed(
  team: Omit<PostseasonTeam, 'seed'>,
  seeds: SeedTeam[],
): PostseasonTeam {
  return {
    ...team,
    seed: seeds.find((seed) => seed.teamId === team.teamId)?.seed ?? null,
  };
}

function compareSeed(a: PostseasonTeam, b: PostseasonTeam) {
  return (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER);
}

/** 경기에 나온 두 팀이 있으면 그 팀으로, 없으면 시드·앞 라운드 승자로 대진을 정한다 */
function resolveParticipants(input: {
  games: PostseasonGameInput[];
  seeds: SeedTeam[];
  expectedHigher: PostseasonTeam | null;
  expectedLower: PostseasonTeam | null;
}) {
  const fromGames = new Map<number, PostseasonTeam>();

  for (const game of input.games) {
    fromGames.set(game.homeTeam.teamId, withSeed(game.homeTeam, input.seeds));
    fromGames.set(game.awayTeam.teamId, withSeed(game.awayTeam, input.seeds));
  }

  if (fromGames.size === 2) {
    const [higher, lower] = [...fromGames.values()].sort(compareSeed);
    return { higher, lower };
  }

  return { higher: input.expectedHigher, lower: input.expectedLower };
}

function countResults(
  games: PostseasonGameInput[],
  higher: PostseasonTeam | null,
  lower: PostseasonTeam | null,
) {
  let higherWins = 0;
  let lowerWins = 0;
  let draws = 0;
  let finished = 0;

  for (const game of games) {
    if (game.status !== 'finished' || game.homeScore === null || game.awayScore === null) {
      continue;
    }

    finished += 1;

    if (game.homeScore === game.awayScore) {
      draws += 1;
      continue;
    }

    const winnerId =
      game.homeScore > game.awayScore ? game.homeTeam.teamId : game.awayTeam.teamId;

    if (winnerId === higher?.teamId) higherWins += 1;
    else if (winnerId === lower?.teamId) lowerWins += 1;
  }

  return { higherWins, lowerWins, draws, finished };
}

export function buildPostseasonBracket(input: {
  seasonYear: number;
  /** 정규시즌 최종 순위 1~5위 */
  seeds: SeedTeam[];
  games: PostseasonGameInput[];
}): PostseasonBracket {
  const seeds = [...input.seeds].sort((a, b) => a.seed - b.seed);
  const seedAt = (rank: number) => seeds.find((seed) => seed.seed === rank) ?? null;
  const rounds: PostseasonRound[] = [];
  let previousWinner: PostseasonTeam | null = null;
  let previousShortName: string | null = null;

  for (const round of ROUNDS) {
    const games = input.games
      .filter((game) => game.seriesId === round.seriesId && game.status !== 'cancelled')
      .sort((a, b) => a.gameDate.localeCompare(b.gameDate));
    const expectedLower =
      round.seriesId === '4' ? seedAt(5) : previousWinner;
    const { higher, lower } = resolveParticipants({
      games,
      seeds,
      expectedHigher: seedAt(round.higherSeed),
      expectedLower,
    });
    const { higherWins, lowerWins, draws, finished } = countResults(games, higher, lower);

    let winner: PostseasonTeam | null = null;
    if (higher && higherWins >= round.winsNeeded.higher) winner = higher;
    else if (lower && lowerWins >= round.winsNeeded.lower) winner = lower;
    else if (round.seriesId === '4' && higher && finished >= WILD_CARD_MAX_GAMES) winner = higher;

    const status: PostseasonRoundStatus = winner
      ? 'finished'
      : finished > 0
        ? 'in_progress'
        : higher && lower
          ? 'upcoming'
          : 'waiting';

    rounds.push({
      seriesId: round.seriesId,
      name: round.name,
      shortName: round.shortName,
      winsNeeded: round.winsNeeded,
      higher,
      lower,
      higherPlaceholder: `정규시즌 ${round.higherSeed}위`,
      lowerPlaceholder:
        round.seriesId === '4' ? '정규시즌 5위' : `${previousShortName} 승자`,
      higherWins,
      lowerWins,
      draws,
      winnerTeamId: winner?.teamId ?? null,
      status,
      games: games.map((game) => ({
        id: game.id,
        gameDate: game.gameDate,
        status: game.status,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      })),
    });

    previousWinner = winner;
    previousShortName = round.shortName;
  }

  return {
    seasonYear: input.seasonYear,
    active: input.games.length > 0,
    rounds,
    // 마지막 라운드(한국시리즈) 승자
    champion: previousWinner,
  };
}
