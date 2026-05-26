export const KBO_TEAM_RANK_PAGE_URL =
  'https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';

/** 정규시즌 (일자별 팀순위 페이지 기본값) */
export const KBO_REGULAR_SEASON_SERIES_ID = '0';

export async function fetchKboTeamRankDailyPage() {
  const response = await fetch(KBO_TEAM_RANK_PAGE_URL, {
    headers: {
      'User-Agent': 'YakukuYaru/1.0 (+https://yakuku-yaru.today; team-rank-sync)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`KBO 팀 순위 페이지 요청 실패 (${response.status})`);
  }

  return response.text();
}
