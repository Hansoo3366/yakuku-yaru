import { revalidateTag } from 'next/cache';
import { PUBLIC_DATA_CACHE_TAG } from '@/lib/server-baseball-api';

/** 내부망에서 이 서버를 직접 부를 때의 호스트 이름 (docker compose 서비스 이름, 로컬 개발) */
const INTERNAL_HOSTNAMES = new Set(['web', 'localhost', '127.0.0.1']);

function isInternalRequest(request: Request) {
  const host = request.headers.get('host') ?? '';
  return INTERNAL_HOSTNAMES.has(host.replace(/:\d+$/, ''));
}

/**
 * 서버가 받아 둔 공개 데이터 캐시를 즉시 비운다. 다음 요청부터 API 에서 새로 받는다.
 * 데이터 갱신을 끝낸 API 컨테이너가 내부망(web:3000)으로 직접 부른다.
 * 밖에서 프록시를 거쳐 들어온 요청은 Host 가 서비스 도메인이므로 없는 경로로 답한다.
 */
export async function POST(request: Request) {
  if (!isInternalRequest(request)) {
    return new Response(null, { status: 404 });
  }

  revalidateTag(PUBLIC_DATA_CACHE_TAG, { expire: 0 });
  return Response.json({ revalidated: true });
}
