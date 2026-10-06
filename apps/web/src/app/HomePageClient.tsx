'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { ArrowUpRight, CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { type AttendanceRecord } from '@/lib/attendance-api';
import { computeAttendanceStatsFromRecords } from '@/lib/attendance-stats';
import { TeamStandingsTable } from '@/components/TeamStandingsTable';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';
import { SeasonProjectionTable } from '@/components/SeasonProjectionTable';
import { PublicHome } from './PublicHome';
import { useInitialSignedIn } from '@/components/AppProviders';
import { HonorTitleSwiper } from '@/components/HonorTitleSwiper';
import { getGameStatusTone } from '@/lib/game-status';
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
import { josa } from '@/lib/josa';

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
  // 좁은 화면에서는 타임라인이 옆으로 넘치므로, 처음에 '오늘' 칸이 왼쪽에 오도록 밀어 둔다.
  const todayMarkerRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const marker = todayMarkerRef.current;
    const strip = marker?.parentElement;

    if (!marker || !strip || strip.scrollWidth <= strip.clientWidth) {
      return;
    }

    strip.scrollLeft = Math.max(0, marker.offsetLeft - 12);
  }, [recentRecords.length, upcomingGames.length]);

  const nextGame = upcomingGames[0] ?? null;
  const nextGameDate = nextGame ? formatDateParts(nextGame.gameDate) : null;
  const favoriteStanding = favoriteTeam
    ? (teamStandings?.items.find((item) => item.teamId === favoriteTeam.id) ??
      null)
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
                {seasonYear} 시즌 ·{' '}
                {favoriteTeam?.shortName ?? '응원 팀 미설정'}
              </span>
              {favoriteStanding ? (
                <span className="dashboard-greeting__rank">
                  현재 {favoriteStanding.rank}위
                </span>
              ) : null}
            </div>
            <h1>{user?.nickname ?? '야구팬'}님, 오늘도 플레이볼.</h1>
            <p>
              {favoriteTeam && favoriteStanding
                ? `${josa(favoriteTeam.shortName, '은')} 현재 ${favoriteStanding.rank}위 · 내 관람 기록은 ${stats?.totalCount ?? 0}경기예요.`
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
            <Link
              className="dashboard-greeting__calendar-link"
              href="/calendar"
            >
              <CalendarDays aria-hidden="true" size={17} />
              전체 일정
              <ChevronRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>

        <div className="season">
          <header className="dashboard-zone-header">
            <div>
              <h2>내 시즌</h2>
            </div>
            <Link className="season__link" href="/me">
              통계 보기
              <ChevronRight aria-hidden="true" size={16} />
            </Link>
          </header>

          {/* 시즌 요약 한 줄: 승률 · 직관 · 집관 · 명예타이틀 */}
          {stats ? (
            <dl className="season-stats">
              <div className="season-stats__rate">
                <dt>관람 승률</dt>
                <dd>
                  <strong>
                    {stats.totalCount > 0 ? stats.winRate : 0}
                    <small>%</small>
                  </strong>
                  <span>
                    {stats.winCount}승 {stats.drawCount}무 {stats.loseCount}패
                  </span>
                  {stats.winCount + stats.drawCount + stats.loseCount > 0 ? (
                    <span
                      aria-hidden="true"
                      className="season-stats__bar"
                      style={{
                        ['--win' as string]: stats.winCount,
                        ['--draw' as string]: stats.drawCount,
                        ['--lose' as string]: stats.loseCount,
                      }}
                    >
                      <i data-kind="win" />
                      <i data-kind="draw" />
                      <i data-kind="lose" />
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>직관</dt>
                <dd>
                  <strong>
                    {stats.stadiumCount}
                    <small>경기</small>
                  </strong>
                  <span>
                    승률 {stats.overallStadiumWinRate ?? stats.stadiumWinRate}%
                  </span>
                </dd>
              </div>
              <div>
                <dt>집관</dt>
                <dd>
                  <strong>
                    {stats.homeCount}
                    <small>경기</small>
                  </strong>
                  <span>
                    승률 {stats.overallHomeWinRate ?? stats.homeWinRate}%
                  </span>
                </dd>
              </div>
              <div className="season-stats__titles">
                <dt>명예타이틀</dt>
                <dd>
                  {stats.titles?.length ? (
                    <HonorTitleSwiper titles={stats.titles} />
                  ) : (
                    <span className="season-stats__empty">
                      기록을 남기면 타이틀이 붙어요
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <Skeleton height={112} radius={12} />
          )}

          {/* 타임라인: 최근 본 경기 → 오늘 → 다가오는 경기. 칸 크기가 같아 줄이 어긋나지 않는다. */}
          {authState === 'checking' ? (
            <Skeleton height={164} radius={12} />
          ) : (
            <ol aria-label="최근 기록과 다가오는 경기" className="season-strip">
              {[...recentRecords].reverse().map((record) => {
                const game = record.game;
                const parts = formatDateParts(game.gameDate);
                const favoriteIsHome = game.homeTeam.id === favoriteTeam?.id;
                const favoriteIsAway = game.awayTeam.id === favoriteTeam?.id;
                const opponent = favoriteIsHome
                  ? game.awayTeam
                  : favoriteIsAway
                    ? game.homeTeam
                    : null;
                const hasScore =
                  game.homeScore !== null && game.awayScore !== null;
                const outcome = isGameCancelled(game)
                  ? 'cancelled'
                  : (resolveAttendanceOutcome(record, favoriteTeam?.id) ??
                    'unknown');

                return (
                  <li key={`record-${record.id}`}>
                    <Link
                      className="season-tile season-tile--past"
                      data-outcome={outcome}
                      href={`/attendance/${record.id}`}
                      prefetch={false}
                    >
                      <span className="season-tile__head">
                        <time dateTime={game.gameDate}>
                          {parts.month}.{parts.day} {parts.weekday}
                        </time>
                        <span className="season-tile__tag">
                          {record.watchType === 'home' ? '집관' : '직관'}
                        </span>
                      </span>
                      {opponent ? (
                        <span className="season-tile__team">
                          <img alt="" src={getTeamLogoSrc(opponent)} />
                          <strong>{opponent.shortName}</strong>
                          <small>{favoriteIsHome ? '홈' : '원정'}</small>
                        </span>
                      ) : (
                        <span className="season-tile__team">
                          <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
                          <strong>
                            {game.awayTeam.shortName} vs{' '}
                            {game.homeTeam.shortName}
                          </strong>
                        </span>
                      )}
                      <span className="season-tile__foot">
                        {hasScore ? (
                          <span className="season-tile__score">
                            {favoriteIsHome ? game.homeScore : game.awayScore}
                            <i aria-hidden="true">:</i>
                            {favoriteIsHome ? game.awayScore : game.homeScore}
                          </span>
                        ) : (
                          <span className="season-tile__note">기록</span>
                        )}
                        <span className="season-tile__result">
                          {formatAttendanceResultLabel(
                            record,
                            favoriteTeam?.id,
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}

              <li
                aria-hidden="true"
                className="season-strip__today"
                ref={todayMarkerRef}
              >
                <span>오늘</span>
              </li>

              {upcomingGames.length ? (
                upcomingGames.map((game) => {
                  const parts = formatDateParts(game.gameDate);
                  const favoriteIsHome = game.homeTeam.id === favoriteTeam?.id;
                  const favoriteIsAway = game.awayTeam.id === favoriteTeam?.id;
                  const opponent = favoriteIsHome
                    ? game.awayTeam
                    : favoriteIsAway
                      ? game.homeTeam
                      : null;
                  const tone = getGameStatusTone(game);

                  return (
                    <li key={`game-${game.id}`}>
                      <Link
                        className="season-tile season-tile--next"
                        data-outcome={
                          tone === 'cancelled' ? 'cancelled' : undefined
                        }
                        href={`/games/${game.id}`}
                      >
                        <span className="season-tile__head">
                          <time dateTime={game.gameDate}>
                            {parts.month}.{parts.day} {parts.weekday}
                          </time>
                          <span className="season-tile__time">
                            {parts.time}
                          </span>
                        </span>
                        {opponent ? (
                          <span className="season-tile__team">
                            <img alt="" src={getTeamLogoSrc(opponent)} />
                            <strong>{opponent.shortName}</strong>
                            <small>{favoriteIsHome ? '홈' : '원정'}</small>
                          </span>
                        ) : (
                          <span className="season-tile__team">
                            <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
                            <strong>
                              {game.awayTeam.shortName} vs{' '}
                              {game.homeTeam.shortName}
                            </strong>
                          </span>
                        )}
                        <span className="season-tile__foot">
                          <span className="season-tile__note">
                            {tone === 'cancelled' ? '취소' : game.stadium}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })
              ) : (
                <li className="season-strip__empty">
                  <span>가까운 일정이 없어요</span>
                  <Link href="/calendar">캘린더에서 다른 달 보기</Link>
                </li>
              )}
            </ol>
          )}
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
                  ? `${josa(favoriteTeam.shortName, '은')} ${
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
