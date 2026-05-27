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

function parseRate(value: string) {
  if (!value || value === '-') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export type ParsedKboHitterSeasonStats = {
  kboPlayerId: string;
  name: string;
  seasonBattingAvg: number | null;
  seasonOps: number | null;
};

export function parseHitterBasic2Html(html: string): ParsedKboHitterSeasonStats[] {
  const headerMatch = html.match(/<thead[\s\S]*?<\/thead>/i);
  const headers = headerMatch
    ? [...headerMatch[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((match) =>
        stripHtml(match[1]),
      )
    : [];
  const avgIndex = headers.indexOf('AVG');
  const opsIndex = headers.indexOf('OPS');

  if (avgIndex < 0 || opsIndex < 0) {
    return [];
  }

  const players: ParsedKboHitterSeasonStats[] = [];

  for (const rowMatch of html.matchAll(/<tr>\s*([\s\S]*?)\s*<\/tr>/g)) {
    const rowHtml = rowMatch[1];
    const playerLinkMatch = rowHtml.match(
      /playerId=(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    const kboPlayerId = playerLinkMatch?.[1] ?? null;
    const name = stripHtml(playerLinkMatch?.[2] ?? '');

    if (!kboPlayerId || !name) {
      continue;
    }

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
      (match) => stripHtml(match[1]),
    );

    players.push({
      kboPlayerId,
      name,
      seasonBattingAvg: parseRate(cells[avgIndex] ?? ''),
      seasonOps: parseRate(cells[opsIndex] ?? ''),
    });
  }

  return players;
}
