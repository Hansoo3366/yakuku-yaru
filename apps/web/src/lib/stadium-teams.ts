import type { CSSProperties } from 'react';
import type { Team } from '@/lib/baseball-api';
import { getAccessibleTeamSurface, normalizeTeamColor } from '@/lib/team-color';

/** `games.stadium` 명칭 → 홈 구단 (잠실은 LG·두산 공동 홈) */
const STADIUM_HOME_TEAM_RULES: Array<{ keywords: string[]; teams: string[] }> =
  [
    { keywords: ['잠실'], teams: ['LG', '두산'] },
    { keywords: ['광주', '챔피언스'], teams: ['KIA'] },
    { keywords: ['대구', '라이온즈', '포항'], teams: ['삼성'] },
    { keywords: ['대전', '한화'], teams: ['한화'] },
    { keywords: ['사직', '울산'], teams: ['롯데'] },
    { keywords: ['인천', 'SSG', '문학'], teams: ['SSG'] },
    { keywords: ['창원', 'NC파크'], teams: ['NC'] },
    { keywords: ['수원', 'KT위즈'], teams: ['KT'] },
    { keywords: ['고척'], teams: ['키움'] },
  ];

export function getStadiumHomeTeams(stadium: string, teams: Team[]) {
  const rule = STADIUM_HOME_TEAM_RULES.find((item) =>
    item.keywords.some((keyword) => stadium.includes(keyword)),
  );

  if (!rule) {
    return [];
  }

  return rule.teams
    .map((shortName) => teams.find((team) => team.shortName === shortName))
    .filter((team): team is Team => Boolean(team));
}

/**
 * 구장 화면용 팀 포인트 컬러 CSS 변수.
 * --stadium-color: 포인트색(하이라이트), --stadium-surface: 흰 글씨가 올라가는 진한 색,
 * --stadium-bar: 상단 띠. 공동 홈 구장은 두 팀 색을 반씩 나눈다.
 */
export function getStadiumColorStyle(homeTeams: Team[]): CSSProperties {
  const colors = homeTeams
    .map((team) => normalizeTeamColor(team.primaryColor))
    .filter((color): color is string => Boolean(color));

  if (!colors.length) {
    return {};
  }

  // 선택된 필터 배경처럼 흰 글씨가 올라가는 곳에 쓰는 진한 색
  const surface = getAccessibleTeamSurface(colors[0], 4.5);
  const split = (values: string[], angle: string) =>
    values.length > 1
      ? `linear-gradient(${angle}, ${values
          .map((value, index) => {
            const from = (index / values.length) * 100;
            const to = ((index + 1) / values.length) * 100;
            return `${value} ${from}% ${to}%`;
          })
          .join(', ')})`
      : values[0];

  return {
    '--stadium-color': colors[0],
    '--stadium-surface': surface,
    '--stadium-bar': split(colors, '90deg'),
  } as CSSProperties;
}
