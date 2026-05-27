export type StadiumSeatMap = {
  src: string;
  label: string;
};

type StadiumSeatMapRule = {
  keywords: string[];
  file: string;
  label: string;
};

/** `games.stadium` / KBO_STADIUM_MAP 명칭 → public/seats 이미지 */
const STADIUM_SEAT_MAP_RULES: StadiumSeatMapRule[] = [
  {
    keywords: ['잠실'],
    file: 'lg_doosan_seats.webp',
    label: '잠실야구장 좌석 배치',
  },
  {
    keywords: ['광주', 'KIA', '챔피언스'],
    file: 'kia_seats.webp',
    label: '광주-KIA 챔피언스 필드 좌석 배치',
  },
  {
    keywords: ['대구', '삼성 라이온즈'],
    file: 'samsung_seats.webp',
    label: '대구 삼성 라이온즈 파크 좌석 배치',
  },
  {
    keywords: ['인천', 'SSG', '문학'],
    file: 'ssg_seats.webp',
    label: '인천 SSG랜더스필드 좌석 배치',
  },
  {
    keywords: ['사직'],
    file: 'lotte_seats.webp',
    label: '사직야구장 좌석 배치',
  },
  {
    keywords: ['창원', 'NC파크'],
    file: 'nc_seats.webp',
    label: '창원 NC파크 좌석 배치',
  },
  {
    keywords: ['고척'],
    file: 'kiwoom_seats.webp',
    label: '고척스카이돔 좌석 배치',
  },
  {
    keywords: ['수원', 'KT위즈'],
    file: 'kt_seats.webp',
    label: '수원 KT위즈파크 좌석 배치',
  },
  {
    keywords: ['대전', '한화'],
    file: 'hanhwa_seats.webp',
    label: '대전 한화생명 볼파크 좌석 배치',
  },
];

export function getStadiumSeatMap(stadium: string): StadiumSeatMap | null {
  const normalized = stadium.trim();

  if (!normalized) {
    return null;
  }

  for (const rule of STADIUM_SEAT_MAP_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return {
        src: `/seats/${rule.file}`,
        label: rule.label,
      };
    }
  }

  return null;
}
