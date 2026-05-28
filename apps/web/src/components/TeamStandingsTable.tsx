/* eslint-disable @next/next/no-img-element */

import type { TeamStandingsResponse } from '@/lib/baseball-api';
import { getTeamLogoSrc } from '@/lib/team-logo';

type Props = {
  standings: TeamStandingsResponse | null;
  highlightTeamId?: number | null;
};

function formatStandingWinRate(winRate: number) {
  if (winRate > 1) {
    return `${winRate}%`;
  }

  return `${(winRate * 100).toFixed(1)}%`;
}

function formatRecentTenRecord(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const normalized = value.replace(/\s+/g, '');
  const match = normalized.match(/^(\d+승)(\d+무)(\d+패)$/);

  if (!match) {
    return value;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getStreakBadgeKind(value: string | null | undefined) {
  if (!value) {
    return 'none';
  }

  if (value.includes('승')) {
    return 'win';
  }

  if (value.includes('패')) {
    return 'lose';
  }

  if (value.includes('무')) {
    return 'draw';
  }

  return 'none';
}

export function TeamStandingsTable({ standings, highlightTeamId }: Props) {
  if (!standings?.items.length) {
    return (
      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        팀 순위 데이터가 아직 없어요. 잠시 후 다시 확인해주세요.
      </p>
    );
  }

  return (
    <div className="standings-table-wrap">
      {standings.rankDate ? (
        <p className="standings-as-of muted">
          {standings.seasonYear}시즌 · {standings.rankDate.replace(/-/g, '.')}{' '}
          기준
        </p>
      ) : null}
      <table className="standings-table">
        <thead>
          <tr>
            <th scope="col">순위</th>
            <th scope="col">팀</th>
            <th scope="col">경기</th>
            <th scope="col">승</th>
            <th scope="col">패</th>
            <th scope="col">무</th>
            <th scope="col">승률</th>
            <th scope="col">게임차</th>
            <th scope="col">최근 10경기</th>
            <th scope="col">연속</th>
          </tr>
        </thead>
        <tbody>
          {standings.items.map((item) => {
            const isHighlighted = highlightTeamId === item.teamId;

            return (
              <tr
                className={isHighlighted ? 'is-highlighted' : undefined}
                key={item.teamId}
              >
                <td>{item.rank}</td>
                <td>
                  <span className="standings-team-cell">
                    <img
                      alt=""
                      src={getTeamLogoSrc({ shortName: item.teamShortName })}
                    />
                    {item.teamShortName}
                  </span>
                </td>
                <td>{item.games}</td>
                <td>{item.wins}</td>
                <td>{item.losses}</td>
                <td>{item.draws}</td>
                <td>{formatStandingWinRate(item.winRate)}</td>
                <td>{item.gamesBehind}</td>
                <td>{formatRecentTenRecord(item.recentTen)}</td>
                <td>
                  <span
                    className="standings-streak-badge"
                    data-kind={getStreakBadgeKind(item.streak)}
                  >
                    {item.streak || '-'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
