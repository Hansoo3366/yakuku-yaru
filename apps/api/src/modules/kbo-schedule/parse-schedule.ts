import { KBO_STADIUM_MAP, mapKboStadium } from './kbo-stadium-map.js';

export type KboScheduleCell = {
  Text: string;
  Class: string | null;
  RowSpan?: string | null;
};

export type KboScheduleRow = {
  row: KboScheduleCell[];
};

export type KboScheduleTable = {
  rows: KboScheduleRow[];
};

export type ParsedKboGame = {
  externalId: string;
  gameDate: string;
  awayTeamShortName: string;
  homeTeamShortName: string;
  awayScore: number | null;
  homeScore: number | null;
  stadium: string;
  status: 'scheduled' | 'finished' | 'cancelled';
  note: string | null;
};

const KBO_DAY_PATTERN = /^(\d{2})\.(\d{2})\([^)]+\)$/;

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function extractGameId(cells: KboScheduleCell[]) {
  for (const cell of cells) {
    const match = cell.Text.match(/gameId=([^&'"]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/** KBO가 아직 gameId·게임센터 링크를 안 붙인 미래 일정용 (나중에 실제 gameId로 갱신됨) */
export function buildPendingExternalId(input: {
  gameDate: string;
  awayTeamShortName: string;
  homeTeamShortName: string;
}) {
  const [datePart, timePart = '000000'] = input.gameDate.split(' ');
  const ymd = datePart.replace(/-/g, '');
  const hm = timePart.replace(/:/g, '').slice(0, 4);
  return `pending-${ymd}${hm}-${input.awayTeamShortName}-${input.homeTeamShortName}`;
}

function parseDayLabel(text: string, seasonYear: number) {
  const match = text.trim().match(KBO_DAY_PATTERN);
  if (!match) {
    return null;
  }

  const month = match[1];
  const day = match[2];
  return `${seasonYear}-${month}-${day}`;
}

function parseTimeLabel(text: string) {
  const match = stripHtml(text).match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  return `${match[1].padStart(2, '0')}:${match[2]}:00`;
}

function parseTeams(playHtml: string) {
  const spans = [...playHtml.matchAll(/<span>([^<]+)<\/span>/g)]
    .map((match) => match[1].trim())
    .filter((value) => value && value !== 'vs');

  if (spans.length < 2) {
    return null;
  }

  return {
    awayTeamShortName: spans[0],
    homeTeamShortName: spans[1],
  };
}

function parseScores(playHtml: string) {
  const emMatch = playHtml.match(/<em>([\s\S]*?)<\/em>/);
  if (!emMatch) {
    return { awayScore: null, homeScore: null };
  }

  const inner = emMatch[1];
  if (!/<span class="(?:win|lose|same)">\d+<\/span>/.test(inner)) {
    return { awayScore: null, homeScore: null };
  }

  const scores = [...inner.matchAll(/<span[^>]*>(\d+)<\/span>/g)].map((match) =>
    Number(match[1]),
  );

  if (scores.length < 2 || scores.some((score) => Number.isNaN(score))) {
    return { awayScore: null, homeScore: null };
  }

  return {
    awayScore: scores[0],
    homeScore: scores[1],
  };
}

function findStadium(cells: KboScheduleCell[]) {
  for (const cell of cells) {
    const text = stripHtml(cell.Text);
    if (text in KBO_STADIUM_MAP) {
      return mapKboStadium(text);
    }
  }

  return mapKboStadium('잠실');
}

function findNote(cells: KboScheduleCell[]) {
  const last = cells[cells.length - 1];
  const text = stripHtml(last?.Text ?? '');
  return text && text !== '-' ? text : null;
}

function resolveStatus(playHtml: string, note: string | null, cells: KboScheduleCell[]) {
  if (note?.includes('취소')) {
    return 'cancelled' as const;
  }

  const relayText = cells.find((cell) => cell.Class === 'relay')?.Text ?? '';
  if (
    relayText.includes('section=REVIEW') ||
    relayText.includes('btnReview') ||
    />리뷰</i.test(relayText)
  ) {
    return 'finished' as const;
  }

  if (
    relayText.includes('section=START_PIT') ||
    relayText.includes('btnPreView') ||
    relayText.includes('프리뷰')
  ) {
    return 'scheduled' as const;
  }

  // 스코어가 보여도 리뷰 링크 전이면 경기 진행 중·예정 — 무승부/종료 오판 방지
  return 'scheduled' as const;
}

export function parseKboScheduleTable(table: KboScheduleTable, seasonYear: number) {
  const games: ParsedKboGame[] = [];
  let currentDate: string | null = null;

  for (const entry of table.rows) {
    const cells = entry.row;
    const dayCell = cells.find((cell) => cell.Class === 'day');

    if (dayCell?.Text) {
      currentDate = parseDayLabel(stripHtml(dayCell.Text), seasonYear);
    }

    const timeCell = cells.find((cell) => cell.Class === 'time');
    const playCell = cells.find((cell) => cell.Class === 'play');

    if (!timeCell || !playCell || !currentDate) {
      continue;
    }

    const time = parseTimeLabel(timeCell.Text);
    if (!time) {
      continue;
    }

    const teams = parseTeams(playCell.Text);
    if (!teams) {
      continue;
    }

    const note = findNote(cells);
    const scores = parseScores(playCell.Text);
    const status = resolveStatus(playCell.Text, note, cells);
    const gameDate = `${currentDate} ${time}`;
    const externalId =
      extractGameId(cells) ??
      buildPendingExternalId({
        gameDate,
        awayTeamShortName: teams.awayTeamShortName,
        homeTeamShortName: teams.homeTeamShortName,
      });

    games.push({
      externalId,
      gameDate,
      awayTeamShortName: teams.awayTeamShortName,
      homeTeamShortName: teams.homeTeamShortName,
      awayScore: scores.awayScore,
      homeScore: scores.homeScore,
      stadium: findStadium(cells),
      status,
      note,
    });
  }

  return games;
}
