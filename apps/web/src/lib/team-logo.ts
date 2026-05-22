import type { Team } from './baseball-api';

const logoByShortName: Record<string, string> = {
  LG: 'lg',
  두산: 'doosan',
  KIA: 'kia',
  삼성: 'samsung',
  한화: 'hanhwa',
  롯데: 'lotte',
  SSG: 'ssg',
  NC: 'nc',
  KT: 'kt',
  키움: 'kiwoom',
};

export function getTeamLogoSrc(team?: Pick<Team, 'shortName'> | null) {
  if (!team) {
    return '';
  }

  const key = logoByShortName[team.shortName];

  return key ? `/team-logo/logo_${key}.svg` : '';
}
