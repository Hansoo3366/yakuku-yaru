import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'KBO 응원가 모음',
  description:
    'KBO 팀 응원가와 선수 응원가를 팀별 탭, 최근 라인업, 전체 선수 검색으로 확인하세요.',
  alternates: {
    canonical: '/cheers',
  },
  openGraph: {
    title: 'KBO 응원가 모음',
    description:
      'KBO 팀 응원가와 선수 응원가를 팀별 탭, 최근 라인업, 전체 선수 검색으로 확인하세요.',
    url: '/cheers',
  },
  twitter: {
    title: 'KBO 응원가 모음',
    description:
      'KBO 팀 응원가와 선수 응원가를 팀별 탭, 최근 라인업, 전체 선수 검색으로 확인하세요.',
  },
};

export default function CheersLayout({ children }: { children: ReactNode }) {
  return children;
}
