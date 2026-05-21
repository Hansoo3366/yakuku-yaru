'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchMe } from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
import {
  fetchAttendanceStats,
  type AttendanceStats,
} from '@/lib/attendance-api';
import { listTeams, type Team } from '@/lib/baseball-api';
import { BottomNav } from '@/components/BottomNav';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    Promise.all([fetchMe(token), fetchAttendanceStats(token), listTeams()])
      .then(([meResponse, statsResponse, teamsResponse]) => {
        setUser(meResponse.user);
        setStats(statsResponse);
        setTeams(teamsResponse.items);
      })
      .catch(() => {
        clearAccessToken();
        router.replace('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  if (isLoading || !stats) {
    return (
      <main className="app-shell">
        <p className="loading-text">마이페이지를 불러오는 중</p>
      </main>
    );
  }

  const favoriteTeam = teams.find((team) => team.id === user?.favoriteTeamId);

  return (
    <main className="app-shell with-bottom-nav">
      <header className="app-header">
        <div>
          <Link className="back-link" href="/calendar">
            캘린더로
          </Link>
          <h1>마이페이지</h1>
          <p>{user?.nickname}님의 직관 승률을 확인합니다.</p>
        </div>
      </header>

      <section className="stats-hero">
        <span>직관 승률</span>
        <strong>{stats.winRate}%</strong>
        <p>{stats.title ?? '아직 승리요정까지 조금 남았어요'}</p>
      </section>

      <section className="stats-grid">
        <div>
          <span>내 팀</span>
          <strong>{favoriteTeam?.name ?? '미설정'}</strong>
        </div>
        <div>
          <span>직관 경기</span>
          <strong>{stats.totalCount}</strong>
        </div>
        <div>
          <span>승</span>
          <strong>{stats.winCount}</strong>
        </div>
        <div>
          <span>패</span>
          <strong>{stats.loseCount}</strong>
        </div>
        <div>
          <span>무</span>
          <strong>{stats.drawCount}</strong>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
