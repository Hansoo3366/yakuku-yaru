/** KBO 게임센터 박스스코어·스코어보드 응답을 화면에서 쓰는 모양으로 바꾼다. */

type KboGridCell = { Text?: string | null };
type KboGridRow = { row?: KboGridCell[] };
type KboGrid = {
  headers?: KboGridRow[];
  rows?: KboGridRow[];
  tfoot?: KboGridRow[];
};

export type KboBoxScoreResponse = {
  tableEtc?: string;
  arrHitter?: { table1?: string; table2?: string; table3?: string }[];
  arrPitcher?: { table?: string }[];
  code?: string;
  msg?: string;
};

export type KboScoreBoardResponse = {
  CROWD_CN?: string | null;
  START_TM?: string | null;
  END_TM?: string | null;
  USE_TM?: string | null;
  table2?: string;
  table3?: string;
  code?: string;
  msg?: string;
};

export type BoxScoreLine = {
  /** 이닝별 득점. 치르지 않은 이닝(9회말 홈 리드 등)은 null */
  innings: (number | null)[];
  runs: number | null;
  hits: number | null;
  errors: number | null;
  walks: number | null;
};

export type BoxScoreHitter = {
  battingOrder: number | null;
  position: string;
  name: string;
  /** 같은 타순을 이어받은 교체 선수 */
  isSubstitute: boolean;
  /** 이닝별 타석 결과. 타석이 없으면 빈 문자열, 한 이닝 두 타석은 " / " 로 잇는다 */
  innings: string[];
  atBats: number | null;
  hits: number | null;
  rbi: number | null;
  runs: number | null;
  average: string | null;
};

export type BoxScoreHitterTotals = {
  atBats: number | null;
  hits: number | null;
  rbi: number | null;
  runs: number | null;
};

export type BoxScorePitcher = {
  name: string;
  isStarter: boolean;
  /** 승·패·세·홀 */
  decision: string | null;
  seasonWins: number | null;
  seasonLosses: number | null;
  seasonSaves: number | null;
  innings: string;
  battersFaced: number | null;
  pitches: number | null;
  atBats: number | null;
  hits: number | null;
  homeRuns: number | null;
  walks: number | null;
  strikeouts: number | null;
  runs: number | null;
  earnedRuns: number | null;
  era: string | null;
};

export type BoxScoreTeam = {
  line: BoxScoreLine;
  hitters: BoxScoreHitter[];
  hitterTotals: BoxScoreHitterTotals | null;
  pitchers: BoxScorePitcher[];
};

export type BoxScore = {
  inningCount: number;
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  /** 결승타·홈런·도루·실책·심판 같은 경기 기록 */
  notes: { label: string; value: string }[];
  crowd: number | null;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
};

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cellText(cell: KboGridCell | undefined) {
  return decodeHtml((cell?.Text ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function toInteger(value: string) {
  if (!value || value === '-') {
    return null;
  }

  const parsed = Number(value.replace(/,/g, ''));
  return Number.isInteger(parsed) ? parsed : null;
}

function toNullableText(value: string) {
  return value && value !== '-' ? value : null;
}

function parseGrid(raw: string | undefined): KboGrid {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as KboGrid;
  } catch {
    return {};
  }
}

function gridRows(rows: KboGridRow[] | undefined) {
  return (rows ?? []).map((row) => (row.row ?? []).map(cellText));
}

/** "중홈 / 삼진" 처럼 한 이닝에 두 타석이면 칸 안에서 / 로 나뉜다 */
function normalizePlateAppearance(value: string) {
  return value.replace(/\s*\/\s*/g, ' / ');
}

function parseHitters(entry: { table1?: string; table2?: string; table3?: string }) {
  const names = gridRows(parseGrid(entry.table1).rows);
  const innings = gridRows(parseGrid(entry.table2).rows);
  const statsGrid = parseGrid(entry.table3);
  const stats = gridRows(statsGrid.rows);
  const totalsRow = gridRows(statsGrid.tfoot)[0];

  let previousOrder: number | null = null;
  const hitters: BoxScoreHitter[] = names.map((cells, index) => {
    const battingOrder = toInteger(cells[0] ?? '');
    const isSubstitute = battingOrder !== null && battingOrder === previousOrder;
    previousOrder = battingOrder;
    const statCells = stats[index] ?? [];

    return {
      battingOrder,
      position: cells[1] ?? '',
      name: cells[2] ?? '',
      isSubstitute,
      innings: (innings[index] ?? []).map(normalizePlateAppearance),
      atBats: toInteger(statCells[0] ?? ''),
      hits: toInteger(statCells[1] ?? ''),
      rbi: toInteger(statCells[2] ?? ''),
      runs: toInteger(statCells[3] ?? ''),
      average: toNullableText(statCells[4] ?? ''),
    };
  });

  const hitterTotals = totalsRow
    ? {
        atBats: toInteger(totalsRow[0] ?? ''),
        hits: toInteger(totalsRow[1] ?? ''),
        rbi: toInteger(totalsRow[2] ?? ''),
        runs: toInteger(totalsRow[3] ?? ''),
      }
    : null;

  return { hitters, hitterTotals };
}

function parsePitchers(entry: { table?: string } | undefined): BoxScorePitcher[] {
  return gridRows(parseGrid(entry?.table).rows)
    .filter((cells) => cells[0])
    .map((cells) => ({
      name: cells[0],
      isStarter: cells[1] === '선발',
      decision: toNullableText(cells[2] ?? ''),
      seasonWins: toInteger(cells[3] ?? ''),
      seasonLosses: toInteger(cells[4] ?? ''),
      seasonSaves: toInteger(cells[5] ?? ''),
      innings: cells[6] ?? '',
      battersFaced: toInteger(cells[7] ?? ''),
      pitches: toInteger(cells[8] ?? ''),
      atBats: toInteger(cells[9] ?? ''),
      hits: toInteger(cells[10] ?? ''),
      homeRuns: toInteger(cells[11] ?? ''),
      walks: toInteger(cells[12] ?? ''),
      strikeouts: toInteger(cells[13] ?? ''),
      runs: toInteger(cells[14] ?? ''),
      earnedRuns: toInteger(cells[15] ?? ''),
      era: toNullableText(cells[16] ?? ''),
    }));
}

function parseLines(scoreBoard: KboScoreBoardResponse | null) {
  const innings = gridRows(parseGrid(scoreBoard?.table2).rows);
  const totals = gridRows(parseGrid(scoreBoard?.table3).rows);

  return [0, 1].map((index): BoxScoreLine => {
    const total = totals[index] ?? [];

    return {
      innings: (innings[index] ?? []).map(toInteger),
      runs: toInteger(total[0] ?? ''),
      hits: toInteger(total[1] ?? ''),
      errors: toInteger(total[2] ?? ''),
      walks: toInteger(total[3] ?? ''),
    };
  });
}

/** 스코어보드는 연장 대비 칸을 넉넉히 주므로, 실제 치른 이닝까지만 남긴다 */
function resolveInningCount(away: BoxScoreLine, home: BoxScoreLine, hitterInnings: number) {
  const lastPlayed = (line: BoxScoreLine) => {
    for (let index = line.innings.length - 1; index >= 0; index -= 1) {
      if (line.innings[index] !== null) return index + 1;
    }
    return 0;
  };

  return Math.max(9, lastPlayed(away), lastPlayed(home), hitterInnings);
}

export function parseKboBoxScore(
  boxScore: KboBoxScoreResponse,
  scoreBoard: KboScoreBoardResponse | null,
): BoxScore | null {
  const hitterEntries = boxScore.arrHitter ?? [];
  const pitcherEntries = boxScore.arrPitcher ?? [];

  if (hitterEntries.length < 2 || pitcherEntries.length < 2) {
    return null;
  }

  const [awayLine, homeLine] = parseLines(scoreBoard);
  const away = parseHitters(hitterEntries[0]);
  const home = parseHitters(hitterEntries[1]);
  const hitterInnings = Math.max(
    ...[...away.hitters, ...home.hitters].map((hitter) => hitter.innings.length),
    0,
  );
  const inningCount = resolveInningCount(awayLine, homeLine, hitterInnings);
  const trim = (line: BoxScoreLine): BoxScoreLine => ({
    ...line,
    innings: Array.from({ length: inningCount }, (_, index) => line.innings[index] ?? null),
  });

  const notes = gridRows(parseGrid(boxScore.tableEtc).rows)
    .filter((cells) => cells[0] && cells[1])
    .map((cells) => ({ label: cells[0], value: cells[1] }));

  return {
    inningCount,
    away: {
      line: trim(awayLine),
      hitters: away.hitters,
      hitterTotals: away.hitterTotals,
      pitchers: parsePitchers(pitcherEntries[0]),
    },
    home: {
      line: trim(homeLine),
      hitters: home.hitters,
      hitterTotals: home.hitterTotals,
      pitchers: parsePitchers(pitcherEntries[1]),
    },
    notes,
    crowd: toInteger(scoreBoard?.CROWD_CN?.trim() ?? ''),
    startTime: toNullableText(scoreBoard?.START_TM?.trim() ?? ''),
    endTime: toNullableText(scoreBoard?.END_TM?.trim() ?? ''),
    duration: toNullableText(scoreBoard?.USE_TM?.trim() ?? ''),
  };
}
