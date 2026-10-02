import type { MetadataRoute } from 'next';
import { getAbsoluteUrl, getSiteUrl } from '@/lib/site-url';

/** 로그인해야 쓸 수 있거나 개인 기록이라 수집 대상이 아닌 경로 */
const PRIVATE_PATHS = [
  '/admin',
  '/attendance',
  '/forgot-password',
  '/login',
  '/me',
  '/offline',
  '/posts/new',
  '/posts/*/edit',
  '/presentation',
  '/register',
  '/reset-password',
  '/verify-email',
];

/**
 * 검색·답변에 이 사이트의 공개 데이터를 써도 되는 AI 크롤러.
 * 기본 규칙(*)만으로도 허용되지만, 의도를 분명히 하려고 이름을 적어 둔다.
 * (이름이 적힌 봇은 * 규칙을 따르지 않으므로 같은 제외 경로를 다시 적는다)
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: getAbsoluteUrl('/sitemap.xml'),
    host: getSiteUrl(),
  };
}
