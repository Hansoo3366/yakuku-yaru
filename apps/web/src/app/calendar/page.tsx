'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMe } from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
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
import { getAssetUrl } from '@/lib/api';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';

const initialMonth = new Date(2026, 4, 1);

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthRange(month: Date) {
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const lastOffset = 6 - lastDay.getDay();
  const totalDays = startOffset + lastDay.getDate() + lastOffset;
  const length = totalDays > 35 ? 42 : 35;

  return Array.from({ length }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [calendarMonth, setCalendarMonth] = useState(initialMonth);
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

  useEffect(() => {
    let isMounted = true;
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    setIsLoading(true);

    Promise.all([fetchMe(token), listTeams()])
      .then(([meResponse, teamsResponse]) => {
        if (!isMounted) return null;

        setUser(meResponse.user);
        setTeams(teamsResponse.items);
        const range = getMonthRange(calendarMonth);
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
        router.replace('/login');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [calendarMonth, router, scheduleScope]);

  function moveMonth(amount: number) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  const days = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  const filteredAttendanceRecords = attendanceRecords.filter((record) =>
    watchTypeFilter === 'all' ? true : record.watchType === watchTypeFilter,
  );

  const currentMonthRecords = attendanceRecords.filter((record) => {
    const recordDate = new Date(record.game.gameDate);
    return (
      recordDate.getFullYear() === calendarMonth.getFullYear() &&
      recordDate.getMonth() === calendarMonth.getMonth()
    );
  });

  const currentMonthRecordCount = currentMonthRecords.length;
  const currentMonthWinCount = currentMonthRecords.filter(
    (record) => record.result === 'win',
  ).length;
  const currentMonthWinRate = currentMonthRecordCount
    ? Math.round((currentMonthWinCount / currentMonthRecordCount) * 100)
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

  const favoriteTeam = teams.find((team) => team.id === user?.favoriteTeamId);

  return (
    <main className="app-shell">
      <header className="app-page-header">
        <span className="eyebrow">Calendar</span>
        <h1>
          {favoriteTeam ? `${favoriteTeam.shortName} 직관 캘린더` : '직관 캘린더'}
        </h1>
        <p>
          {user?.nickname
            ? `${user.nickname}님의 ${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월 일정과 기록`
            : '경기 일정과 기록을 한 번에 확인하세요.'}
        </p>
      </header>

      <section className="calendar-summary-row" aria-label="이번 달 요약">
        <div className="calendar-summary-card">
          <span>이번 달 경기</span>
          <strong>{games.length}</strong>
        </div>
        <div className="calendar-summary-card">
          <span>기록한 경기</span>
          <strong>{currentMonthRecordCount}</strong>
        </div>
        <div className="calendar-summary-card">
          <span>월간 승률</span>
          <strong>{currentMonthWinRate}%</strong>
        </div>
      </section>

      <section className="calendar-toolbar" aria-label="월 이동">
        <button
          aria-label="이전 달"
          className="icon-button"
          onClick={() => moveMonth(-1)}
          type="button"
        >
          ←
        </button>
        <div className="calendar-month-label">
          <small>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long' })}
          </small>
          <span>
            {calendarMonth.getFullYear()}.
            {String(calendarMonth.getMonth() + 1).padStart(2, '0')}
          </span>
        </div>
        <button
          aria-label="다음 달"
          className="icon-button"
          onClick={() => moveMonth(1)}
          type="button"
        >
          →
        </button>
      </section>

      <section className="calendar-filter-bar" aria-label="캘린더 필터">
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
      </section>

      {isLoading ? (
        <div className="card">
          <Skeleton height={420} radius={10} />
        </div>
      ) : (
        <section className="calendar-card" aria-label="월간 캘린더">
          <div className="calendar-weekdays" aria-hidden="true">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((date) => {
              const key = formatDateInput(date);
              const dayGames = gamesByDate[key] ?? [];
              const dayRecords = attendanceByDate[key] ?? [];
              if (recordsOnly && dayRecords.length === 0) {
                return <div className="calendar-day is-outside" key={key} />;
              }
              const visibleGameIds = new Set(dayGames.map((game) => game.id));
              const extraRecords = dayRecords.filter(
                (record) => !visibleGameIds.has(record.gameId),
              );
              const isOutside = date.getMonth() !== calendarMonth.getMonth();
              const isToday = isSameDay(date, new Date());
              const dayOfWeek = date.getDay();
              const classNames = [
                'calendar-day',
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
                      const tagKind = attendance
                        ? attendance.viewerRelation === 'companion'
                          ? 'companion'
                          : attendance.watchType
                        : null;

                      return (
                        <Link
                          className="calendar-event"
                          href={href}
                          key={game.id}
                        >
                          <span
                            aria-hidden="true"
                            className="calendar-event-logos"
                          >
                            <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
                            <img alt="" src={getTeamLogoSrc(game.homeTeam)} />
                          </span>
                          <span className="calendar-event-title">
                            {game.awayTeam.shortName} vs {game.homeTeam.shortName}
                          </span>
                          {attendance?.photoUrl ? (
                            <img
                              alt="직관 사진"
                              className="calendar-event-photo"
                              src={getAssetUrl(attendance.photoUrl)}
                              style={{ gridColumn: '1 / -1' }}
                            />
                          ) : null}
                          {tagKind ? (
                            <span
                              className="calendar-event-tag"
                              data-kind={tagKind}
                              style={{ gridColumn: '1 / -1', justifySelf: 'start' }}
                            >
                              {tagKind === 'home'
                                ? '집관'
                                : tagKind === 'companion'
                                  ? '동행'
                                  : '직관'}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                    {extraRecords.map((record) => {
                      const tagKind =
                        record.viewerRelation === 'companion'
                          ? 'companion'
                          : record.watchType;
                      const href = `/attendance/${record.id}`;
                      return (
                        <Link
                          className="calendar-event"
                          href={href}
                          key={record.id}
                        >
                          <span
                            aria-hidden="true"
                            className="calendar-event-logos"
                          >
                            <img alt="" src={getTeamLogoSrc(record.game.awayTeam)} />
                            <img alt="" src={getTeamLogoSrc(record.game.homeTeam)} />
                          </span>
                          <span className="calendar-event-title">
                            {record.game.awayTeam.shortName} vs {record.game.homeTeam.shortName}
                          </span>
                          {record.photoUrl ? (
                            <img
                              alt="직관 사진"
                              className="calendar-event-photo"
                              src={getAssetUrl(record.photoUrl)}
                              style={{ gridColumn: '1 / -1' }}
                            />
                          ) : null}
                          <span
                            className="calendar-event-tag"
                            data-kind={tagKind}
                            style={{ gridColumn: '1 / -1', justifySelf: 'start' }}
                          >
                            {tagKind === 'home'
                              ? '집관'
                              : tagKind === 'companion'
                                ? '동행'
                                : '직관'}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!isLoading && games.length === 0 ? (
        <EmptyState
          icon="◌"
          title="이번 달엔 경기 일정이 없어요"
          description="시즌 휴식기일 수 있어요. 다른 달로 이동해보세요."
        />
      ) : null}
    </main>
  );
}
