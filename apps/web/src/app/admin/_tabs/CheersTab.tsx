'use client';

import { useMutation } from '@tanstack/react-query';
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import {
  deleteAdminPlayerCheer,
  deleteAdminTeamCheer,
  getPlayerCheerType,
  saveAdminPlayerCheer,
  saveAdminTeamCheer,
  type PlayerCheer,
  type PlayerCheerInput,
  type PlayerCheerRosterScope,
  type TeamCheer,
} from '@/lib/player-cheer-api';
import { useTeamsQuery } from '@/lib/queries';
import {
  useAdminPlayerCheersQuery,
  useAdminTeamCheersQuery,
  useAdminToken,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { normalizeTeamColor } from '@/lib/team-color';
import { AdminDialog } from '../_components/AdminDialog';
import { errorMessage, useAdminFeedback } from '../_components/feedback';
import {
  Chip,
  FilterSelect,
  formatDate,
  listState,
  PanelHeading,
  Pagination,
  ResultCount,
  SearchBox,
  TeamName,
  Toolbar,
} from '../_components/ui';

type EditingTarget =
  | { kind: 'team'; cheer: TeamCheer }
  | { kind: 'player'; player: PlayerCheer };

/** 공개 응원가 화면의 캐시도 같이 비운다. */
const TEAM_CHEER_KEYS = [['admin', 'team-cheers'], ['team-cheers']] as const;
const PLAYER_CHEER_KEYS = [['admin', 'player-cheers'], ['player-cheers']] as const;

export function CheersTab() {
  const [editing, setEditing] = useState<EditingTarget | null>(null);

  return (
    <>
      <TeamCheersPanel onEdit={(cheer) => setEditing({ cheer, kind: 'team' })} />
      <PlayerCheersPanel onEdit={(player) => setEditing({ kind: 'player', player })} />
      {editing ? (
        <CheerEditor
          key={editing.kind === 'team' ? `team-${editing.cheer.teamId}` : `player-${editing.player.playerId}`}
          onClose={() => setEditing(null)}
          target={editing}
        />
      ) : null}
    </>
  );
}

function TeamCheersPanel({ onEdit }: { onEdit: (cheer: TeamCheer) => void }) {
  const teamCheersQuery = useAdminTeamCheersQuery();
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { confirm, notify, notifyError } = useAdminFeedback();
  const cheers = teamCheersQuery.data?.items ?? [];
  const registered = cheers.filter((cheer) => cheer.cheerId).length;

  const deleteMutation = useMutation({
    mutationFn: (cheer: TeamCheer) => deleteAdminTeamCheer(cheer.teamId, token),
    onSuccess: (_data, cheer) => {
      notify(`${cheer.teamShortName} 팀 응원가를 삭제했습니다.`);
      return invalidate(...TEAM_CHEER_KEYS);
    },
    onError: (error) => notifyError(error, '팀 응원가를 삭제하지 못했습니다.'),
  });

  const state = listState({
    ...teamCheersQuery,
    isEmpty: cheers.length === 0,
    empty: { title: '팀 정보가 없습니다' },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        description="라인업과 응원가 페이지에서 팀 이름 옆 버튼으로 나옵니다."
        title="팀 응원가"
        actions={
          teamCheersQuery.data ? (
            <p className="admin-result-count">
              <strong>{registered}</strong>/{cheers.length}팀 등록
            </p>
          ) : null
        }
      />
      {state ?? (
        <ul className="admin-team-cheers">
          {cheers.map((cheer) => (
            <li key={cheer.teamId}>
              <div className="admin-team-cheer-main">
                <TeamName color={cheer.teamPrimaryColor} name={cheer.teamShortName} />
                <span className={cheer.cheerTitle ? 'admin-team-cheer-title' : 'admin-muted'}>
                  {cheer.cheerTitle ?? '등록 안 됨'}
                </span>
              </div>
              <div className="admin-team-cheer-actions">
                <button className="admin-row-btn" onClick={() => onEdit(cheer)} type="button">
                  {cheer.cheerId ? '수정' : '등록'}
                </button>
                {cheer.cheerId ? (
                  <button
                    aria-label={`${cheer.teamShortName} 팀 응원가 삭제`}
                    className="admin-row-btn admin-row-btn--danger"
                    disabled={deleteMutation.isPending}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: `${cheer.teamShortName} 팀 응원가를 삭제할까요?`,
                          description: '제목·영상·가사가 지워지고 응원가 페이지에서 바로 사라집니다.',
                          confirmLabel: '응원가 삭제',
                        })
                      ) {
                        deleteMutation.mutate(cheer);
                      }
                    }}
                    type="button"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PlayerCheersPanel({ onEdit }: { onEdit: (player: PlayerCheer) => void }) {
  const [keyword, setKeyword] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [rosterScope, setRosterScope] = useState<PlayerCheerRosterScope>('firstTeam');
  const [page, setPage] = useState(1);
  const playersQuery = useAdminPlayerCheersQuery({ keyword, page, rosterScope, teamId });
  const teamsQuery = useTeamsQuery();
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { confirm, notify, notifyError } = useAdminFeedback();
  const players = playersQuery.data?.items;
  const pagination = playersQuery.data?.pagination;
  const teamStats = useMemo(() => playersQuery.data?.stats.teams ?? [], [playersQuery.data]);

  const deleteMutation = useMutation({
    mutationFn: (player: PlayerCheer) => deleteAdminPlayerCheer(player.playerId, token),
    onSuccess: (_data, player) => {
      notify(`${player.name} 응원가를 삭제했습니다.`);
      return invalidate(...PLAYER_CHEER_KEYS);
    },
    onError: (error) => notifyError(error, '응원가를 삭제하지 못했습니다.'),
  });

  const state = listState({
    ...playersQuery,
    isEmpty: !players?.length,
    empty: {
      title: '조건에 맞는 선수가 없습니다',
      description: rosterScope === 'firstTeam' ? '범위를 전체 선수로 바꾸면 2군 선수도 찾을 수 있습니다.' : undefined,
    },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        description="선수별 응원가와 등장곡을 등록합니다. 투수는 등장곡, 타자는 응원가로 자동 구분됩니다."
        title="선수 응원가"
      />

      {teamStats.length ? (
        <ul aria-label="팀별 등록 현황" className="admin-coverage">
          {teamStats.map((stat) => {
            const ratio = stat.totalPlayers ? stat.registeredPlayers / stat.totalPlayers : 0;
            const color = normalizeTeamColor(stat.teamPrimaryColor);
            const isActive = teamId === stat.teamId;
            return (
              <li key={stat.teamId}>
                <button
                  aria-pressed={isActive}
                  className={isActive ? 'is-active' : undefined}
                  onClick={() => {
                    setTeamId(isActive ? null : stat.teamId);
                    setPage(1);
                  }}
                  type="button"
                >
                  <span className="admin-coverage-name">
                    <i
                      aria-hidden="true"
                      className="admin-team-dot"
                      style={color ? ({ '--dot': color } as CSSProperties) : undefined}
                    />
                    {stat.teamShortName}
                  </span>
                  <span className="admin-coverage-num">
                    {stat.registeredPlayers}/{stat.totalPlayers}
                  </span>
                  <span aria-hidden="true" className="admin-meter">
                    <span style={{ width: `${Math.round(ratio * 100)}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Toolbar>
        <SearchBox
          label="선수 검색"
          onSearch={(next) => {
            setKeyword(next);
            setPage(1);
          }}
          placeholder="선수 이름 또는 팀"
        />
        <FilterSelect
          label="팀"
          onChange={(value) => {
            setTeamId(value ? Number(value) : null);
            setPage(1);
          }}
          options={[
            { value: '', label: '전체' },
            ...(teamsQuery.data?.items ?? []).map((team) => ({
              value: String(team.id),
              label: team.shortName,
            })),
          ]}
          value={teamId ? String(teamId) : ''}
        />
        <FilterSelect
          label="범위"
          onChange={(value) => {
            setRosterScope(value as PlayerCheerRosterScope);
            setPage(1);
          }}
          options={[
            { value: 'firstTeam', label: '1군 경기 기준' },
            { value: 'all', label: '전체 선수' },
          ]}
          value={rosterScope}
        />
        <ResultCount
          fetching={playersQuery.isFetching && !playersQuery.isPending}
          total={pagination?.total}
          unit="명"
        />
      </Toolbar>

      {state ?? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">선수</th>
                  <th scope="col">팀</th>
                  <th className="is-num" scope="col">등번호</th>
                  <th scope="col">포지션</th>
                  <th scope="col">응원가</th>
                  <th scope="col">수정</th>
                  <th className="is-actions" scope="col">
                    <span className="sr-only">관리</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {players?.map((player) => (
                  <tr key={player.playerId}>
                    <td className="is-primary">
                      <strong>{player.name}</strong>
                      {player.kboPlayerId ? <small className="admin-sub">KBO {player.kboPlayerId}</small> : null}
                    </td>
                    <td data-label="팀">
                      <TeamName color={player.teamPrimaryColor} name={player.teamShortName} />
                    </td>
                    <td className="is-num" data-label="등번호">{player.backNumber ?? '-'}</td>
                    <td data-label="포지션">{player.position ?? <span className="admin-muted">-</span>}</td>
                    <td data-label="응원가">
                      {player.cheerId ? (
                        <Chip tone="success">{getPlayerCheerType(player)} 등록</Chip>
                      ) : (
                        <Chip>미등록</Chip>
                      )}
                    </td>
                    <td className="is-date" data-label="수정">
                      {player.cheerUpdatedAt ? formatDate(player.cheerUpdatedAt) : <span className="admin-muted">-</span>}
                    </td>
                    <td className="is-actions">
                      <span className="admin-row-actions">
                        <button
                          aria-label={`${player.name} 응원가 ${player.cheerId ? '수정' : '등록'}`}
                          className="admin-row-btn"
                          onClick={() => onEdit(player)}
                          type="button"
                        >
                          {player.cheerId ? '수정' : '등록'}
                        </button>
                        {player.cheerId ? (
                          <button
                            aria-label={`${player.name} 응원가 삭제`}
                            className="admin-row-btn admin-row-btn--danger"
                            disabled={deleteMutation.isPending && deleteMutation.variables?.playerId === player.playerId}
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: `${player.name} 응원가를 삭제할까요?`,
                                  description: '영상과 가사가 지워지고 응원가 페이지에서 바로 사라집니다.',
                                  confirmLabel: '응원가 삭제',
                                })
                              ) {
                                deleteMutation.mutate(player);
                              }
                            }}
                            type="button"
                          >
                            삭제
                          </button>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination ? (
            <Pagination
              label="선수 응원가 페이지"
              onChange={setPage}
              page={pagination.page}
              totalPages={pagination.totalPages}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function CheerEditor({ target, onClose }: { target: EditingTarget; onClose: () => void }) {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { notify, notifyError } = useAdminFeedback();
  const source = target.kind === 'team' ? target.cheer : target.player;
  const autoTitle = target.kind === 'player' ? getPlayerCheerType(target.player) : null;
  const [title, setTitle] = useState(target.kind === 'team' ? (target.cheer.cheerTitle ?? '') : '');
  const [youtubeId, setYoutubeId] = useState(source.youtubeId ?? '');
  const [lyrics, setLyrics] = useState(source.lyrics ?? '');
  const [formError, setFormError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (input: PlayerCheerInput) =>
      target.kind === 'team'
        ? saveAdminTeamCheer(target.cheer.teamId, input, token)
        : saveAdminPlayerCheer(target.player.playerId, input, token),
    onSuccess: () => {
      notify(target.kind === 'team' ? '팀 응원가를 저장했습니다.' : '선수 응원가를 저장했습니다.');
      onClose();
      return invalidate(...(target.kind === 'team' ? TEAM_CHEER_KEYS : PLAYER_CHEER_KEYS));
    },
    onError: (error) => {
      setFormError(errorMessage(error, '응원가를 저장하지 못했습니다.'));
      notifyError(error, '응원가를 저장하지 못했습니다.');
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    saveMutation.mutate({
      lyrics: lyrics.trim() || null,
      title: autoTitle ?? (title.trim() || '팀 응원가'),
      youtubeId: youtubeId.trim() || null,
      youtubeUrl: null,
    });
  }

  const heading =
    target.kind === 'team'
      ? `${target.cheer.teamShortName} 팀 응원가`
      : `${target.player.name}${target.player.backNumber ? ` · ${target.player.backNumber}번` : ''}`;

  return (
    <AdminDialog
      dismissOnBackdrop={false}
      eyebrow={target.kind === 'team' ? '팀 응원가' : `${target.player.teamShortName} 선수 응원가`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} type="button">
            취소
          </button>
          <button className="btn btn-primary" disabled={saveMutation.isPending} form="admin-cheer-form" type="submit">
            {saveMutation.isPending ? '저장 중' : '응원가 저장'}
          </button>
        </>
      }
      onClose={onClose}
      open
      title={heading}
    >
      <form className="admin-form-grid admin-form-grid--single" id="admin-cheer-form" onSubmit={handleSubmit}>
        {autoTitle ? (
          <div className="admin-field">
            <span>곡 구분</span>
            <p className="admin-readonly">
              <strong>{autoTitle}</strong>
              <small>포지션을 보고 자동으로 정합니다.</small>
            </p>
          </div>
        ) : (
          <label className="admin-field">
            <span>제목</span>
            <input
              autoComplete="off"
              className="admin-input"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="비우면 '팀 응원가'로 저장됩니다"
              value={title}
            />
          </label>
        )}
        <label className="admin-field">
          <span>유튜브 영상 ID 또는 주소</span>
          <input
            autoComplete="off"
            className="admin-input"
            onChange={(event) => setYoutubeId(event.target.value)}
            placeholder="예: dQw4w9WgXcQ"
            spellCheck={false}
            value={youtubeId}
          />
        </label>
        <label className="admin-field">
          <span>가사</span>
          <textarea
            className="admin-input admin-textarea"
            onChange={(event) => setLyrics(event.target.value)}
            placeholder="한 줄에 한 소절씩 입력합니다"
            rows={9}
            value={lyrics}
          />
        </label>
        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </AdminDialog>
  );
}
