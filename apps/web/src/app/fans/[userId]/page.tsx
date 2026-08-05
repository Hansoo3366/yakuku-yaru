'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { AdminBadge } from '@/components/AdminBadge';
import { EmptyState } from '@/components/EmptyState';
import { FanFollowButton } from '@/components/FanFollowButton';
import { ReportButton } from '@/components/ReportButton';
import { Skeleton } from '@/components/Skeleton';
import { useAuthStore } from '@/lib/auth-store';
import { formatKoreanDateShort } from '@/lib/date-format';
import { getAuthorProfileImageSrc } from '@/lib/profile-image';
import { normalizeTeamColor } from '@/lib/team-color';
import { useFanProfileQuery } from '@/lib/queries';
import styles from '../fans.module.css';

export default function FanProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);
  const token = useAuthStore((state) => state.token);
  const profileQuery = useFanProfileQuery(userId, token);
  const fan = profileQuery.data?.fan ?? null;

  if (profileQuery.isLoading) {
    return (
      <main className={`app-shell ${styles.page}`}>
        <Skeleton height={280} radius={0} />
        <Skeleton height={120} radius={0} />
        <Skeleton height={180} radius={0} />
      </main>
    );
  }

  if (profileQuery.isError || !fan) {
    return (
      <main className={`app-shell ${styles.page}`}>
        <Link className={styles.profileBack} href="/fans">
          ← 팬 찾기
        </Link>
        <div className={styles.empty}>
          <EmptyState
            icon="!"
            title="팬 프로필을 찾을 수 없어요"
            description="삭제되었거나 존재하지 않는 프로필입니다."
          />
        </div>
      </main>
    );
  }

  const teamColor = normalizeTeamColor(
    fan.favoriteTeam?.primaryColor,
    '#111111',
  );

  return (
    <main className={`app-shell with-bottom-nav ${styles.page}`}>
      <Link className={styles.profileBack} href="/fans">
        ← 팬 찾기
      </Link>

      <header
        className={styles.profileHero}
        style={{ '--fan-profile-color': teamColor } as CSSProperties}
      >
        <div className={styles.profileIdentity}>
          <img
            alt={`${fan.nickname} 프로필`}
            className={styles.profileAvatar}
            src={getAuthorProfileImageSrc(
              fan.profileImageUrl,
              fan.favoriteTeam?.shortName,
            )}
          />
          <div>
            <span className={styles.eyebrow}>Fan profile</span>
            <div className={styles.profileNameRow}>
              <h1>{fan.nickname}</h1>
              {fan.role === 'admin' ? <AdminBadge inverse /> : null}
            </div>
            <p>
              {fan.favoriteTeam
                ? `${fan.favoriteTeam.name} 팬`
                : '응원팀을 고르는 중인 야구팬'}
              {fan.stats.title ? ` · ${fan.stats.title}` : ''}
            </p>
          </div>
        </div>

        <div className={styles.profileActions}>
          <div className={styles.followNumbers}>
            <span>
              팔로워 <strong>{fan.followerCount}</strong>
            </span>
            <span>
              팔로잉 <strong>{fan.followingCount}</strong>
            </span>
          </div>
          {fan.isSelf ? (
            <Link className={styles.editProfile} href="/me">
              내 프로필 관리
            </Link>
          ) : (
            <>
              <FanFollowButton
                initialFollowerCount={fan.followerCount}
                initialIsFollowing={fan.isFollowing}
                userId={fan.id}
              />
              <ReportButton targetId={fan.id} targetType="user" />
            </>
          )}
          {fan.sharedAttendanceCount > 0 ? (
            <div className={styles.sharedNote}>
              나와 {fan.sharedAttendanceCount}경기를 함께 봤어요
            </div>
          ) : null}
        </div>
      </header>

      <div className={styles.profileBody}>
        <section className={styles.scoreboard} aria-label="시즌 관람 기록">
          <div>
            <span>전체 관람</span>
            <strong>{fan.stats.totalCount}</strong>
          </div>
          <div>
            <span>직관</span>
            <strong>{fan.stats.stadiumCount}</strong>
          </div>
          <div>
            <span>집관</span>
            <strong>{fan.stats.homeCount}</strong>
          </div>
          <div>
            <span>시즌 승률</span>
            <strong>{fan.stats.winRate}%</strong>
          </div>
        </section>

        {fan.stats.titles.length ? (
          <section>
            <div className={styles.sectionHead}>
              <h2>직관 타이틀</h2>
              <span>{fan.stats.titles.length}개</span>
            </div>
            <div className={styles.titleList}>
              {fan.stats.titles.slice(0, 5).map((title) => (
                <div className={styles.titleItem} key={title.key}>
                  <strong>{title.label}</strong>
                  <span>{title.description}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className={styles.sectionHead}>
            <h2>최근 이야기</h2>
            <Link href="/posts">팬 라운지 보기</Link>
          </div>
          {fan.recentPosts.length ? (
            <div className={styles.postList}>
              {fan.recentPosts.map((post) => (
                <Link
                  className={styles.postItem}
                  href={`/posts/${post.id}`}
                  key={post.id}
                >
                  <div>
                    <strong>{post.title}</strong>
                    <span>{formatKoreanDateShort(post.createdAt)}</span>
                  </div>
                  <em>댓글 {post.commentCount}</em>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <EmptyState
                icon="✎"
                title="아직 공개한 이야기가 없어요"
                description="이 팬이 글을 남기면 여기에서 이어서 볼 수 있어요."
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
