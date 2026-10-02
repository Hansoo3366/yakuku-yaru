import { formatDistanceToNowStrict } from 'date-fns';
import { ko } from 'date-fns/locale/ko';

const KOREA_TIME_ZONE = 'Asia/Seoul';

function dateParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KOREA_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    weekday: get('weekday'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

export function formatKoreanDate(value: string | Date) {
  const { year, month, day, weekday } = dateParts(value);
  return `${year}년 ${month}월 ${day}일 ${weekday}`;
}

export function formatKoreanDateShort(value: string | Date) {
  const { year, month, day } = dateParts(value);
  return `${year}. ${month}. ${day}.`;
}

export function formatKoreanDateTime(value: string | Date) {
  const { year, month, day, weekday, hour, minute } = dateParts(value);
  return `${year}년 ${month}월 ${day}일 ${weekday} ${hour}:${minute}`;
}

export function formatKoreanDateTimeShort(value: string | Date) {
  const { year, month, day, hour, minute } = dateParts(value);
  return `${year}. ${month}. ${day}. ${hour}:${minute}`;
}

export function formatKoreanTime(value: string | Date) {
  const { hour, minute } = dateParts(value);
  return `${hour}:${minute}`;
}

export function formatKoreanMonthDay(value: string | Date) {
  const { month, day } = dateParts(value);
  return `${month.padStart(2, '0')}월 ${day.padStart(2, '0')}일`;
}

export function formatKoreanWeekday(value: string | Date) {
  return dateParts(value).weekday.replace(/요일$/, '');
}

export function formatTimeAgo(value: string | Date) {
  return `${formatDistanceToNowStrict(new Date(value), { locale: ko })} 전`;
}

/** 한국 시간 기준 날짜를 YYYY-MM-DD 로 돌려준다. offsetDays 로 며칠 뒤/앞을 구한다. */
export function getKoreaDateString(
  value: string | Date = new Date(),
  offsetDays = 0,
) {
  const shifted = new Date(
    new Date(value).getTime() + offsetDays * 24 * 60 * 60 * 1000,
  );

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KOREA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}
