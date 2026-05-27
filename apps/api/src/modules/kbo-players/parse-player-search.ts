export type ParsedKboPlayer = {
  kboPlayerId: string;
  name: string;
  teamShortName: string;
  backNumber: string | null;
  position: string | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  school: string | null;
  profileUrl: string | null;
};

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
  return decodeHtml(value.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function parseIntOrNull(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBody(value: string) {
  const match = stripHtml(value).match(/(\d+)cm,\s*(\d+)kg/);

  return {
    heightCm: parseIntOrNull(match?.[1]),
    weightKg: parseIntOrNull(match?.[2]),
  };
}

function normalizeTeamShortName(value: string) {
  if (value === '삼성') return '삼성';
  if (value === '한화') return '한화';
  if (value === '두산') return '두산';
  if (value === '롯데') return '롯데';
  if (value === '키움') return '키움';
  return value;
}

export function parsePlayerSearchHtml(html: string): ParsedKboPlayer[] {
  const rows = [...html.matchAll(/<tr>\s*([\s\S]*?)\s*<\/tr>/g)];
  const players: ParsedKboPlayer[] = [];

  for (const rowMatch of rows) {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
      (match) => match[1],
    );

    if (cells.length < 7) {
      continue;
    }

    const playerLinkMatch = cells[1].match(/href=['"]([^'"]*playerId=(\d+)[^'"]*)['"][^>]*>([\s\S]*?)<\/a>/i);
    const kboPlayerId = playerLinkMatch?.[2] ?? null;
    const name = stripHtml(playerLinkMatch?.[3] ?? cells[1]);

    if (!kboPlayerId || !name) {
      continue;
    }

    const body = parseBody(cells[5]);

    players.push({
      kboPlayerId,
      name,
      teamShortName: normalizeTeamShortName(stripHtml(cells[2])),
      backNumber: stripHtml(cells[0]) || null,
      position: stripHtml(cells[3]) || null,
      birthDate: stripHtml(cells[4]) || null,
      heightCm: body.heightCm,
      weightKg: body.weightKg,
      school: stripHtml(cells[6]) || null,
      profileUrl: playerLinkMatch?.[1] ?? null,
    });
  }

  return players;
}

export function parsePlayerSearchTotalCount(html: string) {
  const match = html.match(/검색결과\s*:\s*<span[^>]*class=["']point["'][^>]*>(\d+)<\/span>/);
  return parseIntOrNull(match?.[1]) ?? 0;
}
