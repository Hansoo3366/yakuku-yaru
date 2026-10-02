import { QuerySeed } from '@/components/QuerySeed';
import type { PostListResponse } from '@/lib/post-api';
import { queryKeys } from '@/lib/query-keys';
import { requestPublic } from '@/lib/server-baseball-api';
import PostsPageClient from './PostsPageClient';

/** 비로그인 첫 화면(최신 글 1쪽)을 서버에서 먼저 받아 첫 HTML 에 담는다. */
export default async function PostsPage() {
  const posts = await requestPublic<PostListResponse>(
    '/posts?page=1&size=10',
    60,
  );

  return (
    <QuerySeed
      entries={[
        {
          queryKey: queryKeys.posts({ page: 1, keyword: '', scope: 'latest' }),
          data: posts,
        },
      ]}
    >
      <PostsPageClient />
    </QuerySeed>
  );
}
