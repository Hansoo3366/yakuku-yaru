'use client';

import type { Game } from '@/lib/baseball-api';
import type { AttendanceRecord } from '@/lib/attendance-api';
import {
  formatDateInput,
  getAgendaDayElementId,
  isSameDay,
} from '@/lib/calendar-range';
import { CalendarEventCard } from '@/components/CalendarEventCard';

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  days: Date[];
  gamesByDate: Record<string, Game[]>;
  attendanceRecordsByGameId: Record<number, AttendanceRecord[]>;
  attendanceByDate: Record<string, AttendanceRecord[]>;
  favoriteTeamId: number | null | undefined;
  showOutsideDays?: boolean;
  referenceMonth?: Date;
  focusDateKey?: string | null;
};

export function CalendarAgendaView({
  days,
  gamesByDate,
  attendanceRecordsByGameId,
  attendanceByDate,
  favoriteTeamId,
  showOutsideDays = false,
  referenceMonth,
  focusDateKey = null,
}: Props) {
  const today = new Date();

  function groupAttendanceRecordsByGame(records: AttendanceRecord[]) {
    const groups = new Map<number, AttendanceRecord[]>();

    for (const record of records) {
      groups.set(record.gameId, [...(groups.get(record.gameId) ?? []), record]);
    }

    return [...groups.values()];
  }

  const visibleDays = days.filter((date) => {
    if (
      referenceMonth &&
      !showOutsideDays &&
      date.getMonth() !== referenceMonth.getMonth()
    ) {
      return false;
    }

    const key = formatDateInput(date);
    const dayGames = gamesByDate[key] ?? [];
    const dayRecords = attendanceByDate[key] ?? [];

    return (
      key === focusDateKey ||
      dayGames.length > 0 ||
      dayRecords.length > 0
    );
  });

  if (visibleDays.length === 0) {
    return (
      <p className="calendar-agenda-empty">표시할 일정이 없어요.</p>
    );
  }

  return (
    <section className="calendar-agenda" aria-label="일정 목록">
      {visibleDays.map((date) => {
        const key = formatDateInput(date);
        const dayGames = gamesByDate[key] ?? [];
        const dayRecords = attendanceByDate[key] ?? [];
        const visibleGameIds = new Set(dayGames.map((game) => game.id));
        const extraRecordGroups = groupAttendanceRecordsByGame(
          dayRecords.filter((record) => !visibleGameIds.has(record.gameId)),
        );
        const isOutside =
          referenceMonth && date.getMonth() !== referenceMonth.getMonth();
        const isToday = isSameDay(date, today);
        const isFocused = key === focusDateKey;
        const hasEvents = dayGames.length > 0 || extraRecordGroups.length > 0;

        return (
          <article
            className={[
              'calendar-agenda-day',
              isOutside ? 'is-outside' : '',
              isToday ? 'is-today' : '',
              isFocused ? 'is-focused' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={isToday ? 'date' : undefined}
            id={getAgendaDayElementId(key)}
            key={key}
          >
            <header className="calendar-agenda-day-head">
              <span className="calendar-agenda-weekday">
                {weekdayLabels[date.getDay()]}
                {isToday ? ' · 오늘' : ''}
              </span>
              <span className="calendar-agenda-date">
                {date.getMonth() + 1}월 {date.getDate()}일
              </span>
            </header>
            <div className="calendar-agenda-events">
              {!hasEvents && isFocused ? (
                <p className="calendar-agenda-day-empty">
                  이 날짜에 표시할 경기·기록이 없어요.
                </p>
              ) : null}
              {dayGames.map((game) => {
                const gameAttendanceRecords =
                  attendanceRecordsByGameId[game.id] ?? [];
                const attendance = gameAttendanceRecords[0] ?? null;
                const href = `/games/${game.id}`;

                return (
                  <CalendarEventCard
                    attendance={attendance}
                    attendanceRecords={gameAttendanceRecords}
                    dense={false}
                    favoriteTeamId={favoriteTeamId}
                    game={game}
                    href={href}
                    key={game.id}
                  />
                );
              })}
              {extraRecordGroups.map((records) => {
                const record = records[0];

                if (!record) {
                  return null;
                }

                return (
                  <CalendarEventCard
                    attendance={record}
                    attendanceRecords={records}
                    dense={false}
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
                    }}
                    href={`/games/${record.gameId}`}
                    key={`record-group-${record.gameId}`}
                  />
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}
