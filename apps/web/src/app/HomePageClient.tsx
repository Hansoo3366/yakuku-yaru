'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { ArrowUpRight, CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { type AttendanceRecord } from '@/lib/attendance-api';
import { computeAttendanceStatsFromRecords } from '@/lib/attendance-stats';
import { TeamStandingsTable } from '@/components/TeamStandingsTable';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { SeasonProjectionTable } from '@/components/SeasonProjectionTable';
import { PublicHome } from './PublicHome';
import { EmptyState } from '@/components/EmptyState';
import { useInitialSignedIn } from '@/components/AppProviders';
import { HonorTitleSwiper } from '@/components/HonorTitleSwiper';
import { getGameStatusLabel, getGameStatusTone } from '@/lib/game-status';
import { isGameCancelled } from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';
import { getCancellationLabel } from '@/lib/game-cancellation';
import type {
  Game,
  SeasonProjectionResponse,
  TeamStandingsResponse,
} from '@/lib/baseball-api';
import { useAuthStore } from '@/lib/auth-store';
import {
  useAttendanceRecordsQuery,
  useGamesQuery,
  useMeQuery,
  useSeasonProjectionQuery,
  useTeamsQuery,
  useTeamStandingsQuery,
} from '@/lib/queries';
import {
  formatKoreanMonthDay,
  formatKoreanTime,
  formatKoreanWeekday,
} from '@/lib/date-format';

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

function formatDateParts(value: string) {
  const [month, day] = formatKoreanMonthDay(value).split('월 ');
  return {
    month,
    day: day.replace('일', ''),
    weekday: formatKoreanWeekday(value),
    time: formatKoreanTime(value),
  };
}

function isUpcoming(value: string) {
  return new Date(value).getTime() >= Date.now() - 1000 * 60 * 60 * 6;
}

export type HomePageClientProps = {
  /** 서버가 한국 시간 기준으로 정한 시즌 연도. 서버·클라이언트 쿼리 키를 맞춘다. */
  seasonYear: number;
  initialStandings: TeamStandingsResponse | null;
  initialProjection: SeasonProjectionResponse | null;
  /** 비로그인 홈의 '오늘의 경기'용 리그 전체 일정 */
  initialGames: Game[] | null;
  gamesRange: { from: string; to: string };
};

export function HomePageClient({
  seasonYear,
  initialStandings,
  initialProjection,
  initialGames,
  gamesRange,
}: HomePageClientProps) {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const storedUser = useAuthStore((state) => state.user);
  const initialSignedIn = useInitialSignedIn();
  const meQuery = useMeQuery(token);
  const user = meQuery.data?.user ?? storedUser;
  const teamsQuery = useTeamsQuery();
  const teamStandingsQuery = useTeamStandingsQuery(seasonYear, {
    initialData: initialStandings,
  });
  const seasonProjectionQuery = useSeasonProjectionQuery(seasonYear, {
    initialData: initialProjection,
  });
  const attendanceStatsRange = useMemo(
    () => ({
      from: `${seasonYear}-01-01`,
      to: `${seasonYear + 1}-01-01`,
    }),
    [seasonYear],
  );
  const scheduleRange = useMemo(() => {
    const today = new Date();
    const monthLater = new Date(today);
    monthLater.setMonth(today.getMonth() + 2);

    return {
      from: today.toISOString().slice(0, 10),
      to: monthLater.toISOString().slice(0, 10),
    };
  }, []);
  const gamesQuery = useGamesQuery(
    {
      ...scheduleRange,
      teamId: user?.favoriteTeamId ?? undefined,
    },
    { enabled: Boolean(token && user) },
  );
  const recordsQuery = useAttendanceRecordsQuery(attendanceStatsRange, token, {
    enabled: Boolean(token && user),
  });
  // 인증 상태를 불러오기 전에는 서버가 쿠키로 판단한 값을 따른다. 비로그인이면 바로 랜딩을 그린다.
  const authState: 'checking' | 'guest' | 'authed' = !hasHydrated
    ? initialSignedIn
      ? 'checking'
      : 'guest'
    : token && !meQuery.isError
      ? 'authed'
      : 'guest';
  const teams = teamsQuery.data?.items ?? [];
  const favoriteTeam =
    teams.find((team) => team.id === user?.favoriteTeamId) ?? null;
  const teamStandings = teamStandingsQuery.data ?? null;
  const attendanceRecords = useMemo(
    () => recordsQuery.data?.items ?? [],
    [recordsQuery.data?.items],
  );
  const upcomingGames = useMemo(
    () =>
      (gamesQuery.data?.items ?? [])
        .filter((game) => isUpcoming(game.gameDate))
        .slice(0, 5),
    [gamesQuery.data?.items],
  );
  const recentRecords = useMemo(() => {
    const ownedRecords = attendanceRecords.filter(
      (record) => record.viewerRelation === 'owner',
    );

    return [...ownedRecords]
      .sort(
        (a, b) =>
          new Date(b.game.gameDate).getTime() -
          new Date(a.game.gameDate).getTime(),
      )
      .slice(0, 3);
  }, [attendanceRecords]);
  const stats = useMemo(
    () =>
      user
        ? computeAttendanceStatsFromRecords(
            attendanceRecords,
            user.favoriteTeamId,
          )
        : null,
    [attendanceRecords, user],
  );
  const seasonProjection = seasonProjectionQuery.data ?? null;
  const seasonProjectionLoading = seasonProjectionQuery.isLoading;
  const nextGame = upcomingGames[0] ?? null;
  const nextGameDate = nextGame ? formatDateParts(nextGame.gameDate) : null;
  const favoriteStanding = favoriteTeam
    ? teamStandings?.items.find((item) => item.teamId === favoriteTeam.id) ?? null
    : null;

  if (authState === 'guest') {
    return (
      <PublicHome
        gamesRange={gamesRange}
        initialGames={initialGames}
        projection={seasonProjection}
        projectionLoading={seasonProjectionLoading}
        standings={teamStandings}
      />
    );
  }

  return (
    <main className="page-shell page-shell--dashboard">
      <section className="dashboard-grid">
        <div className="dashboard-greeting">
          <div className="dashboard-greeting__content">
            <div className="dashboard-greeting__identity">
              {favoriteTeam ? (
                <span className="dashboard-greeting__logo">
                  <img alt="" src={getTeamLogoSrc(favoriteTeam)} />
                </span>
              ) : null}
              <span className="eyebrow">
                {seasonYear} 시즌 · {favoriteTeam?.shortName ?? '응원 팀 미설정'}
              </span>
              {favoriteStanding ? (
                <span className="dashboard-greeting__rank">
                  현재 {favoriteStanding.rank}위
                </span>
              ) : null}
            </div>
            <h1>
              {user?.nickname ?? '야구팬'}님, 오늘도 플레이볼.
            </h1>
            <p>
              {favoriteTeam && favoriteStanding
                ? `${favoriteTeam.shortName}은 현재 ${favoriteStanding.rank}위 · 내 관람 기록은 ${stats?.totalCount ?? 0}경기예요.`
                : favoriteTeam
                  ? `${favoriteTeam.name}의 다음 경기를 기다리고 있어요.`
                  : '응원 팀을 설정하면 내 팀 일정부터 정리해 드려요.'}
            </p>
          </div>
          <div className="dashboard-greeting__actions">
            {nextGame && nextGameDate ? (
              <Link
                className="dashboard-next-ticket"
                href={`/games/${nextGame.id}`}
              >
                <span className="dashboard-next-ticket__top">
                  <span>
                    <CalendarDays aria-hidden="true" size={14} /> 다음 경기
                  </span>
                  <ArrowUpRight aria-hidden="true" size={16} />
                </span>
                <span className="dashboard-next-ticket__matchup">
                  <span>
                    <img alt="" src={getTeamLogoSrc(nextGame.awayTeam)} />
                    <strong>{nextGame.awayTeam.shortName}</strong>
                  </span>
                  <b>VS</b>
                  <span>
                    <img alt="" src={getTeamLogoSrc(nextGame.homeTeam)} />
                    <strong>{nextGame.homeTeam.shortName}</strong>
                  </span>
                </span>
                <span className="dashboard-next-ticket__meta">
                  <strong>
                    {nextGameDate.month}.{nextGameDate.day}{' '}
                    {nextGameDate.weekday}
                  </strong>
                  <span>{nextGameDate.time}</span>
                  <span>
                    <MapPin aria-hidden="true" size={13} />
                    {nextGame.stadium}
                  </span>
                </span>
              </Link>
            ) : null}
            <Link className="dashboard-greeting__calendar-link" href="/calendar">
              <CalendarDays aria-hidden="true" size={17} />
              전체 일정
              <ChevronRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>

        <div className="dashboard-personal-zone">
          <header className="dashboard-zone-header">
            <div>
              <h2>내 경기</h2>
            </div>
            <p>다가오는 일정과 나의 관람 기록</p>
          </header>

          <div className="dashboard-main-grid">
            <section className="card stack dashboard-upcoming-card">
              <div className="section-heading">
                <div>
                  <h3>다가오는 경기</h3>
                  <p>오늘 이후 일정 중 가까운 5개</p>
                </div>
                <Link className="btn btn-secondary btn-sm" href="/calendar">
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

            <aside className="dashboard-sidebar">
              <div className="card home-win-rate-card">
                <div className="section-heading home-win-rate-heading">
                  <div>
                    <span className="eyebrow">관람 승률</span>
                    {stats ? (
                      <div className="home-win-rate-hero">
                        <strong>{stats.winRate}%</strong>
                        <span>{stats.totalCount}경기</span>
                      </div>
                    ) : (
                      <Skeleton height={40} radius={8} />
                    )}
                  </div>
                  <Link className="btn btn-secondary btn-sm" href="/me">
                    통계 보기
                  </Link>
                </div>

                {stats ? (
                  <>
                    {stats.totalCount > 0 ? (
                      <>
                        <p className="home-win-rate-record">
                          <span>{stats.winCount}승</span>
                          <span>{stats.drawCount}무</span>
                          <span>{stats.loseCount}패</span>
                        </p>
                        <div className="home-win-rate-metrics">
                          <div className="home-win-rate-metric">
                            <span>직관</span>
                            <strong>{stats.stadiumCount}경기</strong>
                            <em>
                              {stats.overallStadiumWinRate ??
                                stats.stadiumWinRate}
                              %
                            </em>
                          </div>
                          <div className="home-win-rate-metric">
                            <span>집관</span>
                            <strong>{stats.homeCount}경기</strong>
                            <em>
                              {stats.overallHomeWinRate ?? stats.homeWinRate}%
                            </em>
                          </div>
                        </div>
                        {stats.winCount + stats.loseCount + stats.drawCount >
                        0 ? (
                          <div
                            aria-label={`승 ${stats.winCount}무 ${stats.drawCount}패 ${stats.loseCount}`}
                            className="home-win-rate-bar"
                            role="img"
                          >
                            <span
                              data-kind="win"
                              style={{
                                width: `${(stats.winCount / (stats.winCount + stats.loseCount + stats.drawCount)) * 100}%`,
                              }}
                            />
                            <span
                              data-kind="draw"
                              style={{
                                width: `${(stats.drawCount / (stats.winCount + stats.loseCount + stats.drawCount)) * 100}%`,
                              }}
                            />
                            <span
                              data-kind="lose"
                              style={{
                                width: `${(stats.loseCount / (stats.winCount + stats.loseCount + stats.drawCount)) * 100}%`,
                              }}
                            />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="home-win-rate-hint">
                        직관 기록을 남기면 승률과 승패 흐름이 여기에 모여요.
                      </p>
                    )}
                    <div className="home-win-rate-titles">
                      <span className="home-win-rate-titles-label">
                        명예타이틀
                      </span>
                      {stats.titles?.length ? (
                        <HonorTitleSwiper titles={stats.titles} />
                      ) : (
                        <p className="home-win-rate-titles-empty">
                          타이틀 미보유
                        </p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {recentRecords.length ? (
                <section className="card stack dashboard-recent-card">
                  <div className="section-heading dashboard-sidebar-heading">
                    <div>
                      <h3>최근 직관 기록</h3>
                      <p>가장 최근 3개</p>
                    </div>
                  </div>
                  <div className="dashboard-list dashboard-list--compact">
                    {recentRecords.map((record) => {
                      const parts = formatDateParts(record.game.gameDate);
                      return (
                        <Link
                          className="dashboard-recent-row"
                          href={`/attendance/${record.id}`}
                          key={record.id}
                          prefetch={false}
                        >
                          <div className="dashboard-recent-row-main">
                            <span className="dashboard-recent-date">
                              {parts.month}.{parts.day}
                            </span>
                            <span className="dashboard-recent-matchup">
                              {record.game.awayTeam.shortName} vs{' '}
                              {record.game.homeTeam.shortName}
                            </span>
                          </div>
                          <span className="dashboard-recent-meta">
                            {record.watchType === 'home' ? '집관' : '직관'} ·{' '}
                            {formatAttendanceResultLabel(
                              record,
                              favoriteTeam?.id,
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      <section className="dashboard-league-zone stack">
        <header className="dashboard-zone-header">
          <div>
            <h2>리그 현황</h2>
          </div>
          <p>팀 순위와 {seasonYear} 시즌 예상 순위</p>
        </header>

        <section className="card stack home-leaderboard-card">
          <div className="section-heading">
            <div>
              <h3>KBO 팀 순위</h3>
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
        <SeasonProjectionTable
          highlightTeamId={favoriteTeam?.id}
          loading={seasonProjectionLoading}
          projection={seasonProjection}
        />
      </section>
    </main>
  );
}
