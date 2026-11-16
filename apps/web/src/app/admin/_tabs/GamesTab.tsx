'use client';

import { useMutation } from '@tanstack/react-query';
import { ExternalLink, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import {
  createAdminGame,
  updateAdminGame,
  type AdminGame,
  type AdminGameInput,
} from '@/lib/admin-api';
import type { Team } from '@/lib/baseball-api';
import { formatKoreanDateTimeLocalInput } from '@/lib/date-format';
import { useTeamsQuery } from '@/lib/queries';
import {
  useAdminGamesQuery,
  useAdminToken,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { AdminDialog } from '../_components/AdminDialog';
import { errorMessage, useAdminFeedback } from '../_components/feedback';
import {
  Chip,
  formatDate,
  listState,
  PanelHeading,
  Pagination,
  ResultCount,
  Segmented,
  TeamName,
  Toolbar,
  type ChipTone,
} from '../_components/ui';

type StatusFilter = 'all' | 'scheduled' | 'finished' | 'cancelled';

const GAME_STATUS_LABELS: Record<string, string> = {
  scheduled: '예정',
  finished: '종료',
  cancelled: '취소',
};

const GAME_STATUS_TONES: Record<string, ChipTone> = {
  scheduled: 'scheduled',
  finished: 'neutral',
  cancelled: 'cancelled',
};

const emptyForm = {
  awayScore: '',
  awayTeamId: '',
  gameDate: '',
  homeScore: '',
  homeTeamId: '',
  stadium: '',
  status: 'scheduled',
  ticketOpenAt: '',
  ticketUrl: '',
};

type GameForm = typeof emptyForm;

type EditorState = { mode: 'create' } | { mode: 'edit'; game: AdminGame };

/** 점수가 앞선 쪽. 끝난 경기 표에서 이긴 팀 점수만 진하게 보이게 한다. */
function leadSide(game: AdminGame) {
  if (game.awayScore == null || game.homeScore == null || game.awayScore === game.homeScore) return null;
  return game.awayScore > game.homeScore ? 'away' : 'home';
}

function toForm(game: AdminGame): GameForm {
  return {
    awayScore: game.awayScore?.toString() ?? '',
    awayTeamId: String(game.awayTeamId),
    gameDate: formatKoreanDateTimeLocalInput(game.gameDate),
    homeScore: game.homeScore?.toString() ?? '',
    homeTeamId: String(game.homeTeamId),
    stadium: game.stadium,
    status: game.status,
    ticketOpenAt: game.ticketOpenAt ? formatKoreanDateTimeLocalInput(game.ticketOpenAt) : '',
    ticketUrl: game.ticketUrl ?? '',
  };
}

function toInput(form: GameForm): AdminGameInput {
  return {
    awayScore: form.awayScore === '' ? null : Number(form.awayScore),
    awayTeamId: Number(form.awayTeamId),
    gameDate: form.gameDate,
    homeScore: form.homeScore === '' ? null : Number(form.homeScore),
    homeTeamId: Number(form.homeTeamId),
    stadium: form.stadium.trim(),
    status: form.status,
    ticketOpenAt: form.ticketOpenAt || null,
    ticketUrl: form.ticketUrl.trim() || null,
  };
}

export function GamesTab() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const gamesQuery = useAdminGamesQuery({ page, status });
  const teamsQuery = useTeamsQuery();
  const teams = useMemo(() => teamsQuery.data?.items ?? [], [teamsQuery.data]);
  const teamColors = useMemo(
    () => new Map(teams.map((team) => [team.id, team.primaryColor])),
    [teams],
  );
  const games = gamesQuery.data?.items;
  const pagination = gamesQuery.data?.pagination;

  const state = listState({
    ...gamesQuery,
    isEmpty: !games?.length,
    empty: { title: '이 상태의 경기가 없습니다' },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setEditor({ mode: 'create' })} type="button">
            <Plus aria-hidden="true" size={16} />
            경기 추가
          </button>
        }
        description="KBO 일정 데이터를 직접 고칩니다. 대부분은 데이터 갱신으로 들어오고, 여기서는 빠진 값만 손봅니다."
        title="경기"
      />
      <Toolbar>
        <Segmented
          label="경기 상태"
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: '전체' },
            { value: 'scheduled', label: '예정' },
            { value: 'finished', label: '종료' },
            { value: 'cancelled', label: '취소' },
          ]}
          value={status}
        />
        <ResultCount fetching={gamesQuery.isFetching && !gamesQuery.isPending} total={pagination?.total} unit="경기" />
      </Toolbar>

      {state ?? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--games">
              <thead>
                <tr>
                  <th scope="col">일시</th>
                  <th className="is-right" scope="col">원정</th>
                  <th className="is-center" scope="col">점수</th>
                  <th scope="col">홈</th>
                  <th scope="col">구장</th>
                  <th scope="col">상태</th>
                  <th scope="col">예매</th>
                  <th className="is-actions" scope="col">
                    <span className="sr-only">수정</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {games?.map((game) => (
                  <tr key={game.id}>
                    <td className="is-primary is-date">
                      <time dateTime={game.gameDate}>{formatDate(game.gameDate)}</time>
                    </td>
                    <td className="is-right" data-label="원정">
                      <TeamName color={teamColors.get(game.awayTeamId)} name={game.awayTeamShortName} />
                    </td>
                    <td className="is-center is-num" data-label="점수">
                      <span className="admin-score">
                        <b data-lead={leadSide(game) === 'away' || undefined}>{game.awayScore ?? '-'}</b>
                        <span aria-hidden="true">:</span>
                        <b data-lead={leadSide(game) === 'home' || undefined}>{game.homeScore ?? '-'}</b>
                      </span>
                    </td>
                    <td data-label="홈">
                      <TeamName color={teamColors.get(game.homeTeamId)} name={game.homeTeamShortName} />
                    </td>
                    <td data-label="구장">{game.stadium}</td>
                    <td data-label="상태">
                      <Chip tone={GAME_STATUS_TONES[game.status] ?? 'neutral'}>
                        {GAME_STATUS_LABELS[game.status] ?? game.status}
                      </Chip>
                    </td>
                    <td className={game.ticketUrl ? undefined : 'is-empty'} data-label="예매">
                      {game.ticketUrl ? (
                        <a className="admin-inline-link" href={game.ticketUrl} rel="noreferrer" target="_blank">
                          {game.ticketOpenAt ? `${formatDate(game.ticketOpenAt)} 오픈` : '예매 링크'}
                          <ExternalLink aria-hidden="true" size={12} />
                        </a>
                      ) : (
                        <span className="admin-muted">없음</span>
                      )}
                    </td>
                    <td className="is-actions">
                      <button
                        aria-label={`${game.awayTeamShortName} 대 ${game.homeTeamShortName} 경기 수정`}
                        className="admin-row-btn"
                        onClick={() => setEditor({ game, mode: 'edit' })}
                        type="button"
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination ? (
            <Pagination
              label="경기 페이지"
              onChange={setPage}
              page={pagination.page}
              totalPages={pagination.totalPages}
            />
          ) : null}
        </>
      )}

      {editor ? (
        <GameEditor
          editor={editor}
          key={editor.mode === 'edit' ? editor.game.id : 'create'}
          onClose={() => setEditor(null)}
          teams={teams}
        />
      ) : null}
    </section>
  );
}

function GameEditor({
  editor,
  teams,
  onClose,
}: {
  editor: EditorState;
  teams: Team[];
  onClose: () => void;
}) {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { notify, notifyError } = useAdminFeedback();
  const [form, setForm] = useState<GameForm>(
    editor.mode === 'edit' ? toForm(editor.game) : emptyForm,
  );
  const [formError, setFormError] = useState('');

  const saveMutation = useMutation({
    mutationFn: async (input: AdminGameInput) => {
      if (editor.mode === 'edit') {
        await updateAdminGame(editor.game.id, input, token);
      } else {
        await createAdminGame(input, token);
      }
    },
    onSuccess: () => {
      notify(editor.mode === 'edit' ? '경기 정보를 수정했습니다.' : '경기를 추가했습니다.');
      onClose();
      return invalidate(['admin', 'games']);
    },
    onError: (error) => {
      setFormError(errorMessage(error, '경기를 저장하지 못했습니다.'));
      notifyError(error, '경기를 저장하지 못했습니다.');
    },
  });

  function update<K extends keyof GameForm>(key: K, value: GameForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.homeTeamId && form.homeTeamId === form.awayTeamId) {
      setFormError('홈팀과 원정팀이 같습니다.');
      return;
    }
    setFormError('');
    saveMutation.mutate(toInput(form));
  }

  const teamOptions = teams.map((team) => (
    <option key={team.id} value={team.id}>
      {team.shortName}
    </option>
  ));

  return (
    <AdminDialog
      dismissOnBackdrop={false}
      eyebrow={editor.mode === 'edit' ? `경기 #${editor.game.id}` : '새 경기'}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} type="button">
            취소
          </button>
          <button className="btn btn-primary" disabled={saveMutation.isPending} form="admin-game-form" type="submit">
            {saveMutation.isPending ? '저장 중' : editor.mode === 'edit' ? '수정 저장' : '경기 추가'}
          </button>
        </>
      }
      onClose={onClose}
      open
      title={
        editor.mode === 'edit'
          ? `${editor.game.awayTeamShortName} @ ${editor.game.homeTeamShortName}`
          : '경기 추가'
      }
    >
      <form className="admin-form-grid" id="admin-game-form" onSubmit={handleSubmit}>
        <label className="admin-field">
          <span>경기 일시 (한국 시간)</span>
          <input
            className="admin-input"
            onChange={(event) => update('gameDate', event.target.value)}
            required
            type="datetime-local"
            value={form.gameDate}
          />
        </label>
        <label className="admin-field">
          <span>구장</span>
          <input
            autoComplete="off"
            className="admin-input"
            onChange={(event) => update('stadium', event.target.value)}
            placeholder="예: 잠실"
            required
            value={form.stadium}
          />
        </label>
        <label className="admin-field">
          <span>원정팀</span>
          <select
            className="admin-input"
            onChange={(event) => update('awayTeamId', event.target.value)}
            required
            value={form.awayTeamId}
          >
            <option value="">선택</option>
            {teamOptions}
          </select>
        </label>
        <label className="admin-field">
          <span>홈팀</span>
          <select
            className="admin-input"
            onChange={(event) => update('homeTeamId', event.target.value)}
            required
            value={form.homeTeamId}
          >
            <option value="">선택</option>
            {teamOptions}
          </select>
        </label>
        <label className="admin-field">
          <span>원정 점수</span>
          <input
            className="admin-input admin-input--num"
            inputMode="numeric"
            min={0}
            onChange={(event) => update('awayScore', event.target.value)}
            placeholder="-"
            type="number"
            value={form.awayScore}
          />
        </label>
        <label className="admin-field">
          <span>홈 점수</span>
          <input
            className="admin-input admin-input--num"
            inputMode="numeric"
            min={0}
            onChange={(event) => update('homeScore', event.target.value)}
            placeholder="-"
            type="number"
            value={form.homeScore}
          />
        </label>
        <label className="admin-field">
          <span>상태</span>
          <select
            className="admin-input"
            onChange={(event) => update('status', event.target.value)}
            value={form.status}
          >
            <option value="scheduled">예정</option>
            <option value="finished">종료</option>
            <option value="cancelled">취소</option>
          </select>
        </label>
        <label className="admin-field">
          <span>예매 오픈 (선택)</span>
          <input
            className="admin-input"
            onChange={(event) => update('ticketOpenAt', event.target.value)}
            type="datetime-local"
            value={form.ticketOpenAt}
          />
        </label>
        <label className="admin-field admin-field--full">
          <span>예매 링크 (선택)</span>
          <input
            autoComplete="off"
            className="admin-input"
            inputMode="url"
            onChange={(event) => update('ticketUrl', event.target.value)}
            placeholder="https://"
            spellCheck={false}
            type="url"
            value={form.ticketUrl}
          />
        </label>
        {formError ? (
          <p className="form-error admin-field--full" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </AdminDialog>
  );
}
