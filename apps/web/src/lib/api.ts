const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const ASSET_URL = API_URL.replace(/\/api\/?$/, '');

export type ApiErrorResponse = {
  code: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers();

  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: '요청 처리 중 오류가 발생했습니다.',
    }))) as ApiErrorResponse;

    throw new ApiError(response.status, error.code, error.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function getAssetUrl(path: string | null) {
  if (!path) {
    return '';
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${ASSET_URL}${path}`;
}
