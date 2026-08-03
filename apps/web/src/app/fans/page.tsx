'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { FormEvent, useState, type CSSProperties } from 'react';
import { AdminBadge } from '@/components/AdminBadge';
import { EmptyState } from '@/components/EmptyState';
import { FanFollowButton } from '@/components/FanFollowButton';
import { Skeleton } from '@/components/Skeleton';
import { useAuthStore } from '@/lib/auth-store';
import { getAuthorProfileImageSrc } from '@/lib/profile-image';
import { useFansQuery, useTeamsQuery } from '@/lib/queries';
import styles from './fans.module.css';

const LOADING_ITEMS = Array.from({ length: 6 }, (_, index) => index);

export default function FansPage() {
  const token = useAuthStore((state) => state.token);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const teamsQuery = useTeamsQuery();
  const fansQuery = useFansQuery(
    { keyword: appliedKeyword, teamId, page },
    token,
  );
  const fans = fansQuery.data?.items ?? [];
  const total = fansQuery.data?.total ?? 0;
  const totalPages = Math.max(fansQuery.data?.totalPages ?? 1, 1);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedKeyword(keyword.trim());
    setPage(1);
  }

  function selectTeam(nextTeamId: number | null) {
    setTeamId(nextTeamId);
    setPage(1);
  }

  return (
    <main className={`app-shell with-bottom-nav ${styles.page}`}>
      <nav className={styles.sectionNav} aria-label="팬 커뮤니티 메뉴">
        <Link href="/posts">팬 라운지</Link>
        <Link
          aria-current="page"
          className={styles.sectionNavActive}
          href="/fans"
        >
          팬 찾기
        </Link>
      </nav>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Fan directory</span>
          <h1>같이 응원할 팬을 찾으세요</h1>
          <p>
            같은 팀을 응원하거나 같은 야구장에 다녀온 팬을 발견하고,
            다음 이야기도 이어서 볼 수 있어요.
          </p>
        </div>
        <div className={styles.heroCount} aria-label={`팬 ${total}명`}>
          <strong>{fansQuery.isLoading ? '—' : total}</strong>
          <span>FANS</span>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="팬 검색과 필터">
        <div className={styles.toolbarTop}>
          <div className={styles.toolbarTitle}>
            <strong>{appliedKeyword || teamId ? '찾은 팬' : '최근 활동한 팬'}</strong>
            <span>응원팀과 직관 기록을 기준으로 팬을 둘러보세요.</span>
          </div>
          <form className={styles.search} onSubmit={handleSearch} role="search">
            <label className="sr-only" htmlFor="fan-search">
              팬 닉네임 검색
            </label>
            <input
              id="fan-search"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="닉네임으로 팬 찾기"
              value={keyword}
            />
            <button type="submit">검색</button>
          </form>
        </div>
        <div className={styles.teamFilters} aria-label="응원팀으로 필터">
          <button
            className={`${styles.teamFilter}${teamId === null ? ` ${styles.isActive}` : ''}`}
            onClick={() => selectTeam(null)}
            type="button"
          >
            전체
          </button>
          {(teamsQuery.data?.items ?? []).map((team) => (
            <button
              className={`${styles.teamFilter}${teamId === team.id ? ` ${styles.isActive}` : ''}`}
              key={team.id}
              onClick={() => selectTeam(team.id)}
              type="button"
            >
              {team.shortName}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.fanGrid} aria-label="팬 목록">
        {fansQuery.isLoading
          ? LOADING_ITEMS.map((item) => (
              <div className={styles.loadingCard} key={item}>
                <Skeleton height={48} width={48} radius={14} />
              </div>
            ))
          : null}

        {!fansQuery.isLoading && fansQuery.isError ? (
          <div className={styles.empty}>
            <EmptyState
              icon="!"
              title="팬 목록을 불러오지 못했어요"
              description="연결을 확인한 뒤 다시 불러와 주세요."
              action={
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => fansQuery.refetch()}
                  type="button"
                >
                  다시 불러오기
                </button>
              }
            />
          </div>
        ) : null}

        {!fansQuery.isLoading && !fansQuery.isError && !fans.length ? (
          <div className={styles.empty}>
            <EmptyState
              icon="⌕"
              title="조건에 맞는 팬이 없어요"
              description="응원팀 필터를 바꾸거나 닉네임을 다시 검색해보세요."
            />
          </div>
        ) : null}

        {fans.map((fan) => (
          <article
            className={styles.fanCard}
            key={fan.id}
            style={
              {
                '--fan-card-color': fan.favoriteTeam?.primaryColor ?? '#111111',
              } as CSSProperties
            }
          >
            <div className={styles.fanCardHead}>
              <img
                alt={`${fan.nickname} 프로필`}
                className={styles.avatar}
                src={getAuthorProfileImageSrc(
                  fan.profileImageUrl,
                  fan.favoriteTeam?.shortName,
                )}
              />
              <div className={styles.identity}>
                <div className={styles.identityName}>
                  <strong>{fan.nickname}</strong>
                  {fan.role === 'admin' ? <AdminBadge /> : null}
                </div>
                <span>{fan.favoriteTeam?.shortName ?? '응원팀 미선택'}</span>
              </div>
              <FanFollowButton
                compact
                initialFollowerCount={fan.followerCount}
                initialIsFollowing={fan.isFollowing}
                isSelf={fan.isSelf}
                userId={fan.id}
              />
            </div>
            <div className={styles.cardStats}>
              <div>
                <span>시즌 직관</span>
                <strong>{fan.stadiumCount}</strong>
              </div>
              <div>
                <span>직관 인연</span>
                <strong>{fan.connectionCount}</strong>
              </div>
              <div>
                <span>작성글</span>
                <strong>{fan.postCount}</strong>
              </div>
            </div>
            <Link className={styles.cardLink} href={`/fans/${fan.id}`}>
              프로필 보기 →
            </Link>
          </article>
        ))}
      </section>

      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="팬 목록 페이지">
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            ← 이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            다음 →
          </button>
        </nav>
      ) : null}
    </main>
  );
}
