import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// 이 경로에 metadata 가 없으면 루트 레이아웃의 canonical('/')을 물려받아
// 검색엔진이 팬 찾기 페이지를 홈의 중복으로 보고 색인하지 않는다.
export const metadata: Metadata = {
  title: '야구팬 찾기 - 같은 팀·같은 구장 팬',
  description:
    '같은 KBO 팀을 응원하거나 같은 야구장에 다녀온 야구팬을 찾고, 직관 기록과 이야기를 이어서 보세요.',
  alternates: {
    canonical: '/fans',
  },
};

export default function FansLayout({ children }: { children: ReactNode }) {
  return children;
}
