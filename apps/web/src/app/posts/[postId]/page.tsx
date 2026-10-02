import type { Metadata } from 'next';
import { QuerySeed } from '@/components/QuerySeed';
import type { CommentItem, PostDetail } from '@/lib/post-api';
import { POST_CATEGORY_LABELS } from '@/lib/post-meta';
import { queryKeys } from '@/lib/query-keys';
import { requestPublic } from '@/lib/server-baseball-api';
import { getAbsoluteUrl } from '@/lib/site-url';
import PostDetailPageClient from './PostDetailPageClient';

type PostPageProps = {
  params: Promise<{ postId: string }>;
};

function parsePostId(value: string) {
  const postId = Number(value);

  return Number.isInteger(postId) && postId > 0 ? postId : null;
}

async function fetchPublicPost(postId: number) {
  const response = await requestPublic<{ post: PostDetail }>(
    `/posts/${postId}`,
    60,
  );

  return response?.post ?? null;
}

/** 본문에서 줄바꿈·연속 공백을 정리해 미리보기 문장으로 만든다. */
function summarize(content: string, maxLength = 150) {
  const text = content.replace(/\s+/g, ' ').trim();

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { postId: rawPostId } = await params;
  const postId = parsePostId(rawPostId);
  const post = postId ? await fetchPublicPost(postId) : null;

  if (!post) {
    return { title: '팬 라운지' };
  }

  const description = summarize(post.content);
  const canonical = `/posts/${post.id}`;

  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: post.title,
      description,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
    },
  };
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const { postId: rawPostId } = await params;
  const postId = parsePostId(rawPostId);
  const [post, comments] = postId
    ? await Promise.all([
        fetchPublicPost(postId),
        requestPublic<{ items: CommentItem[] }>(
          `/posts/${postId}/comments`,
          60,
        ),
      ])
    : [null, null];
  const jsonLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        headline: post.title,
        articleSection: POST_CATEGORY_LABELS[post.category],
        text: post.content,
        url: getAbsoluteUrl(`/posts/${post.id}`),
        datePublished: post.createdAt,
        dateModified: post.updatedAt,
        author: { '@type': 'Person', name: post.authorNickname },
        commentCount: post.commentCount,
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
          type="application/ld+json"
        />
      ) : null}
      <QuerySeed
        entries={
          postId
            ? [
                {
                  queryKey: queryKeys.post(postId),
                  data: post ? { post } : null,
                },
                { queryKey: queryKeys.comments(postId), data: comments },
              ]
            : []
        }
      >
        <PostDetailPageClient />
      </QuerySeed>
    </>
  );
}
