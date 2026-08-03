import { fetchKboJson } from '../../lib/kbo-http.js';
import type { KboScheduleTable } from './parse-schedule.js';

const KBO_SCHEDULE_PAGE_URL =
  'https://www.koreabaseball.com/Schedule/Schedule.aspx';
const KBO_SCHEDULE_LIST_URL =
  'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList';

/** KBO 정규시즌 (시범+정규+포스트 — 페이지 기본값과 동일) */
export const KBO_DEFAULT_SERIES_IDS = '0,9,6';

export type FetchKboMonthScheduleInput = {
  seasonYear: number;
  month: number;
  seriesIds?: string;
  teamId?: string;
};

export async function fetchKboMonthSchedule(input: FetchKboMonthScheduleInput) {
  const body = new URLSearchParams({
    leId: '1',
    srIdList: input.seriesIds ?? KBO_DEFAULT_SERIES_IDS,
    seasonId: String(input.seasonYear),
    gameMonth: String(input.month).padStart(2, '0'),
    teamId: input.teamId ?? '',
  });

  const data = await fetchKboJson<KboScheduleTable>(
    KBO_SCHEDULE_LIST_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: KBO_SCHEDULE_PAGE_URL,
      },
      body: body.toString(),
    },
    'KBO 일정 API',
  );

  if (!Array.isArray(data.rows)) {
    throw new Error('KBO 일정 API 응답 형식이 올바르지 않습니다.');
  }

  return data;
}
