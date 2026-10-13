import { env } from '../config/env.js';

const PURGE_TIMEOUT_MS = 5_000;

/**
 * 웹(Next) 서버가 들고 있는 공개 데이터 캐시를 비운다.
 * 실패해도 갱신 자체는 끝난 것이므로 던지지 않는다. 캐시는 원래 유효 시간이 지나면 풀린다.
 */
export async function purgeWebCache() {
  try {
    const response = await fetch(`${env.webInternalUrl}/internal/revalidate`, {
      method: 'POST',
      signal: AbortSignal.timeout(PURGE_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[web-cache] 캐시 비우기 실패: HTTP ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      `[web-cache] 캐시 비우기 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}
