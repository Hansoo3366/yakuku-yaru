'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AdminBadge } from '@/components/AdminBadge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useAuthStore } from '@/lib/auth-store';
import { formatKoreanDateShort } from '@/lib/date-format';
import { usePostsQuery } from '@/lib/queries';
import type { PostCategory } from '@/lib/post-api';
import { FEATURE_STATUS_LABELS, POST_CATEGORY_LABELS } from '@/lib/post-meta';
import styles from './posts.module.css';

const LOADING_ROWS = Array.from({ length: 6 }, (_, index) => index);
const CATEGORY_FILTERS: Array<[PostCategory | 'all', string]> = [
  ['all', '전체'],
  ['notice', '공지'],
  ['review', '직관 후기'],
  ['free', '자유'],
  ['info', '정보'],
  ['feature', '기능 개선'],
];

export default function PostsPage() {
  const router = useRouter();
  const seasonYear = new Date().getFullYear();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [scope, setScope] = useState<'latest' | 'myTeam' | 'following'>(
    'latest',
  );
  const [category, setCategory] = useState<PostCategory | 'all'>('all');
  const token = useAuthStore((state) => state.token);
  const postsQuery = usePostsQuery({
    page,
    keyword: appliedKeyword,
    scope,
    category: category === 'all' ? undefined : category,
    token,
  });
  const posts = postsQuery.data?.items ?? [];
  const totalPosts = postsQuery.data?.total ?? 0;
  const totalPages = Math.max(postsQuery.data?.totalPages ?? 1, 1);
  const hasToken = Boolean(token);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  function clearSearch() {
    setKeyword('');
    setAppliedKeyword('');
    setPage(1);
  }

  function selectScope(nextScope: 'latest' | 'myTeam' | 'following') {
    if (nextScope !== 'latest' && !token) {
      router.push('/login');
      return;
    }

    setScope(nextScope);
    setPage(1);
  }

  function selectCategory(nextCategory: PostCategory | 'all') {
    setCategory(nextCategory);
    setPage(1);
  }

  const feedLabel =
    scope === 'myTeam'
      ? '내 팀 이야기'
      : scope === 'following'
        ? '팔로잉 이야기'
        : '최신 이야기';

  return (
    <main className={`app-shell with-bottom-nav ${styles.page}`}>
      <section className={styles.board} aria-labelledby="posts-title">
        <nav className={styles.sectionNav} aria-label="팬 커뮤니티 메뉴">
          <Link aria-current="page" className={styles.sectionNavActive} href="/posts">
            팬 라운지
          </Link>
          <Link href="/fans">팬 찾기</Link>
        </nav>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>
              Fan board · {seasonYear} season
            </span>
            <h1 id="posts-title">
              야구 본 이야기를
              <br />
              나누는 곳
            </h1>
            <p>좌석 시야부터 원정 팁까지, 직접 보고 겪은 기록을 남겨요.</p>
          </div>

          <div className={styles.heroAside}>
            <span>쌓인 이야기</span>
            <strong>{postsQuery.isLoading ? '—' : totalPosts}</strong>
            <small>개의 팬 이야기</small>
            {hasToken ? (
              <Link className={styles.writeButton} href="/posts/new">
                글쓰기 <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <Link className={styles.loginButton} href="/login">
                로그인하고 글쓰기
              </Link>
            )}
          </div>
        </header>

        <div className={styles.controlBar}>
          <div className={styles.listIntro}>
            <div>
              <strong>{appliedKeyword ? '검색 결과' : feedLabel}</strong>
              <p>
                {appliedKeyword
                  ? `“${appliedKeyword}”에 대한 게시글입니다.`
                  : scope === 'myTeam'
                    ? '나와 같은 팀을 응원하는 팬들의 글이에요.'
                    : scope === 'following'
                      ? '내가 팔로우한 팬들의 최근 글이에요.'
                      : '팬들이 최근에 남긴 야구장 이야기를 모았어요.'}
              </p>
            </div>
          </div>

          <form className={styles.search} onSubmit={handleSearch} role="search">
            <label className="sr-only" htmlFor="post-search">
              게시글 검색
            </label>
            <span aria-hidden="true" className={styles.searchIcon}>
              ⌕
            </span>
            <input
              autoComplete="off"
              id="post-search"
              name="keyword"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="제목이나 본문 검색…"
              value={keyword}
            />
            {appliedKeyword ? (
              <button
                aria-label="검색어 지우기"
                className={styles.clearButton}
                onClick={clearSearch}
                type="button"
              >
                ×
              </button>
            ) : null}
            <button className={styles.searchButton} type="submit">
              검색
            </button>
          </form>
        </div>

        <div className={styles.feedTabs} role="tablist" aria-label="글 피드 선택">
          {(
            [
              ['latest', '최신'],
              ['myTeam', '내 팀'],
              ['following', '팔로잉'],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-selected={scope === value}
              className={scope === value ? styles.feedTabActive : ''}
              key={value}
              onClick={() => selectScope(value)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.categoryTabs} aria-label="글 종류 선택">
          {CATEGORY_FILTERS.map(([value, label]) => (
            <button
              aria-pressed={category === value}
              className={category === value ? styles.categoryTabActive : ''}
              key={value}
              onClick={() => selectCategory(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {postsQuery.isLoading ? (
          <div className={styles.postList} aria-label="게시글 불러오는 중">
            {LOADING_ROWS.map((row) => (
              <div className={styles.loadingRow} key={row}>
                <Skeleton height={14} width={52} />
                <div>
                  <Skeleton height={18} width="70%" />
                  <Skeleton height={12} width={120} />
                </div>
                <Skeleton height={14} width={46} />
              </div>
            ))}
          </div>
        ) : postsQuery.isError ? (
          <div className={styles.emptyWrap}>
            <EmptyState
              icon="!"
              title="게시글을 불러오지 못했어요"
              description="연결을 확인한 뒤 다시 불러와 주세요."
              action={
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => postsQuery.refetch()}
                  type="button"
                >
                  다시 불러오기
                </button>
              }
            />
          </div>
        ) : posts.length ? (
          <section className={styles.postList} aria-label="게시글 목록">
            <div className={styles.listHeader} aria-hidden="true">
              <span>No.</span>
              <span>이야기</span>
              <span>댓글</span>
            </div>
            {posts.map((post) => (
              <article
                className={styles.postRow}
                key={post.id}
              >
                <span className={styles.postNumber}>
                  {String(post.id).padStart(3, '0')}
                </span>
                <span className={styles.postMain}>
                  <span className={styles.postTitleLine}>
                    <span
                      className={`${styles.categoryBadge} ${
                        post.category === 'notice' ? styles.noticeBadge : ''
                      }`}
                    >
                      {post.isPinned ? '고정 · ' : ''}
                      {POST_CATEGORY_LABELS[post.category]}
                    </span>
                    <Link className={styles.postTitle} href={`/posts/${post.id}`}>
                      {post.title}
                    </Link>
                  </span>
                  <span className={styles.postMeta}>
                    {post.requestStatus ? (
                      <span className={styles.requestStatus}>
                        {FEATURE_STATUS_LABELS[post.requestStatus]}
                      </span>
                    ) : null}
                    {post.authorFavoriteTeamShortName ? (
                      <span className={styles.teamTag}>
                        {post.authorFavoriteTeamShortName}
                      </span>
                    ) : null}
                    <Link className={styles.author} href={`/fans/${post.userId}`}>
                      {post.authorNickname}
                    </Link>
                    {post.authorRole === 'admin' ? <AdminBadge /> : null}
                    <time dateTime={post.createdAt}>
                      {formatKoreanDateShort(post.createdAt)}
                    </time>
                  </span>
                </span>
                <Link
                  aria-label={`${post.title} 댓글 ${post.commentCount}개 보기`}
                  className={styles.commentCount}
                  href={`/posts/${post.id}`}
                >
                  <span aria-hidden="true">↳</span>
                  <span className="sr-only">댓글</span>
                  {post.commentCount}
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <div className={styles.emptyWrap}>
            <EmptyState
              icon="✎"
              title={
                appliedKeyword
                  ? '검색 결과가 없어요'
                  : scope === 'following'
                    ? '팔로잉 피드가 비어 있어요'
                    : scope === 'myTeam'
                      ? '내 팀 팬의 글이 아직 없어요'
                      : '아직 작성된 글이 없어요'
              }
              description={
                appliedKeyword
                  ? '검색어를 줄이거나 다른 단어로 찾아보세요.'
                  : scope === 'following'
                    ? '팬 찾기에서 마음에 드는 팬을 팔로우해보세요.'
                  : '첫 글을 남기고 다른 팬들과 이야기를 나눠보세요.'
              }
              action={
                scope === 'following' ? (
                  <Link className="btn btn-primary btn-sm" href="/fans">
                    팬 찾기
                  </Link>
                ) : hasToken ? (
                  <Link className="btn btn-primary btn-sm" href="/posts/new">
                    글쓰기
                  </Link>
                ) : null
              }
            />
          </div>
        )}

        {posts.length ? (
          <nav className={styles.pagination} aria-label="게시글 페이지">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              type="button"
            >
              <span aria-hidden="true">←</span> 이전
            </button>
            <span className={styles.pageIndicator}>
              <strong>{String(page).padStart(2, '0')}</strong>
              <span>/ {String(totalPages).padStart(2, '0')}</span>
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              다음 <span aria-hidden="true">→</span>
            </button>
          </nav>
        ) : null}

        <aside className={styles.bottomWriteCta}>
          <div>
            <span>YOUR TURN</span>
            <strong>이번에는 어떤 야구 이야기를 남겨볼까요?</strong>
            <p>후기, 구장 정보, 자유로운 이야기와 기능 제안을 기다리고 있어요.</p>
          </div>
          <Link href={hasToken ? '/posts/new' : '/login'}>
            {hasToken ? '새 글 쓰기' : '로그인하고 글쓰기'}
            <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </section>

      {hasToken ? (
        <Link
          aria-label="게시글 작성"
          className={styles.mobileWriteButton}
          href="/posts/new"
        >
          <span aria-hidden="true">＋</span> 글쓰기
        </Link>
      ) : null}
    </main>
  );
}
