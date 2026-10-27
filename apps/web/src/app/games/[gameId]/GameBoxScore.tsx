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
import { useGameBoxScoreQuery } from '@/lib/queries';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';

type Props = {
  game: Game;
  viewerFavoriteTeamId: number | null;
};

type Side = 'away' | 'home';

/** 좌안·중2·우3·좌중홈 처럼 안타는 끝 글자가 안·2·3·홈 이다 */
function isHitResult(value: string) {
  return value.split(' / ').some((part) => /(안|홈|[^0-9]2|[^0-9]3)$/.test(part));
}

function formatNumber(value: number | null) {
  return value === null ? '-' : String(value);
}

function LineScore({ boxScore, game }: { boxScore: BoxScore; game: Game }) {
  const innings = Array.from({ length: boxScore.inningCount }, (_, index) => index + 1);
  const rows: { side: Side; team: Game['awayTeam'] }[] = [
    { side: 'away', team: game.awayTeam },
    { side: 'home', team: game.homeTeam },
  ];

  return (
    <div className="box-score-scroll">
      <table className="box-score-table box-score-line">
        <thead>
          <tr>
            <th scope="col">팀</th>
            {innings.map((inning) => (
              <th key={inning} scope="col">
                {inning}
              </th>
            ))}
            <th className="is-total" scope="col">R</th>
            <th scope="col">H</th>
            <th scope="col">E</th>
            <th scope="col">B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ side, team }) => {
            const line = boxScore[side].line;

            return (
              <tr key={side}>
                <th scope="row">
                  <span className="box-score-team">
                    <img alt="" src={getTeamLogoSrc(team)} />
                    {team.shortName}
                  </span>
                </th>
                {line.innings.map((runs, index) => (
                  <td data-scored={runs !== null && runs > 0} key={index}>
                    {runs === null ? '-' : runs}
                  </td>
                ))}
                <td className="is-total">{formatNumber(line.runs)}</td>
                <td>{formatNumber(line.hits)}</td>
                <td>{formatNumber(line.errors)}</td>
                <td>{formatNumber(line.walks)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PitcherTable({ pitchers }: { pitchers: BoxScorePitcher[] }) {
  return (
    <div className="box-score-scroll">
      <table className="box-score-table box-score-players">
        <thead>
          <tr>
            <th scope="col">투수</th>
            <th scope="col">이닝</th>
            <th scope="col">투구수</th>
            <th scope="col">타자</th>
            <th scope="col">피안타</th>
            <th scope="col">피홈런</th>
            <th scope="col">4사구</th>
            <th scope="col">삼진</th>
            <th scope="col">실점</th>
            <th scope="col">자책</th>
            <th scope="col">ERA</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((pitcher, index) => (
            <tr key={`${pitcher.name}-${index}`}>
              <th scope="row">
                <span className="box-score-player">
                  <strong>{pitcher.name}</strong>
                  {pitcher.decision ? (
                    <span className="box-score-decision" data-kind={pitcher.decision}>
                      {pitcher.decision}
                    </span>
                  ) : null}
                  {pitcher.isStarter ? <em>선발</em> : null}
                </span>
              </th>
              <td>{pitcher.innings || '-'}</td>
              <td>{formatNumber(pitcher.pitches)}</td>
              <td>{formatNumber(pitcher.battersFaced)}</td>
              <td>{formatNumber(pitcher.hits)}</td>
              <td>{formatNumber(pitcher.homeRuns)}</td>
              <td>{formatNumber(pitcher.walks)}</td>
              <td>{formatNumber(pitcher.strikeouts)}</td>
              <td>{formatNumber(pitcher.runs)}</td>
              <td>{formatNumber(pitcher.earnedRuns)}</td>
              <td>{pitcher.era ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HitterTable({
  team,
  inningCount,
}: {
  team: BoxScoreTeam;
  inningCount: number;
}) {
  const innings = Array.from({ length: inningCount }, (_, index) => index);

  return (
    <div className="box-score-scroll">
      <table className="box-score-table box-score-players box-score-hitters">
        <thead>
          <tr>
            <th scope="col">타자</th>
            <th scope="col">타수</th>
            <th scope="col">안타</th>
            <th scope="col">타점</th>
            <th scope="col">득점</th>
            <th scope="col">타율</th>
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
                <span className="box-score-player">
                  <span className="box-score-order">
                    {hitter.isSubstitute ? '' : hitter.battingOrder}
                  </span>
                  <strong>{hitter.name}</strong>
                  <em>{hitter.position}</em>
                </span>
              </th>
              <td>{formatNumber(hitter.atBats)}</td>
              <td data-strong={Boolean(hitter.hits)}>{formatNumber(hitter.hits)}</td>
              <td data-strong={Boolean(hitter.rbi)}>{formatNumber(hitter.rbi)}</td>
              <td>{formatNumber(hitter.runs)}</td>
              <td>{hitter.average ?? '-'}</td>
              {innings.map((inningIndex) => {
                const result = hitter.innings[inningIndex] ?? '';

                return (
                  <td
                    className="is-inning"
                    data-hit={result ? isHitResult(result) : undefined}
                    key={inningIndex}
                  >
                    {result}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {team.hitterTotals ? (
          <tfoot>
            <tr>
              <th scope="row">합계</th>
              <td>{formatNumber(team.hitterTotals.atBats)}</td>
              <td>{formatNumber(team.hitterTotals.hits)}</td>
              <td>{formatNumber(team.hitterTotals.rbi)}</td>
              <td>{formatNumber(team.hitterTotals.runs)}</td>
              <td />
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

export function GameBoxScore({ game, viewerFavoriteTeamId }: Props) {
  const boxScoreQuery = useGameBoxScoreQuery(game.id, true);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const boxScore = boxScoreQuery.data?.boxScore ?? null;
  const side: Side =
    selectedSide ?? (viewerFavoriteTeamId === game.homeTeam.id ? 'home' : 'away');
  const teams: { side: Side; team: Game['awayTeam'] }[] = [
    { side: 'away', team: game.awayTeam },
    { side: 'home', team: game.homeTeam },
  ];

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
            <h3>투수</h3>
            <PitcherTable pitchers={boxScore[side].pitchers} />
          </div>
          <div className="box-score-block">
            <h3>타자</h3>
            <HitterTable inningCount={boxScore.inningCount} team={boxScore[side]} />
          </div>

          {boxScore.notes.length > 0 ? (
            <dl className="box-score-notes">
              {boxScore.notes.map((note) => (
                <div key={note.label}>
                  <dt>{note.label}</dt>
                  <dd>{note.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      )}
    </section>
  );
}
