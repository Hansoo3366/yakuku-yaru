'use client';

import type { Game } from '@/lib/baseball-api';
import type { AttendanceRecord } from '@/lib/attendance-api';
import { formatDateInput } from '@/lib/calendar-range';
import { CalendarEventCard } from '@/components/CalendarEventCard';

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  days: Date[];
  gamesByDate: Record<string, Game[]>;
  attendanceByGameId: Record<number, AttendanceRecord>;
  attendanceByDate: Record<string, AttendanceRecord[]>;
  favoriteTeamId: number | null | undefined;
  recordsOnly: boolean;
  showOutsideDays?: boolean;
  referenceMonth?: Date;
};

export function CalendarAgendaView({
  days,
  gamesByDate,
  attendanceByGameId,
  attendanceByDate,
  favoriteTeamId,
  recordsOnly,
  showOutsideDays = false,
  referenceMonth,
}: Props) {
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

    if (recordsOnly && dayGames.length === 0 && dayRecords.length === 0) {
      return false;
    }

    return dayGames.length > 0 || dayRecords.length > 0 || !recordsOnly;
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
        const extraRecords = dayRecords.filter(
          (record) => !visibleGameIds.has(record.gameId),
        );
        const isOutside =
          referenceMonth && date.getMonth() !== referenceMonth.getMonth();

        return (
          <article
            className={`calendar-agenda-day${isOutside ? ' is-outside' : ''}`}
            key={key}
          >
            <header className="calendar-agenda-day-head">
              <span className="calendar-agenda-weekday">
                {weekdayLabels[date.getDay()]}
              </span>
              <span className="calendar-agenda-date">
                {date.getMonth() + 1}월 {date.getDate()}일
              </span>
            </header>
            <div className="calendar-agenda-events">
              {dayGames.map((game) => {
                const attendance = attendanceByGameId[game.id];
                const href = attendance
                  ? `/attendance/${attendance.id}`
                  : `/games/${game.id}`;

                return (
                  <CalendarEventCard
                    attendance={attendance}
                    dense={false}
                    favoriteTeamId={favoriteTeamId}
                    game={game}
                    href={href}
                    key={game.id}
                  />
                );
              })}
              {extraRecords.map((record) => (
                <CalendarEventCard
                  attendance={record}
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
                  href={`/attendance/${record.id}`}
                  key={`record-${record.id}`}
                />
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
