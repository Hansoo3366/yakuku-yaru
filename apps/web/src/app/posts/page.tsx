'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { usePostsQuery } from '@/lib/queries';
import { useMediaQuery } from '@/lib/use-media-query';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeleton';

export default function PostsPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const token = useAuthStore((state) => state.token);
  const postsQuery = usePostsQuery({ page, keyword: appliedKeyword });
  const posts = postsQuery.data?.items ?? [];
  const totalPages = Math.max(postsQuery.data?.totalPages ?? 1, 1);
  const hasToken = Boolean(token);
  const isLoading = postsQuery.isLoading;
  const isMobile = useMediaQuery('(max-width: 720px)');

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  return (
    <main className="app-shell app-shell--posts with-bottom-nav">
      <section className="post-surface" aria-label="직관 후기 게시판">
        <header className="app-page-header">
          <span className="eyebrow">Board</span>
          <h1>직관 후기 게시판</h1>
          <p>경기장에서 남긴 이야기와 직관 팁을 함께 나눠요.</p>
        </header>

        <div className="post-toolbar">
          <form className="post-search-form" onSubmit={handleSearch}>
            <input
              aria-label="게시글 검색어"
              className="post-search-input"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="제목이나 본문 검색"
              value={keyword}
            />
            <button className="post-toolbar-btn post-toolbar-btn-search" type="submit">
              검색
            </button>
          </form>
          <div className="post-toolbar-actions">
            {!isMobile && hasToken ? (
              <Link className="post-toolbar-btn post-toolbar-btn-primary" href="/posts/new">
                글쓰기
              </Link>
            ) : null}
            {!hasToken ? (
              <Link className="post-toolbar-btn post-toolbar-btn-ghost" href="/login">
                로그인
              </Link>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="post-list">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : posts.length ? (
          <section className="post-list post-list--plain" aria-label="게시글 목록">
            {posts.map((post) => (
              <Link className="post-row" href={`/posts/${post.id}`} key={post.id}>
                <span className="post-row-main">
                  <span className="post-row-title">{post.title}</span>
                  <span className="post-row-meta">
                    <span className="post-row-author">{post.authorNickname}</span>
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </span>
                <span className="post-row-comments">댓글 {post.commentCount}</span>
              </Link>
            ))}
          </section>
        ) : (
          <EmptyState
            icon="✎"
            title={
              appliedKeyword ? '검색 결과가 없어요' : '아직 작성된 후기가 없어요'
            }
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
          <nav className="post-pagination" aria-label="게시글 페이지">
            <button
              className="post-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              type="button"
            >
              이전
            </button>
            <span className="post-page-indicator">
              {page} / {totalPages}
            </span>
            <button
              className="post-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              다음
            </button>
          </nav>
        ) : null}
      </section>

      {isMobile && hasToken ? (
        <Link aria-label="게시글 작성" className="post-write-fab" href="/posts/new">
          글쓰기
        </Link>
      ) : null}
    </main>
  );
}
