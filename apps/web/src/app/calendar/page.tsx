'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMe } from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import {
  listGames,
  listTeams,
  type Game,
  type Team,
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
import {
  formatDateInput,
  formatWeekLabel,
  getCalendarMonthDays,
  getMonthRange,
  getMonthStart,
  getWeekDays,
  getWeekRange,
  getWeekStart,
  isSameDay,
} from '@/lib/calendar-range';
import { useMediaQuery } from '@/lib/use-media-query';

const initialAnchor = new Date(2026, 4, 1);
const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

type ViewMode = 'month' | 'week';

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
  const [anchorDate, setAnchorDate] = useState(initialAnchor);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    [],
  );
  const [scheduleScope, setScheduleScope] = useState<'favorite' | 'all'>(
    'favorite',
  );
  const [watchTypeFilter, setWatchTypeFilter] = useState<
    'all' | 'stadium' | 'home'
  >('all');
  const [recordsOnly, setRecordsOnly] = useState(false);
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

  useEffect(() => {
    let isMounted = true;
    const token = getAccessToken();

    if (!token) {
      router.replace('/');
      return;
    }

    setIsLoading(true);

    Promise.all([fetchMe(token), listTeams()])
      .then(([meResponse, teamsResponse]) => {
        if (!isMounted) return null;

        setUser(meResponse.user);
        setTeams(teamsResponse.items);
        return Promise.all([
          listGames({
            ...range,
            teamId:
              scheduleScope === 'favorite'
                ? meResponse.user.favoriteTeamId
                : undefined,
          }),
          listAttendanceRecords(range, token),
        ]);
      })
      .then((responses) => {
        if (!responses || !isMounted) return;
        const [gamesResponse, attendanceResponse] = responses;
        setGames(gamesResponse.items);
        setAttendanceRecords(attendanceResponse.items);
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
  }, [rangeKey, router, scheduleScope]);

  const filteredAttendanceRecords = attendanceRecords.filter((record) =>
    watchTypeFilter === 'all' ? true : record.watchType === watchTypeFilter,
  );

  const periodRecords = useMemo(() => {
    const fromMs = new Date(`${range.from}T00:00:00`).getTime();
    const toMs = new Date(`${range.to}T00:00:00`).getTime();

    return attendanceRecords.filter((record) => {
      const ms = new Date(record.game.gameDate).getTime();
      return ms >= fromMs && ms < toMs;
    });
  }, [attendanceRecords, range.from, range.to]);

  const periodWinCount = periodRecords.filter(
    (record) => record.result === 'win',
  ).length;
  const periodWinRate = periodRecords.length
    ? Math.round((periodWinCount / periodRecords.length) * 100)
    : 0;

  const gamesByDate = games.reduce<Record<string, Game[]>>((acc, game) => {
    const key = game.gameDate.slice(0, 10);
    acc[key] = [...(acc[key] ?? []), game];
    return acc;
  }, {});

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
    const dayGames = gamesByDate[key] ?? [];
    const dayRecords = attendanceByDate[key] ?? [];

    if (recordsOnly && dayRecords.length === 0 && dayGames.length === 0) {
      return (
        <div
          className={`calendar-day is-empty${options.inMonth ? '' : ' is-outside'}`}
          key={key}
        />
      );
    }

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

      <section className="calendar-summary-row" aria-label="기간 요약">
        <div className="calendar-summary-card">
          <span>{periodLabel} 경기</span>
          <strong>{games.length}</strong>
        </div>
        <div className="calendar-summary-card">
          <span>기록한 경기</span>
          <strong>{periodRecords.length}</strong>
        </div>
        <div className="calendar-summary-card">
          <span>{viewMode === 'month' ? '월간' : '주간'} 승률</span>
          <strong>{periodWinRate}%</strong>
        </div>
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
              setAnchorDate(getWeekStart(anchorDate));
            }}
            type="button"
          >
            주간
          </button>
        </div>
        <div className="filter-group">
          <span className="filter-group-label">경기</span>
          <button
            className={`filter-pill ${scheduleScope === 'favorite' ? 'is-selected' : ''}`}
            onClick={() => setScheduleScope('favorite')}
            type="button"
          >
            내 팀만
          </button>
          <button
            className={`filter-pill ${scheduleScope === 'all' ? 'is-selected' : ''}`}
            onClick={() => setScheduleScope('all')}
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
        <label className="filter-toggle">
          <input
            checked={recordsOnly}
            onChange={(event) => setRecordsOnly(event.target.checked)}
            type="checkbox"
          />
          기록 있는 날만
        </label>
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
          gamesByDate={gamesByDate}
          recordsOnly={recordsOnly}
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

      {!isLoading && games.length === 0 ? (
        <EmptyState
          icon="◌"
          title={
            viewMode === 'month'
              ? '이번 달엔 경기 일정이 없어요'
              : '이번 주엔 경기 일정이 없어요'
          }
          description="다른 기간으로 이동해보세요."
        />
      ) : null}
    </main>
  );
}
