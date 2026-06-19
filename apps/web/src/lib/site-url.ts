export const DEFAULT_SITE_URL = 'https://yakuku-yaru.today';

export function getSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

  return rawUrl.replace(/\/+$/, '');
}

export function getAbsoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${getSiteUrl()}${normalizedPath}`;
}
