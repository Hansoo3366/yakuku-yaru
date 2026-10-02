'use client';

/* eslint-disable @next/next/no-img-element */

import { Info, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Skeleton } from '@/components/Skeleton';
import { type SeasonProjectionResponse } from '@/lib/baseball-api';
import { formatKboChampionshipLabel } from '@/lib/kbo-championship-history';
import { getTeamLogoSrc } from '@/lib/team-logo';

function formatWinRate(value: number) {
  return value.toFixed(3);
}

function formatAverageRank(value: number) {
  return value.toFixed(1);
}

function formatProbability(value: number) {
  if (!Number.isFinite(value)) {
    return '0.0%';
  }

  const percentage = value * 100;

  if (percentage <= 0) {
    return '0%';
  }

  if (percentage >= 100) {
    return '100%';
  }

  if (percentage < 0.1) {
    return '<0.1%';
  }

  if (percentage > 99.9) {
    return '>99.9%';
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
            <span className="eyebrow">계산 방식</span>
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
            예상 승-무-패와 예상 승률은 시뮬레이션 평균값이고, 기대 승률은
            득실점으로 계산한 피타고리안 승률입니다. 정규시즌 144경기가 끝나면
            표는 포스트시즌 최종 예측으로 바뀝니다.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function SeasonProjectionTable({
  projection,
  highlightTeamId,
  loading,
}: {
  projection: SeasonProjectionResponse | null;
  highlightTeamId?: number | null;
  loading?: boolean;
}) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const seasonYear = projection?.seasonYear ?? new Date().getFullYear();
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
      <section aria-busy="true" className="card stack season-projection-card">
        <div className="section-heading season-projection-heading">
          <div>
            <h2>{seasonYear} KBO 예상 순위</h2>
            <p>시즌 예측을 불러오고 있어요…</p>
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
      <section className="card stack season-projection-card">
        <div className="section-heading season-projection-heading">
          <div>
            <h2>{seasonYear} KBO 포스트시즌 최종 예측</h2>
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
                <th scope="col">평균 최종 순위</th>
                <th scope="col">우승확률</th>
                <th scope="col">KS 진출</th>
                <th className="col-wide" scope="col">
                  전력 승률
                </th>
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
                    <td>{formatAverageRank(row.averageFinalRank)}</td>
                    <td>{formatProbability(row.championshipProbability)}</td>
                    <td>{formatProbability(row.koreanSeriesProbability)}</td>
                    <td className="col-wide">
                      {formatWinRate(row.projectedWinRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="season-projection-note">
          정규시즌 144경기 완료 후 저장된 1~5위 seed로 와일드카드, 준플레이오프,
          플레이오프, 한국시리즈를 다시 시뮬레이션합니다.
        </p>
      </section>
    );
  }

  // 시뮬레이션 평균 순위가 낮은 팀부터 1위~10위로 보여 준다. 소수점 평균은 보조 정보로 둔다.
  const rankedRows = [...projection.rows].sort(
    (a, b) => a.averageRank - b.averageRank,
  );

  return (
    <section className="card stack season-projection-card">
      <div className="section-heading season-projection-heading">
        <div>
          <h2>{seasonYear} KBO 시즌 예상 순위</h2>
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
              <th scope="col">예상 순위</th>
              <th scope="col">가을야구 확률</th>
              <th className="col-wide" scope="col">
                현재 승률
              </th>
              <th scope="col">예상 승-무-패</th>
              <th className="col-wide" scope="col">
                예상 승률
              </th>
              <th className="col-wide" scope="col">
                기대 승률
              </th>
              <th className="col-wide" scope="col">
                잔여 경기 승률
              </th>
            </tr>
          </thead>
          <tbody>
            {rankedRows.map((row, index) => {
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
                  <td>
                    <span className="season-projection-rank">
                      {index + 1}위
                      <small>평균 {formatAverageRank(row.averageRank)}</small>
                    </span>
                  </td>
                  <td>{formatProbability(row.playoffProbability)}</td>
                  <td className="col-wide">
                    {formatWinRate(row.currentWinRate)}
                  </td>
                  <td>{formatExpectedRecord(row)}</td>
                  <td className="col-wide">
                    {formatWinRate(row.expectedWinRate)}
                  </td>
                  <td className="col-wide">
                    {formatWinRate(row.pythagoreanWinRate)}
                  </td>
                  <td className="col-wide">
                    {formatWinRate(row.scheduleAdjustedWinRate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="season-projection-note">
        남은 대진을 10만 번 시뮬레이션한 결과입니다. 가을야구 확률은 최종 5위
        이내에 든 비율이고, 예상 순위 아래 숫자는 시뮬레이션 평균 순위입니다.
      </p>
    </section>
  );
}
