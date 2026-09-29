import type { Metadata } from 'next';
import { StadiumDetailPageClient } from './StadiumDetailPageClient';

type StadiumPageProps = {
  params: Promise<{
    stadium: string;
  }>;
};

/** 한글 구장명은 인코딩된 채로 들어올 수 있어 한 번만 안전하게 디코딩한다. */
function decodeStadiumParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: StadiumPageProps): Promise<Metadata> {
  const stadium = decodeStadiumParam((await params).stadium);

  return {
    title: `${stadium} 맛집·주차 팬 메모 - 구장 정보`,
    description: `${stadium} 근처 맛집, 주차, 교통, 좌석 정보를 팬들이 남긴 메모로 확인하세요.`,
    alternates: {
      canonical: `/stadiums/${encodeURIComponent(stadium)}`,
    },
  };
}

export default async function StadiumPage({ params }: StadiumPageProps) {
  const stadium = decodeStadiumParam((await params).stadium);

  return <StadiumDetailPageClient stadium={stadium} />;
}
