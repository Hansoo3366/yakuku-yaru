'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { listPosts, type PostListItem } from '@/lib/post-api';
import { getAccessToken } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';

export default function PostsPage() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    listPosts({ page, keyword: appliedKeyword }).then((response) => {
      setPosts(response.items);
      setTotalPages(Math.max(response.totalPages, 1));
    });
  }, [appliedKeyword, page]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  return (
    <main className="app-shell with-bottom-nav">
      <header className="app-header">
        <div>
          <Link className="back-link" href="/">
            Yakuku Yaru
          </Link>
          <h1>직관 후기 게시판</h1>
          <p>경기장에서 남긴 이야기를 모아봅니다.</p>
        </div>
        {hasToken ? (
          <Link className="solid-link" href="/posts/new">
            글쓰기
          </Link>
        ) : (
          <Link className="solid-link" href="/login">
            로그인
          </Link>
        )}
      </header>

      <form className="search-row" onSubmit={handleSearch}>
        <input
          aria-label="게시글 검색어"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="제목이나 본문 검색"
          value={keyword}
        />
        <button type="submit">검색</button>
      </form>

      <section className="list-panel">
        {posts.length ? (
          posts.map((post) => (
            <Link className="post-row" href={`/posts/${post.id}`} key={post.id}>
              <strong>{post.title}</strong>
              <span>
                {post.authorNickname} ·{' '}
                {new Date(post.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </Link>
          ))
        ) : (
          <p className="empty-text">아직 작성된 후기가 없습니다.</p>
        )}
      </section>

      <nav className="pagination" aria-label="게시글 페이지">
        <button
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
          disabled={page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          다음
        </button>
      </nav>
      <BottomNav />
    </main>
  );
}
