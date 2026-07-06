import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'KBO 야구 일정 캘린더 - 오늘 프로야구 일정',
  description:
    '로그인 없이 KBO 전체 팀 경기 일정, 오늘 프로야구 일정, 경기 시간, 구장, 선발 투수와 예매 정보를 월간·주간 야구 캘린더로 확인하세요.',
  keywords: [
    'KBO 일정',
    '프로야구 일정',
    '오늘 프로야구 일정',
    '오늘 야구 경기',
    '야구 일정표',
    '야구 캘린더',
    'KBO 경기 일정',
    '프로야구 경기 일정',
    'KBO 선발투수',
    'KBO 라인업',
    '야구 예매',
    '야구장 일정',
  ],
  alternates: {
    canonical: '/calendar',
  },
  openGraph: {
    title: 'KBO 야구 일정 캘린더 - 오늘 프로야구 일정',
    description:
      'KBO 전체 팀 경기 일정과 프로야구 일정표, 오늘 야구 경기, 선발 투수와 예매 정보를 월간·주간 캘린더로 확인하세요.',
    url: '/calendar',
  },
  twitter: {
    title: 'KBO 야구 일정 캘린더 - 오늘 프로야구 일정',
    description:
      'KBO 전체 팀 경기 일정과 프로야구 일정표, 오늘 야구 경기와 선발 정보를 월간·주간 캘린더로 확인하세요.',
  },
};

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return children;
}
