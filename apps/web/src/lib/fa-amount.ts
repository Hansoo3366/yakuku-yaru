import type { FreeAgent } from './baseball-api';

/** 만 원 단위 금액 → "50억", "4억 5,000만", "8,000만" */
export function formatManwon(amount: number) {
  const eok = Math.floor(amount / 10000);
  const man = amount % 10000;

  if (eok && man)
    return `${eok.toLocaleString('ko-KR')}억 ${man.toLocaleString('ko-KR')}만`;
  if (eok) return `${eok.toLocaleString('ko-KR')}억`;
  return `${man.toLocaleString('ko-KR')}만`;
}

/** 총액을 따로 넣지 않았으면 계약금 + 연봉 + 옵션 합계 */
export function getFreeAgentTotal(freeAgent: FreeAgent) {
  if (freeAgent.totalAmount != null) return freeAgent.totalAmount;

  const parts = [
    freeAgent.signingBonus,
    freeAgent.salaryAmount,
    freeAgent.incentiveAmount,
  ].filter((value): value is number => value != null);

  return parts.length ? parts.reduce((sum, value) => sum + value, 0) : null;
}

/** "4년 50억" / "4년" / "50억" / null */
export function formatFreeAgentDeal(freeAgent: FreeAgent) {
  const total = getFreeAgentTotal(freeAgent);
  const parts = [
    freeAgent.contractYears ? `${freeAgent.contractYears}년` : null,
    total != null ? formatManwon(total) : null,
  ].filter(Boolean);

  return parts.length ? parts.join(' ') : null;
}

/** "계약금 20억 · 연봉 25억 · 옵션 5억" (채운 항목만) */
export function formatFreeAgentBreakdown(freeAgent: FreeAgent) {
  return [
    freeAgent.signingBonus != null
      ? `계약금 ${formatManwon(freeAgent.signingBonus)}`
      : null,
    freeAgent.salaryAmount != null
      ? `연봉 ${formatManwon(freeAgent.salaryAmount)}`
      : null,
    freeAgent.incentiveAmount != null
      ? `옵션 ${formatManwon(freeAgent.incentiveAmount)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
