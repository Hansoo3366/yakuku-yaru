import type { ParsedKboPlayer } from '../kbo-players/parse-player-search.js';

function rosterPositionMatchesLineup(
  rosterPosition: string | null,
  lineupPosition: string | null | undefined,
) {
  if (!rosterPosition || !lineupPosition) {
    return false;
  }

  if (lineupPosition === '투수') {
    return rosterPosition.includes('투수');
  }

  if (lineupPosition === '포수') {
    return rosterPosition.includes('포수');
  }

  if (['1루수', '2루수', '3루수', '유격수'].includes(lineupPosition)) {
    return rosterPosition.includes('내야수');
  }

  if (['좌익수', '중견수', '우익수'].includes(lineupPosition)) {
    return rosterPosition.includes('외야수');
  }

  if (lineupPosition === '지명타자') {
    return !rosterPosition.includes('투수');
  }

  return false;
}

export function resolveLineupPlayerSearchMatches(input: {
  matches: ParsedKboPlayer[];
  name: string;
  teamShortName: string;
  fieldPosition?: string | null;
}) {
  const exactMatches = input.matches.filter(
    (candidate) =>
      candidate.name === input.name &&
      candidate.teamShortName === input.teamShortName,
  );
  const activeMatches = exactMatches.filter(
    (candidate) => !candidate.isRetired,
  );
  const positionMatches = activeMatches.filter((candidate) =>
    rosterPositionMatchesLineup(candidate.position, input.fieldPosition),
  );

  return {
    activeMatch:
      activeMatches.length === 1
        ? activeMatches[0]
        : positionMatches.length === 1
          ? positionMatches[0]
          : null,
    retiredMatches: exactMatches.filter((candidate) => candidate.isRetired),
  };
}
