'use client';

import { FormEvent, useState } from 'react';
import { PlayerCheerDialog } from '@/components/PlayerCheerDialog';
import { PlayerPhoto } from '@/components/PlayerPhoto';
import type { PlayerCheer } from '@/lib/player-cheer-api';
import { usePlayerCheersQuery, useTeamsQuery } from '@/lib/queries';

export default function CheersPage() {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCheer | null>(null);
  const teamsQuery = useTeamsQuery();
  const cheersQuery = usePlayerCheersQuery({
    keyword: submittedKeyword,
    page,
    rosterScope: 'firstTeam',
    size: 24,
    teamId,
  });
  const players = cheersQuery.data?.items ?? [];
  const pagination = cheersQuery.data?.pagination;
  const registeredCount = players.filter((player) => player.cheerId).length;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSubmittedKeyword(keyword);
  }

  return (
    <main className="app-shell cheers-shell">
      <header className="app-page-header cheers-page-header">
        <span className="eyebrow">Cheer Songs</span>
        <h1>선수 응원가</h1>
        <p>선수별 프로필과 관리자 등록 응원가 정보를 확인합니다.</p>
      </header>

      <form className="cheers-toolbar" onSubmit={handleSearch}>
        <input
          aria-label="선수 검색"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="선수명 또는 팀명 검색"
          value={keyword}
        />
        <select
          aria-label="팀 필터"
          onChange={(event) => {
            setPage(1);
            setTeamId(event.target.value ? Number(event.target.value) : null);
          }}
          value={teamId ?? ''}
        >
          <option value="">전체 팀</option>
          {teamsQuery.data?.items.map((team) => (
            <option key={team.id} value={team.id}>
              {team.shortName}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          검색
        </button>
      </form>

      <section className="cheers-status">
        <strong>{pagination?.total ?? players.length}명</strong>
        <span>현재 페이지 등록 {registeredCount}개</span>
      </section>

      {cheersQuery.isLoading ? (
        <section className="card stack">
          <p className="muted">선수 응원가 정보를 불러오는 중입니다.</p>
        </section>
      ) : (
        <section className="cheer-player-grid" aria-label="선수 응원가 목록">
          {players.map((player) => (
            <button
              className="cheer-player-card"
              key={player.playerId}
              onClick={() => setSelectedPlayer(player)}
              type="button"
            >
              <PlayerPhoto
                className="cheer-player-photo"
                profileImageUrl={player.profileImageUrl}
              />
              <span className="cheer-player-team">{player.teamShortName}</span>
              <strong>{player.name}</strong>
              <span className="cheer-player-meta">
                {player.backNumber ? `No.${player.backNumber}` : '등번호 미등록'}
                {player.position ? ` · ${player.position}` : ''}
              </span>
              <span
                className={`cheer-player-badge${
                  player.cheerId ? ' is-registered' : ''
                }`}
              >
                {player.cheerId ? '등록됨' : '미등록'}
              </span>
            </button>
          ))}
        </section>
      )}

      {!cheersQuery.isLoading && players.length === 0 ? (
        <section className="card stack">
          <strong>검색 결과가 없어요.</strong>
          <p className="muted">선수명이나 팀 필터를 다시 확인해주세요.</p>
        </section>
      ) : null}

      {pagination && pagination.totalPages > 1 ? (
        <nav className="cheers-pagination" aria-label="응원가 목록 페이지">
          <button
            className="btn btn-ghost btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            이전
          </button>
          <span>
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPage((current) => Math.min(pagination.totalPages, current + 1))
            }
            type="button"
          >
            다음
          </button>
        </nav>
      ) : null}

      <PlayerCheerDialog
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />
    </main>
  );
}
