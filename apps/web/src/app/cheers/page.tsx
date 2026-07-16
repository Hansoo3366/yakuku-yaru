'use client';

/* eslint-disable @next/next/no-img-element */

import './cheers.css';

import { type CSSProperties, type FormEvent, useMemo, useState } from 'react';
import { PlayerCheerDialog } from '@/components/PlayerCheerDialog';
import type { CheerDialogItem } from '@/components/PlayerCheerDialog';
import { PlayerPhoto } from '@/components/PlayerPhoto';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { getContrastingTextColor } from '@/lib/team-color';
import type {
  PlayerCheer,
  PlayerCheerRosterScope,
  TeamCheer,
} from '@/lib/player-cheer-api';
import {
  usePlayerCheersQuery,
  useTeamCheersQuery,
  useTeamsQuery,
} from '@/lib/queries';

type ViewMode = 'recentLineup' | 'all';

const CHEER_SKELETON_ITEMS = ['one', 'two', 'three', 'four', 'five', 'six'];

function getLineupLabel(player: PlayerCheer) {
  if (player.recentBattingOrder) {
    return `${player.recentBattingOrder}번`;
  }

  if (player.recentLineupRole?.startsWith('pitcher')) {
    return '선발';
  }

  return null;
}

function getLineupMarker(player: PlayerCheer) {
  if (player.recentBattingOrder) {
    return String(player.recentBattingOrder).padStart(2, '0');
  }

  if (player.recentLineupRole?.startsWith('pitcher')) {
    return 'P';
  }

  return player.backNumber || '—';
}

function teamCheerToDialogItem(
  cheer: TeamCheer,
  imageUrl: string | null,
): CheerDialogItem {
  return {
    accentColor: cheer.teamPrimaryColor,
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
  const [onlyWithCheer, setOnlyWithCheer] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCheer | null>(
    null,
  );
  const [activeTeamCheer, setActiveTeamCheer] =
    useState<CheerDialogItem | null>(null);
  const teamsQuery = useTeamsQuery();
  const teamCheersQuery = useTeamCheersQuery();
  const rosterScope: PlayerCheerRosterScope =
    viewMode === 'recentLineup' ? 'recentLineup' : 'all';
  const cheersQuery = usePlayerCheersQuery({
    keyword: submittedKeyword,
    onlyWithCheer,
    page,
    rosterScope,
    size: 18,
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
  const allTotalPlayers = teamStats.reduce(
    (sum, stat) => sum + stat.totalPlayers,
    0,
  );
  const allRegisteredPlayers = teamStats.reduce(
    (sum, stat) => sum + stat.registeredPlayers,
    0,
  );
  const allRegistrationRate = allTotalPlayers
    ? Math.round((allRegisteredPlayers / allTotalPlayers) * 100)
    : 0;
  const selectedTeam = selectedTeamId
    ? (teams.find((team) => team.id === selectedTeamId) ?? null)
    : null;
  const selectedTeamCheer = selectedTeamId
    ? (teamCheersById.get(selectedTeamId) ?? null)
    : null;
  const selectedTeamStat = selectedTeamId
    ? (teamStatsById.get(selectedTeamId) ?? null)
    : null;
  const currentTotalPlayers = selectedTeamStat?.totalPlayers ?? allTotalPlayers;
  const currentRegisteredPlayers =
    selectedTeamStat?.registeredPlayers ?? allRegisteredPlayers;
  const resultTitle = selectedTeam
    ? `${selectedTeam.shortName} 선수`
    : viewMode === 'recentLineup'
      ? '최근 라인업 선수'
      : '전체 선수';

  function resetListState() {
    setPage(1);
    setSelectedPlayer(null);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetListState();
    setSubmittedKeyword(keyword.trim());
  }

  return (
    <main className="app-shell cheers-shell">
      <header className="cheers-page-intro">
        <span>2026 KBO CHANTS</span>
        <h1>응원가</h1>
        <p>오늘의 라인업부터 전체 선수까지, 부르고 싶은 응원가를 찾습니다.</p>
      </header>

      <section className="cheers-lookup" aria-label="응원가 검색과 보기 설정">
        <form className="cheers-search" onSubmit={handleSearch}>
          <label htmlFor="cheer-player-search">선수 검색</label>
          <div className="cheers-search-row">
            <input
              autoComplete="off"
              id="cheer-player-search"
              name="keyword"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={
                selectedTeam
                  ? `${selectedTeam.shortName} 선수 이름 검색`
                  : '선수명 또는 팀명 검색'
              }
              spellCheck={false}
              value={keyword}
            />
            {keyword || submittedKeyword ? (
              <button
                aria-label="검색어 지우기"
                className="cheers-search-clear"
                onClick={() => {
                  setKeyword('');
                  setSubmittedKeyword('');
                  resetListState();
                }}
                title="검색어 지우기"
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            <button className="cheers-search-submit" type="submit">
              검색
            </button>
          </div>
        </form>

        <div className="cheers-view-options">
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
          <label className="cheers-available-toggle">
            <input
              checked={onlyWithCheer}
              onChange={(event) => {
                setOnlyWithCheer(event.target.checked);
                resetListState();
              }}
              type="checkbox"
            />
            <span aria-hidden="true" />
            등록된 응원가만
          </label>
        </div>
      </section>

      <section className="cheers-team-section" aria-label="팀 선택">
        <header className="cheers-section-heading">
          <div>
            <h2>팀 선택</h2>
            <p>팀을 고르면 해당 선수와 팀 응원가를 함께 볼 수 있습니다.</p>
          </div>
          <span>
            전체 {allRegisteredPlayers}/{allTotalPlayers}곡 ·{' '}
            {allRegistrationRate}%
          </span>
        </header>

        <div className="cheers-team-rail" role="toolbar" aria-label="KBO 팀">
          <button
            aria-pressed={selectedTeamId === null}
            className={`cheers-team-tab${
              selectedTeamId === null ? ' active' : ''
            }`}
            onClick={() => {
              setSelectedTeamId(null);
              resetListState();
            }}
            type="button"
          >
            <span className="cheers-team-tab__all" aria-hidden="true">
              KBO
            </span>
            <strong>전체</strong>
          </button>

          {teams.map((team) => {
            return (
              <button
                aria-pressed={selectedTeamId === team.id}
                className={`cheers-team-tab${
                  selectedTeamId === team.id ? ' active' : ''
                }`}
                key={team.id}
                onClick={() => {
                  setSelectedTeamId(team.id);
                  resetListState();
                }}
                style={
                  team.primaryColor
                    ? ({
                        '--team-tab-color': team.primaryColor,
                      } as CSSProperties)
                    : undefined
                }
                type="button"
              >
                <img alt={`${team.name} 로고`} src={getTeamLogoSrc(team)} />
                <strong>{team.shortName}</strong>
              </button>
            );
          })}
        </div>
      </section>

      {selectedTeam ? (
        <section
          className="cheers-team-feature"
          style={
            selectedTeam.primaryColor
              ? ({
                  '--team-tab-color': selectedTeam.primaryColor,
                  '--team-tab-surface': selectedTeam.primaryColor,
                  '--team-tab-contrast': getContrastingTextColor(
                    selectedTeam.primaryColor,
                  ),
                } as CSSProperties)
              : undefined
          }
        >
          <div className="cheers-team-feature__identity">
            <img
              alt={`${selectedTeam.name} 로고`}
              src={getTeamLogoSrc(selectedTeam)}
            />
            <div>
              <span>선택한 팀</span>
              <h2>{selectedTeam.name}</h2>
              <p>
                선수 응원가 {selectedTeamStat?.registeredPlayers ?? 0}/
                {selectedTeamStat?.totalPlayers ?? 0}곡 등록
              </p>
            </div>
          </div>
          <button
            disabled={!selectedTeamCheer?.cheerId}
            onClick={() => {
              if (!selectedTeamCheer?.cheerId) return;
              setActiveTeamCheer(
                teamCheerToDialogItem(
                  selectedTeamCheer,
                  getTeamLogoSrc(selectedTeam),
                ),
              );
            }}
            type="button"
          >
            {selectedTeamCheer?.cheerId
              ? '팀 응원가 보기'
              : '팀 응원가 준비 중'}
          </button>
        </section>
      ) : null}

      <section className="cheers-roster" aria-label="선수 응원가 목록">
        <header className="cheers-roster__heading">
          <div>
            <span>
              {viewMode === 'recentLineup' ? 'LINEUP BOARD' : 'PLAYER INDEX'}
            </span>
            <h2>{resultTitle}</h2>
            <p>
              응원가 {currentRegisteredPlayers}/{currentTotalPlayers}곡
              {pagination ? ` · 검색 결과 ${pagination.total}명` : ''}
            </p>
          </div>
          {submittedKeyword ? (
            <p className="cheers-search-note">
              검색어 <strong>“{submittedKeyword}”</strong>
            </p>
          ) : null}
        </header>

        {cheersQuery.isLoading ? (
          <div
            className="cheers-roster-skeleton"
            aria-label="선수 목록 불러오는 중"
          >
            {CHEER_SKELETON_ITEMS.map((item) => (
              <span key={item} />
            ))}
          </div>
        ) : cheersQuery.isError ? (
          <div className="cheers-roster-message" role="alert">
            <strong>선수 응원가를 불러오지 못했습니다.</strong>
            <p>연결 상태를 확인한 뒤 다시 시도해주세요.</p>
            <button onClick={() => void cheersQuery.refetch()} type="button">
              다시 불러오기
            </button>
          </div>
        ) : players.length ? (
          <div className="cheer-player-list">
            {players.map((player) => {
              const lineupLabel = getLineupLabel(player);

              return (
                <button
                  aria-label={`${player.name} ${player.cheerId ? '응원가 보기' : '응원가 준비 상태 보기'}`}
                  className="cheer-player-row"
                  data-available={Boolean(player.cheerId)}
                  key={player.playerId}
                  onClick={() => setSelectedPlayer(player)}
                  style={
                    player.teamPrimaryColor
                      ? ({
                          '--player-team-color': player.teamPrimaryColor,
                        } as CSSProperties)
                      : undefined
                  }
                  type="button"
                >
                  <span className="cheer-player-order" aria-hidden="true">
                    <strong>{getLineupMarker(player)}</strong>
                    <small>{lineupLabel ?? 'ROSTER'}</small>
                  </span>
                  <PlayerPhoto
                    className="cheer-player-photo"
                    profileImageUrl={player.profileImageUrl}
                  />
                  <span className="cheer-player-main">
                    <span className="cheer-player-team">
                      {player.teamShortName}
                    </span>
                    <strong>{player.name}</strong>
                    <span className="cheer-player-meta">
                      {player.backNumber
                        ? `No.${player.backNumber}`
                        : '등번호 없음'}
                      {player.position ? ` · ${player.position}` : ''}
                    </span>
                  </span>
                  <span className="cheer-player-status">
                    {player.cheerId ? '응원가 보기' : '준비 중'}
                    <span aria-hidden="true">→</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="cheers-roster-message">
            <strong>조건에 맞는 선수가 없습니다.</strong>
            <p>
              {onlyWithCheer
                ? '등록곡 필터를 끄거나 다른 팀을 선택해보세요.'
                : '검색어를 지우거나 전체 선수로 범위를 넓혀보세요.'}
            </p>
            <button
              onClick={() => {
                setKeyword('');
                setSubmittedKeyword('');
                setOnlyWithCheer(false);
                resetListState();
              }}
              type="button"
            >
              필터 초기화
            </button>
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <nav className="cheers-pagination" aria-label="응원가 목록 페이지">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              이전
            </button>
            <span>
              <strong>{pagination.page}</strong> / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1),
                )
              }
              type="button"
            >
              다음
            </button>
          </nav>
        ) : null}
      </section>

      <PlayerCheerDialog
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />
      <PlayerCheerDialog
        cheer={activeTeamCheer}
        onClose={() => setActiveTeamCheer(null)}
      />
    </main>
  );
}
