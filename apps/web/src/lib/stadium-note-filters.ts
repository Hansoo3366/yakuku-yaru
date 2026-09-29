import type { PublicStadiumNote } from '@/lib/stadium-note-api';

export type StadiumNoteFilter = {
  id: string;
  label: string;
  /** 비어 있으면 전체 */
  keywords: string[];
};

/** 팬 메모 키워드 필터. 한 단어라도 포함되면 해당 필터에 걸리고, 걸린 단어를 하이라이트한다. */
export const STADIUM_NOTE_FILTERS: StadiumNoteFilter[] = [
  { id: 'all', label: '전체', keywords: [] },
  {
    id: 'food',
    label: '맛·음식',
    keywords: [
      '맛',
      '음식',
      '먹',
      '메뉴',
      '치킨',
      '닭강정',
      '떡볶이',
      '분식',
      '김밥',
      '햄버거',
      '버거',
      '피자',
      '국밥',
      '밀면',
      '족발',
      '곱창',
      '라면',
      '핫도그',
      '푸드',
      '포장',
      '배달',
      '맥주',
      '음료',
      '커피',
      '카페',
      '간식',
      '안주',
    ],
  },
  {
    id: 'parking',
    label: '주차',
    keywords: ['주차', '만차', '발렛', '공영', '자차', '차량', '출차', '정산'],
  },
  {
    id: 'transit',
    label: '교통·이동',
    keywords: [
      '지하철',
      '호선',
      '버스',
      '셔틀',
      '택시',
      '출구',
      '도보',
      '걸어',
      '환승',
      '막차',
      '역에서',
      '역까지',
    ],
  },
  {
    id: 'seat',
    label: '좌석·시야',
    keywords: [
      '좌석',
      '자리',
      '시야',
      '응원석',
      '외야',
      '내야',
      '테이블석',
      '1루',
      '3루',
      '익사이팅',
      '그늘',
      '햇빛',
      '지붕',
    ],
  },
  {
    id: 'price',
    label: '가격·가성비',
    keywords: [
      '가격',
      '가성비',
      '저렴',
      '싸요',
      '싸다',
      '싼',
      '비싸',
      '비싼',
      '할인',
      '만원',
      '천원',
      '무료',
    ],
  },
  {
    id: 'crowd',
    label: '대기·혼잡',
    keywords: [
      '웨이팅',
      '대기',
      '줄 서',
      '줄서',
      '혼잡',
      '붐비',
      '막히',
      '밀리',
      '일찍',
    ],
  },
  {
    id: 'facility',
    label: '편의시설',
    keywords: [
      '화장실',
      '흡연',
      '편의점',
      '굿즈',
      '물품보관',
      '보관함',
      '유모차',
      '수유실',
      '엘리베이터',
      '충전',
    ],
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 긴 단어부터 매칭해야 '주차장' 대신 '주차'만 칠해지는 일을 줄일 수 있다. */
export function buildKeywordPattern(keywords: string[]) {
  const unique = [...new Set(keywords.map((word) => word.trim()))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!unique.length) {
    return null;
  }

  return new RegExp(`(${unique.map(escapeRegExp).join('|')})`, 'gi');
}

export function noteText(note: PublicStadiumNote) {
  return `${note.foodMemo}\n${note.parkingMemo}`;
}

export function matchesPattern(text: string, pattern: RegExp | null) {
  if (!pattern) {
    return true;
  }

  pattern.lastIndex = 0;
  const matched = pattern.test(text);
  pattern.lastIndex = 0;

  return matched;
}

/** 하이라이트 렌더링용: 매칭 구간은 isMatch=true */
export function splitByPattern(text: string, pattern: RegExp | null) {
  if (!pattern) {
    return [{ text, isMatch: false }];
  }

  return text
    .split(pattern)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, isMatch: matchesPattern(part, pattern) }));
}
