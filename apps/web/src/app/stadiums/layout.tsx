import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'KBO 구장 정보 - 팬들이 남긴 맛집·주차 메모',
  description:
    'KBO 야구장별 맛집, 주차, 교통, 좌석 정보를 팬들이 남긴 메모로 모아 보고 키워드로 필터링하세요.',
  alternates: {
    canonical: '/stadiums',
  },
};

export default function StadiumsLayout({ children }: { children: ReactNode }) {
  return children;
}
