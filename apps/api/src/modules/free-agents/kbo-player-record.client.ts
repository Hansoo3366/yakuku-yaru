import { fetchKboText } from '../../lib/kbo-http.js';
import {
  mergeSeasonTables,
  parseHiddenFields,
  parsePlayerProfile,
  parseRecordTables,
  type ProfileItem,
  type RecordTable,
} from './parse-player-record.js';

const KBO_BASE_URL = 'https://www.koreabaseball.com/Record/Player';
/** 통산 페이지의 시리즈 선택 상자. 포스트시즌 중에는 기본값이 한국시리즈라 정규시즌(0)으로 바꿔 다시 요청한다. */
const SERIES_FIELD =
  'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeries';
const REGULAR_SEASON = '0';

export type PlayerRecordRole = 'hitter' | 'pitcher';

export type PlayerRecord = {
  role: PlayerRecordRole;
  profile: ProfileItem[];
  /** 올해 정규시즌 기본 기록. 올해 뛰지 않았으면 null */
  season: RecordTable | null;
  /** 최근 10경기 */
  recent: RecordTable | null;
  /** 연도별 주요 기록 순위 */
  rankings: RecordTable | null;
  /** 연도별 정규시즌 기록과 통산 합계 */
  career: RecordTable | null;
};

function nonEmpty(table: RecordTable | undefined) {
  return table && (table.rows.length || table.total) ? table : null;
}

function detailPath(role: PlayerRecordRole) {
  return role === 'pitcher' ? 'PitcherDetail' : 'HitterDetail';
}

async function fetchCareerTable(role: PlayerRecordRole, kboPlayerId: string) {
  const url = `${KBO_BASE_URL}/${detailPath(role)}/Total.aspx?playerId=${encodeURIComponent(kboPlayerId)}`;
  const first = await fetchKboText(url, undefined, 'KBO 선수 통산 기록');
  const cookie = first.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  const body = new URLSearchParams({
    ...parseHiddenFields(first.text),
    __EVENTTARGET: SERIES_FIELD,
    __EVENTARGUMENT: '',
    [SERIES_FIELD]: REGULAR_SEASON,
  });
  const regular = await fetchKboText(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: url,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body.toString(),
    },
    'KBO 선수 통산 기록(정규시즌)',
  );

  // 선택이 정규시즌으로 바뀌지 않았으면 다른 시리즈 기록을 정규시즌으로 저장하지 않는다
  if (
    !new RegExp(`<option selected="selected" value="${REGULAR_SEASON}">`).test(
      regular.text,
    )
  ) {
    throw new Error('KBO 선수 통산 기록: 정규시즌을 고르지 못했습니다.');
  }

  return nonEmpty(parseRecordTables(regular.text)[0]);
}

/** 선수 기본 정보·올시즌·최근 10경기·순위·통산을 한 번에 받는다. KBO 요청 3번. */
export async function fetchKboPlayerRecord(
  kboPlayerId: string,
  role: PlayerRecordRole,
): Promise<PlayerRecord> {
  const basicUrl = `${KBO_BASE_URL}/${detailPath(role)}/Basic.aspx?playerId=${encodeURIComponent(kboPlayerId)}`;
  const basic = await fetchKboText(basicUrl, undefined, 'KBO 선수 기본 기록');
  const tables = parseRecordTables(basic.text);

  return {
    role,
    profile: parsePlayerProfile(basic.text),
    season: mergeSeasonTables(tables[0], tables[1]),
    recent: nonEmpty(tables[2]),
    rankings: nonEmpty(tables[3]),
    career: await fetchCareerTable(role, kboPlayerId),
  };
}
