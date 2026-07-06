import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '야구 직관 후기 게시판',
  description:
    'KBO 경기 직관 후기, 야구장 좌석과 먹거리, 예매 팁, 응원 분위기와 프로야구 관람 기록을 팬들과 나누는 게시판입니다.',
  keywords: [
    '야구 직관 후기',
    'KBO 직관 후기',
    '프로야구 직관',
    '야구장 후기',
    '야구장 좌석',
    '야구장 먹거리',
    '야구 예매 팁',
    'KBO 게시판',
    '프로야구 게시판',
    '직관 기록',
    '야구 관람 후기',
  ],
  alternates: {
    canonical: '/posts',
  },
  openGraph: {
    title: '야구 직관 후기 게시판',
    description:
      'KBO 경기 직관 후기, 야구장 좌석과 먹거리, 예매 팁과 응원 분위기를 팬들과 나눠보세요.',
    url: '/posts',
  },
  twitter: {
    title: '야구 직관 후기 게시판',
    description:
      'KBO 경기 직관 후기, 야구장 좌석과 먹거리, 예매 팁을 팬들과 나누는 게시판입니다.',
  },
};

export default function PostsLayout({ children }: { children: ReactNode }) {
  return children;
}
