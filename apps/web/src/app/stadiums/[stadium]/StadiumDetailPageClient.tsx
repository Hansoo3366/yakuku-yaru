'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminBadge } from '@/components/AdminBadge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeleton';
import { StadiumPersonalNotes } from '@/components/StadiumPersonalNotes';
import { StadiumSeatMapViewer } from '@/components/StadiumSeatMapViewer';
import { ApiError } from '@/lib/api';
import { formatTimeAgo } from '@/lib/date-format';
import { getAuthorProfileImageSrc } from '@/lib/profile-image';
import { useStadiumQuery, useTeamsQuery } from '@/lib/queries';
import { getStadiumColorStyle, getStadiumHomeTeams } from '@/lib/stadium-teams';
import { getTeamLogoSrc } from '@/lib/team-logo';
import {
  STADIUM_NOTE_FILTERS,
  buildKeywordPattern,
  matchesPattern,
  noteText,
  splitByPattern,
} from '@/lib/stadium-note-filters';
import styles from '../stadiums.module.css';

type Props = {
  stadium: string;
};

function HighlightedText({
  pattern,
  text,
}: {
  pattern: RegExp | null;
  text: string;
}) {
  return (
    <p>
      {splitByPattern(text, pattern).map((part, index) =>
        part.isMatch ? <mark key={index}>{part.text}</mark> : part.text,
      )}
    </p>
  );
}

export function StadiumDetailPageClient({ stadium }: Props) {
  const stadiumQuery = useStadiumQuery(stadium);
  const homeTeams = getStadiumHomeTeams(
    stadium,
    useTeamsQuery().data?.items ?? [],
  );
  const [filterId, setFilterId] = useState('all');
  const [search, setSearch] = useState('');
  const notes = useMemo(
    () => stadiumQuery.data?.notes ?? [],
    [stadiumQuery.data?.notes],
  );
  const summary = stadiumQuery.data?.stadium;
  const activeFilter =
    STADIUM_NOTE_FILTERS.find((filter) => filter.id === filterId) ??
    STADIUM_NOTE_FILTERS[0];
  const searchWords = search.trim().split(/\s+/).filter(Boolean);

  const filterCounts = useMemo(
    () =>
      new Map(
        STADIUM_NOTE_FILTERS.map((filter) => {
          const pattern = buildKeywordPattern(filter.keywords);
          return [
            filter.id,
            notes.filter((note) => matchesPattern(noteText(note), pattern))
              .length,
          ] as const;
        }),
      ),
    [notes],
  );

  const filterPattern = buildKeywordPattern(activeFilter.keywords);
  const searchPattern = buildKeywordPattern(searchWords);
  const highlightPattern = buildKeywordPattern([
    ...activeFilter.keywords,
    ...searchWords,
  ]);
  const visibleNotes = notes.filter((note) => {
    const text = noteText(note);
    return (
      matchesPattern(text, filterPattern) && matchesPattern(text, searchPattern)
    );
  });

  const isNotFound =
    stadiumQuery.error instanceof ApiError && stadiumQuery.error.status === 404;

  return (
    <main
      className={`app-shell with-bottom-nav ${styles.page}`}
      style={getStadiumColorStyle(homeTeams)}
    >
      <Link className={styles.backLink} href="/stadiums">
        ← 전체 구장
      </Link>

      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>구장 가이드</span>
          <div className={styles.heroTitle}>
            {homeTeams.length ? (
              <span className={styles.teamLogos}>
                {homeTeams.map((team) => (
                  <img alt="" key={team.id} src={getTeamLogoSrc(team)} />
                ))}
              </span>
            ) : null}
            <h1>{stadium}</h1>
          </div>
          {homeTeams.length ? (
            <p className={styles.heroTeams}>
              {homeTeams.map((team) => team.name).join(' · ')} 홈구장
            </p>
          ) : null}
          <p>
            팬들이 남긴 맛집·주차·교통 메모예요. 키워드 필터를 누르면 해당
            단어가 들어간 메모만 모아서 하이라이트해 드려요.
          </p>
          {summary?.mapUrl ? (
            <div className={styles.heroActions}>
              <a href={summary.mapUrl} rel="noreferrer" target="_blank">
                지도에서 보기
              </a>
              <a href="#my-stadium-note">내 메모 남기기</a>
            </div>
          ) : (
            <div className={styles.heroActions}>
              <a href="#my-stadium-note">내 메모 남기기</a>
            </div>
          )}
        </div>
        <div
          className={styles.heroCount}
          aria-label={`팬 메모 ${notes.length}개`}
        >
          <strong>{stadiumQuery.isLoading ? '—' : notes.length}</strong>
          <span>개의 팬 메모</span>
        </div>
      </header>

      <section className={styles.seatMap} aria-label="좌석 배치도">
        <StadiumSeatMapViewer stadium={stadium} variant="inline" />
      </section>

      <section className={styles.toolbar} aria-label="팬 메모 필터">
        <div className={styles.toolbarTop}>
          <div className={styles.toolbarTitle}>
            <strong>팬 메모</strong>
            <span>
              {filterId === 'all' && !searchWords.length
                ? '최근 수정된 순서로 보여드려요.'
                : `${visibleNotes.length}개의 메모가 조건에 맞아요.`}
            </span>
          </div>
          <div className={styles.search} role="search">
            <label className="sr-only" htmlFor="stadium-note-search">
              메모 내용 검색
            </label>
            <input
              id="stadium-note-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="단어로 검색 (예: 치킨 3루)"
              type="search"
              value={search}
            />
          </div>
        </div>
        <div className={styles.filters} aria-label="키워드 필터">
          {STADIUM_NOTE_FILTERS.map((filter) => {
            const count = filterCounts.get(filter.id) ?? 0;
            const isActive = filter.id === filterId;

            return (
              <button
                aria-pressed={isActive}
                className={`${styles.filter}${isActive ? ` ${styles.isActive}` : ''}`}
                disabled={!isActive && filter.id !== 'all' && count === 0}
                key={filter.id}
                onClick={() => setFilterId(filter.id)}
                type="button"
              >
                {filter.label}
                <small>{count}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.notes} aria-label="팬 메모 목록">
        {stadiumQuery.isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : null}

        {stadiumQuery.isError && !isNotFound ? (
          <div className={styles.empty}>
            <EmptyState
              icon="!"
              title="구장 메모를 불러오지 못했어요"
              description="연결을 확인한 뒤 다시 불러와 주세요."
              action={
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => stadiumQuery.refetch()}
                  type="button"
                >
                  다시 불러오기
                </button>
              }
            />
          </div>
        ) : null}

        {isNotFound ? (
          <div className={styles.empty}>
            <EmptyState
              icon="⌕"
              title="아직 등록된 정보가 없는 구장이에요"
              description="첫 번째 메모를 남겨보세요."
            />
          </div>
        ) : null}

        {stadiumQuery.isSuccess && !visibleNotes.length ? (
          <div className={styles.empty}>
            <EmptyState
              icon="⌕"
              title={
                notes.length
                  ? '조건에 맞는 메모가 없어요'
                  : '아직 공개된 팬 메모가 없어요'
              }
              description={
                notes.length
                  ? '다른 필터를 누르거나 검색어를 바꿔보세요.'
                  : '아래에서 첫 번째 메모를 남겨보세요.'
              }
            />
          </div>
        ) : null}

        {visibleNotes.map((note) => (
          <article className={styles.note} key={note.id}>
            <div className={styles.noteAuthor}>
              <img
                alt=""
                src={getAuthorProfileImageSrc(
                  note.author.profileImageUrl,
                  note.author.favoriteTeamShortName,
                )}
              />
              <div>
                <Link href={`/fans/${note.author.id}`}>
                  {note.author.nickname}
                </Link>{' '}
                {note.author.role === 'admin' ? <AdminBadge /> : null}
                <small>
                  {[
                    note.author.favoriteTeamShortName,
                    `${formatTimeAgo(note.updatedAt)} 수정`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </div>
            </div>
            <div className={styles.noteBody}>
              {note.foodMemo ? (
                <div className={styles.noteField}>
                  <h3>맛집 메모</h3>
                  <HighlightedText
                    pattern={highlightPattern}
                    text={note.foodMemo}
                  />
                </div>
              ) : null}
              {note.parkingMemo ? (
                <div className={styles.noteField}>
                  <h3>주차 정보</h3>
                  <HighlightedText
                    pattern={highlightPattern}
                    text={note.parkingMemo}
                  />
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <div className={styles.myNote} id="my-stadium-note">
        <StadiumPersonalNotes stadium={stadium} />
      </div>
    </main>
  );
}
