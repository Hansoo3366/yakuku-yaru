import { HttpError } from './http-error.js';

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:']);

export function normalizeExternalHttpUrl(
  value: unknown,
  label = '외부 링크',
) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'INVALID_INPUT', `${label} 형식이 올바르지 않습니다.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new HttpError(400, 'INVALID_INPUT', `${label} 형식이 올바르지 않습니다.`);
  }

  if (
    !ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password
  ) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      `${label}는 사용자 정보가 없는 HTTPS 주소만 사용할 수 있습니다.`,
    );
  }

  return url.toString();
}
