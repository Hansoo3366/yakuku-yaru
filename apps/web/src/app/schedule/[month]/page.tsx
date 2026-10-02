import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Game } from '@/lib/baseball-api';
import {
  formatKoreanTime,
  formatKoreanWeekday,
  getKoreaDateString,
} from '@/lib/date-format';
import { getCancellationLabel } from '@/lib/game-cancellation';
import { getGameStatusLabel, getGameStatusTone } from '@/lib/game-status';
import { getMonthRangeOf, listPublicGames } from '@/lib/server-baseball-api';
import styles from '../../data-page.module.css';

/**
 * 한 달의 KBO 경기 일정과 결과를 표로 보여 주는 페이지.
 * 캘린더 화면은 이번 달만 첫 HTML 에 담기므로, 지난 달 결과까지 검색·AI 가 읽을 수 있게
 * 달마다 고정된 주소(/schedule/2026-09)를 둔다.
 */
type SchedulePageProps = {
  params: Promise<{ month: string }>;
};

function parseMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12
    ? { year, month }
    : null;
}

function formatMonthLabel(month: string) {
  const parsed = parseMonth(month);

  return parsed ? `${parsed.year}년 ${parsed.month}월` : month;
}

function groupByDay(games: Game[]) {
  const byDay = new Map<string, Game[]>();

  for (const game of games) {
    const day = getKoreaDateString(game.gameDate);

    byDay.set(day, [...(byDay.get(day) ?? []), game]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, items]) => ({
      day,
      games: items.sort(
        (a, b) =>
          new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime() ||
          a.id - b.id,
      ),
    }));
}

function formatDayHeading(day: string, sample: string) {
  const [, month, date] = day.split('-').map(Number);

  return `${month}월 ${date}일 ${formatKoreanWeekday(sample)}요일`;
}

function describeResult(game: Game) {
  const tone = getGameStatusTone(game);

  if (tone === 'cancelled') {
    return getCancellationLabel(game.cancellationReason);
  }

  if (game.awayScore !== null && game.homeScore !== null) {
    return `${game.awayScore} : ${game.homeScore}`;
  }

  return getGameStatusLabel(tone);
}

export async function generateMetadata({
  params,
}: SchedulePageProps): Promise<Metadata> {
  const { month } = await params;

  if (!parseMonth(month)) {
    return { title: 'KBO 경기 일정' };
  }

  const label = formatMonthLabel(month);

  return {
    title: `${label} KBO 경기 일정·결과`,
    description: `${label} KBO 프로야구 전체 경기 일정과 결과입니다. 날짜별 경기 시간, 대진, 스코어, 구장, 선발 투수를 확인하세요.`,
    alternates: { canonical: `/schedule/${month}` },
  };
}

export default async function ScheduleMonthPage({ params }: SchedulePageProps) {
  const { month } = await params;

  if (!parseMonth(month)) {
    notFound();
  }

  const range = getMonthRangeOf(month);
  const games = await listPublicGames(
    { from: range.from, to: range.to },
    // 이번 달은 결과가 계속 바뀌므로 짧게, 지난 달은 길게 캐시한다.
    month === getKoreaDateString().slice(0, 7) ? 60 * 5 : 60 * 60 * 6,
  );
  const days = groupByDay(games ?? []);
  const label = formatMonthLabel(month);

  return (
    <main className={`app-shell ${styles.page}`}>
      <header className={styles.head}>
        <h1>{label} KBO 경기 일정·결과</h1>
        <p>
          {games === null
            ? '경기 일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
            : `KBO 리그 ${games.length}경기. 시각은 한국 시간 기준이고, 스코어는 원정 : 홈 순서입니다.`}
        </p>
        <nav aria-label="다른 달과 관련 페이지" className={styles.links}>
          <Link href={`/schedule/${range.previousMonth}`}>
            ← {formatMonthLabel(range.previousMonth)}
          </Link>
          <Link href={`/schedule/${range.nextMonth}`}>
            {formatMonthLabel(range.nextMonth)} →
          </Link>
          <Link href="/standings">팀 순위</Link>
          <Link href="/calendar">캘린더로 보기</Link>
        </nav>
      </header>

      <section aria-label={`${label} 경기 목록`} className={styles.panel}>
        {days.length ? (
          days.map(({ day, games: dayGames }) => (
            <section className={styles.day} key={day}>
              <h2>{formatDayHeading(day, dayGames[0].gameDate)}</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">시간</th>
                      <th scope="col">경기 (원정 vs 홈)</th>
                      <th scope="col">결과</th>
                      <th scope="col">구장</th>
                      <th className={styles.wide} scope="col">
                        선발 투수
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayGames.map((game) => {
                      const away = game.probablePitchers.away?.name;
                      const home = game.probablePitchers.home?.name;

                      return (
                        <tr key={game.id}>
                          <td>
                            <time dateTime={game.gameDate}>
                              {formatKoreanTime(game.gameDate)}
                            </time>
                          </td>
                          <td>
                            <Link href={`/games/${game.id}`} prefetch={false}>
                              {game.awayTeam.shortName} vs{' '}
                              {game.homeTeam.shortName}
                            </Link>
                          </td>
                          <td className={styles.score}>
                            {describeResult(game)}
                          </td>
                          <td className={styles.muted}>{game.stadium}</td>
                          <td className={`${styles.wide} ${styles.muted}`}>
                            {away || home
                              ? `${away ?? '미정'} vs ${home ?? '미정'}`
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        ) : (
          <p className={styles.empty}>이 달에는 등록된 경기가 없어요.</p>
        )}
      </section>
    </main>
  );
}
