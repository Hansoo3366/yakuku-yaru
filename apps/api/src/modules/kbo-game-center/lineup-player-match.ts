import type { ParsedKboPlayer } from '../kbo-players/parse-player-search.js';

export function resolveLineupPlayerSearchMatches(input: {
  matches: ParsedKboPlayer[];
  name: string;
  teamShortName: string;
}) {
  const exactMatches = input.matches.filter(
    (candidate) =>
      candidate.name === input.name &&
      candidate.teamShortName === input.teamShortName,
  );
  const activeMatches = exactMatches.filter(
    (candidate) => !candidate.isRetired,
  );

  return {
    activeMatch: activeMatches.length === 1 ? activeMatches[0] : null,
    retiredMatches: exactMatches.filter((candidate) => candidate.isRetired),
  };
}
