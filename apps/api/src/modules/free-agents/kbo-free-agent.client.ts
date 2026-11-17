import { fetchKboJson } from '../../lib/kbo-http.js';
import {
  parseKboTradeRows,
  type KboTradeRow,
  type KboTradeTable,
} from './parse-free-agent.js';

const KBO_TRADE_PAGE_URL = 'https://www.koreabaseball.com/Player/Trade.aspx';
const KBO_TRADE_LIST_URL =
  'https://www.koreabaseball.com/ws/Player.asmx/GetTradeList';
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

/** KBO 선수 이동현황 '항목' 값. 화면의 선택 상자 번호와 같다. */
export const KBO_TRADE_SECTIONS = {
  faContract: '13',
  faQualified: '14',
} as const;

/** 한 해의 선수 이동 중 한 항목을 전부 받는다. 비고(계약 조건)는 KBO 가 비워 둔다. */
export async function fetchKboTradeRows(input: {
  seasonYear: number;
  section: (typeof KBO_TRADE_SECTIONS)[keyof typeof KBO_TRADE_SECTIONS];
}) {
  const rows: KboTradeRow[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = new URLSearchParams({
      seasonId: String(input.seasonYear),
      monthId: '0',
      bdSc: input.section,
      teamName: '',
      searchIf: '',
      pageNo: String(page),
      listCount: String(PAGE_SIZE),
    });

    const data = await fetchKboJson<KboTradeTable>(
      KBO_TRADE_LIST_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: KBO_TRADE_PAGE_URL,
        },
        body: body.toString(),
      },
      'KBO 선수 이동현황 API',
    );

    if (!Array.isArray(data.rows)) {
      throw new Error('KBO 선수 이동현황 API 응답 형식이 올바르지 않습니다.');
    }

    rows.push(...parseKboTradeRows(data));

    if (data.rows.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}
