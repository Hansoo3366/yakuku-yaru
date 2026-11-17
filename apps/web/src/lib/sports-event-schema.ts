/**
 * schema.org SportsEvent 구조화 데이터에 함께 쓰는 값.
 * Google 은 Event 로 적힌 노드마다 startDate·location 을 요구하니,
 * 한 경기(한 구장·한 시각)가 아닌 묶음(시리즈·포스트시즌 전체)은 Event 로 적지 않는다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** "2026-11-03T09:30:00.000Z" → "2026-11-03T18:30:00+09:00" (한국 시각, 시간대 표기 포함) */
export function toKstIsoString(value: string | Date) {
  const time = new Date(value).getTime();

  return `${new Date(time + KST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`;
}

export const KBO_ORGANIZER = {
  '@type': 'SportsOrganization',
  name: 'KBO 리그',
  alternateName: 'Korea Baseball Organization',
  url: 'https://www.koreabaseball.com',
} as const;

type StadiumAddress = {
  streetAddress?: string;
  addressLocality: string;
  addressRegion: string;
};

/** `games.stadium` 이름에 들어 있는 낱말 → 구장 주소 (제2구장은 도시까지만 적는다) */
const STADIUM_ADDRESSES: ReadonlyArray<[RegExp, StadiumAddress]> = [
  [/잠실/, { streetAddress: '올림픽로 19-2', addressLocality: '송파구', addressRegion: '서울특별시' }],
  [/고척/, { streetAddress: '경인로 430', addressLocality: '구로구', addressRegion: '서울특별시' }],
  [/광주|챔피언스/, { streetAddress: '서림로 10', addressLocality: '북구', addressRegion: '광주광역시' }],
  [/포항/, { addressLocality: '포항시', addressRegion: '경상북도' }],
  [/대구|라이온즈/, { streetAddress: '야구전설로 1', addressLocality: '수성구', addressRegion: '대구광역시' }],
  [/청주/, { addressLocality: '청주시', addressRegion: '충청북도' }],
  [/대전|한화생명/, { streetAddress: '대종로 373', addressLocality: '중구', addressRegion: '대전광역시' }],
  [/울산/, { addressLocality: '남구', addressRegion: '울산광역시' }],
  [/사직/, { streetAddress: '사직로 45', addressLocality: '동래구', addressRegion: '부산광역시' }],
  [/창원|NC파크/i, { streetAddress: '삼호로 63', addressLocality: '창원시 마산회원구', addressRegion: '경상남도' }],
  [/수원|위즈파크/i, { streetAddress: '경수대로 893', addressLocality: '수원시 장안구', addressRegion: '경기도' }],
  [/인천|문학|랜더스/, { streetAddress: '매소홀로 618', addressLocality: '미추홀구', addressRegion: '인천광역시' }],
];

/** 경기 장소. 모르는 구장도 이름과 나라는 적어 location 이 비지 않게 한다. */
export function buildStadiumPlace(stadium: string) {
  const address = STADIUM_ADDRESSES.find(([pattern]) => pattern.test(stadium))?.[1];

  return {
    '@type': 'StadiumOrArena',
    name: stadium,
    address: {
      '@type': 'PostalAddress',
      ...address,
      addressCountry: 'KR',
    },
  };
}

/** 경기 상태 → schema.org eventStatus */
export function toEventStatus(status: string) {
  switch (status) {
    case 'cancelled':
      return 'https://schema.org/EventCancelled';
    case 'postponed':
    case 'suspended':
      return 'https://schema.org/EventPostponed';
    default:
      return 'https://schema.org/EventScheduled';
  }
}
