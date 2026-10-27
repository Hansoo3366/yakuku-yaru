import { fetchKboMonthSchedule } from './kbo-schedule.client.js';
import { parseKboScheduleTable } from './parse-schedule.js';

/** KBO srId: 정규시즌 0, 와일드카드 4, 준플레이오프 3, 플레이오프 5, 한국시리즈 7 */
export const KBO_REGULAR_SERIES_ID = '0';
export const KBO_POSTSEASON_SERIES_IDS = ['4', '3', '5', '7'] as const;

export type KboPostseasonSeriesId = (typeof KBO_POSTSEASON_SERIES_IDS)[number];

/** 포스트시즌이 열릴 수 있는 달만 따로 조회한다. 나머지 달은 요청을 아낀다. */
function mayHavePostseason(month: number) {
  return month >= 9 && month <= 11;
}

/**
 * 합쳐 받은 월 일정에는 시리즈 구분이 없어서, 포스트시즌 시리즈를 하나씩 다시 받아 경기 ID 별 시리즈를 만든다.
 * 여기 없는 경기는 정규시즌이다.
 */
export async function fetchPostseasonSeriesByExternalId(
  seasonYear: number,
  month: number,
) {
  const seriesByExternalId = new Map<string, KboPostseasonSeriesId>();

  if (!mayHavePostseason(month)) {
    return seriesByExternalId;
  }

  for (const seriesId of KBO_POSTSEASON_SERIES_IDS) {
    const table = await fetchKboMonthSchedule({
      seasonYear,
      month,
      seriesIds: seriesId,
    });

    for (const game of parseKboScheduleTable(table, seasonYear)) {
      seriesByExternalId.set(game.externalId, seriesId);
    }
  }

  return seriesByExternalId;
}
