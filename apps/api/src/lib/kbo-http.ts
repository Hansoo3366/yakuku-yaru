import { env } from '../config/env.js';

const DEFAULT_KBO_USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
] as const;

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
    const response = await fetch(url, {
      ...init,
      headers: buildKboHeaders(init, userAgents[index]),
    });
    const text = await response.text();

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
