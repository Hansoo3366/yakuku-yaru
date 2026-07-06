import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'KBO 응원가 모음 - 팀 응원가·선수 응원가',
  description:
    'KBO 팀 응원가, 선수 응원가, 등장곡과 최근 라인업 응원가를 팀별 탭과 전체 선수 검색으로 확인하세요.',
  keywords: [
    'KBO 응원가',
    '프로야구 응원가',
    '야구 응원가',
    '팀 응원가',
    '선수 응원가',
    'KBO 선수 응원가',
    '프로야구 선수 응원가',
    '야구 등장곡',
    'KBO 라인업 응원가',
    'LG 응원가',
    '두산 응원가',
    'KIA 응원가',
    '삼성 응원가',
    '한화 응원가',
    '롯데 응원가',
    'SSG 응원가',
    'NC 응원가',
    'KT 응원가',
    '키움 응원가',
  ],
  alternates: {
    canonical: '/cheers',
  },
  openGraph: {
    title: 'KBO 응원가 모음 - 팀 응원가·선수 응원가',
    description:
      'KBO 팀 응원가, 선수 응원가, 등장곡과 최근 라인업 응원가를 팀별 탭과 전체 선수 검색으로 확인하세요.',
    url: '/cheers',
  },
  twitter: {
    title: 'KBO 응원가 모음 - 팀 응원가·선수 응원가',
    description:
      'KBO 팀 응원가, 선수 응원가, 등장곡과 최근 라인업 응원가를 검색으로 확인하세요.',
  },
};

export default function CheersLayout({ children }: { children: ReactNode }) {
  return children;
}
