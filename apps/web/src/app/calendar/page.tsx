'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMe } from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import {
  listGames,
  listTeamStandings,
  listTeams,
  type Game,
  type Team,
  type TeamStandingsResponse,
} from '@/lib/baseball-api';
import {
  listAttendanceRecords,
  type AttendanceRecord,
} from '@/lib/attendance-api';
import { CalendarAgendaView } from '@/components/CalendarAgendaView';
import { CalendarEventCard } from '@/components/CalendarEventCard';
import { CalendarOutcomeLegend } from '@/components/CalendarOutcomeLegend';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { getStadiumAttendanceOpponentInsights } from '@/lib/calendar-opponent-insights';
import { OpponentInsightRanking } from '@/components/OpponentInsightRanking';
import {
  formatWinRateLabel,
  getHomeAttendanceWinRate,
  getStadiumAttendanceWinRate,
} from '@/lib/calendar-win-rates';
import {
  getKboFavoriteTeamSeasonWinRate,
  getKboOpponentWinRateInsights,
} from '@/lib/kbo-season-insights';
import {
  formatDateInput,
  formatWeekLabel,
  getCalendarMonthDays,
  getMonthRange,
  getMonthStart,
  getWeekDays,
  getWeekRange,
  getWeekStart,
  getYearRange,
  isSameDay,
} from '@/lib/calendar-range';
import { useMediaQuery } from '@/lib/use-media-query';

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

type ViewMode = 'month' | 'week';

function gameFromAttendanceRecord(record: AttendanceRecord, gamesById: Map<number, Game>): Game {
  const existing = gamesById.get(record.gameId);

  if (existing) {
    return existing;
  }

  return {
    id: record.gameId,
    gameDate: record.game.gameDate,
    stadium: record.game.stadium,
    homeTeam: record.game.homeTeam as Game['homeTeam'],
    awayTeam: record.game.awayTeam as Game['awayTeam'],
    homeScore: record.game.homeScore,
    awayScore: record.game.awayScore,
    status: record.game.status,
    ticketUrl: null,
    ticketOpenAt: null,
    stadiumGuide: null,
  };
}

function shiftAnchor(date: Date, viewMode: ViewMode, amount: number) {
  if (viewMode === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  }

  const next = new Date(date);
  next.setDate(next.getDate() + amount * 7);
  return getWeekStart(next);
}

export default function CalendarPage() {
  const router = useRouter();
  useAuthGuard();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchorDate, setAnchorDate] = useState(() => getMonthStart(new Date()));
  const [user, setUser] = useState<PublicUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    [],
  );
  const [yearAttendanceRecords, setYearAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [yearSeasonGames, setYearSeasonGames] = useState<Game[]>([]);
  const [teamStandings, setTeamStandings] = useState<TeamStandingsResponse | null>(
    null,
  );
  const [scheduleFilter, setScheduleFilter] = useState<
    'favorite' | 'favorite-home' | 'all'
  >('favorite');
  const [watchTypeFilter, setWatchTypeFilter] = useState<
    'all' | 'stadium' | 'home'
  >('all');
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 720px)');

  const monthStart = useMemo(() => getMonthStart(anchorDate), [anchorDate]);
  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);
  const range = useMemo(
    () =>
      viewMode === 'month' ? getMonthRange(monthStart) : getWeekRange(weekStart),
    [viewMode, monthStart, weekStart],
  );
  const rangeKey = `${viewMode}:${range.from}:${range.to}`;
  const statsYear = anchorDate.getFullYear();
  const yearRange = useMemo(() => getYearRange(statsYear), [statsYear]);
  const yearRangeKey = `${yearRange.from}:${yearRange.to}`;

  useEffect(() => {
    let isMounted = true;
    const token = getAccessToken();

    if (!token) {
      router.replace('/');
      return;
    }

    setIsLoading(true);

    Promise.all([fetchMe(token), listTeams()])
      .then(async ([meResponse, teamsResponse]) => {
        if (!isMounted) return null;

        setUser(meResponse.user);
        setTeams(teamsResponse.items);

        const favoriteTeamId = meResponse.user.favoriteTeamId;
        const [gamesResponse, attendanceResponse] = await Promise.all([
          listGames({
            ...range,
            teamId:
              scheduleFilter !== 'all' ? favoriteTeamId ?? undefined : undefined,
          }),
          listAttendanceRecords(range, token),
        ]);

        if (!isMounted) return null;

        const nextGames =
          scheduleFilter === 'favorite-home' && favoriteTeamId
            ? gamesResponse.items.filter(
                (game) => game.homeTeam.id === favoriteTeamId,
              )
            : gamesResponse.items;

        return { nextGames, attendanceResponse };
      })
      .then((result) => {
        if (!result || !isMounted) return;
        setGames(result.nextGames);
        setAttendanceRecords(result.attendanceResponse.items);
      })
      .catch(() => {
        clearAccessToken();
        router.replace('/');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rangeKey, router, scheduleFilter]);

  useEffect(() => {
    let isMounted = true;
    const token = getAccessToken();

    if (!token) {
      return;
    }

    listAttendanceRecords(yearRange, token)
      .then((response) => {
        if (isMounted) {
          setYearAttendanceRecords(response.items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setYearAttendanceRecords([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [yearRangeKey, router]);

  useEffect(() => {
    let isMounted = true;

    listTeamStandings(statsYear)
      .then((response) => {
        if (isMounted) {
          setTeamStandings(response);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTeamStandings(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [statsYear]);

  useEffect(() => {
    let isMounted = true;

    if (!user?.favoriteTeamId) {
      setYearSeasonGames([]);
      return () => {
        isMounted = false;
      };
    }

    listGames({ ...yearRange, teamId: user.favoriteTeamId })
      .then((response) => {
        if (isMounted) {
          setYearSeasonGames(response.items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setYearSeasonGames([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [yearRangeKey, user?.favoriteTeamId]);

  const ownAttendanceRecords = useMemo(
    () => attendanceRecords.filter((record) => record.viewerRelation === 'owner'),
    [attendanceRecords],
  );

  const filteredAttendanceRecords = useMemo(() => {
    if (watchTypeFilter === 'all') {
      return ownAttendanceRecords;
    }

    return ownAttendanceRecords.filter(
      (record) => record.watchType === watchTypeFilter,
    );
  }, [ownAttendanceRecords, watchTypeFilter]);

  const periodRecords = useMemo(() => {
    const fromMs = new Date(`${range.from}T00:00:00`).getTime();
    const toMs = new Date(`${range.to}T00:00:00`).getTime();

    return filteredAttendanceRecords.filter((record) => {
      const ms = new Date(record.game.gameDate).getTime();
      return ms >= fromMs && ms < toMs;
    });
  }, [filteredAttendanceRecords, range.from, range.to]);

  const statsAttendanceRecords = useMemo(() => {
    const byId = new Map<number, AttendanceRecord>();

    for (const record of yearAttendanceRecords) {
      byId.set(record.id, record);
    }

    for (const record of ownAttendanceRecords) {
      const recordYear = new Date(record.game.gameDate).getFullYear();

      if (recordYear === statsYear) {
        byId.set(record.id, record);
      }
    }

    return [...byId.values()];
  }, [yearAttendanceRecords, ownAttendanceRecords, statsYear]);

  const yearStadiumWinRate = useMemo(
    () =>
      getStadiumAttendanceWinRate(
        statsAttendanceRecords,
        user?.favoriteTeamId,
      ),
    [statsAttendanceRecords, user?.favoriteTeamId],
  );
  const yearHomeWinRate = useMemo(
    () =>
      getHomeAttendanceWinRate(statsAttendanceRecords, user?.favoriteTeamId),
    [statsAttendanceRecords, user?.favoriteTeamId],
  );
  const yearTeamWinRate = useMemo(
    () => getKboFavoriteTeamSeasonWinRate(teamStandings, user?.favoriteTeamId),
    [teamStandings, user?.favoriteTeamId],
  );
  const opponentInsights = useMemo(() => {
    const kbo = getKboOpponentWinRateInsights(
      yearSeasonGames,
      user?.favoriteTeamId,
    );
    const stadium = getStadiumAttendanceOpponentInsights(
      statsAttendanceRecords,
      user?.favoriteTeamId,
    );

    return {
      teamWinRateHigh: kbo.high,
      teamWinRateLow: kbo.low,
      stadiumWinRateHigh: stadium.high,
      stadiumWinRateLow: stadium.low,
    };
  }, [
    yearSeasonGames,
    statsAttendanceRecords,
    user?.favoriteTeamId,
  ]);

  const favoriteTeamStanding = useMemo(() => {
    if (!user?.favoriteTeamId || !teamStandings?.items.length) {
      return null;
    }

    return (
      teamStandings.items.find((item) => item.teamId === user.favoriteTeamId) ??
      null
    );
  }, [teamStandings, user?.favoriteTeamId]);

  const gamesByDate = useMemo(
    () =>
      games.reduce<Record<string, Game[]>>((acc, game) => {
        const key = game.gameDate.slice(0, 10);
        acc[key] = [...(acc[key] ?? []), game];
        return acc;
      }, {}),
    [games],
  );

  const gamesById = useMemo(
    () => new Map(games.map((game) => [game.id, game])),
    [games],
  );

  const displayGamesByDate = useMemo(() => {
    if (watchTypeFilter === 'all') {
      return gamesByDate;
    }

    const result: Record<string, Game[]> = {};

    for (const record of filteredAttendanceRecords) {
      const key = record.game.gameDate.slice(0, 10);
      const game = gameFromAttendanceRecord(record, gamesById);
      const dayGames = result[key] ?? [];

      if (!dayGames.some((item) => item.id === game.id)) {
        result[key] = [...dayGames, game];
      }
    }

    return result;
  }, [watchTypeFilter, gamesByDate, filteredAttendanceRecords, gamesById]);

  const displayGameCount = useMemo(() => {
    if (watchTypeFilter === 'all') {
      return games.length;
    }

    return Object.values(displayGamesByDate).reduce(
      (total, dayGames) => total + dayGames.length,
      0,
    );
  }, [watchTypeFilter, games.length, displayGamesByDate]);

  const attendanceByGameId = filteredAttendanceRecords.reduce<
    Record<number, AttendanceRecord>
  >((acc, record) => {
    acc[record.gameId] = record;
    return acc;
  }, {});

  const attendanceByDate = filteredAttendanceRecords.reduce<
    Record<string, AttendanceRecord[]>
  >((acc, record) => {
    const key = record.game.gameDate.slice(0, 10);
    acc[key] = [...(acc[key] ?? []), record];
    return acc;
  }, {});

  const days =
    viewMode === 'month'
      ? getCalendarMonthDays(monthStart)
      : getWeekDays(weekStart);

  const favoriteTeam = teams.find((team) => team.id === user?.favoriteTeamId);

  function renderDayCell(date: Date, options: { dense: boolean; inMonth: boolean }) {
    const key = formatDateInput(date);
    const dayGames = displayGamesByDate[key] ?? [];
    const dayRecords = attendanceByDate[key] ?? [];

    const visibleGameIds = new Set(dayGames.map((game) => game.id));
    const extraRecords = dayRecords.filter(
      (record) => !visibleGameIds.has(record.gameId),
    );
    const isOutside = !options.inMonth;
    const isToday = isSameDay(date, new Date());
    const dayOfWeek = date.getDay();
    const classNames = [
      'calendar-day',
      viewMode === 'week' ? 'calendar-day--week' : '',
      isOutside ? 'is-outside' : '',
      isToday ? 'is-today' : '',
      dayRecords.length ? 'has-record' : '',
      dayOfWeek === 0 ? 'is-sunday' : '',
      dayOfWeek === 6 ? 'is-saturday' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={classNames} key={key}>
        <span className="calendar-day-number">{date.getDate()}</span>
        <div className="calendar-events">
          {dayGames.map((game) => {
            const attendance = attendanceByGameId[game.id];
            const href = attendance
              ? `/attendance/${attendance.id}`
              : `/games/${game.id}`;

            return (
              <CalendarEventCard
                attendance={attendance}
                dense={options.dense}
                favoriteTeamId={user?.favoriteTeamId}
                game={game}
                href={href}
                key={game.id}
              />
            );
          })}
          {extraRecords.map((record) => (
            <CalendarEventCard
              attendance={record}
              dense={options.dense}
              favoriteTeamId={user?.favoriteTeamId}
              game={{
                id: record.gameId,
                gameDate: record.game.gameDate,
                stadium: record.game.stadium,
                homeTeam: record.game.homeTeam,
                awayTeam: record.game.awayTeam,
                homeScore: record.game.homeScore,
                awayScore: record.game.awayScore,
                status: record.game.status,
              }}
              href={`/attendance/${record.id}`}
              key={`record-${record.id}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const toolbarTitle =
    viewMode === 'month'
      ? `${anchorDate.getFullYear()}.${String(anchorDate.getMonth() + 1).padStart(2, '0')}`
      : formatWeekLabel(weekStart);

  const periodLabel = viewMode === 'month' ? '이번 달' : '이번 주';
  const showTeamWinRate = Boolean(user?.favoriteTeamId);
  const teamRateLabel = favoriteTeam
    ? `우리팀(${favoriteTeam.shortName}) 승률`
    : null;
  const favoriteRankLabel = favoriteTeamStanding
    ? `${favoriteTeamStanding.rank}위`
    : favoriteTeam
      ? '—'
      : null;

  return (
    <main className="app-shell app-shell--calendar with-bottom-nav">
      <header className="app-page-header">
        <span className="eyebrow">Calendar</span>
        <h1>
          {favoriteTeam ? `${favoriteTeam.shortName} 직관 캘린더` : '직관 캘린더'}
        </h1>
        <p>
          {user?.nickname
            ? `${user.nickname}님의 ${viewMode === 'month' ? '월간' : '주간'} 일정과 기록`
            : '경기 일정과 기록을 한 번에 확인하세요.'}
        </p>
      </header>

      <section
        className={`calendar-summary-row${
          favoriteRankLabel ? '' : ' calendar-summary-row--duo'
        }`}
        aria-label="기간 요약"
      >
        <div className="calendar-summary-card">
          <span>{periodLabel} 경기</span>
          <strong>{displayGameCount}</strong>
        </div>
        <div className="calendar-summary-card">
          <span>기록한 경기</span>
          <strong>{periodRecords.length}</strong>
        </div>
        {favoriteRankLabel ? (
          <div className="calendar-summary-card">
            <span>{favoriteTeam?.shortName ?? '우리팀'} 순위</span>
            <strong>{favoriteRankLabel}</strong>
          </div>
        ) : null}
      </section>

      <section className="calendar-win-rate-panel" aria-label="승률 요약">
        <div className="calendar-win-rate-group">
          <h2 className="calendar-win-rate-heading">
            {statsYear}년
            <small>연간 승률</small>
          </h2>
          <div
            className={`calendar-summary-row calendar-summary-row--rates${
              showTeamWinRate ? ' calendar-summary-row--trio' : ''
            }`}
          >
            <div className="calendar-summary-card">
              <span>직관 승률</span>
              <strong>{formatWinRateLabel(yearStadiumWinRate)}</strong>
            </div>
            <div className="calendar-summary-card">
              <span>집관 승률</span>
              <strong>{formatWinRateLabel(yearHomeWinRate)}</strong>
            </div>
            {showTeamWinRate && teamRateLabel ? (
              <div className="calendar-summary-card">
                <span>{teamRateLabel}</span>
                <strong>{formatWinRateLabel(yearTeamWinRate)}</strong>
              </div>
            ) : null}
          </div>
        </div>
        {showTeamWinRate ? (
          <div className="calendar-win-rate-group">
            <h2 className="calendar-win-rate-heading">상대 팀 인사이트</h2>
            <div className="calendar-summary-row calendar-summary-row--quad">
              <div className="calendar-summary-card calendar-summary-card--ranking">
                <span>상대 승률 높은 팀</span>
                <OpponentInsightRanking
                  items={opponentInsights.teamWinRateHigh}
                  title="상대 승률 높은 팀"
                  variant="high"
                />
              </div>
              <div className="calendar-summary-card calendar-summary-card--ranking">
                <span>상대 승률 낮은 팀</span>
                <OpponentInsightRanking
                  items={opponentInsights.teamWinRateLow}
                  showViewAll={false}
                  title="상대 승률 낮은 팀"
                  variant="low"
                />
              </div>
              <div className="calendar-summary-card calendar-summary-card--ranking">
                <span>직관 승률 높은 팀</span>
                <OpponentInsightRanking
                  items={opponentInsights.stadiumWinRateHigh}
                  title="직관 승률 높은 팀"
                  variant="high"
                />
              </div>
              <div className="calendar-summary-card calendar-summary-card--ranking">
                <span>직관 승률 낮은 팀</span>
                <OpponentInsightRanking
                  items={opponentInsights.stadiumWinRateLow}
                  title="직관 승률 낮은 팀"
                  variant="low"
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="calendar-toolbar" aria-label="기간 이동">
        <button
          aria-label={viewMode === 'month' ? '이전 달' : '이전 주'}
          className="icon-button"
          onClick={() => setAnchorDate((current) => shiftAnchor(current, viewMode, -1))}
          type="button"
        >
          ←
        </button>
        <div className="calendar-month-label">
          <small>{viewMode === 'month' ? 'Monthly' : 'Weekly'}</small>
          <span>{toolbarTitle}</span>
        </div>
        <button
          aria-label={viewMode === 'month' ? '다음 달' : '다음 주'}
          className="icon-button"
          onClick={() => setAnchorDate((current) => shiftAnchor(current, viewMode, 1))}
          type="button"
        >
          →
        </button>
      </section>

      <section className="calendar-filter-bar" aria-label="캘린더 필터">
        <div className="calendar-filter-groups">
        <div className="filter-group">
          <span className="filter-group-label">보기</span>
          <button
            className={`filter-pill ${viewMode === 'month' ? 'is-selected' : ''}`}
            onClick={() => {
              setViewMode('month');
              setAnchorDate(getMonthStart(anchorDate));
            }}
            type="button"
          >
            월간
          </button>
          <button
            className={`filter-pill ${viewMode === 'week' ? 'is-selected' : ''}`}
            onClick={() => {
              setViewMode('week');
              setAnchorDate(getWeekStart(new Date()));
            }}
            type="button"
          >
            주간
          </button>
        </div>
        <div className="filter-group">
          <span className="filter-group-label">경기</span>
          <button
            className={`filter-pill ${scheduleFilter === 'favorite' ? 'is-selected' : ''}`}
            onClick={() => setScheduleFilter('favorite')}
            type="button"
          >
            내 팀만
          </button>
          <button
            className={`filter-pill ${scheduleFilter === 'favorite-home' ? 'is-selected' : ''}`}
            disabled={!user?.favoriteTeamId}
            onClick={() => setScheduleFilter('favorite-home')}
            type="button"
          >
            홈 경기
          </button>
          <button
            className={`filter-pill ${scheduleFilter === 'all' ? 'is-selected' : ''}`}
            onClick={() => setScheduleFilter('all')}
            type="button"
          >
            전체
          </button>
        </div>
        <div className="filter-group">
          <span className="filter-group-label">기록</span>
          {(['all', 'stadium', 'home'] as const).map((type) => (
            <button
              className={`filter-pill ${watchTypeFilter === type ? 'is-selected' : ''}`}
              key={type}
              onClick={() => setWatchTypeFilter(type)}
              type="button"
            >
              {type === 'all' ? '전체' : type === 'stadium' ? '직관' : '집관'}
            </button>
          ))}
        </div>
        </div>
        {user?.favoriteTeamId ? <CalendarOutcomeLegend /> : null}
      </section>

      {isLoading ? (
        <div className="card">
          <Skeleton height={isMobile ? 360 : viewMode === 'week' ? 520 : 420} radius={10} />
        </div>
      ) : isMobile ? (
        <CalendarAgendaView
          attendanceByDate={attendanceByDate}
          attendanceByGameId={attendanceByGameId}
          days={days}
          favoriteTeamId={user?.favoriteTeamId}
          gamesByDate={displayGamesByDate}
          referenceMonth={viewMode === 'month' ? monthStart : undefined}
          showOutsideDays={viewMode === 'week'}
        />
      ) : (
        <section
          className={`calendar-card${viewMode === 'week' ? ' calendar-card--week' : ''}`}
          aria-label={viewMode === 'month' ? '월간 캘린더' : '주간 캘린더'}
        >
          <div className="calendar-weekdays" aria-hidden="true">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((date) =>
              renderDayCell(date, {
                dense: viewMode === 'month',
                inMonth:
                  viewMode === 'week' ||
                  date.getMonth() === monthStart.getMonth(),
              }),
            )}
          </div>
        </section>
      )}

      {!isLoading && displayGameCount === 0 ? (
        <EmptyState
          icon="◌"
          title={
            watchTypeFilter === 'all'
              ? scheduleFilter === 'favorite-home'
                ? viewMode === 'month'
                  ? '이번 달엔 홈 경기가 없어요'
                  : '이번 주엔 홈 경기가 없어요'
                : viewMode === 'month'
                  ? '이번 달엔 경기 일정이 없어요'
                  : '이번 주엔 경기 일정이 없어요'
              : watchTypeFilter === 'stadium'
                ? '이번 기간에 직관 기록이 없어요'
                : '이번 기간에 집관 기록이 없어요'
          }
          description={
            watchTypeFilter === 'all'
              ? scheduleFilter === 'favorite-home'
                ? '원정 일정은 「내 팀만」으로 확인해보세요.'
                : '다른 기간으로 이동해보세요.'
              : '직관 기록을 남기거나 다른 기간을 확인해보세요.'
          }
        />
      ) : null}
    </main>
  );
}
