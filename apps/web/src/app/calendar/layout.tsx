import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'KBO 야구 일정 캘린더',
  description:
    '로그인 없이 KBO 전체 팀 경기 일정과 프로야구 일정표를 월간·주간 야구 캘린더로 확인하세요.',
  alternates: {
    canonical: '/calendar',
  },
  openGraph: {
    title: 'KBO 야구 일정 캘린더',
    description:
      'KBO 전체 팀 경기 일정과 프로야구 일정표를 월간·주간 캘린더로 확인하세요.',
    url: '/calendar',
  },
  twitter: {
    title: 'KBO 야구 일정 캘린더',
    description:
      'KBO 전체 팀 경기 일정과 프로야구 일정표를 월간·주간 캘린더로 확인하세요.',
  },
};

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return children;
}
