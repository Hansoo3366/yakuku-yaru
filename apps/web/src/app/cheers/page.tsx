'use client';

/* eslint-disable @next/next/no-img-element */

import { type CSSProperties, FormEvent, useMemo, useState } from 'react';
import { PlayerCheerDialog } from '@/components/PlayerCheerDialog';
import type { CheerDialogItem } from '@/components/PlayerCheerDialog';
import { PlayerPhoto } from '@/components/PlayerPhoto';
import { getTeamLogoSrc } from '@/lib/team-logo';
import type {
  PlayerCheer,
  PlayerCheerRosterScope,
  TeamCheer,
  PlayerCheerTeamStat,
} from '@/lib/player-cheer-api';
import {
  usePlayerCheersQuery,
  useTeamCheersQuery,
  useTeamsQuery,
} from '@/lib/queries';

type ViewMode = 'recentLineup' | 'all';

function getRegistrationRate(stat: PlayerCheerTeamStat | null | undefined) {
  if (!stat || stat.totalPlayers === 0) {
    return 0;
  }

  return Math.round((stat.registeredPlayers / stat.totalPlayers) * 100);
}

function getLineupLabel(player: PlayerCheer) {
  if (player.recentBattingOrder) {
    return `${player.recentBattingOrder}번`;
  }

  if (player.recentLineupRole?.startsWith('pitcher')) {
    return '선발';
  }

  return null;
}

function teamCheerToDialogItem(
  cheer: TeamCheer,
  imageUrl: string | null,
): CheerDialogItem {
  return {
    cheerId: cheer.cheerId,
    imageUrl,
    imageMode: 'raw',
    lyrics: cheer.lyrics,
    meta: '팀 전체 응원가',
    subtitle: cheer.teamShortName,
    title: cheer.teamName,
    cheerTitle: cheer.cheerTitle,
    youtubeId: cheer.youtubeId,
    youtubeUrl: cheer.youtubeUrl,
  };
}

export default function CheersPage() {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('recentLineup');
  const [page, setPage] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCheer | null>(null);
  const [selectedTeamCheer, setSelectedTeamCheer] =
    useState<CheerDialogItem | null>(null);
  const teamsQuery = useTeamsQuery();
  const teamCheersQuery = useTeamCheersQuery();
  const rosterScope: PlayerCheerRosterScope =
    viewMode === 'recentLineup' ? 'recentLineup' : 'all';
  const cheersQuery = usePlayerCheersQuery({
    keyword: submittedKeyword,
    page,
    rosterScope,
    size: viewMode === 'recentLineup' ? 40 : 24,
    teamId: selectedTeamId,
  });
  const teams = teamsQuery.data?.items ?? [];
  const players = cheersQuery.data?.items ?? [];
  const pagination = cheersQuery.data?.pagination;
  const teamStats = useMemo(
    () => cheersQuery.data?.stats.teams ?? [],
    [cheersQuery.data?.stats.teams],
  );
  const teamCheersById = useMemo(
    () =>
      new Map(
        (teamCheersQuery.data?.items ?? []).map((cheer) => [
          cheer.teamId,
          cheer,
        ]),
      ),
    [teamCheersQuery.data?.items],
  );
  const teamStatsById = useMemo(
    () => new Map(teamStats.map((stat) => [stat.teamId, stat])),
    [teamStats],
  );
  const selectedTeamStat = selectedTeamId
    ? teamStatsById.get(selectedTeamId)
    : null;
  const allTotalPlayers = teamStats.reduce(
    (sum, stat) => sum + stat.totalPlayers,
    0,
  );
  const allRegisteredPlayers = teamStats.reduce(
    (sum, stat) => sum + stat.registeredPlayers,
    0,
  );
  const totalPlayers = selectedTeamStat?.totalPlayers ?? allTotalPlayers;
  const registeredPlayers =
    selectedTeamStat?.registeredPlayers ?? allRegisteredPlayers;
  const allRegistrationRate = allTotalPlayers
    ? Math.round((allRegisteredPlayers / allTotalPlayers) * 100)
    : 0;
  const registrationRate = selectedTeamStat
    ? getRegistrationRate(selectedTeamStat)
    : totalPlayers
      ? Math.round((registeredPlayers / totalPlayers) * 100)
      : 0;
  const selectedTeamName =
    teams.find((team) => team.id === selectedTeamId)?.shortName ?? '전체 팀';

  function resetListState() {
    setPage(1);
    setSelectedPlayer(null);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetListState();
    setSelectedTeamId(null);
    setSubmittedKeyword(keyword.trim());
  }

  return (
    <main className="app-shell cheers-shell">
      <header className="app-page-header cheers-page-header">
        <span className="eyebrow">Cheer Songs</span>
        <h1>선수 응원가</h1>
        <p>팀 응원가와 선수 응원가를 라인업 기준으로 빠르게 확인합니다.</p>
      </header>

      <section className="cheers-control-panel">
        <form className="cheers-search" onSubmit={handleSearch}>
          <label htmlFor="cheer-player-search">선수 검색</label>
          <div className="cheers-search-row">
            <input
              autoComplete="off"
              id="cheer-player-search"
              name="keyword"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="선수명 또는 팀명 검색…"
              spellCheck={false}
              value={keyword}
            />
            <button className="btn btn-primary" type="submit">
              검색
            </button>
            {submittedKeyword ? (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setKeyword('');
                  setSubmittedKeyword('');
                  resetListState();
                }}
                type="button"
              >
                해제
              </button>
            ) : null}
          </div>
        </form>

        <div className="cheers-mode-bar" aria-label="목록 보기 방식">
          <button
            aria-pressed={viewMode === 'recentLineup'}
            className={viewMode === 'recentLineup' ? 'active' : ''}
            onClick={() => {
              setViewMode('recentLineup');
              resetListState();
            }}
            type="button"
          >
            최근 라인업
          </button>
          <button
            aria-pressed={viewMode === 'all'}
            className={viewMode === 'all' ? 'active' : ''}
            onClick={() => {
              setViewMode('all');
              resetListState();
            }}
            type="button"
          >
            전체 선수
          </button>
        </div>

        <div className="cheers-summary" aria-label="응원가 등록 현황">
          <div>
            <span>선택</span>
            <strong>{selectedTeamName}</strong>
          </div>
          <div>
            <span>등록율</span>
            <strong>{registrationRate}%</strong>
          </div>
          <div>
            <span>등록</span>
            <strong>
              {registeredPlayers} / {totalPlayers}
            </strong>
          </div>
        </div>
      </section>

      {submittedKeyword ? (
        <p className="cheers-search-note">
          팀 필터 없이 <strong>{submittedKeyword}</strong> 검색 결과를 보고 있습니다.
        </p>
      ) : null}

      <section className="cheers-team-board" aria-label="팀 선택 및 팀 응원가">
        <article
          className={`cheers-team-card${selectedTeamId === null ? ' active' : ''}`}
        >
          <button
            aria-pressed={selectedTeamId === null}
            className="cheers-team-select"
            onClick={() => {
              setSelectedTeamId(null);
              resetListState();
            }}
            type="button"
          >
            <span className="cheers-team-logo">ALL</span>
            <span>
              <strong>전체 팀</strong>
              <em>{allRegistrationRate}% 등록</em>
            </span>
          </button>
        </article>
        {teams.map((team) => {
          const stat = teamStatsById.get(team.id);
          const teamCheer = teamCheersById.get(team.id);
          const hasTeamCheer = Boolean(teamCheer?.cheerId);

          return (
            <article
              className={`cheers-team-card${
                selectedTeamId === team.id ? ' active' : ''
              }`}
              key={team.id}
              style={
                team.primaryColor
                  ? ({ '--team-tab-color': team.primaryColor } as CSSProperties)
                  : undefined
              }
            >
              <button
                aria-pressed={selectedTeamId === team.id}
                className="cheers-team-select"
                onClick={() => {
                  setSelectedTeamId(team.id);
                  resetListState();
                }}
                type="button"
              >
                <img alt="" src={getTeamLogoSrc(team)} />
                <span>
                  <strong>{team.shortName}</strong>
                  <em>{getRegistrationRate(stat)}% 등록</em>
                </span>
              </button>
              <button
                className="cheers-team-song"
                disabled={!teamCheer || !hasTeamCheer}
                onClick={() => {
                  if (!teamCheer || !hasTeamCheer) return;

                  setSelectedTeamCheer(
                    teamCheerToDialogItem(teamCheer, getTeamLogoSrc(team)),
                  );
                }}
                type="button"
              >
                {hasTeamCheer ? '팀 응원가' : '미등록'}
              </button>
            </article>
          );
        })}
      </section>

      {cheersQuery.isLoading ? (
        <section className="card stack">
          <p className="muted">선수 응원가 정보를 불러오는 중입니다.</p>
        </section>
      ) : (
        <section className="cheer-player-grid" aria-label="선수 응원가 목록">
          {players.map((player) => {
            const lineupLabel = getLineupLabel(player);

            return (
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
                <span className="cheer-player-main">
                  <span className="cheer-player-team">
                    {player.teamShortName}
                    {lineupLabel ? ` · ${lineupLabel}` : ''}
                  </span>
                  <strong>{player.name}</strong>
                  <span className="cheer-player-meta">
                    {player.backNumber
                      ? `No.${player.backNumber}`
                      : '등번호 미등록'}
                    {player.position ? ` · ${player.position}` : ''}
                  </span>
                </span>
                <span
                  className={`cheer-player-badge${
                    player.cheerId ? ' is-registered' : ''
                  }`}
                >
                  {player.cheerId ? '등록됨' : '미등록'}
                </span>
              </button>
            );
          })}
        </section>
      )}

      {!cheersQuery.isLoading && players.length === 0 ? (
        <section className="card stack">
          <strong>검색 결과가 없어요.</strong>
          <p className="muted">검색어를 바꾸거나 전체 리스트 보기로 전환해보세요.</p>
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
      <PlayerCheerDialog
        cheer={selectedTeamCheer}
        onClose={() => setSelectedTeamCheer(null)}
      />
    </main>
  );
}
