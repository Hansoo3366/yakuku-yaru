'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { formatTimeAgo } from '@/lib/date-format';
import { useStadiumsQuery, useTeamsQuery } from '@/lib/queries';
import { getStadiumColorStyle, getStadiumHomeTeams } from '@/lib/stadium-teams';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { getStadiumPath } from '@/lib/stadium-note-api';
import styles from './stadiums.module.css';

const LOADING_ITEMS = Array.from({ length: 6 }, (_, index) => index);

export default function StadiumsPage() {
  const stadiumsQuery = useStadiumsQuery();
  const teams = useTeamsQuery().data?.items ?? [];
  const stadiums = stadiumsQuery.data?.items ?? [];
  const totalNotes = stadiums.reduce(
    (sum, stadium) => sum + stadium.publicNoteCount,
    0,
  );

  return (
    <main className={`app-shell with-bottom-nav ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>구장 가이드</span>
          <h1>구장 정보</h1>
          <p>
            팬들이 직접 남긴 맛집·주차·교통 메모를 구장별로 모아 봤어요. 경기
            상세나 구장 페이지에서 내 메모를 남기면 여기에 함께 보여요.
          </p>
        </div>
        <div
          className={styles.heroCount}
          aria-label={`팬 메모 ${totalNotes}개`}
        >
          <strong>{stadiumsQuery.isLoading ? '—' : totalNotes}</strong>
          <span>개의 팬 메모</span>
        </div>
      </header>

      {stadiumsQuery.isError ? (
        <div className={styles.empty}>
          <EmptyState
            icon="!"
            title="구장 목록을 불러오지 못했어요"
            description="연결을 확인한 뒤 다시 불러와 주세요."
            action={
              <button
                className="btn btn-primary btn-sm"
                onClick={() => stadiumsQuery.refetch()}
                type="button"
              >
                다시 불러오기
              </button>
            }
          />
        </div>
      ) : null}

      <section className={styles.grid} aria-label="구장 목록">
        {stadiumsQuery.isLoading
          ? LOADING_ITEMS.map((item) => (
              <div className={styles.card} key={item}>
                <Skeleton height={20} width="60%" />
                <Skeleton height={48} width="100%" />
              </div>
            ))
          : null}

        {stadiums.map((stadium) => {
          const homeTeams = getStadiumHomeTeams(stadium.stadium, teams);

          return (
            <Link
              className={styles.card}
              href={getStadiumPath(stadium.stadium)}
              key={stadium.stadium}
              style={getStadiumColorStyle(homeTeams)}
            >
              <div className={styles.cardHead}>
                <h2>{stadium.stadium}</h2>
                {homeTeams.length ? (
                  <span className={styles.teamLogos}>
                    {homeTeams.map((team) => (
                      <img
                        alt={team.name}
                        key={team.id}
                        src={getTeamLogoSrc(team)}
                      />
                    ))}
                  </span>
                ) : null}
              </div>
              <p>
                {stadium.foodSummary ??
                  '아직 기본 안내가 없어요. 팬 메모를 확인해보세요.'}
              </p>
              <div className={styles.cardMeta}>
                <span>
                  팬 메모 <strong>{stadium.publicNoteCount}</strong>개
                </span>
                {stadium.lastNoteAt ? (
                  <span>최근 {formatTimeAgo(stadium.lastNoteAt)}</span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
