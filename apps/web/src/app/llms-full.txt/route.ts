import type { Game, PostseasonBracket, PostseasonRound } from '@/lib/baseball-api';
import { getBoxScoreHighlights, type BoxScoreHighlights } from '@/lib/box-score-terms';
import {
  formatKoreanTime,
  formatKoreanWeekday,
  getKoreaDateString,
} from '@/lib/date-format';
import { getCancellationLabel } from '@/lib/game-cancellation';
import {
  fetchPublicBoxScore,
  fetchPublicPostseason,
  fetchPublicSeasonProjection,
  fetchPublicStandings,
  getKoreaSeasonYear,
  listPublicGames,
} from '@/lib/server-baseball-api';
import { getAbsoluteUrl } from '@/lib/site-url';

/**
 * AI 에이전트가 한 번의 요청으로 현재 리그 상황을 읽을 수 있는 텍스트 요약.
 * /llms.txt 가 "어디에 무엇이 있는지"의 안내라면, 이 파일은 지금의 순위·최근 결과·다가오는 일정
 * 자체를 마크다운으로 담는다.
 * 빌드 시점에는 API 에 닿지 못할 수 있으므로 미리 만들지 않고 요청 때 만든다.
 * (안에서 쓰는 조회는 5~10분씩 캐시된다)
 */
export const dynamic = 'force-dynamic';

/** 최근 결과에 승리·패전 투수를 붙이려고 받는 박스스코어 수. 한 주 경기 수(최대 35)를 넘지 않는다 */
const MAX_RESULT_BOX_SCORES = 35;

type HighlightsByGame = Map<number, BoxScoreHighlights>;

function describePitchers(highlights: BoxScoreHighlights | undefined) {
  if (!highlights) return '';

  const items = [
    highlights.winningPitcher ? `승 ${highlights.winningPitcher.name}` : null,
    highlights.losingPitcher ? `패 ${highlights.losingPitcher.name}` : null,
    highlights.savePitcher ? `세 ${highlights.savePitcher.name}` : null,
  ].filter(Boolean);

  return items.length ? ` | ${items.join(', ')}` : '';
}

function describeGame(game: Game, highlights?: HighlightsByGame) {
  const matchup = `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`;
  const result =
    game.status === 'cancelled'
      ? getCancellationLabel(game.cancellationReason)
      : game.awayScore !== null && game.homeScore !== null
        ? `${game.awayScore} : ${game.homeScore}`
        : '예정';
  const away = game.probablePitchers.away?.name;
  const home = game.probablePitchers.home?.name;
  const pitchers =
    away || home ? ` | 선발 ${away ?? '미정'} vs ${home ?? '미정'}` : '';

  return `- ${formatKoreanTime(game.gameDate)} ${matchup} | ${result} | ${game.stadium}${pitchers}${describePitchers(highlights?.get(game.id))} | ${getAbsoluteUrl(`/games/${game.id}`)}`;
}

function describeDays(games: Game[], highlights?: HighlightsByGame) {
  const byDay = new Map<string, Game[]>();

  for (const game of games) {
    const day = getKoreaDateString(game.gameDate);

    byDay.set(day, [...(byDay.get(day) ?? []), game]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([day, items]) =>
        `### ${day} (${formatKoreanWeekday(items[0].gameDate)})\n${items
          .sort(
            (a, b) =>
              new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime(),
          )
          .map((game) => describeGame(game, highlights))
          .join('\n')}`,
    )
    .join('\n\n');
}

const ROUND_STATUS_LABEL: Record<PostseasonRound['status'], string> = {
  waiting: '대진 미정',
  upcoming: '시작 전',
  in_progress: '진행 중',
  finished: '종료',
};

function describeRound(round: PostseasonRound) {
  const higher = round.higher?.name ?? round.higherPlaceholder;
  const lower = round.lower?.name ?? round.lowerPlaceholder;
  const winner = [round.higher, round.lower].find(
    (team) => team && team.teamId === round.winnerTeamId,
  );
  const record =
    round.status === 'in_progress' || round.status === 'finished'
      ? ` | 전적 ${round.higher?.shortName ?? '상위'} ${round.higherWins}승, ${round.lower?.shortName ?? '하위'} ${round.lowerWins}승${round.draws ? `, 무승부 ${round.draws}` : ''}`
      : '';
  const rule =
    round.seriesId === '4'
      ? '4위 팀이 1승을 안고 시작, 최대 2경기'
      : `${round.winsNeeded.higher}승 선승제`;
  const games = round.games
    .map((game, index) => {
      const score =
        game.awayScore !== null && game.homeScore !== null && game.status === 'finished'
          ? `${game.awayScore} : ${game.homeScore}`
          : getKoreaDateString(game.gameDate);

      return `  - ${index + 1}차전 ${game.awayTeam.shortName} vs ${game.homeTeam.shortName} | ${score} | ${getAbsoluteUrl(`/games/${game.id}`)}`;
    })
    .join('\n');

  return `- ${round.name} (${rule}): ${higher} vs ${lower} | ${ROUND_STATUS_LABEL[round.status]}${record}${winner ? ` | ${winner.name} 진출` : ''}${games ? `\n${games}` : ''}`;
}

function describePostseason(bracket: PostseasonBracket) {
  return `## ${bracket.seasonYear} KBO 포스트시즌 대진

정규시즌 1~5위가 계단식으로 올라갑니다. 와일드카드 결정전(4위 vs 5위) 승자가 준플레이오프에서 3위와, 그 승자가 플레이오프에서 2위와, 그 승자가 한국시리즈에서 1위와 맞붙습니다. 스코어는 "원정 : 홈" 순서입니다.${bracket.champion ? `\n\n**${bracket.seasonYear} 한국시리즈 우승: ${bracket.champion.name}**` : ''}

${bracket.rounds.map(describeRound).join('\n')}`;
}

/** 끝난 경기의 승리·패전·세이브 투수 */
async function loadHighlights(games: Game[]): Promise<HighlightsByGame> {
  const finished = games
    .filter((game) => game.status === 'finished')
    .slice(-MAX_RESULT_BOX_SCORES);
  const boxScores = await Promise.all(
    finished.map(async (game) => [game.id, await fetchPublicBoxScore(game.id)] as const),
  );

  return new Map(
    boxScores.flatMap(([gameId, boxScore]) =>
      boxScore ? [[gameId, getBoxScoreHighlights(boxScore)] as const] : [],
    ),
  );
}

export async function GET() {
  const seasonYear = getKoreaSeasonYear();
  const today = getKoreaDateString();
  const [standings, projection, games, postseason] = await Promise.all([
    fetchPublicStandings(seasonYear),
    fetchPublicSeasonProjection(seasonYear),
    listPublicGames({
      from: getKoreaDateString(new Date(), -7),
      to: getKoreaDateString(new Date(), 8),
    }),
    fetchPublicPostseason(seasonYear),
  ]);
  const recent = (games ?? []).filter(
    (game) => getKoreaDateString(game.gameDate) < today,
  );
  const upcoming = (games ?? []).filter(
    (game) => getKoreaDateString(game.gameDate) >= today,
  );
  const highlights = await loadHighlights(recent);
  const sections = [
    `# 야크크 야르 - KBO 리그 현황 요약

> ${today} (한국 시간) 기준. KBO 프로야구의 팀 순위, 포스트시즌 대진, 최근 일주일 결과, 앞으로 일주일 일정입니다. 비공식 팬 서비스의 데이터이며 공식 기록과 조금 다를 수 있습니다. 스코어는 "원정 : 홈" 순서입니다.

사이트 안내는 ${getAbsoluteUrl('/llms.txt')} 에 있습니다.`,
  ];

  if (standings?.items.length) {
    sections.push(
      `## ${standings.seasonYear} KBO 팀 순위${standings.rankDate ? ` (${standings.rankDate} 기준)` : ''}

| 순위 | 팀 | 경기 | 승 | 패 | 무 | 승률 | 게임차 | 최근 10경기 | 연속 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${standings.items
  .map(
    (item) =>
      `| ${item.rank} | ${item.teamName} | ${item.games} | ${item.wins} | ${item.losses} | ${item.draws} | ${item.winRate > 1 ? item.winRate : (item.winRate * 100).toFixed(1)}% | ${item.gamesBehind} | ${item.recentTen || '-'} | ${item.streak || '-'} |`,
  )
  .join('\n')}

페이지: ${getAbsoluteUrl('/standings')}`,
    );
  }

  if (postseason?.active) {
    sections.push(describePostseason(postseason));
  }

  if (projection?.status === 'regularSeason' && projection.rows.length) {
    const rows = [...projection.rows].sort(
      (a, b) => a.averageRank - b.averageRank,
    );

    sections.push(
      `## ${projection.seasonYear} 시즌 예상 순위 (시뮬레이션 ${projection.simulations.toLocaleString('en-US')}회)

현재 승률과 피타고리안 승률을 섞은 전력으로 남은 일정을 시뮬레이션한 추정치입니다. 가을야구 확률은 최종 5위 이내에 든 비율입니다.

| 예상 순위 | 팀 | 평균 순위 | 가을야구 확률 | 예상 승 | 예상 무 | 예상 패 |
| --- | --- | --- | --- | --- | --- | --- |
${rows
  .map(
    (row, index) =>
      `| ${index + 1} | ${row.teamName} | ${row.averageRank.toFixed(1)} | ${(row.playoffProbability * 100).toFixed(1)}% | ${row.averageWins.toFixed(1)} | ${row.averageDraws.toFixed(1)} | ${row.averageLosses.toFixed(1)} |`,
  )
  .join('\n')}`,
    );
  }

  if (projection?.status === 'postseason' && projection.postseasonRows.length) {
    sections.push(
      `## ${projection.seasonYear} 포스트시즌 최종 예측

| 정규 순위 | 팀 | 우승 확률 | 한국시리즈 진출 확률 |
| --- | --- | --- | --- |
${projection.postseasonRows
  .map(
    (row) =>
      `| ${row.seed} | ${row.teamName} | ${(row.championshipProbability * 100).toFixed(1)}% | ${(row.koreanSeriesProbability * 100).toFixed(1)}% |`,
  )
  .join('\n')}`,
    );
  }

  if (upcoming.length) {
    sections.push(`## 오늘부터 일주일 경기 일정\n\n${describeDays(upcoming)}`);
  }

  if (recent.length) {
    sections.push(`## 최근 일주일 경기 결과\n\n${describeDays(recent, highlights)}`);
  }

  sections.push(`## 더 보기

- 월별 전체 일정·결과: ${getAbsoluteUrl(`/schedule/${today.slice(0, 7)}`)} (\`/schedule/YYYY-MM\`)
- 선수 응원가 가사: ${getAbsoluteUrl('/cheers')} (\`/cheers/{playerId}\`)
- 구장별 맛집·주차 팬 메모: ${getAbsoluteUrl('/stadiums')}
- 직관 후기 게시판: ${getAbsoluteUrl('/posts')}
- JSON API 명세: ${getAbsoluteUrl('/api-docs.json')}`);

  return new Response(`${sections.join('\n\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
