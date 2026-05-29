'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchMe } from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
import {
  listAttendanceRecords,
  type AttendanceStats,
  type AttendanceRecord,
} from '@/lib/attendance-api';
import { computeAttendanceStatsFromRecords } from '@/lib/attendance-stats';
import {
  listGames,
  listTeamStandings,
  listTeams,
  type Game,
  type Team,
  type TeamStandingsResponse,
} from '@/lib/baseball-api';
import { TeamStandingsTable } from '@/components/TeamStandingsTable';
import { getAssetUrl } from '@/lib/api';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { getGameStatusLabel, getGameStatusTone } from '@/lib/game-status';
import { isGameCancelled } from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';
import { getCancellationLabel } from '@/lib/game-cancellation';

function formatAttendanceResultLabel(
  record: AttendanceRecord,
  favoriteTeamId: number | null | undefined,
) {
  if (isGameCancelled(record.game)) {
    return getCancellationLabel(record.game.cancellationReason);
  }

  const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

  if (outcome === 'win') return '승';
  if (outcome === 'lose') return '패';
  if (outcome === 'draw') return '무';
  return '결과 미입력';
}

const features = [
  {
    icon: '◇',
    title: '내 팀 캘린더',
    description: 'KBO 일정과 직관 기록을 한 화면에서 모아 봅니다.',
  },
  {
    icon: '⌖',
    title: '직관 인증과 사진',
    description: '경기별로 사진과 메모, 스코어를 함께 남겨요.',
  },
  {
    icon: '★',
    title: '승리요정 · 패배요정',
    description:
      '승률에 따라 마이페이지에 승리요정 또는 패배요정 타이틀이 붙어요.',
  },
];

function formatDateParts(value: string) {
  const date = new Date(value);
  return {
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    weekday: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
    time: date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function isUpcoming(value: string) {
  return new Date(value).getTime() >= Date.now() - 1000 * 60 * 60 * 6;
}

export default function HomePage() {
  const [authState, setAuthState] = useState<'checking' | 'guest' | 'authed'>(
    'checking',
  );
  const [user, setUser] = useState<PublicUser | null>(null);
  const [favoriteTeam, setFavoriteTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [teamStandings, setTeamStandings] =
    useState<TeamStandingsResponse | null>(null);

  useEffect(() => {
    const seasonYear = new Date().getFullYear();
    listTeamStandings(seasonYear)
      .then(setTeamStandings)
      .catch(() => setTeamStandings(null));
  }, []);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      setAuthState('guest');
      return;
    }

    fetchMe(token)
      .then((response) => {
        setUser(response.user);
        setAuthState('authed');
        return response.user;
      })
      .then(async (current) => {
        const today = new Date();
        const monthLater = new Date(today);
        monthLater.setMonth(today.getMonth() + 2);
        const isoFrom = today.toISOString().slice(0, 10);
        const isoTo = monthLater.toISOString().slice(0, 10);

        const [teamsResponse, gamesResponse, recordsResponse] =
          await Promise.all([
            listTeams(),
            listGames({
              from: isoFrom,
              to: isoTo,
              teamId: current.favoriteTeamId ?? undefined,
            }),
            listAttendanceRecords({}, token),
          ]);

        setFavoriteTeam(
          teamsResponse.items.find(
            (team) => team.id === current.favoriteTeamId,
          ) ?? null,
        );
        setUpcomingGames(
          gamesResponse.items
            .filter((game) => isUpcoming(game.gameDate))
            .slice(0, 5),
        );
        const ownedRecords = recordsResponse.items.filter(
          (record) => record.viewerRelation === 'owner',
        );
        setRecentRecords(
          [...ownedRecords]
            .sort(
              (a, b) =>
                new Date(b.game.gameDate).getTime() -
                new Date(a.game.gameDate).getTime(),
            )
            .slice(0, 3),
        );
        setStats(
          computeAttendanceStatsFromRecords(
            recordsResponse.items,
            current.favoriteTeamId,
          ),
        );
      })
      .catch(() => {
        clearAccessToken();
        setAuthState('guest');
      });
  }, []);

  if (authState === 'guest') {
    return (
      <main className="page-shell">
        <section className="home-hero">
          <span className="eyebrow">야크크 야르~ 섹시야구</span>
          <h1>오늘의 직관, 캘린더에 새기다</h1>
          <p>
            경기 일정과 직관 사진, 스코어와 승률, <br />
            그리고 같이 간 친구의 기록까지 기록할 수 있는 야구 앱입니다.
          </p>
          <div className="actions">
            <Link className="btn btn-primary btn-lg" href="/register">
              지금 가입하기
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/login">
              로그인
            </Link>
          </div>
        </section>

        <section
          aria-label="핵심 기능"
          className="home-features"
          style={{ marginTop: 'var(--space-5)' }}
        >
          {features.map((feature) => (
            <div className="home-feature-card" key={feature.title}>
              <span aria-hidden="true" className="icon">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="card stack" style={{ marginTop: 'var(--space-5)' }}>
          <div className="section-heading">
            <div>
              <h2>KBO 팀 순위</h2>
              <p>공식 기록실 일자별 순위를 매일 반영해요.</p>
            </div>
          </div>
          <TeamStandingsTable standings={teamStandings} />
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="dashboard-grid">
        <div className="dashboard-greeting">
          <div>
            <span className="eyebrow">Today</span>
            <h2>
              {user?.nickname ?? '야구팬'}님,{' '}
              {favoriteTeam?.shortName ?? '내 팀'} 경기 보러 가세요
            </h2>
            <p>
              {favoriteTeam
                ? `${favoriteTeam.name}의 다가오는 일정을 정리했어요.`
                : '마이페이지에서 응원 팀을 설정하면 일정이 더 정확해져요.'}
            </p>
          </div>
          <Link className="btn btn-primary" href="/calendar">
            캘린더 열기
          </Link>
        </div>

        <div className="dashboard-section-grid">
          <section className="card stack">
            <div className="section-heading">
              <div>
                <h2>다가오는 경기</h2>
                <p>오늘 이후 일정 중 가까운 5개</p>
              </div>
              <Link className="btn btn-ghost btn-sm" href="/calendar">
                전체 보기
              </Link>
            </div>
            {authState === 'checking' ? (
              <div className="dashboard-list">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : upcomingGames.length ? (
              <div className="dashboard-list">
                {upcomingGames.map((game) => {
                  const parts = formatDateParts(game.gameDate);
                  return (
                    <Link
                      className="dashboard-game-row"
                      href={`/games/${game.id}`}
                      key={game.id}
                    >
                      <div className="dashboard-game-date">
                        <span>{parts.month}월</span>
                        <strong>{parts.day}</strong>
                      </div>
                      <div className="dashboard-game-info">
                        <span className="matchup">
                          <span className="matchup-team">
                            <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
                            <strong>{game.awayTeam.shortName}</strong>
                          </span>
                          <span className="matchup-vs">vs</span>
                          <span className="matchup-team">
                            <img alt="" src={getTeamLogoSrc(game.homeTeam)} />
                            <strong>{game.homeTeam.shortName}</strong>
                          </span>
                        </span>
                        <span>
                          {parts.weekday} · {parts.time} · {game.stadium}
                        </span>
                      </div>
                      <span
                        className={`badge ${
                          getGameStatusTone(game) === 'finished'
                            ? 'badge-navy'
                            : getGameStatusTone(game) === 'cancelled'
                              ? 'badge-gray'
                              : 'badge-green'
                        }`}
                      >
                        {getGameStatusLabel(getGameStatusTone(game))}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="◌"
                title="가까운 일정이 없어요"
                description="시즌 휴식기일 수 있어요. 캘린더에서 다른 달을 살펴보세요."
              />
            )}
          </section>

          <section className="stack">
            <div className="card-dark home-win-rate-card">
              <span className="eyebrow">Win Rate</span>
              {stats ? (
                <>
                  <div className="home-win-rate-head">
                    <div
                      style={{
                        alignItems: 'baseline',
                        display: 'flex',
                        gap: 8,
                        marginTop: 6,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 'var(--text-3xl)',
                          color: 'var(--color-white)',
                        }}
                      >
                        {stats.winRate}%
                      </strong>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                        / {stats.totalCount}경기
                      </span>
                    </div>
                    {stats.title ? (
                      <span
                        className="profile-title-pill home-title-pill"
                        data-kind={stats.title === '패배요정' ? 'lose' : 'win'}
                      >
                        {stats.title}
                      </span>
                    ) : null}
                  </div>
                  {stats.totalCount > 0 ? (
                    <p className="home-win-rate-record">
                      <span>{stats.winCount}승</span>
                      <span>{stats.loseCount}패</span>
                      <span>{stats.drawCount}무</span>
                    </p>
                  ) : null}
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.78)',
                      fontSize: 'var(--text-sm)',
                      marginTop: 6,
                    }}
                  >
                    {stats.title
                      ? `${stats.title} 타이틀 보유 중`
                      : '직관 기록을 남기면 승리요정·패배요정이 붙어요'}
                  </p>
                </>
              ) : (
                <Skeleton height={48} radius={8} />
              )}
              <Link
                className="btn btn-ghost btn-sm"
                href="/me"
                style={{ marginTop: 12, justifySelf: 'start' }}
              >
                통계 보기
              </Link>
            </div>
          </section>
        </div>

        {recentRecords.length ? (
          <section className="card stack">
            <div className="section-heading">
              <div>
                <h2>최근 직관 기록</h2>
                <p>가장 최근에 남긴 3개의 기록</p>
              </div>
              <Link className="btn btn-ghost btn-sm" href="/me">
                통계 보기
              </Link>
            </div>
            <div className="dashboard-list">
              {recentRecords.map((record) => {
                const parts = formatDateParts(record.game.gameDate);
                return (
                  <Link
                    className="dashboard-game-row"
                    href={`/attendance/${record.id}`}
                    key={record.id}
                  >
                    <div className="dashboard-game-date">
                      <span>{parts.month}월</span>
                      <strong>{parts.day}</strong>
                    </div>
                    <div className="dashboard-game-info">
                      <span className="matchup">
                        <span className="matchup-team">
                          <img
                            alt=""
                            src={getTeamLogoSrc(record.game.awayTeam)}
                          />
                          <strong>{record.game.awayTeam.shortName}</strong>
                        </span>
                        <span className="matchup-vs">vs</span>
                        <span className="matchup-team">
                          <img
                            alt=""
                            src={getTeamLogoSrc(record.game.homeTeam)}
                          />
                          <strong>{record.game.homeTeam.shortName}</strong>
                        </span>
                      </span>
                      <span>
                        {record.watchType === 'home' ? '집관' : '직관'} ·{' '}
                        {formatAttendanceResultLabel(record, favoriteTeam?.id)}
                      </span>
                    </div>
                    {record.photoUrl ? (
                      <img
                        alt=""
                        src={getAssetUrl(record.photoUrl)}
                        style={{
                          borderRadius: 8,
                          height: 44,
                          objectFit: 'cover',
                          width: 60,
                        }}
                      />
                    ) : (
                      <span className="badge badge-navy">사진 없음</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </section>

      <section className="card stack">
        <div className="section-heading">
          <div>
            <h2>KBO 팀 순위</h2>
            <p>
              {favoriteTeam
                ? `${favoriteTeam.shortName}는 ${
                    teamStandings?.items.find(
                      (item) => item.teamId === favoriteTeam.id,
                    )?.rank ?? '—'
                  }위예요.`
                : '응원 팀을 설정하면 순위를 강조해 보여드려요.'}
            </p>
          </div>
        </div>
        <TeamStandingsTable
          highlightTeamId={favoriteTeam?.id}
          standings={teamStandings}
        />
      </section>
    </main>
  );
}
