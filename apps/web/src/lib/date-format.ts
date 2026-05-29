import { format, formatDistanceToNowStrict } from 'date-fns';
import { ko } from 'date-fns/locale/ko';

export function formatKoreanDate(value: string | Date) {
  return format(new Date(value), 'yyyy년 M월 d일 EEE요일', { locale: ko });
}

export function formatKoreanDateShort(value: string | Date) {
  return format(new Date(value), 'yyyy. M. d.', { locale: ko });
}

export function formatKoreanDateTime(value: string | Date) {
  return format(new Date(value), 'yyyy년 M월 d일 EEE요일 HH:mm', {
    locale: ko,
  });
}

export function formatKoreanDateTimeShort(value: string | Date) {
  return format(new Date(value), 'yyyy. M. d. HH:mm', { locale: ko });
}

export function formatKoreanTime(value: string | Date) {
  return format(new Date(value), 'HH:mm', { locale: ko });
}

export function formatKoreanMonthDay(value: string | Date) {
  return format(new Date(value), 'MM월 dd일', { locale: ko });
}

export function formatKoreanWeekday(value: string | Date) {
  return format(new Date(value), 'EEE', { locale: ko });
}

export function formatTimeAgo(value: string | Date) {
  return `${formatDistanceToNowStrict(new Date(value), { locale: ko })} 전`;
}
