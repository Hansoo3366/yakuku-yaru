'use client';

import { OpponentInsightRanking } from '@/components/OpponentInsightRanking';
import type { RankedOpponentInsightItem } from '@/lib/calendar-opponent-insights';
import {
  formatWinRateLabel,
  type WinRateSnapshot,
} from '@/lib/calendar-win-rates';
import { josa } from '@/lib/josa';

type CalendarStatsRailProps = {
  statsYear: number;
  /** 응원팀이 있을 때만 시즌 승률과 상대 순위를 보여 준다. */
  hasFavoriteTeam: boolean;
  favoriteTeamShortName: string | null;
  stats: {
    stadiumWinRate: WinRateSnapshot;
    homeWinRate: WinRateSnapshot;
    teamWinRate: WinRateSnapshot;
    teamWinRateHigh: RankedOpponentInsightItem[];
    stadiumWinRateHigh: RankedOpponentInsightItem[];
  };
};

/** 로그인한 사용자에게 보여 주는 오른쪽 승률 요약 */
export function CalendarStatsRail({
  statsYear,
  hasFavoriteTeam,
  favoriteTeamShortName,
  stats,
}: CalendarStatsRailProps) {
  return (
    <aside aria-label="승률 요약" className="cal-rail">
      <section>
        <h2>{statsYear}년 내 승률</h2>
        <dl className="cal-rates">
          <div>
            <dt>직관</dt>
            <dd>{formatWinRateLabel(stats.stadiumWinRate)}</dd>
          </div>
          <div>
            <dt>집관</dt>
            <dd>{formatWinRateLabel(stats.homeWinRate)}</dd>
          </div>
          {hasFavoriteTeam && favoriteTeamShortName ? (
            <div>
              <dt>{favoriteTeamShortName} 시즌</dt>
              <dd>{formatWinRateLabel(stats.teamWinRate)}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      {hasFavoriteTeam ? (
        <>
          <section>
            <h2>{josa(favoriteTeamShortName ?? '우리 팀', '이')} 강한 상대</h2>
            <OpponentInsightRanking
              items={stats.teamWinRateHigh}
              title="상대 승률 높은 팀"
              variant="high"
            />
          </section>
          <section>
            <h2>내가 직관 가면 이기는 상대</h2>
            <OpponentInsightRanking
              items={stats.stadiumWinRateHigh}
              title="직관 승률 높은 팀"
              variant="high"
            />
          </section>
        </>
      ) : null}
    </aside>
  );
}
