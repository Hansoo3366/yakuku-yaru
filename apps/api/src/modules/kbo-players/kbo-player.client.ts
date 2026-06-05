import { parseHitterBasic2Html } from './parse-hitter-basic.js';
import {
  parsePlayerSearchHtml,
  parsePlayerSearchTotalCount,
  type ParsedKboPlayer,
} from './parse-player-search.js';

const KBO_PLAYER_SEARCH_URL = 'https://www.koreabaseball.com/Player/Search.aspx';
const KBO_HITTER_BASIC2_URL =
  'https://www.koreabaseball.com/Record/Player/HitterBasic/Basic2.aspx';
const FIELD_PREFIX = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$';
const PAGE_SIZE = 20;

export const KBO_TEAM_CODES = [
  'SS',
  'LG',
  'KT',
  'HT',
  'HH',
  'SK',
  'OB',
  'NC',
  'LT',
  'WO',
] as const;

export type KboTeamCode = (typeof KBO_TEAM_CODES)[number];

function extractHiddenField(html: string, id: string) {
  const match = html.match(new RegExp(`id="${id}" value="([^"]*)"`));
  return match?.[1] ?? '';
}

function buildSearchBody(input: {
  html: string;
  teamCode: KboTeamCode;
  eventTarget?: string;
}) {
  const body = new URLSearchParams();
  body.set('__VIEWSTATE', extractHiddenField(input.html, '__VIEWSTATE'));
  body.set(
    '__VIEWSTATEGENERATOR',
    extractHiddenField(input.html, '__VIEWSTATEGENERATOR'),
  );
  body.set(
    '__EVENTVALIDATION',
    extractHiddenField(input.html, '__EVENTVALIDATION'),
  );

  if (input.eventTarget) {
    body.set('__EVENTTARGET', input.eventTarget);
    body.set('__EVENTARGUMENT', '');
  }

  body.set(`${FIELD_PREFIX}hfPage`, '1');
  body.set(`${FIELD_PREFIX}ddlTeam`, input.teamCode);
  body.set(`${FIELD_PREFIX}ddlPosition`, '');
  body.set(`${FIELD_PREFIX}txtSearchPlayerName`, '');

  if (!input.eventTarget) {
    body.set(`${FIELD_PREFIX}btnSearch`, '검색');
  }

  return body;
}

async function postSearch(body: URLSearchParams) {
  const response = await fetch(KBO_PLAYER_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: KBO_PLAYER_SEARCH_URL,
      'User-Agent': 'YakukuYaru/1.0 (+https://yakuku-yaru.today; player-sync)',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`KBO 선수 조회 요청 실패 (${response.status})`);
  }

  return response.text();
}

export async function fetchKboPlayersByTeam(teamCode: KboTeamCode) {
  const initialResponse = await fetch(KBO_PLAYER_SEARCH_URL, {
    headers: {
      'User-Agent': 'YakukuYaru/1.0 (+https://yakuku-yaru.today; player-sync)',
    },
  });

  if (!initialResponse.ok) {
    throw new Error(`KBO 선수 조회 페이지 요청 실패 (${initialResponse.status})`);
  }

  const initialHtml = await initialResponse.text();
  let pageHtml = await postSearch(buildSearchBody({ html: initialHtml, teamCode }));
  const totalCount = parsePlayerSearchTotalCount(pageHtml);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const players: ParsedKboPlayer[] = [...parsePlayerSearchHtml(pageHtml)];

  for (let page = 2; page <= totalPages; page += 1) {
    pageHtml = await postSearch(
      buildSearchBody({
        html: pageHtml,
        teamCode,
        eventTarget: `${FIELD_PREFIX}ucPager$btnNo${page}`,
      }),
    );
    players.push(...parsePlayerSearchHtml(pageHtml));
  }

  return players;
}

export async function fetchKboPlayersBySearchWord(searchWord: string) {
  const response = await fetch(
    `${KBO_PLAYER_SEARCH_URL}?searchWord=${encodeURIComponent(searchWord)}`,
    {
      headers: {
        'User-Agent': 'YakukuYaru/1.0 (+https://yakuku-yaru.today; player-sync)',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`KBO 선수 검색 요청 실패 (${response.status})`);
  }

  return parsePlayerSearchHtml(await response.text());
}

function buildHitterBasic2Body(input: { html: string; teamCode: KboTeamCode }) {
  const body = new URLSearchParams();
  body.set('__VIEWSTATE', extractHiddenField(input.html, '__VIEWSTATE'));
  body.set(
    '__VIEWSTATEGENERATOR',
    extractHiddenField(input.html, '__VIEWSTATEGENERATOR'),
  );
  body.set(
    '__EVENTVALIDATION',
    extractHiddenField(input.html, '__EVENTVALIDATION'),
  );
  // HitterBasic2는 dropdown name이 "...$ddlX$ddlX" 형태다.
  // 누락 시 팀 필터가 무시되거나 빈 결과가 반환될 수 있다.
  body.set(
    `${FIELD_PREFIX}ddlSeason$ddlSeason`,
    String(new Date().getFullYear()),
  );
  body.set(`${FIELD_PREFIX}ddlSeries$ddlSeries`, '0');
  body.set(`${FIELD_PREFIX}ddlTeam$ddlTeam`, input.teamCode);
  body.set(`${FIELD_PREFIX}ddlPos$ddlPos`, '');
  body.set(`${FIELD_PREFIX}ddlSituation$ddlSituation`, '');
  body.set(`${FIELD_PREFIX}ddlSituationDetail$ddlSituationDetail`, '');
  body.set(
    `${FIELD_PREFIX}hfPage`,
    extractHiddenField(input.html, 'cphContents_cphContents_cphContents_hfPage') ||
      '1',
  );
  body.set(
    `${FIELD_PREFIX}hfOrderByCol`,
    extractHiddenField(
      input.html,
      'cphContents_cphContents_cphContents_hfOrderByCol',
    ) || 'HRA_RT',
  );
  body.set(
    `${FIELD_PREFIX}hfOrderBy`,
    extractHiddenField(input.html, 'cphContents_cphContents_cphContents_hfOrderBy') ||
      'DESC',
  );

  return body;
}

export async function fetchKboHitterSeasonStatsByTeam(teamCode: KboTeamCode) {
  const initialResponse = await fetch(KBO_HITTER_BASIC2_URL, {
    headers: {
      'User-Agent': 'YakukuYaru/1.0 (+https://yakuku-yaru.today; player-sync)',
    },
  });

  if (!initialResponse.ok) {
    throw new Error(`KBO 타자 기록 페이지 요청 실패 (${initialResponse.status})`);
  }

  const initialHtml = await initialResponse.text();
  const rawSetCookie = initialResponse.headers.get('set-cookie') ?? '';
  const cookie = rawSetCookie
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter((part): part is string => Boolean(part))
    .join('; ');
  const response = await fetch(KBO_HITTER_BASIC2_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: KBO_HITTER_BASIC2_URL,
      'User-Agent': 'YakukuYaru/1.0 (+https://yakuku-yaru.today; player-sync)',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: buildHitterBasic2Body({ html: initialHtml, teamCode }).toString(),
  });

  if (!response.ok) {
    throw new Error(`KBO 타자 기록 요청 실패 (${response.status})`);
  }

  return parseHitterBasic2Html(await response.text());
}
