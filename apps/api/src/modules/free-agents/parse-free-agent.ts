/** KBO 선수 이동현황 표 한 줄: 날짜 / 항목 / 팀 / 선수(포지션) / 비고 */
export type KboTradeTable = {
  rows?: { row?: { Text?: string | null }[] }[];
  totalCnt?: number | string;
};

export type KboTradeRow = {
  date: string;
  section: string;
  teamShortName: string;
  playerName: string;
  position: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PLAYER_RE = /^(.+?)\s*\(([^()]+)\)$/;

export function parseKboTradeRows(table: KboTradeTable): KboTradeRow[] {
  const parsed: KboTradeRow[] = [];

  for (const item of table.rows ?? []) {
    const cells = (item.row ?? []).map((cell) => (cell.Text ?? '').trim());
    const [date, section, teamShortName, player] = cells;
    const match = player?.match(PLAYER_RE);

    if (!date || !DATE_RE.test(date) || !teamShortName || !match) {
      continue;
    }

    parsed.push({
      date,
      section: section ?? '',
      teamShortName,
      playerName: match[1].trim(),
      position: match[2].trim(),
    });
  }

  return parsed;
}

/**
 * FA 자격은 정규시즌이 끝난 11월에 공시되고 계약은 이듬해 봄까지 이어진다.
 * 11~12월은 그해, 1~3월은 지난해 스토브리그로 본다. 그 밖의 달은 스토브리그가 아니다.
 */
export function getStoveLeagueYear(dateKey: string) {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));

  if (month >= 11) return year;
  if (month <= 3) return year - 1;
  return null;
}

/** 이 스토브리그(faYear)의 계약인지. 다음 해 11월 공시부터는 다음 스토브리그다. */
export function isContractInStoveLeague(
  contractDate: string,
  faYear: number,
  qualifiedOn: string,
) {
  return contractDate >= qualifiedOn && contractDate < `${faYear + 1}-11-01`;
}

/** 한국 시간 기준 YYYY-MM-DD */
export function getKoreaDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

type PositionGroup =
  | 'pitcher'
  | 'catcher'
  | 'infield'
  | 'outfield'
  | 'designated';

const POSITION_GROUPS: Record<string, PositionGroup> = {
  투수: 'pitcher',
  포수: 'catcher',
  내야수: 'infield',
  '1루수': 'infield',
  '2루수': 'infield',
  '3루수': 'infield',
  유격수: 'infield',
  외야수: 'outfield',
  좌익수: 'outfield',
  중견수: 'outfield',
  우익수: 'outfield',
  지명타자: 'designated',
};

/** KBO FA 명단은 내야수·외야수로, 선수 명단은 유격수·좌익수처럼 세분해 적는다. 지명타자는 야수 누구와도 맞는다. */
function isSamePositionGroup(
  faPosition: string,
  playerPosition: string | null,
) {
  const faGroup = POSITION_GROUPS[faPosition];
  const playerGroup = playerPosition
    ? POSITION_GROUPS[playerPosition]
    : undefined;

  if (!faGroup || !playerGroup) return false;
  if (faGroup === playerGroup) return true;

  const fielders = faGroup !== 'pitcher' && playerGroup !== 'pitcher';
  return fielders && (faGroup === 'designated' || playerGroup === 'designated');
}

export type FreeAgentPlayerCandidate = {
  id: number;
  position: string | null;
  teamId: number;
  isActive: boolean;
};

/** 같은 이름의 선수 중 FA 선수와 같은 사람. 확신할 수 없으면 null. */
export function pickFreeAgentPlayer(
  freeAgent: { position: string; teamIds: (number | null)[] },
  candidates: FreeAgentPlayerCandidate[],
) {
  const samePosition = candidates.filter((player) =>
    isSamePositionGroup(freeAgent.position, player.position),
  );
  const sameTeam = samePosition
    .filter((player) => freeAgent.teamIds.includes(player.teamId))
    .sort(
      (a, b) =>
        Number(b.teamId === freeAgent.teamIds[0]) -
          Number(a.teamId === freeAgent.teamIds[0]) ||
        Number(b.isActive) - Number(a.isActive),
    );

  if (sameTeam[0]) return sameTeam[0].id;
  return samePosition.length === 1 ? samePosition[0].id : null;
}
