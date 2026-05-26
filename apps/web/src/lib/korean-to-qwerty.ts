const HANGUL_SYLLABLE_BASE = 0xac00;

const CHO_LIST = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG_LIST = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG_LIST = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

/** 두벌식 한글 자모 → 같은 키 위치의 영문(QWERTY) */
const JAMO_TO_QWERTY: Record<string, string> = {
  'ㄱ': 'r',
  'ㄲ': 'R',
  'ㄴ': 's',
  'ㄷ': 'e',
  'ㄸ': 'E',
  'ㄹ': 'f',
  'ㅁ': 'a',
  'ㅂ': 'q',
  'ㅃ': 'Q',
  'ㅅ': 't',
  'ㅆ': 'T',
  'ㅇ': 'd',
  'ㅈ': 'w',
  'ㅉ': 'W',
  'ㅊ': 'c',
  'ㅋ': 'z',
  'ㅌ': 'x',
  'ㅍ': 'v',
  'ㅎ': 'g',
  'ㅏ': 'k',
  'ㅐ': 'o',
  'ㅑ': 'i',
  'ㅒ': 'O',
  'ㅓ': 'j',
  'ㅔ': 'p',
  'ㅕ': 'u',
  'ㅖ': 'P',
  'ㅗ': 'h',
  'ㅘ': 'hk',
  'ㅙ': 'ho',
  'ㅚ': 'hl',
  'ㅛ': 'y',
  'ㅜ': 'n',
  'ㅝ': 'nj',
  'ㅞ': 'np',
  'ㅟ': 'nl',
  'ㅠ': 'b',
  'ㅡ': 'm',
  'ㅢ': 'ml',
  'ㅣ': 'l',
  'ㄳ': 'rt',
  'ㄵ': 'sw',
  'ㄶ': 'sg',
  'ㄺ': 'fr',
  'ㄻ': 'fa',
  'ㄼ': 'fq',
  'ㄽ': 'ft',
  'ㄾ': 'fx',
  'ㄿ': 'fv',
  'ㅀ': 'fg',
  'ㅄ': 'qt',
  '·': '`',
  '₩': '\\',
};

function isHangulSyllable(char: string) {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

function isJamo(char: string) {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x3130 && code <= 0x318f) ||
    JAMO_TO_QWERTY[char] !== undefined
  );
}

function decomposeSyllable(char: string) {
  const code = char.charCodeAt(0) - HANGUL_SYLLABLE_BASE;
  const choIndex = Math.floor(code / (21 * 28));
  const jungIndex = Math.floor((code % (21 * 28)) / 28);
  const jongIndex = code % 28;

  return (
    CHO_LIST[choIndex] +
    JUNG_LIST[jungIndex] +
    (jongIndex > 0 ? JONG_LIST[jongIndex] : '')
  );
}

function mapJamoSequence(jamos: string) {
  let result = '';

  for (let index = 0; index < jamos.length; index += 1) {
    const two = jamos.slice(index, index + 2);
    if (JAMO_TO_QWERTY[two]) {
      result += JAMO_TO_QWERTY[two];
      index += 1;
      continue;
    }

    const one = jamos[index] ?? '';
    result += JAMO_TO_QWERTY[one] ?? one;
  }

  return result;
}

function toHalfwidthAscii(char: string) {
  const code = char.charCodeAt(0);

  if (code >= 0xff01 && code <= 0xff5e) {
    return String.fromCharCode(code - 0xfee0);
  }

  if (code === 0x3000) {
    return ' ';
  }

  return char;
}

/**
 * 비밀번호 입력 시 한글(두벌식)을 같은 키 위치의 영문으로 치환합니다.
 */
export function koreanToQwerty(value: string) {
  let result = '';

  for (const char of value) {
    if (isHangulSyllable(char)) {
      result += mapJamoSequence(decomposeSyllable(char));
      continue;
    }

    if (isJamo(char)) {
      result += JAMO_TO_QWERTY[char] ?? char;
      continue;
    }

    const halfwidth = toHalfwidthAscii(char);
    const code = halfwidth.charCodeAt(0);

    if (code >= 0x3130 && code <= 0x318f) {
      result += JAMO_TO_QWERTY[halfwidth] ?? '';
      continue;
    }

    result += halfwidth;
  }

  return result;
}

export function normalizePasswordInput(value: string) {
  return koreanToQwerty(value);
}
