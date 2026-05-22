'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { listPosts, type PostListItem } from '@/lib/post-api';
import { getAccessToken } from '@/lib/auth';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeleton';

export default function PostsPage() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasToken(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    listPosts({ page, keyword: appliedKeyword })
      .then((response) => {
        setPosts(response.items);
        setTotalPages(Math.max(response.totalPages, 1));
      })
      .finally(() => setIsLoading(false));
  }, [appliedKeyword, page]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  return (
    <main className="app-shell">
      <header className="app-page-header">
        <span className="eyebrow">Board</span>
        <h1>직관 후기 게시판</h1>
        <p>경기장에서 남긴 이야기와 직관 팁을 함께 나눠요.</p>
      </header>

      <div
        style={{
          alignItems: 'center',
          display: 'grid',
          gap: 'var(--space-2)',
          gridTemplateColumns: '1fr auto',
        }}
      >
        <form className="search-row" onSubmit={handleSearch}>
          <input
            aria-label="게시글 검색어"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="제목이나 본문 검색"
            value={keyword}
          />
          <button className="btn btn-secondary" type="submit">
            검색
          </button>
        </form>
        {hasToken ? (
          <Link className="btn btn-primary" href="/posts/new">
            글쓰기
          </Link>
        ) : (
          <Link className="btn btn-ghost" href="/login">
            로그인
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="post-list">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : posts.length ? (
        <section className="post-list" aria-label="게시글 목록">
          {posts.map((post) => (
            <Link className="post-card" href={`/posts/${post.id}`} key={post.id}>
              <span className="post-card-title">{post.title}</span>
              <span className="post-card-meta">
                {post.authorNickname} ·{' '}
                {new Date(post.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <EmptyState
          icon="✎"
          title={appliedKeyword ? '검색 결과가 없어요' : '아직 작성된 후기가 없어요'}
          description={
            appliedKeyword
              ? '다른 키워드로 다시 시도해보세요.'
              : '첫 후기를 남기고 다른 팬들과 공유해보세요.'
          }
          action={
            hasToken ? (
              <Link className="btn btn-primary btn-sm" href="/posts/new">
                후기 작성하기
              </Link>
            ) : null
          }
        />
      )}

      {posts.length ? (
        <nav className="pagination" aria-label="게시글 페이지">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            type="button"
          >
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            다음
          </button>
        </nav>
      ) : null}
    </main>
  );
}
