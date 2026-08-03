import { fetchKboText } from '../../lib/kbo-http.js';

export const KBO_TEAM_RANK_PAGE_URL =
  'https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';

/** 정규시즌 (일자별 팀순위 페이지 기본값) */
export const KBO_REGULAR_SEASON_SERIES_ID = '0';

export async function fetchKboTeamRankDailyPage() {
  const response = await fetchKboText(
    KBO_TEAM_RANK_PAGE_URL,
    {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    },
    'KBO 팀 순위 페이지',
  );

  return response.text;
}
