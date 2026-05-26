export type ParsedKboTeamStanding = {
  rank: number;
  teamShortName: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  gamesBehind: number;
};

export type ParsedKboTeamRankPage = {
  seasonYear: number;
  rankDate: string;
  seriesId: string;
  standings: ParsedKboTeamStanding[];
};

function parseRankDateFromHtml(html: string) {
  const hiddenMatch = html.match(
    /id="cphContents_cphContents_cphContents_hfSearchDate"[^>]*value="(\d{8})"/,
  );

  if (hiddenMatch?.[1]) {
    const raw = hiddenMatch[1];
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  const labelMatch = html.match(/(\d{4})년\s*(\d{2})월\s*(\d{2})일\s*기준/);

  if (labelMatch) {
    return `${labelMatch[1]}-${labelMatch[2]}-${labelMatch[3]}`;
  }

  return new Date().toISOString().slice(0, 10);
}

function parseSeriesIdFromHtml(html: string) {
  const match = html.match(
    /id="cphContents_cphContents_cphContents_hfSearchSeries"[^>]*value="([^"]+)"/,
  );

  return match?.[1]?.trim() || '0';
}

function extractStandingsTableHtml(html: string) {
  const tableMatch = html.match(
    /<table[^>]*summary="[^"]*순위[^"]*팀명[^"]*"[^>]*class="tData"[^>]*>[\s\S]*?<\/table>/i,
  );

  return tableMatch?.[0] ?? null;
}

export function parseKboTeamRankHtml(html: string): ParsedKboTeamRankPage {
  const rankDate = parseRankDateFromHtml(html);
  const seasonYear = Number(rankDate.slice(0, 4));
  const seriesId = parseSeriesIdFromHtml(html);
  const tableHtml = extractStandingsTableHtml(html);

  if (!tableHtml) {
    throw new Error('KBO 팀 순위 표를 찾지 못했습니다.');
  }

  const rowPattern =
    /<tr>\s*<td>(\d+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>([\d.]+)<\/td>\s*<td>([\d.]+)<\/td>/g;

  const standings: ParsedKboTeamStanding[] = [];

  for (const match of tableHtml.matchAll(rowPattern)) {
    standings.push({
      rank: Number(match[1]),
      teamShortName: match[2].trim(),
      games: Number(match[3]),
      wins: Number(match[4]),
      losses: Number(match[5]),
      draws: Number(match[6]),
      winRate: Number(match[7]),
      gamesBehind: Number(match[8]),
    });
  }

  if (!standings.length) {
    throw new Error('KBO 팀 순위 행을 파싱하지 못했습니다.');
  }

  return {
    seasonYear,
    rankDate,
    seriesId,
    standings,
  };
}
