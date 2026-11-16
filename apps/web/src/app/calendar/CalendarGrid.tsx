'use client';

import type { AttendanceRecord } from '@/lib/attendance-api';
import type { Game } from '@/lib/baseball-api';
import {
  CalendarEventCard,
  type CalendarEventVariant,
} from '@/components/CalendarEventCard';
import {
  type AttendanceByDate,
  type AttendanceByGameId,
  type GamesByDate,
  groupAttendanceRecordsByGame,
  groupGamesByTime,
} from '@/lib/calendar-data';
import { formatDateInput, getKoreaToday } from '@/lib/calendar-range';
import type { CalendarViewMode } from '@/lib/calendar-ui-store';

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

type CalendarGridProps = {
  viewMode: CalendarViewMode;
  days: Date[];
  monthStart: Date;
  /** 월간 칸에 쓰는 표기. 주간은 늘 card 다. */
  monthEventVariant: CalendarEventVariant;
  gamesByDate: GamesByDate;
  attendanceByDate: AttendanceByDate;
  attendanceRecordsByGameId: AttendanceByGameId;
  favoriteTeamId: number | null;
  focusDateKey: string | null;
  onSelectDay: (date: Date, dateKey: string) => void;
};

/** 데스크톱 월간·주간 달력. 주간은 같은 격자에 일곱 칸만 그린다. */
export function CalendarGrid({
  viewMode,
  days,
  monthStart,
  monthEventVariant,
  gamesByDate,
  attendanceByDate,
  attendanceRecordsByGameId,
  favoriteTeamId,
  focusDateKey,
  onSelectDay,
}: CalendarGridProps) {
  const todayKey = formatDateInput(getKoreaToday());
  const variant = viewMode === 'month' ? monthEventVariant : 'card';

  return (
    <section
      aria-label={viewMode === 'month' ? '월간 캘린더' : '주간 캘린더'}
      className="cal-board"
    >
      <div aria-hidden="true" className="cal-weekdays">
        {weekdayLabels.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div
        className={`cal-grid${viewMode === 'week' ? ' cal-grid--week' : ''}`}
      >
        {days.map((date) => {
          const key = formatDateInput(date);

          return (
            <CalendarDayCell
              attendanceRecordsByGameId={attendanceRecordsByGameId}
              date={date}
              dateKey={key}
              dayGames={gamesByDate[key] ?? []}
              dayRecords={attendanceByDate[key] ?? []}
              favoriteTeamId={favoriteTeamId}
              inMonth={
                viewMode === 'week' || date.getMonth() === monthStart.getMonth()
              }
              isFocused={focusDateKey === key}
              isToday={key === todayKey}
              key={key}
              onSelect={onSelectDay}
              variant={variant}
            />
          );
        })}
      </div>
    </section>
  );
}

type CalendarDayCellProps = {
  date: Date;
  dateKey: string;
  dayGames: Game[];
  dayRecords: AttendanceRecord[];
  attendanceRecordsByGameId: AttendanceByGameId;
  favoriteTeamId: number | null;
  variant: CalendarEventVariant;
  inMonth: boolean;
  isToday: boolean;
  isFocused: boolean;
  onSelect: (date: Date, dateKey: string) => void;
};

function CalendarDayCell({
  date,
  dateKey,
  dayGames,
  dayRecords,
  attendanceRecordsByGameId,
  favoriteTeamId,
  variant,
  inMonth,
  isToday,
  isFocused,
  onSelect,
}: CalendarDayCellProps) {
  const visibleGameIds = new Set(dayGames.map((game) => game.id));
  // 일정에는 안 보이지만 내 기록이 있는 경기(중립 경기 등)는 기록으로 덧붙인다.
  const extraRecordGroups = groupAttendanceRecordsByGame(
    dayRecords.filter((record) => !visibleGameIds.has(record.gameId)),
  );
  const dayOfWeek = date.getDay();
  const classNames = [
    'cal-day',
    !inMonth ? 'is-outside' : '',
    isToday ? 'is-today' : '',
    isFocused ? 'is-focused-day' : '',
    dayRecords.length ? 'has-record' : '',
    dayOfWeek === 0 ? 'is-sunday' : '',
    dayOfWeek === 6 ? 'is-saturday' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function renderDayGame(game: Game) {
    const gameAttendanceRecords = attendanceRecordsByGameId[game.id] ?? [];

    return (
      <CalendarEventCard
        attendance={gameAttendanceRecords[0] ?? null}
        attendanceRecords={gameAttendanceRecords}
        variant={variant}
        favoriteTeamId={favoriteTeamId}
        game={game}
        href={`/games/${game.id}`}
        key={game.id}
      />
    );
  }

  return (
    <div
      className={classNames}
      id={`calendar-day-${dateKey}`}
      aria-current={isToday ? 'date' : undefined}
      tabIndex={-1}
    >
      <button
        aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 주간 보기`}
        className="cal-day__num"
        onClick={() => onSelect(date, dateKey)}
        title="이 날짜의 주간 일정 보기"
        type="button"
      >
        {date.getDate()}
      </button>
      <div className="cal-day__events">
        {variant === 'line'
          ? // 리그 전체: 시간을 경기마다 반복하지 않고 시간별로 묶어서 한 번만 적는다.
            groupGamesByTime(dayGames).map(([time, games]) => (
              <div className="cal-time-group" key={time}>
                <span className="cal-time-group__label">{time}</span>
                {games.map((game) => renderDayGame(game))}
              </div>
            ))
          : dayGames.map((game) => renderDayGame(game))}
        {extraRecordGroups.map((records) => {
          const record = records[0];

          if (!record) {
            return null;
          }

          return (
            <CalendarEventCard
              attendance={record}
              attendanceRecords={records}
              variant={variant}
              favoriteTeamId={favoriteTeamId}
              game={{
                id: record.gameId,
                gameDate: record.game.gameDate,
                stadium: record.game.stadium,
                homeTeam: record.game.homeTeam,
                awayTeam: record.game.awayTeam,
                homeScore: record.game.homeScore,
                awayScore: record.game.awayScore,
                status: record.game.status,
                cancellationReason: null,
                probablePitchers: { home: null, away: null },
              }}
              href={`/games/${record.gameId}`}
              key={`record-group-${record.gameId}`}
            />
          );
        })}
      </div>
    </div>
  );
}
