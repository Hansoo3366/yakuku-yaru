/**
 * 달력 칸처럼 좁은 자리에 넣는 짧은 구장 이름.
 * 후원사 이름을 빼고 "도시 + 구장" 으로 줄인다. ("대전 한화생명 볼파크" → "대전 볼파크")
 * 알려지지 않은 구장은 받은 이름을 그대로 돌려준다.
 */
const SHORT_NAMES: ReadonlyArray<[RegExp, string]> = [
  [/잠실/, '잠실야구장'],
  [/고척/, '고척스카이돔'],
  [/광주|챔피언스/, '광주 챔피언스필드'],
  [/대구|라이온즈/, '대구 라이온즈파크'],
  [/대전|한화생명/, '대전 볼파크'],
  [/사직/, '사직야구장'],
  [/창원|NC파크/i, '창원 NC파크'],
  [/수원|위즈파크/, '수원 위즈파크'],
  [/문학|랜더스/, '인천 랜더스필드'],
];

export function getStadiumShortName(stadium: string): string {
  const matched = SHORT_NAMES.find(([pattern]) => pattern.test(stadium));
  return matched ? matched[1] : stadium;
}
