'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import type {
  BoxScore,
  BoxScoreHitter,
  BoxScorePitcher,
  BoxScoreTeam,
  Game,
} from '@/lib/baseball-api';
import {
  DECISION_LABEL,
  describePlateResults,
  getBoxScoreHighlights,
  describePosition,
  formatPitcherInnings,
  type PlateResultKind,
} from '@/lib/box-score-terms';
import { useGameBoxScoreQuery } from '@/lib/queries';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';

type Props = {
  game: Game;
  viewerFavoriteTeamId: number | null;
  /** 서버가 미리 받아 온 기록. 첫 HTML 에 기록이 담겨 검색·AI 도 읽을 수 있다. */
  initialBoxScore?: BoxScore | null;
};

type Side = 'away' | 'home';
type TeamInfo = Game['awayTeam'];

const WINNING_HIT_LABEL = '결승타';

const RESULT_LEGEND: { kind: PlateResultKind; label: string }[] = [
  { kind: 'hit', label: '안타' },
  { kind: 'walk', label: '볼넷·사구' },
  { kind: 'reach', label: '실책 출루' },
  { kind: 'out', label: '아웃' },
];

function formatNumber(value: number | null) {
  return value === null ? '-' : String(value);
}

/** 타율 0.417 → .417 */
function formatAverage(value: string | null) {
  if (!value) return null;
  return value.startsWith('0.') ? value.slice(1) : value;
}

function LineScore({ boxScore, game }: { boxScore: BoxScore; game: Game }) {
  const innings = Array.from({ length: boxScore.inningCount }, (_, index) => index + 1);
  const rows: { side: Side; team: TeamInfo }[] = [
    { side: 'away', team: game.awayTeam },
    { side: 'home', team: game.homeTeam },
  ];
  const awayRuns = boxScore.away.line.runs ?? 0;
  const homeRuns = boxScore.home.line.runs ?? 0;
  const winner: Side | null =
    awayRuns === homeRuns ? null : awayRuns > homeRuns ? 'away' : 'home';

  return (
    <div className="box-score-scroll box-score-line-wrap">
      <table className="box-score-table box-score-line">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">팀</span>
            </th>
            {innings.map((inning) => (
              <th key={inning} scope="col">
                {inning}
              </th>
            ))}
            <th className="is-total is-first-total" scope="col">득점</th>
            <th className="is-total" scope="col">안타</th>
            <th className="is-total" scope="col">실책</th>
            <th className="is-total is-walks" scope="col">볼넷</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ side, team }) => {
            const line = boxScore[side].line;

            return (
              <tr data-winner={winner === side} key={side}>
                <th scope="row">
                  <span className="box-score-team">
                    <img alt="" src={getTeamLogoSrc(team)} />
                    {team.shortName}
                  </span>
                </th>
                {line.innings.map((runs, index) => (
                  <td data-scored={runs !== null && runs > 0} key={index}>
                    {runs === null ? '' : runs}
                  </td>
                ))}
                <td className="is-total is-first-total is-runs">{formatNumber(line.runs)}</td>
                <td className="is-total">{formatNumber(line.hits)}</td>
                <td className="is-total">{formatNumber(line.errors)}</td>
                <td className="is-total is-walks">{formatNumber(line.walks)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 승리·패전·세이브 투수와 결승타를 경기 기록 맨 위에 모아 둔다 */
function KeyPlayers({ boxScore, game }: { boxScore: BoxScore; game: Game }) {
  const highlights = getBoxScoreHighlights(boxScore);
  const teamOf = (side: Side) => (side === 'away' ? game.awayTeam : game.homeTeam);
  const items: { label: string; name: string; team: TeamInfo | null; detail?: string }[] = [];

  for (const [label, pitcher] of [
    ['승리 투수', highlights.winningPitcher],
    ['패전 투수', highlights.losingPitcher],
    ['세이브 투수', highlights.savePitcher],
  ] as const) {
    if (pitcher) items.push({ label, name: pitcher.name, team: teamOf(pitcher.side) });
  }

  if (highlights.winningHit) {
    items.push({
      label: WINNING_HIT_LABEL,
      name: highlights.winningHit.name,
      team: null,
      detail: highlights.winningHit.detail ?? undefined,
    });
  }

  if (items.length === 0) return null;

  return (
    <ul aria-label="이 경기의 주인공" className="box-score-keys">
      {items.map((item) => (
        <li key={item.label}>
          <span className="box-score-keys__label">{item.label}</span>
          <span className="box-score-keys__name">
            {item.team ? <img alt="" src={getTeamLogoSrc(item.team)} /> : null}
            <strong>{item.name}</strong>
          </span>
          {item.detail ? <span className="box-score-keys__detail">{item.detail}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function PitcherTable({ pitchers }: { pitchers: BoxScorePitcher[] }) {
  return (
    <div className="box-score-scroll">
      <table className="box-score-table box-score-pitchers">
        <thead>
          <tr>
            <th scope="col">투수</th>
            <th scope="col">이닝</th>
            <th scope="col">투구수</th>
            <th scope="col">피안타</th>
            <th scope="col">피홈런</th>
            <th scope="col" title="볼넷과 몸에 맞는 공">볼넷</th>
            <th scope="col">삼진</th>
            <th scope="col">실점</th>
            <th scope="col">자책점</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((pitcher, index) => {
            const decision = pitcher.decision ? DECISION_LABEL[pitcher.decision] : null;

            return (
              <tr key={`${pitcher.name}-${index}`}>
                <th scope="row">
                  <span className="box-score-person">
                    <span className="box-score-person__name">
                      <strong>{pitcher.name}</strong>
                      {decision ? (
                        <span className="box-score-decision" data-kind={decision}>
                          {decision}
                        </span>
                      ) : null}
                    </span>
                    <span className="box-score-person__sub">
                      {pitcher.isStarter ? '선발' : '구원'}
                      {pitcher.era ? ` · 평균자책 ${pitcher.era}` : ''}
                    </span>
                  </span>
                </th>
                <td className="is-strong">{formatPitcherInnings(pitcher.innings)}</td>
                <td data-zero={pitcher.pitches === 0}>{formatNumber(pitcher.pitches)}</td>
                <td data-zero={pitcher.hits === 0}>{formatNumber(pitcher.hits)}</td>
                <td data-zero={pitcher.homeRuns === 0}>{formatNumber(pitcher.homeRuns)}</td>
                <td data-zero={pitcher.walks === 0}>{formatNumber(pitcher.walks)}</td>
                <td data-zero={pitcher.strikeouts === 0}>{formatNumber(pitcher.strikeouts)}</td>
                <td data-zero={pitcher.runs === 0}>{formatNumber(pitcher.runs)}</td>
                <td data-zero={pitcher.earnedRuns === 0}>{formatNumber(pitcher.earnedRuns)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 회마다 칸을 나눈 타자 기록표. 칸 안에는 "좌익수 / 뜬공"처럼 공이 간 곳과 결과를 두 줄로 쓴다 */
function HitterTable({ team, inningCount }: { team: BoxScoreTeam; inningCount: number }) {
  const innings = Array.from({ length: inningCount }, (_, index) => index);

  return (
    <div className="box-score-scroll">
      <table className="box-score-table box-score-hitters">
        <thead>
          <tr>
            <th scope="col">타자</th>
            <th className="is-stat" scope="col">타수</th>
            <th className="is-stat" scope="col">안타</th>
            <th className="is-stat" scope="col">타점</th>
            <th className="is-stat" scope="col">득점</th>
            <th className="is-stat is-last-stat" scope="col">타율</th>
            {innings.map((index) => (
              <th className="is-inning" key={index} scope="col">
                {index + 1}회
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.hitters.map((hitter: BoxScoreHitter, index) => (
            <tr data-substitute={hitter.isSubstitute} key={`${hitter.name}-${index}`}>
              <th scope="row">
                <span className="box-score-batter">
                  <span
                    aria-label={hitter.isSubstitute ? '교체 선수' : `${hitter.battingOrder}번 타자`}
                    className="box-score-batter__order"
                  >
                    {hitter.isSubstitute ? '↳' : hitter.battingOrder}
                  </span>
                  <span className="box-score-batter__who">
                    <strong>{hitter.name}</strong>
                    <span>{describePosition(hitter.position)}</span>
                    {/* 좁은 화면에서는 기록 칸을 숨기고 이름 밑에 한 줄로 적는다 */}
                    <span className="box-score-batter__line">
                      {hitter.atBats ?? 0}타수 {hitter.hits ?? 0}안타
                      {hitter.rbi ? ` ${hitter.rbi}타점` : ''}
                    </span>
                  </span>
                </span>
              </th>
              <td className="is-stat" data-zero={hitter.atBats === 0}>{formatNumber(hitter.atBats)}</td>
              <td className="is-stat" data-hot={Boolean(hitter.hits)} data-zero={hitter.hits === 0}>
                {formatNumber(hitter.hits)}
              </td>
              <td className="is-stat" data-hot={Boolean(hitter.rbi)} data-zero={hitter.rbi === 0}>
                {formatNumber(hitter.rbi)}
              </td>
              <td className="is-stat" data-zero={hitter.runs === 0}>{formatNumber(hitter.runs)}</td>
              <td className="is-stat is-last-stat is-average">
                {formatAverage(hitter.average) ?? '-'}
              </td>
              {innings.map((inningIndex) => {
                const plates = describePlateResults(hitter.innings[inningIndex] ?? '');

                return (
                  <td className="is-inning" key={inningIndex}>
                    {plates.map((plate, order) => (
                      <span
                        className="box-score-plate"
                        data-kind={plate.kind}
                        key={order}
                        title={plate.label}
                      >
                        {plate.place ? <small>{plate.place}</small> : null}
                        {plate.outcome}
                      </span>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {team.hitterTotals ? (
          <tfoot>
            <tr>
              <th scope="row">팀 합계</th>
              <td className="is-stat">{formatNumber(team.hitterTotals.atBats)}</td>
              <td className="is-stat">{formatNumber(team.hitterTotals.hits)}</td>
              <td className="is-stat">{formatNumber(team.hitterTotals.rbi)}</td>
              <td className="is-stat">{formatNumber(team.hitterTotals.runs)}</td>
              <td className="is-stat is-last-stat" />
              {innings.map((index) => (
                <td className="is-inning" key={index} />
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function formatGameMeta(boxScore: BoxScore) {
  return [
    boxScore.crowd ? `관중 ${boxScore.crowd.toLocaleString('ko-KR')}명` : null,
    boxScore.duration ? `경기 시간 ${boxScore.duration}` : null,
    boxScore.startTime && boxScore.endTime
      ? `${boxScore.startTime}~${boxScore.endTime}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function GameBoxScore({ game, viewerFavoriteTeamId, initialBoxScore }: Props) {
  const boxScoreQuery = useGameBoxScoreQuery(game.id, true, {
    initialData: initialBoxScore,
  });
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const boxScore = boxScoreQuery.data?.boxScore ?? null;
  const side: Side =
    selectedSide ?? (viewerFavoriteTeamId === game.homeTeam.id ? 'home' : 'away');
  const teams: { side: Side; team: TeamInfo }[] = [
    { side: 'away', team: game.awayTeam },
    { side: 'home', team: game.homeTeam },
  ];
  const notes = boxScore?.notes.filter((note) => note.label !== WINNING_HIT_LABEL) ?? [];

  return (
    <section
      aria-label="경기 기록"
      className="game-detail-surface game-report-section"
      id="box-score"
    >
      <div className="section-heading">
        <div>
          <h2>경기 기록</h2>
          <p>
            {boxScore
              ? formatGameMeta(boxScore) || '이닝별 득점과 선수 기록'
              : '이닝별 득점과 선수 기록'}
          </p>
        </div>
      </div>

      {boxScoreQuery.isLoading ? (
        <Skeleton height={160} radius={10} />
      ) : !boxScore ? (
        <p className="box-score-empty">
          기록을 정리하고 있어요. 경기가 끝나고 30분쯤 뒤에 올라와요.
        </p>
      ) : (
        <div className="box-score">
          <LineScore boxScore={boxScore} game={game} />
          <KeyPlayers boxScore={boxScore} game={game} />

          <div aria-label="기록을 볼 팀" className="box-score-switch" role="group">
            {teams.map(({ side: teamSide, team }) => (
              <button
                aria-pressed={side === teamSide}
                className={side === teamSide ? 'is-selected' : ''}
                key={teamSide}
                onClick={() => setSelectedSide(teamSide)}
                type="button"
              >
                <img alt="" height={22} src={getTeamLogoSrc(team)} width={22} />
                {team.shortName}
              </button>
            ))}
          </div>

          <div className="box-score-block">
            <div className="box-score-block__head">
              <h3>타자</h3>
              <ul aria-label="타석 결과 색 구분" className="box-score-legend">
                {RESULT_LEGEND.map((item) => (
                  <li data-kind={item.kind} key={item.kind}>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
            <HitterTable inningCount={boxScore.inningCount} team={boxScore[side]} />
          </div>

          <div className="box-score-block">
            <div className="box-score-block__head">
              <h3>투수</h3>
            </div>
            <PitcherTable pitchers={boxScore[side].pitchers} />
          </div>

          {notes.length > 0 ? (
            <div className="box-score-block">
              <div className="box-score-block__head">
                <h3>주요 기록</h3>
              </div>
              <dl className="box-score-notes">
                {notes.map((note) => (
                  <div key={note.label}>
                    <dt>{note.label}</dt>
                    <dd>{note.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
