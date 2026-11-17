/** KBO 선수 기록 페이지(Record/Player/*Detail)의 표를 그대로 옮긴다. 열 이름은 KBO 약어와 한글 설명을 함께 둔다. */
export type RecordColumn = { key: string; label: string };

export type RecordTable = {
  columns: RecordColumn[];
  rows: string[][];
  /** 표 아래 합계 줄(통산·최근 10경기 합계). 없으면 null */
  total: string[] | null;
};

export type ProfileItem = { label: string; value: string };

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function cellTexts(rowHtml: string) {
  return [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(
    (match) => stripHtml(match[1]),
  );
}

function parseColumns(theadHtml: string): RecordColumn[] {
  return [...theadHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((match) => {
    const key = stripHtml(match[1]);
    // <a title="타율">AVG</a> 처럼 약어에 한글 설명이 붙어 있다
    const title = match[1].match(/title="([^"]+)"/)?.[1];
    return { key, label: title ? decodeHtml(title) : key };
  });
}

function parseRows(sectionHtml: string | undefined) {
  if (!sectionHtml) return [];

  return (
    [...sectionHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
      .map((match) => ({ html: match[1], cells: cellTexts(match[1]) }))
      // "기록이 없습니다." 같은 안내 줄은 칸 하나가 표 전체를 차지한다
      .filter((row) => !(row.cells.length === 1 && /colspan=/i.test(row.html)))
      .map((row) => row.cells)
  );
}

/** 페이지 안의 기록 표를 순서대로 읽는다. */
export function parseRecordTables(html: string): RecordTable[] {
  return [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)].map((match) => {
    const body = match[1];
    const thead = body.match(/<thead[^>]*>([\s\S]*?)<\/thead>/)?.[1] ?? '';
    const tbody = body.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
    const tfoot = body.match(/<tfoot[^>]*>([\s\S]*?)<\/tfoot>/)?.[1];

    return {
      columns: parseColumns(thead),
      rows: parseRows(tbody),
      total: parseRows(tfoot)[0] ?? null,
    };
  });
}

/** 기본 기록 페이지의 "생년월일: 1993년 02월 12일" 같은 선수 정보 */
export function parsePlayerProfile(html: string): ProfileItem[] {
  const list = html.match(/class="player_basic"([\s\S]*?)<\/ul>/)?.[1] ?? '';

  return [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
    .map((match) => stripHtml(match[1]))
    .map((text) => {
      const index = text.indexOf(':');
      return index > 0
        ? {
            label: text.slice(0, index).trim(),
            value: text.slice(index + 1).trim(),
          }
        : null;
    })
    .filter((item): item is ProfileItem => Boolean(item?.value));
}

/** 시즌 기본 기록은 표 두 개로 나뉘어 있다. 한 줄로 합친다. 기록이 없으면 null */
export function mergeSeasonTables(first?: RecordTable, second?: RecordTable) {
  const firstRow = first?.rows[0];

  if (!first || !firstRow) {
    return null;
  }

  const secondRow = second?.rows[0];

  return {
    columns: [...first.columns, ...(secondRow ? (second?.columns ?? []) : [])],
    rows: [[...firstRow, ...(secondRow ?? [])]],
    total: null,
  } satisfies RecordTable;
}

/** ASP.NET 폼의 숨은 값(__VIEWSTATE 등). 시리즈 선택 같은 postback 에 그대로 돌려보낸다. */
export function parseHiddenFields(html: string) {
  const fields: Record<string, string> = {};

  for (const match of html.matchAll(
    /<input type="hidden" name="([^"]+)"[^>]*value="([^"]*)"/g,
  )) {
    fields[match[1]] = decodeHtml(match[2]);
  }

  return fields;
}
