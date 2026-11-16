'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { ArrowUpRight, CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { TeamStandingsTable } from '@/components/TeamStandingsTable';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';
import { SeasonProjectionTable } from '@/components/SeasonProjectionTable';
import {
  PostseasonBracket,
  summarizePostseason,
} from '@/components/PostseasonBracket';
import { PublicHome } from './PublicHome';
import {
  HomeSeasonTimeline,
  PAST_TILE_LIMIT,
  formatDateParts,
} from './HomeSeasonTimeline';
import { useInitialSignedIn } from '@/components/AppProviders';
import { HonorTitleSwiper } from '@/components/HonorTitleSwiper';
import type {
  Game,
  PostseasonBracket as PostseasonBracketData,
  SeasonProjectionResponse,
  TeamStandingsResponse,
} from '@/lib/baseball-api';
import { useAuthStore } from '@/lib/auth-store';
import {
  getAttendanceSeasonRange,
  useAttendanceRecordsQuery,
  useAttendanceStatsQuery,
  useGamesQuery,
  useMeQuery,
  usePostseasonQuery,
  useSeasonProjectionQuery,
  useTeamsQuery,
  useTeamStandingsQuery,
} from '@/lib/queries';
import { getKoreaDateString } from '@/lib/date-format';
import { josa } from '@/lib/josa';

/** 지난 경기 결과를 타임라인에 보여 주는 기간 */
const RECENT_RESULT_DAYS = 21;
/** 다가오는 일정을 받아 오는 기간 (개월) */
const UPCOMING_MONTHS = 2;

function hasFinalScore(game: Game) {
  return (
    game.status === 'finished' && game.homeScore !== null && game.awayScore !== null
  );
}

function isUpcoming(value: string) {
  return new Date(value).getTime() >= Date.now() - 1000 * 60 * 60 * 6;
}

/** YYYY-MM-DD 날짜에 개월 수를 더한다. 날짜만 다루므로 시간대가 끼어들지 않는다. */
function addMonthsToDateKey(dateKey: string, months: number) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1 + months, day))
    .toISOString()
    .slice(0, 10);
}

/** 지난 3주 결과(기록 안 한 경기 포함)와 앞으로 두 달 일정. 한국 날짜 기준. */
function getHomeScheduleRange() {
  const today = getKoreaDateString();

  return {
    from: getKoreaDateString(new Date(), -RECENT_RESULT_DAYS),
    to: addMonthsToDateKey(today, UPCOMING_MONTHS),
  };
}

export type HomePageClientProps = {
  /** 서버가 한국 시간 기준으로 정한 시즌 연도. 서버·클라이언트 쿼리 키를 맞춘다. */
  seasonYear: number;
  initialStandings: TeamStandingsResponse | null;
  initialProjection: SeasonProjectionResponse | null;
  /** 포스트시즌 경기가 잡히면(active) 순위표 위에 대진표를 띄운다 */
  initialPostseason: PostseasonBracketData | null;
  /** 비로그인 홈의 '오늘의 경기'용 리그 전체 일정 */
  initialGames: Game[] | null;
  gamesRange: { from: string; to: string };
};

export function HomePageClient({
  seasonYear,
  initialStandings,
  initialProjection,
  initialPostseason,
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
  const postseasonQuery = usePostseasonQuery(seasonYear, {
    initialData: initialPostseason,
  });
  const postseason = postseasonQuery.data?.active ? postseasonQuery.data : null;
  const seasonRange = useMemo(
    () => getAttendanceSeasonRange(seasonYear),
    [seasonYear],
  );
  const scheduleRange = useMemo(getHomeScheduleRange, []);
  const gamesQuery = useGamesQuery(
    {
      ...scheduleRange,
      teamId: user?.favoriteTeamId ?? undefined,
    },
    { enabled: Boolean(token && user) },
  );
  // 타임라인용 내 기록. 통계·명예타이틀은 /me 와 같은 API 값을 쓴다.
  const recordsQuery = useAttendanceRecordsQuery(seasonRange, token, {
    enabled: Boolean(token && user),
  });
  const statsQuery = useAttendanceStatsQuery(token, seasonRange, {
    enabled: Boolean(token && user),
  });
  const stats = statsQuery.data ?? null;
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
  const upcomingGames = useMemo(
    () =>
      (gamesQuery.data?.items ?? [])
        .filter((game) => !hasFinalScore(game) && isUpcoming(game.gameDate))
        .slice(0, 5),
    [gamesQuery.data?.items],
  );
  // 기록하지 않은 경기도 응원 팀 결과는 타임라인에 남긴다 (포스트시즌처럼 집에서 못 챙긴 경기)
  // 응원 팀이 없으면 리그 전체 경기가 오므로 결과 칸은 응원 팀이 있을 때만 만든다.
  const finishedTeamGames = useMemo(
    () =>
      user?.favoriteTeamId
        ? (gamesQuery.data?.items ?? []).filter(hasFinalScore)
        : [],
    [gamesQuery.data?.items, user?.favoriteTeamId],
  );
  const recentRecords = useMemo(
    () =>
      (recordsQuery.data?.items ?? [])
        .filter((record) => record.viewerRelation === 'owner')
        .sort(
          (a, b) =>
            new Date(b.game.gameDate).getTime() -
            new Date(a.game.gameDate).getTime(),
        )
        // 타임라인에서 왼쪽으로 넘겨 볼 수 있도록 최근 기록을 넉넉히 둔다.
        .slice(0, PAST_TILE_LIMIT),
    [recordsQuery.data?.items],
  );
  const seasonProjection = seasonProjectionQuery.data ?? null;
  const seasonProjectionLoading = seasonProjectionQuery.isLoading;
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
        postseason={postseason}
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
            <HomeSeasonTimeline
              favoriteTeamId={favoriteTeam?.id}
              finishedTeamGames={finishedTeamGames}
              recentRecords={recentRecords}
              upcomingGames={upcomingGames}
            />
          )}
        </div>
      </section>

      <section className="dashboard-league-zone stack">
        <header className="dashboard-zone-header">
          <div>
            <h2>리그 현황</h2>
          </div>
          <p>
            {postseason
              ? '포스트시즌 대진과 정규시즌 최종 순위'
              : `팀 순위와 ${seasonYear} 시즌 예상 순위`}
          </p>
        </header>

        {postseason ? (
          <section className="card stack home-leaderboard-card">
            <div className="section-heading">
              <div>
                <h3>{seasonYear} 포스트시즌</h3>
                <p>{summarizePostseason(postseason)}</p>
              </div>
            </div>
            <PostseasonBracket
              bracket={postseason}
              highlightTeamId={favoriteTeam?.id}
            />
          </section>
        ) : null}

        <section className="card stack home-leaderboard-card">
          <div className="section-heading">
            <div>
              <h3>{postseason ? '정규시즌 최종 순위' : 'KBO 팀 순위'}</h3>
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
