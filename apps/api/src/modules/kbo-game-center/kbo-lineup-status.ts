/** KBO 경기 목록의 LINEUP_CK: 0=미확정, 그 외(20~47 등)=공식 라인업 확정 코드 */
export function isGameListLineupConfirmed(
  lineupCk: number | null | undefined,
): boolean {
  return lineupCk != null && lineupCk !== 0;
}

/** GetLineUpAnalysis 응답 data[0] — 배열/객체 형태 모두 처리 */
export function parseLineupAnalysisConfirmed(
  statusPayload: unknown,
): boolean {
  if (!statusPayload) {
    return false;
  }

  if (Array.isArray(statusPayload)) {
    const first = statusPayload[0];

    if (first && typeof first === 'object' && 'LINEUP_CK' in first) {
      return Boolean((first as { LINEUP_CK?: unknown }).LINEUP_CK);
    }

    return parseLineupAnalysisConfirmed(first);
  }

  if (
    typeof statusPayload === 'object' &&
    statusPayload !== null &&
    'LINEUP_CK' in statusPayload
  ) {
    return Boolean((statusPayload as { LINEUP_CK?: unknown }).LINEUP_CK);
  }

  return false;
}

export function resolveLineupConfirmed(input: {
  analysisStatusPayload: unknown;
  gameListLineupCk: number | null | undefined;
}): boolean {
  return (
    parseLineupAnalysisConfirmed(input.analysisStatusPayload) ||
    isGameListLineupConfirmed(input.gameListLineupCk)
  );
}
