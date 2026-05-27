'use client';

import type { AttendanceResult } from '@/lib/attendance-score';

type Props = {
  myTeamScore: string;
  opponentScore: string;
  result: AttendanceResult | null;
  resultManuallySet: boolean;
  scoreLocked: boolean;
  lockHint?: string;
  onMyTeamScoreChange: (value: string) => void;
  onOpponentScoreChange: (value: string) => void;
  onPickResult: (value: AttendanceResult) => void;
};

export function AttendanceScoreSection({
  myTeamScore,
  opponentScore,
  result,
  resultManuallySet,
  scoreLocked,
  lockHint = '경기 종료 후 KBO 공식 스코어가 확인되면 자동으로 맞춰집니다.',
  onMyTeamScoreChange,
  onOpponentScoreChange,
  onPickResult,
}: Props) {
  return (
    <section className="card stack">
      <div className="section-heading" style={{ marginBottom: 0 }}>
        <div>
          <h2>스코어와 결과</h2>
          <p>
            {scoreLocked
              ? '점수는 직접 입력하지 않고 공식 경기 스코어만 반영합니다.'
              : '점수를 입력하면 결과는 자동으로 추정해요. 수동 선택도 가능합니다.'}
          </p>
        </div>
      </div>
      <div
        className={`score-input-group${scoreLocked ? ' score-input-group--locked' : ''}`}
      >
        <label className="score-input-cell">
          <span>내 팀</span>
          <input
            disabled={scoreLocked}
            inputMode="numeric"
            min="0"
            onChange={(event) => onMyTeamScoreChange(event.target.value)}
            placeholder="0"
            type="number"
            value={myTeamScore}
          />
        </label>
        <span aria-hidden="true" className="score-divider">
          :
        </span>
        <label className="score-input-cell">
          <span>상대</span>
          <input
            disabled={scoreLocked}
            inputMode="numeric"
            min="0"
            onChange={(event) => onOpponentScoreChange(event.target.value)}
            placeholder="0"
            type="number"
            value={opponentScore}
          />
        </label>
      </div>
      <div
        className="choice-group result-toggle"
        role="radiogroup"
        aria-label="경기 결과"
      >
        {(['win', 'lose', 'draw'] as const).map((value) => (
          <button
            aria-checked={result === value}
            className={`choice-button ${result === value ? 'is-selected' : ''}`}
            data-result={value}
            disabled={scoreLocked}
            key={value}
            onClick={() => onPickResult(value)}
            role="radio"
            type="button"
          >
            <span className="dot" aria-hidden="true" />
            {value === 'win' ? '승리' : value === 'lose' ? '패배' : '무승부'}
          </button>
        ))}
      </div>
      {scoreLocked ? (
        <p className="score-input-hint">{lockHint}</p>
      ) : !resultManuallySet && result ? (
        <p className="score-input-hint">
          스코어로 자동 계산된 결과예요. 변경하면 수동 선택으로 고정됩니다.
        </p>
      ) : null}
    </section>
  );
}
