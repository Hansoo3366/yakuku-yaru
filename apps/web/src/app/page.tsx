'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { Info, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { type AttendanceRecord } from '@/lib/attendance-api';
import { computeAttendanceStatsFromRecords } from '@/lib/attendance-stats';
import { TeamStandingsTable } from '@/components/TeamStandingsTable';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { HonorTitleSwiper } from '@/components/HonorTitleSwiper';
import { getGameStatusLabel, getGameStatusTone } from '@/lib/game-status';
import { isGameCancelled } from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';
import { getCancellationLabel } from '@/lib/game-cancellation';
import { type SeasonProjectionResponse } from '@/lib/baseball-api';
import { formatKboChampionshipLabel } from '@/lib/kbo-championship-history';
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

const features = [
  {
    icon: '◇',
    title: 'KBO 야구 캘린더',
    description:
      '오늘 야구 일정과 프로야구 일정표, 직관 기록을 한 화면에서 봅니다.',
  },
  {
    icon: '⌖',
    title: '직관 인증과 사진',
    description: '경기별로 사진과 메모, 스코어를 함께 남겨요.',
  },
  {
    icon: '★',
    title: 'KBO 팬 명예타이틀',
    description:
      '승률과 기록 패턴에 따라 여러 명예타이틀이 마이페이지에 붙어요.',
  },
];

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

function formatWinRate(value: number) {
  return value.toFixed(3);
}

function formatExpectedRank(value: number) {
  return `${value.toFixed(1)}위`;
}

function formatProbability(value: number) {
  if (!Number.isFinite(value)) {
    return '0.0%';
  }

  const percentage = value * 100;

  if (percentage > 0 && percentage < 0.1) {
    return '<0.1%';
  }

  return `${percentage.toFixed(1)}%`;
}

function formatExpectedRecord(row: SeasonProjectionResponse['rows'][number]) {
  const targetTotal = Math.round(row.projectedGames);
  const values = [
    { key: 'wins', value: row.averageWins },
    { key: 'draws', value: row.averageDraws },
    { key: 'losses', value: row.averageLosses },
  ] as const;
  const rounded = values.map((entry) => ({
    ...entry,
    count: Math.floor(entry.value),
    remainder: entry.value - Math.floor(entry.value),
  }));
  const missing =
    targetTotal - rounded.reduce((sum, entry) => sum + entry.count, 0);

  rounded
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, Math.max(0, missing))
    .forEach((entry) => {
      entry.count += 1;
    });

  const byKey = new Map(rounded.map((entry) => [entry.key, entry.count]));

  return `${byKey.get('wins') ?? 0} - ${byKey.get('draws') ?? 0} - ${
    byKey.get('losses') ?? 0
  }`;
}

function SeasonProjectionFormulaDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="season-projection-modal">
      <button
        aria-label="닫기"
        className="season-projection-modal__backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="season-projection-modal__panel"
        role="dialog"
      >
        <div className="season-projection-modal__head">
          <div>
            <span className="eyebrow">Formula</span>
            <h3 id={titleId}>예상 순위 계산식</h3>
          </div>
          <button
            aria-label="닫기"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="season-projection-modal__body">
          <div className="season-projection-formula">
            <div className="season-projection-formula__row">
              <span>1</span>
              <div>
                <strong>현재 승률</strong>
                <code>승 / (승 + 패)</code>
                <p>무승부는 KBO 승률처럼 분모에서 제외합니다.</p>
              </div>
            </div>
            <div className="season-projection-formula__row">
              <span>2</span>
              <div>
                <strong>피타고리안 승률</strong>
                <code>득점^1.83 / (득점^1.83 + 실점^1.83)</code>
                <p>득실점은 전력 보정용으로만 40% 반영합니다.</p>
              </div>
            </div>
            <div className="season-projection-formula__row">
              <span>3</span>
              <div>
                <strong>팀 전력 승률</strong>
                <code>현재 승률 * 0.60 + 피타고리안 승률 * 0.40</code>
                <p>
                  대승 한두 경기 영향이 과해지지 않도록 보수적으로 섞습니다.
                </p>
              </div>
            </div>
            <div className="season-projection-formula__row">
              <span>4</span>
              <div>
                <strong>잔여 경기 승률</strong>
                <code>A(1-B) / (A(1-B) + B(1-A))</code>
                <p>
                  Log5로 상대 전력을 반영하고 홈 보정과 무승부 2%를 적용합니다.
                </p>
              </div>
            </div>
            <div className="season-projection-formula__row">
              <span>5</span>
              <div>
                <strong>정규시즌 예상 순위</strong>
                <code>144경기까지 100,000회 몬테카를로 평균 저장</code>
                <p>
                  서버가 계산하고, 일정에 없는 재편성분은 리그 평균 상대 경기로
                  채웁니다.
                </p>
              </div>
            </div>
            <div className="season-projection-formula__row">
              <span>6</span>
              <div>
                <strong>가을야구 확률</strong>
                <code>시뮬레이션 최종 순위 5위 이내 횟수 / 100,000</code>
                <p>
                  정규시즌이 진행 중일 때만 표에 표시하는 포스트시즌 진출
                  확률입니다.
                </p>
              </div>
            </div>
            <div className="season-projection-formula__row">
              <span>7</span>
              <div>
                <strong>포스트시즌 최종 예측</strong>
                <code>144경기 완료 후 1~5위 seed로 별도 시뮬레이션</code>
                <p>
                  와일드카드 4위 어드밴티지, 준플레이오프, 플레이오프,
                  한국시리즈를 순서대로 반영합니다.
                </p>
              </div>
            </div>
          </div>
          <p className="season-projection-formula__note">
            예상 W-T-L과 예상승률은 시뮬레이션 평균값이고, pWin%는 피타고리안
            승률 원값입니다. 정규시즌 144경기가 끝나면 표는 포스트시즌 최종
            예측으로 바뀝니다.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function SeasonProjectionTable({
  projection,
  highlightTeamId,
  loading,
}: {
  projection: SeasonProjectionResponse | null;
  highlightTeamId?: number | null;
  loading?: boolean;
}) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const formulaButton = (
    <button
      aria-label="예상 순위 계산식 보기"
      className="icon-button season-projection-info-button"
      onClick={() => setFormulaOpen(true)}
      title="예상 순위 계산식 보기"
      type="button"
    >
      <Info aria-hidden="true" size={18} />
    </button>
  );

  if (loading) {
    return (
      <section aria-busy="true" className="card stack">
        <div className="section-heading season-projection-heading">
          <div>
            <h2>2026 KBO 예상 순위</h2>
            <p>DB에 저장된 시즌 예측 값을 불러오고 있어요…</p>
          </div>
          {formulaButton}
        </div>
        {formulaOpen ? (
          <SeasonProjectionFormulaDialog
            onClose={() => setFormulaOpen(false)}
          />
        ) : null}
        <div className="season-projection-skeleton">
          <Skeleton height={28} />
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton height={40} key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (
    !projection ||
    (!projection.rows.length && !projection.postseasonRows.length)
  ) {
    return null;
  }

  if (projection.status === 'postseason' && projection.postseasonRows.length) {
    return (
      <section className="card stack">
        <div className="section-heading season-projection-heading">
          <div>
            <h2>2026 KBO 포스트시즌 최종 예측</h2>
            <p>
              {projection.rankDate
                ? `${projection.rankDate} 정규시즌 최종 순위 기반`
                : '정규시즌 최종 순위 기반'}
            </p>
          </div>
          {formulaButton}
        </div>
        {formulaOpen ? (
          <SeasonProjectionFormulaDialog
            onClose={() => setFormulaOpen(false)}
          />
        ) : null}
        <div className="season-projection-table-wrap">
          <table className="season-projection-table">
            <thead>
              <tr>
                <th scope="col">팀</th>
                <th scope="col">정규순위</th>
                <th scope="col">예상최종순위</th>
                <th scope="col">우승확률</th>
                <th scope="col">KS 진출</th>
                <th scope="col">전력승률</th>
              </tr>
            </thead>
            <tbody>
              {projection.postseasonRows.map((row) => {
                const isHighlighted = highlightTeamId === row.teamId;

                return (
                  <tr
                    className={isHighlighted ? 'is-highlighted' : undefined}
                    key={row.teamId}
                  >
                    <td>
                      <span className="standings-team-cell">
                        <img
                          alt=""
                          src={getTeamLogoSrc({
                            shortName: row.teamShortName,
                          })}
                        />
                        <span>
                          <strong>{row.teamShortName}</strong>
                          <em>
                            정규 {row.seed}위 ·{' '}
                            {formatKboChampionshipLabel(
                              row.championshipHistory,
                            )}
                          </em>
                        </span>
                      </span>
                    </td>
                    <td>{row.seed}위</td>
                    <td>{formatExpectedRank(row.averageFinalRank)}</td>
                    <td>{formatProbability(row.championshipProbability)}</td>
                    <td>{formatProbability(row.koreanSeriesProbability)}</td>
                    <td>{formatWinRate(row.projectedWinRate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="season-projection-note">
          정규시즌 144경기 완료 후 저장된 1~5위 seed로 와일드카드,
          준플레이오프, 플레이오프, 한국시리즈를 다시 시뮬레이션합니다.
        </p>
      </section>
    );
  }

  return (
    <section className="card stack">
      <div className="section-heading season-projection-heading">
        <div>
          <h2>2026 KBO 시즌 예상 순위</h2>
          <p>
            {projection.rankDate
              ? `${projection.rankDate}까지의 성적과 남은 대진 기반`
              : '저장된 성적과 남은 대진 기반'}
          </p>
        </div>
        {formulaButton}
      </div>
      {formulaOpen ? (
        <SeasonProjectionFormulaDialog onClose={() => setFormulaOpen(false)} />
      ) : null}
      <div className="season-projection-table-wrap">
        <table className="season-projection-table">
          <thead>
            <tr>
              <th scope="col">팀</th>
              <th scope="col">예상순위</th>
              <th scope="col">가을야구</th>
              <th scope="col">현재 승률</th>
              <th scope="col">예상 W-T-L</th>
              <th scope="col">예상승률</th>
              <th scope="col">pWin%</th>
              <th scope="col">잔여승률</th>
            </tr>
          </thead>
          <tbody>
            {projection.rows.map((row) => {
              const isHighlighted = highlightTeamId === row.teamId;

              return (
                <tr
                  className={isHighlighted ? 'is-highlighted' : undefined}
                  key={row.teamId}
                >
                  <td>
                    <span className="standings-team-cell">
                      <img
                        alt=""
                        src={getTeamLogoSrc({ shortName: row.teamShortName })}
                      />
                      <span>
                        <strong>{row.teamShortName}</strong>
                        <em>
                          {row.currentRank}위 ·{' '}
                          {formatKboChampionshipLabel(row.championshipHistory)}
                        </em>
                      </span>
                    </span>
                  </td>
                  <td>{formatExpectedRank(row.averageRank)}</td>
                  <td>{formatProbability(row.playoffProbability)}</td>
                  <td>{formatWinRate(row.currentWinRate)}</td>
                  <td>{formatExpectedRecord(row)}</td>
                  <td>{formatWinRate(row.expectedWinRate)}</td>
                  <td>{formatWinRate(row.pythagoreanWinRate)}</td>
                  <td>{formatWinRate(row.scheduleAdjustedWinRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="season-projection-note">
        가을야구 확률은 144경기 시뮬레이션에서 최종 5위 이내에 든 비율입니다.
      </p>
    </section>
  );
}

export default function HomePage() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const storedUser = useAuthStore((state) => state.user);
  const seasonYear = new Date().getFullYear();
  const meQuery = useMeQuery(token);
  const user = meQuery.data?.user ?? storedUser;
  const teamsQuery = useTeamsQuery();
  const teamStandingsQuery = useTeamStandingsQuery(seasonYear);
  const seasonProjectionQuery = useSeasonProjectionQuery(seasonYear);
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
  const authState: 'checking' | 'guest' | 'authed' = !hasHydrated
    ? 'checking'
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

  if (authState === 'guest') {
    return (
      <main className="page-shell">
        <section className="home-hero">
          <span className="eyebrow">야크크 야르~ 섹시야구</span>
          <h1>
            KBO 일정과 시즌 예상
            <br />
            순위를 한눈에
          </h1>
          <p>
            프로야구 일정표와 야구 캘린더, 팀 순위와 2026 시즌 예상 순위, <br />
            직관 사진과 같이 간 친구의 기록까지 남기는 야구 앱입니다.
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
              <h2>KBO 팀 순위와 프로야구 일정</h2>
              <p>공식 기록실 순위와 야구 일정 데이터를 매일 반영해요.</p>
            </div>
          </div>
          <TeamStandingsTable standings={teamStandings} />
        </section>
        <SeasonProjectionTable
          loading={seasonProjectionLoading}
          projection={seasonProjection}
        />
      </main>
    );
  }

  return (
    <main className="page-shell page-shell--dashboard">
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
                ? `${favoriteTeam.name}의 다가오는 KBO 일정과 직관 캘린더를 정리했어요.`
                : '마이페이지에서 응원 팀을 설정하면 야구 일정과 캘린더가 더 정확해져요.'}
            </p>
          </div>
          <Link className="btn btn-primary" href="/calendar">
            캘린더 열기
          </Link>
        </div>

        <div className="dashboard-personal-zone">
          <header className="dashboard-zone-header">
            <h2>내 경기</h2>
            <p>다가오는 일정과 직관 기록을 한눈에</p>
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
                    <span className="eyebrow">Win Rate</span>
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
          <h2>리그 현황</h2>
          <p>팀 순위와 2026 시즌 예상 순위</p>
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
