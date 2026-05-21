'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchMe } from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
import {
  listGames,
  listTeams,
  updateFavoriteTeam,
  type Game,
  type Team,
} from '@/lib/baseball-api';
import {
  listAttendanceRecords,
  type AttendanceRecord,
} from '@/lib/attendance-api';
import { getAssetUrl } from '@/lib/api';
import { BottomNav } from '@/components/BottomNav';

const initialMonth = new Date(2026, 4, 1);

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthRange(month: Date) {
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return {
    from: formatDateInput(from),
    to: formatDateInput(to),
  };
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
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
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    Promise.all([fetchMe(token), listTeams()])
      .then(([meResponse, teamsResponse]) => {
        if (!isMounted) {
          return null;
        }

        setUser(meResponse.user);
        setTeams(teamsResponse.items);
        const range = getMonthRange(calendarMonth);
        return Promise.all([
          listGames({
            ...range,
            teamId: meResponse.user.favoriteTeamId,
          }),
          listAttendanceRecords(range, token),
        ]);
      })
      .then((responses) => {
        if (!responses || !isMounted) {
          return;
        }

        const [gamesResponse, attendanceResponse] = responses;
        setGames(gamesResponse.items);
        setAttendanceRecords(attendanceResponse.items);
      })
      .catch(() => {
        clearAccessToken();
        router.replace('/login');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [calendarMonth, router]);

  async function handleTeamChange(teamId: number) {
    if (!teamId) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    const response = await updateFavoriteTeam(teamId, token);
    setUser(response.user);
    setMessage('내 팀이 저장되었습니다.');

    const range = getMonthRange(calendarMonth);
    const [gamesResponse, attendanceResponse] = await Promise.all([
      listGames({
        ...range,
        teamId,
      }),
      listAttendanceRecords(range, token),
    ]);
    setGames(gamesResponse.items);
    setAttendanceRecords(attendanceResponse.items);
  }

  function handleLogout() {
    clearAccessToken();
    router.replace('/login');
  }

  function moveMonth(amount: number) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <p className="loading-text">로그인 상태 확인 중</p>
      </main>
    );
  }

  const days = getCalendarDays(calendarMonth);
  const gamesByDate = games.reduce<Record<string, Game[]>>((acc, game) => {
    const key = game.gameDate.slice(0, 10);
    acc[key] = [...(acc[key] ?? []), game];
    return acc;
  }, {});
  const attendanceByGameId = attendanceRecords.reduce<
    Record<number, AttendanceRecord>
  >((acc, record) => {
    acc[record.gameId] = record;
    return acc;
  }, {});
  const attendanceByDate = attendanceRecords.reduce<
    Record<string, AttendanceRecord[]>
  >((acc, record) => {
    const key = record.game.gameDate.slice(0, 10);
    acc[key] = [...(acc[key] ?? []), record];
    return acc;
  }, {});

  return (
    <main className="app-shell with-bottom-nav">
      <header className="app-header">
        <div>
          <Link className="back-link" href="/">
            Yakuku Yaru
          </Link>
          <h1>직관 캘린더</h1>
          <p>{user?.nickname}님의 경기 기록을 준비하고 있어요.</p>
        </div>
        <div className="header-actions">
          <Link className="ghost-button" href="/me">
            마이페이지
          </Link>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <section className="team-setting-panel">
        <label>
          내 팀
          <select
            onChange={(event) => handleTeamChange(Number(event.target.value))}
            value={user?.favoriteTeamId ?? ''}
          >
            <option value="">팀을 선택하세요</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        {message ? <p>{message}</p> : null}
      </section>

      <section className="calendar-placeholder">
        <div className="calendar-toolbar">
          <button type="button" onClick={() => moveMonth(-1)}>
            이전
          </button>
          <div className="month-label">
            {calendarMonth.getFullYear()}.
            {String(calendarMonth.getMonth() + 1).padStart(2, '0')}
          </div>
          <button type="button" onClick={() => moveMonth(1)}>
            다음
          </button>
        </div>
        <div className="calendar-grid-preview" aria-label="캘린더 미리보기">
          {days.map((date) => {
            const key = formatDateInput(date);
            const dayGames = gamesByDate[key] ?? [];
            const dayRecords = attendanceByDate[key] ?? [];
            const visibleGameIds = new Set(dayGames.map((game) => game.id));
            const extraRecords = dayRecords.filter(
              (record) => !visibleGameIds.has(record.gameId),
            );

            return (
              <div
                key={key}
                className={
                  date.getMonth() === calendarMonth.getMonth()
                    ? 'current-month'
                    : 'outside-month'
                }
              >
                <span>{date.getDate()}</span>
                {dayGames.map((game) => (
                  <Link href={`/games/${game.id}`} key={game.id}>
                    {attendanceByGameId[game.id]?.photoUrl ? (
                      <img
                        alt="직관 사진 미리보기"
                        className="calendar-photo-preview"
                        src={getAssetUrl(attendanceByGameId[game.id].photoUrl)}
                      />
                    ) : null}
                    <strong>
                      {game.awayTeam.shortName} @ {game.homeTeam.shortName}
                    </strong>
                  </Link>
                ))}
                {extraRecords.map((record) => (
                  <Link href={`/attendance/${record.id}/edit`} key={record.id}>
                    {record.photoUrl ? (
                      <img
                        alt="직관 사진 미리보기"
                        className="calendar-photo-preview"
                        src={getAssetUrl(record.photoUrl)}
                      />
                    ) : null}
                    <strong>
                      {record.game.awayTeam.shortName} @{' '}
                      {record.game.homeTeam.shortName}
                    </strong>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
