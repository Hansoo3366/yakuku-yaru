import { env } from '../config/env.js';

const DEFAULT_KBO_USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
] as const;

/**
 * 응답 본문까지 받는 데 허용하는 시간. KBO 서버가 응답을 멈추면 동기화 잠금이 풀리지 않아
 * 이후 모든 동기화가 막히므로 반드시 끊는다.
 */
export const KBO_REQUEST_TIMEOUT_MS = 20_000;

type KboTextResponse = {
  text: string;
  headers: Headers;
  status: number;
};

function getKboUserAgents() {
  return Array.from(
    new Set(
      [env.kboSync.userAgent, ...DEFAULT_KBO_USER_AGENTS].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );
}

function shouldTryCompatibilityProfile(response: Response, text: string) {
  return response.status === 204 || !text.trim();
}

function buildKboHeaders(init: RequestInit | undefined, userAgent: string) {
  const headers = new Headers(init?.headers);
  headers.set('User-Agent', userAgent);

  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7');
  }

  return headers;
}

export async function fetchKboText(
  url: string,
  init: RequestInit | undefined,
  label: string,
): Promise<KboTextResponse> {
  const userAgents = getKboUserAgents();
  let lastFailure = `${label} 요청 실패`;

  for (let index = 0; index < userAgents.length; index += 1) {
    const timeoutSignal = AbortSignal.timeout(KBO_REQUEST_TIMEOUT_MS);
    let response: Response;
    let text: string;

    try {
      response = await fetch(url, {
        ...init,
        headers: buildKboHeaders(init, userAgents[index]),
        signal: init?.signal
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal,
      });
      text = await response.text();
    } catch (error) {
      if (timeoutSignal.aborted) {
        throw new Error(
          `${label} 요청 시간 초과 (${KBO_REQUEST_TIMEOUT_MS / 1000}초)`,
        );
      }

      throw error;
    }

    if (response.ok && response.status !== 204 && text.trim()) {
      return {
        text,
        headers: response.headers,
        status: response.status,
      };
    }

    const detail =
      response.status === 204 || !text.trim()
        ? `${response.status} 빈 응답`
        : `${response.status} ${response.statusText}`.trim();
    lastFailure = `${label} 요청 실패 (${detail})`;

    const hasNextProfile = index + 1 < userAgents.length;
    if (!hasNextProfile || !shouldTryCompatibilityProfile(response, text)) {
      break;
    }

    console.warn(
      `[kbo-http] ${label} ${detail} — 호환 프로필 ${index + 2}/${userAgents.length}로 재시도`,
    );
  }

  throw new Error(lastFailure);
}

export async function fetchKboJson<T>(
  url: string,
  init: RequestInit | undefined,
  label: string,
): Promise<T> {
  const response = await fetchKboText(url, init, label);

  try {
    return JSON.parse(response.text) as T;
  } catch {
    throw new Error(`${label} 응답이 올바른 JSON이 아닙니다.`);
  }
}
