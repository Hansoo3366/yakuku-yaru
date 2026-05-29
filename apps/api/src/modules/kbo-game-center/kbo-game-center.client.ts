import { parseLineupAnalysisConfirmed } from './kbo-lineup-status.js';

const KBO_GAME_CENTER_URL = 'https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx';
const KBO_GAME_LIST_URL = 'https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList';
const KBO_PITCHER_RECORD_ANALYSIS_URL =
  'https://www.koreabaseball.com/ws/Schedule.asmx/GetPitcherRecordAnalysis';
const KBO_LINEUP_ANALYSIS_URL =
  'https://www.koreabaseball.com/ws/Schedule.asmx/GetLineUpAnalysis';

export type KboGameCenterGame = {
  G_ID: string;
  G_DT: string;
  G_TM?: string | null;
  AWAY_ID: string;
  HOME_ID: string;
  AWAY_NM: string;
  HOME_NM: string;
  T_PIT_P_ID: number | null;
  T_PIT_P_NM: string | null;
  B_PIT_P_ID: number | null;
  B_PIT_P_NM: string | null;
  GAME_STATE_SC: string;
  CANCEL_SC_ID: string | null;
  CANCEL_SC_NM: string | null;
  T_SCORE_CN: string | null;
  B_SCORE_CN: string | null;
  START_PIT_CK: number | null;
  LINEUP_CK: number | null;
};

type KboGameCenterResponse = {
  game?: KboGameCenterGame[];
  code?: string;
  msg?: string;
};

type KboGridCell = {
  Text?: string | null;
};

type KboGridRow = {
  row?: KboGridCell[];
};

type KboPitcherRecordAnalysisResponse = {
  rows?: KboGridRow[];
  code?: string;
  msg?: string;
};

type KboLineupAnalysisResponse = unknown[];

export type KboPitcherAnalysis = {
  kboPlayerId: number | null;
  name: string | null;
  profileImageUrl: string | null;
  throwBat: string | null;
  seasonRecord: string | null;
  era: number | null;
  war: number | null;
  games: number | null;
  starterAverageInnings: string | null;
  qualityStarts: number | null;
  whip: number | null;
};

export type KboLineupPlayer = {
  battingOrder: number;
  fieldPosition: string | null;
  name: string;
  kboPlayerId: number | null;
  profileImageUrl: string | null;
  war: number | null;
};

export type KboLineupAnalysis = {
  isConfirmed: boolean;
  home: KboLineupPlayer[];
  away: KboLineupPlayer[];
};

function makeAbsoluteUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  if (value.startsWith('/')) {
    return `https://www.koreabaseball.com${value}`;
  }

  return value;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(value: string | null | undefined) {
  return decodeHtml((value ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumber(value: string | null | undefined) {
  const text = stripHtml(value);

  if (!text || text === '-') {
    return null;
  }

  const parsed = Number(text);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | null | undefined) {
  const parsed = parseNumber(value);

  return parsed === null ? null : Math.trunc(parsed);
}

function extractPlayerId(value: string | null | undefined) {
  const match = value?.match(/\/person\/kbo\/\d+\/(\d+)\.png/i);
  return match ? Number(match[1]) : null;
}

function extractImageUrl(value: string | null | undefined) {
  const match = value?.match(/<img[^>]+src=['"]([^'"]*\/person\/kbo\/[^'"]+)['"]/i);
  return makeAbsoluteUrl(match?.[1]);
}

function extractClassText(value: string | null | undefined, className: string) {
  const match = value?.match(
    new RegExp(`<[^>]+class=['"][^'"]*${className}[^'"]*['"][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'),
  );
  return stripHtml(match?.[1]);
}

function parsePitcherAnalysisRow(row: KboGridRow): KboPitcherAnalysis | null {
  const cells = row.row ?? [];

  if (cells.length < 7) {
    return null;
  }

  const pitcherCell = cells[0]?.Text ?? null;
  const imageUrl = extractImageUrl(pitcherCell);
  const name = extractClassText(pitcherCell, 'name') || null;

  if (!name) {
    return null;
  }

  return {
    kboPlayerId: extractPlayerId(imageUrl),
    name,
    profileImageUrl: imageUrl,
    throwBat: extractClassText(pitcherCell, 'style') || null,
    seasonRecord: extractClassText(pitcherCell, 'record') || null,
    era: parseNumber(cells[1]?.Text),
    war: parseNumber(cells[2]?.Text),
    games: parseInteger(cells[3]?.Text),
    starterAverageInnings: stripHtml(cells[4]?.Text) || null,
    qualityStarts: parseInteger(cells[5]?.Text),
    whip: parseNumber(cells[6]?.Text),
  };
}

export function parseLineupRowsPayload(value: unknown): KboLineupPlayer[] {
  if (typeof value !== 'string') {
    return [];
  }

  let parsed: { rows?: KboGridRow[] };

  try {
    parsed = JSON.parse(value) as { rows?: KboGridRow[] };
  } catch {
    return [];
  }

  return (parsed.rows ?? [])
    .map((row) => {
      const cells = row.row ?? [];
      const battingOrder = parseInteger(cells[0]?.Text);
      const playerCell = cells[2]?.Text ?? null;
      const profileImageUrl = extractImageUrl(playerCell);
      const name =
        extractClassText(playerCell, 'name') || stripHtml(playerCell) || null;

      if (!battingOrder || !name) {
        return null;
      }

      return {
        battingOrder,
        fieldPosition: stripHtml(cells[1]?.Text) || null,
        name,
        kboPlayerId: extractPlayerId(profileImageUrl),
        profileImageUrl,
        war: parseNumber(cells[3]?.Text),
      };
    })
    .filter((player): player is KboLineupPlayer => Boolean(player));
}

function parseLineupRows(value: unknown): KboLineupPlayer[] {
  return parseLineupRowsPayload(value);
}

async function postKboJson<T>(url: string, body: URLSearchParams) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: KBO_GAME_CENTER_URL,
      'User-Agent': 'YakukuYaru/1.0 (+https://yakuku-yaru.today; game-center-sync)',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`KBO 게임센터 요청 실패 (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function fetchKboGameCenterList(dateYmd: string) {
  const srId =
    dateYmd >= '20241026'
      ? '0,1,3,4,5,6,7,8,9'
      : dateYmd.slice(0, 4) >= '2021'
        ? '0,1,3,4,5,6,7,9'
        : '0,1,3,4,5,7,9';
  const body = new URLSearchParams({
    leId: '1',
    srId,
    date: dateYmd,
  });

  const data = await postKboJson<KboGameCenterResponse>(KBO_GAME_LIST_URL, body);

  if (data.code && data.code !== '100') {
    throw new Error(`KBO 게임센터 응답 실패: ${data.msg ?? data.code}`);
  }

  return Array.isArray(data.game) ? data.game : [];
}

export async function fetchKboPitcherAnalysis(input: {
  seasonYear: number;
  awayTeamCode: string;
  homeTeamCode: string;
  awayPitcherId: number;
  homePitcherId: number;
}) {
  const data = await postKboJson<KboPitcherRecordAnalysisResponse>(
    KBO_PITCHER_RECORD_ANALYSIS_URL,
    new URLSearchParams({
      leId: '1',
      srId: '0',
      seasonId: String(input.seasonYear),
      awayTeamId: input.awayTeamCode,
      awayPitId: String(input.awayPitcherId),
      homeTeamId: input.homeTeamCode,
      homePitId: String(input.homePitcherId),
      groupSc: 'SEASON',
    }),
  );

  if (data.code && data.code !== '100') {
    throw new Error(`KBO 선발투수 분석 응답 실패: ${data.msg ?? data.code}`);
  }

  const rows = (data.rows ?? [])
    .map(parsePitcherAnalysisRow)
    .filter((row): row is KboPitcherAnalysis => Boolean(row));

  return {
    away: rows[0] ?? null,
    home: rows[1] ?? null,
  };
}

export async function fetchKboLineupAnalysis(input: {
  seasonYear: number;
  gameExternalId: string;
}) {
  const data = await postKboJson<KboLineupAnalysisResponse>(
    KBO_LINEUP_ANALYSIS_URL,
    new URLSearchParams({
      leId: '1',
      srId: '0',
      seasonId: String(input.seasonYear),
      gameId: input.gameExternalId,
    }),
  );

  return {
    isConfirmed: parseLineupAnalysisConfirmed(data[0]),
    home: parseLineupRows((data[3] as unknown[])?.[0]),
    away: parseLineupRows((data[4] as unknown[])?.[0]),
  } satisfies KboLineupAnalysis;
}
