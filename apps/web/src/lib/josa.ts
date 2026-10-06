/**
 * 단어의 마지막 글자 받침에 맞춰 조사를 고른다.
 * 팀 이름처럼 동적으로 들어오는 단어 뒤에 "이/가", "은/는" 을 붙일 때 쓴다.
 * 한글이 아니면(영문 약칭 "SSG", "KT", "NC", "LG" 등) 발음 기준으로 받침을 판단한다.
 */
const PAIRS = {
  이: ['이', '가'],
  은: ['은', '는'],
  을: ['을', '를'],
  과: ['과', '와'],
  으로: ['으로', '로'],
} as const;

type JosaKind = keyof typeof PAIRS;

// 읽었을 때 받침으로 끝나는 영문 약칭. KBO 구단 약칭(SSG·KT·NC·LG·KIA)은 모두 모음으로 끝난다.
const CONSONANT_ENDING_LATIN = new Set<string>([]);

function endsWithConsonant(word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed) {
    return false;
  }
  const last = trimmed[trimmed.length - 1];
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 !== 0;
  }
  if (/[0-9]/.test(last)) {
    return '0136789'.includes(last); // 영, 일, 삼, 육, 칠, 팔, 구
  }
  return CONSONANT_ENDING_LATIN.has(trimmed.toUpperCase());
}

/** 단어와 알맞은 조사를 붙여 돌려준다. josa('한화', '이') → '한화가' */
export function josa(word: string, kind: JosaKind): string {
  const [withConsonant, withoutConsonant] = PAIRS[kind];
  const particle =
    kind === '으로'
      ? endsWithConsonant(word) && !/[ᄅᆯ]$/.test(word.normalize('NFD'))
        ? withConsonant
        : withoutConsonant
      : endsWithConsonant(word)
        ? withConsonant
        : withoutConsonant;
  return `${word}${particle}`;
}
