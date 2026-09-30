'use client';

import type { AttendanceResult } from '@/lib/attendance-score';

type Props = {
  /** KBO 공식 스코어. 경기가 끝나 확인되기 전에는 null */
  scores: {
    myTeamScore: number;
    opponentScore: number;
    result: AttendanceResult;
  } | null;
  lockHint?: string;
};

const RESULT_LABELS: Record<AttendanceResult, string> = {
  win: '승리',
  lose: '패배',
  draw: '무승부',
};

/** 직관 기록의 점수는 직접 입력하지 않고 공식 스코어만 보여준다. 저장은 서버가 경기 결과로 맞춘다. */
export function AttendanceScoreSection({
  scores,
  lockHint = '경기 종료 후 KBO 공식 스코어가 확인되면 자동으로 맞춰집니다.',
}: Props) {
  return (
    <section className="card stack">
      <div className="section-heading" style={{ marginBottom: 0 }}>
        <div>
          <h2>스코어와 결과</h2>
          <p>점수는 직접 입력하지 않고 공식 경기 스코어만 반영합니다.</p>
        </div>
      </div>
      <div className="score-input-group score-input-group--locked">
        <label className="score-input-cell">
          <span>내 팀</span>
          <input
            disabled
            placeholder="0"
            readOnly
            type="number"
            value={scores?.myTeamScore ?? ''}
          />
        </label>
        <span aria-hidden="true" className="score-divider">
          :
        </span>
        <label className="score-input-cell">
          <span>상대</span>
          <input
            disabled
            placeholder="0"
            readOnly
            type="number"
            value={scores?.opponentScore ?? ''}
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
            aria-checked={scores?.result === value}
            className={`choice-button ${scores?.result === value ? 'is-selected' : ''}`}
            data-result={value}
            disabled
            key={value}
            role="radio"
            type="button"
          >
            <span className="dot" aria-hidden="true" />
            {RESULT_LABELS[value]}
          </button>
        ))}
      </div>
      <p className="score-input-hint">{lockHint}</p>
    </section>
  );
}
