import { PUBLIC_DATA_CACHE_TAG } from '@/lib/server-baseball-api';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
).replace(/\/+$/, '');

/**
 * 공개 API 한 건을 받되, 없는 자료(404)와 일시적인 실패를 구분해서 돌려준다.
 * 없는 자료는 페이지가 404 로 응답해야 검색엔진이 빈 페이지(soft 404)를 색인하지 않고,
 * 일시적인 실패는 지금처럼 클라이언트 조회로 넘긴다.
 */
export async function requestPublicResource<T>(
  path: string,
  revalidate = 60,
): Promise<{ data: T | null; missing: boolean }> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate, tags: [PUBLIC_DATA_CACHE_TAG] },
    });

    if (response.status === 404) {
      return { data: null, missing: true };
    }

    if (!response.ok) {
      return { data: null, missing: false };
    }

    return { data: (await response.json()) as T, missing: false };
  } catch {
    return { data: null, missing: false };
  }
}
