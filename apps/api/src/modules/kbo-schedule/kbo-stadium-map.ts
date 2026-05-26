/** KBO 일정 표의 구장 약칭 → 앱 DB `games.stadium` / `stadium_guides` 명칭 */
export const KBO_STADIUM_MAP: Record<string, string> = {
  잠실: '잠실야구장',
  광주: '광주-KIA 챔피언스 필드',
  대구: '대구 삼성 라이온즈 파크',
  문학: '인천 SSG랜더스필드',
  사직: '사직야구장',
  창원: '창원 NC파크',
  고척: '고척스카이돔',
  수원: '수원 KT위즈파크',
  대전: '대전 한화생명 볼파크',
  포항: '포항야구장',
};

export function mapKboStadium(shortName: string) {
  const trimmed = shortName.trim();
  return KBO_STADIUM_MAP[trimmed] ?? trimmed;
}
