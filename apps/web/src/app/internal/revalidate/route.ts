import { revalidateTag } from 'next/cache';
import { PUBLIC_DATA_CACHE_TAG } from '@/lib/server-baseball-api';

/**
 * 서버가 받아 둔 공개 데이터 캐시를 즉시 비운다. 다음 요청부터 API 에서 새로 받는다.
 * 데이터 갱신을 끝낸 API 컨테이너가 내부망(web:3000)으로 부른다. 게이트웨이(nginx)가 /internal/ 을 막아 밖에서는 닿지 않는다.
 */
export async function POST() {
  revalidateTag(PUBLIC_DATA_CACHE_TAG, { expire: 0 });
  return Response.json({ revalidated: true });
}
