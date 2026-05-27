export type CancellationReason =
  | 'rain'
  | 'dust'
  | 'ground'
  | 'heat'
  | 'cold'
  | 'other';

export function getCancellationMeta(reason: string | null | undefined) {
  switch (reason) {
    case 'rain':
      return { icon: '☂', label: '우천 취소' };
    case 'dust':
      return { icon: '≈', label: '황사 취소' };
    case 'ground':
      return { icon: '▥', label: '그라운드 취소' };
    case 'heat':
      return { icon: '☼', label: '폭염 취소' };
    case 'cold':
      return { icon: '❄', label: '한파 취소' };
    case 'other':
      return { icon: '×', label: '경기 취소' };
    default:
      return { icon: '×', label: '경기 취소' };
  }
}

export function getCancellationLabel(reason: string | null | undefined) {
  return getCancellationMeta(reason).label;
}

/** 티켓 스텁(좁은 세로 영역)용 — 사유·「취소」를 줄 단위로 나눔 */
export function getCancellationTicketStubLines(
  reason: string | null | undefined,
) {
  const label = getCancellationLabel(reason);
  const cancelIndex = label.lastIndexOf(' 취소');

  if (cancelIndex === -1) {
    return { reason: label, status: null };
  }

  return {
    reason: label.slice(0, cancelIndex),
    status: '취소',
  };
}
