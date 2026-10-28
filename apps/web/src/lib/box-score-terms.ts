/**
 * KBO 박스스코어는 포지션을 한자 한 글자(一·二·三)로, 타석 결과를 "투땅"·"좌안" 같은 줄임말로 준다.
 * 화면에는 누구나 읽을 수 있는 말로 풀어서 보여 준다.
 */

const POSITION_NAMES: Record<string, string> = {
  투: '투수',
  포: '포수',
  一: '1루수',
  二: '2루수',
  三: '3루수',
  유: '유격수',
  좌: '좌익수',
  중: '중견수',
  우: '우익수',
  지: '지명타자',
  타: '대타',
  주: '대주자',
};

/** "타우"처럼 교체로 자리가 바뀐 선수는 "대타 → 우익수"로 이어 쓴다 */
export function describePosition(code: string) {
  return [...code].map((char) => POSITION_NAMES[char] ?? char).join(' → ');
}

/** 공이 간 곳. 두 글자 방향(좌중·우중)을 먼저 본다 */
const FIELDERS: Record<string, string> = {
  좌중: '좌중간',
  우중: '우중간',
  투: '투수',
  포: '포수',
  '1': '1루수',
  '2': '2루수',
  '3': '3루수',
  유: '유격수',
  좌: '좌익수',
  중: '중견수',
  우: '우익수',
};

const OUTFIELD = new Set(['좌', '중', '우', '좌중', '우중']);

export type PlateResultKind = 'homerun' | 'hit' | 'walk' | 'reach' | 'out';

export type PlateResult = {
  code: string;
  label: string;
  kind: PlateResultKind;
};

const STANDALONE: Record<string, Omit<PlateResult, 'code'>> = {
  삼진: { label: '삼진', kind: 'out' },
  '4구': { label: '볼넷', kind: 'walk' },
  고4: { label: '고의 볼넷', kind: 'walk' },
  사구: { label: '몸에 맞는 공', kind: 'walk' },
  타방: { label: '타격 방해 출루', kind: 'walk' },
  낫아웃: { label: '낫아웃 출루', kind: 'reach' },
};

/** 결과 글자는 긴 것부터 맞춘다 (희번이 번보다 먼저) */
const OUTCOME_SUFFIXES = ['희번', '희비', '야선', '안', '홈', '땅', '비', '파', '직', '병', '실', '번', '2', '3'] as const;

/** "1우"·"3좌"처럼 두 수비수 사이로 간 공은 뒤쪽 수비수 방향으로 읽는다 */
function resolveFielder(direction: string) {
  if (FIELDERS[direction]) return direction;
  const lastTwo = direction.slice(-2);
  if (FIELDERS[lastTwo]) return lastTwo;
  const last = direction.slice(-1);
  return FIELDERS[last] ? last : null;
}

function towards(fielder: string) {
  return fielder === '좌중' || fielder === '우중' ? FIELDERS[fielder] : `${FIELDERS[fielder]} 쪽`;
}

function describeOne(code: string): PlateResult {
  const standalone = STANDALONE[code];
  if (standalone) return { code, ...standalone };

  const suffix = OUTCOME_SUFFIXES.find(
    (candidate) => code.endsWith(candidate) && code.length > candidate.length,
  );
  const fielder = suffix ? resolveFielder(code.slice(0, -suffix.length)) : null;

  if (!suffix || !fielder) return { code, label: code, kind: 'out' };

  const name = FIELDERS[fielder];

  switch (suffix) {
    case '안':
      return OUTFIELD.has(fielder)
        ? {
            code,
            label: fielder.length === 2 ? `${name} 안타` : `${name} 앞 안타`,
            kind: 'hit',
          }
        : { code, label: `${name} 쪽 내야안타`, kind: 'hit' };
    case '2':
      return { code, label: `${towards(fielder)} 2루타`, kind: 'hit' };
    case '3':
      return { code, label: `${towards(fielder)} 3루타`, kind: 'hit' };
    case '홈':
      return { code, label: `${towards(fielder)} 홈런`, kind: 'homerun' };
    case '땅':
      return { code, label: `${name} 땅볼`, kind: 'out' };
    case '비':
      return { code, label: `${name} 뜬공`, kind: 'out' };
    case '파':
      return { code, label: `${name} 파울 뜬공`, kind: 'out' };
    case '직':
      return { code, label: `${name} 직선타`, kind: 'out' };
    case '병':
      return { code, label: `${name} 병살타`, kind: 'out' };
    case '실':
      return { code, label: `${name} 실책으로 출루`, kind: 'reach' };
    case '야선':
      return { code, label: `야수 선택으로 출루`, kind: 'reach' };
    case '희번':
      return { code, label: `${name} 쪽 희생번트`, kind: 'out' };
    case '희비':
      return { code, label: `${name} 희생플라이`, kind: 'out' };
    case '번':
      return { code, label: `${name} 쪽 번트 아웃`, kind: 'out' };
    default:
      return { code, label: code, kind: 'out' };
  }
}

/** 한 이닝에 두 번 나온 타석은 "좌안 / 삼진"처럼 이어져 온다 */
export function describePlateResults(value: string): PlateResult[] {
  return value
    .split(' / ')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(describeOne);
}

/** "4 1/3" → "4⅓" */
export function formatPitcherInnings(value: string) {
  const formatted = value.replace(' 1/3', '⅓').replace(' 2/3', '⅔').replace('1/3', '⅓').replace('2/3', '⅔');
  return formatted || '0';
}

export const DECISION_LABEL: Record<string, string> = {
  승: '승리',
  패: '패전',
  세: '세이브',
  홀: '홀드',
  홀드: '홀드',
};

type DecisionSide = 'away' | 'home';

export type BoxScoreHighlights = {
  winningPitcher: { name: string; side: DecisionSide } | null;
  losingPitcher: { name: string; side: DecisionSide } | null;
  savePitcher: { name: string; side: DecisionSide } | null;
  /** "김도영(3회 1사 1루서 좌중월 홈런)" 을 이름과 상황으로 나눈 것 */
  winningHit: { name: string; detail: string | null } | null;
  /** 주요 기록의 홈런 줄 그대로 */
  homeRuns: string | null;
};

/** 승리·패전·세이브 투수와 결승타, 홈런처럼 경기를 한 줄로 말할 때 쓰는 기록만 뽑는다 */
export function getBoxScoreHighlights(boxScore: {
  away: { pitchers: { name: string; decision: string | null }[] };
  home: { pitchers: { name: string; decision: string | null }[] };
  notes: { label: string; value: string }[];
}): BoxScoreHighlights {
  const findDecision = (decision: string) => {
    for (const side of ['away', 'home'] as const) {
      const pitcher = boxScore[side].pitchers.find((item) => item.decision === decision);
      if (pitcher) return { name: pitcher.name, side };
    }
    return null;
  };
  const note = (label: string) =>
    boxScore.notes.find((item) => item.label === label)?.value.trim() || null;
  const winningHitText = note('결승타');
  const winningHitMatch = winningHitText ? /^([^(]+)\((.+)\)$/.exec(winningHitText) : null;

  return {
    winningPitcher: findDecision('승'),
    losingPitcher: findDecision('패'),
    savePitcher: findDecision('세'),
    winningHit: winningHitText
      ? {
          name: winningHitMatch ? winningHitMatch[1].trim() : winningHitText,
          detail: winningHitMatch ? winningHitMatch[2] : null,
        }
      : null,
    homeRuns: note('홈런'),
  };
}
