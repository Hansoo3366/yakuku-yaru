export type ScheduleWindow = {
  /** KST 벽시계 'YYYY-MM-DD HH:mm:ss' (이상) */
  from: string;
  /** KST 벽시계 'YYYY-MM-DD HH:mm:ss' (미만) */
  to: string;
};

export type StoredScheduledGame = {
  id: number;
  externalId: string | null;
  attendanceCount: number;
};

export type StaleGameAction = { id: number; action: 'delete' | 'cancel' };

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** 한 달 일정 응답이 덮는 범위. 날짜 필터(주간·당일 모드)가 있으면 그 안으로 좁힌다. */
export function resolveMonthWindow(
  seasonYear: number,
  month: number,
  filter?: ScheduleWindow | null,
): ScheduleWindow | null {
  const nextYear = month === 12 ? seasonYear + 1 : seasonYear;
  const nextMonth = month === 12 ? 1 : month + 1;
  let from = `${seasonYear}-${pad(month)}-01 00:00:00`;
  let to = `${nextYear}-${pad(nextMonth)}-01 00:00:00`;

  if (filter) {
    if (filter.from > from) from = filter.from;
    if (filter.to < to) to = filter.to;
  }

  return from < to ? { from, to } : null;
}

/**
 * KBO 일정에서 사라진 예정 경기를 고른다. KBO 는 일정이 밀리거나(우천 순연 뒤 재편성)
 * 시리즈가 일찍 끝나면 해당 경기를 목록에서 빼기만 한다.
 * 직관 기록이 걸린 경기는 지우면 기록까지 같이 지워지므로 취소로 남긴다.
 */
export function selectGamesMissingFromSchedule(
  stored: StoredScheduledGame[],
  scheduledExternalIds: ReadonlySet<string>,
): StaleGameAction[] {
  return stored
    .filter((game) => !game.externalId || !scheduledExternalIds.has(game.externalId))
    .map((game) => ({
      id: game.id,
      action: game.attendanceCount > 0 ? 'cancel' : 'delete',
    }));
}
