'use client';

import { useId, useState } from 'react';

const STAT_GLOSSARY: Record<string, string> = {
  ERA: '평균자책점 — 9이닝당 허용한 평균 실점입니다. 낮을수록 좋습니다.',
  WHIP: '이닝당 출루 허용 — 1이닝당 허용한 출루(안타+볼넷) 수입니다. 낮을수록 좋습니다.',
  WAR: '대체 선수 대비 기여도 — 팀 승리에 얼마나 기여했는지 추정한 지표입니다.',
  QS: '퀄리티 스타트 — 선발이 6이닝 이상, 3실점 이하로 던진 경기 횟수입니다.',
  OPS: '출루율+장타율 — 공격 종합 지표입니다. 높을수록 좋습니다.',
};

type StatTermProps = {
  abbr: string;
  className?: string;
};

export function StatTerm({ abbr, className }: StatTermProps) {
  const description = STAT_GLOSSARY[abbr];
  const [open, setOpen] = useState(false);
  const hintId = useId();

  if (!description) {
    return <span className={className}>{abbr}</span>;
  }

  return (
    <span className={`stat-term${className ? ` ${className}` : ''}`}>
      <span className="stat-term-abbr">{abbr}</span>
      <button
        aria-controls={hintId}
        aria-expanded={open}
        aria-label={`${abbr} 설명`}
        className="stat-term-info"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        i
      </button>
      {open ? (
        <span className="stat-term-popover" id={hintId} role="tooltip">
          {description}
        </span>
      ) : null}
    </span>
  );
}
