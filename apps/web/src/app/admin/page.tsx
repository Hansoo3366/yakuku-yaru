'use client';

import Link from 'next/link';
import {
  type Dispatch,
  FormEvent,
  Fragment,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  createAdminGame,
  deleteAdminComment,
  deleteAdminPost,
  deleteAdminUser,
  fetchAdminSummary,
  listAdminComments,
  listAdminGames,
  listAdminPosts,
  listAdminUsers,
  updateAdminGame,
  updateAdminUserEmailVerification,
  updateAdminUserRole,
  type AdminComment,
  type AdminGame,
  type AdminGameInput,
  type AdminPost,
  type AdminSummary,
  type AdminUser,
} from '@/lib/admin-api';
import { useAuthStore } from '@/lib/auth-store';
import { fetchMe } from '@/lib/auth-api';
import { listTeams, type Team } from '@/lib/baseball-api';
import { formatKoreanDateTimeShort } from '@/lib/date-format';
import {
  deleteAdminPlayerCheer,
  deleteAdminTeamCheer,
  listAdminTeamCheers,
  listAdminPlayerCheers,
  saveAdminTeamCheer,
  saveAdminPlayerCheer,
  type PlayerCheer,
  type PlayerCheerPagination,
  type PlayerCheerRosterScope,
  type TeamCheer,
} from '@/lib/player-cheer-api';

type AdminTab = 'users' | 'posts' | 'comments' | 'games' | 'cheers';

const emptyGameForm = {
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

type GameForm = typeof emptyGameForm;

const emptyCheerForm = {
  lyrics: '',
  title: '',
  youtubeId: '',
};

type CheerForm = typeof emptyCheerForm;

type CheerFilterInput = {
  keyword: string;
  page: number;
  rosterScope: PlayerCheerRosterScope;
  teamId: number | null;
};

function toInput(form: GameForm): AdminGameInput {
  return {
    awayScore: form.awayScore === '' ? null : Number(form.awayScore),
    awayTeamId: Number(form.awayTeamId),
    gameDate: form.gameDate,
    homeScore: form.homeScore === '' ? null : Number(form.homeScore),
    homeTeamId: Number(form.homeTeamId),
    stadium: form.stadium,
    status: form.status,
    ticketOpenAt: form.ticketOpenAt || null,
    ticketUrl: form.ticketUrl || null,
  };
}

function formatDate(value: string) {
  return formatKoreanDateTimeShort(value);
}

function CheerFormFields({
  cheerForm,
  setCheerForm,
  submitLabel,
}: {
  cheerForm: CheerForm;
  setCheerForm: Dispatch<SetStateAction<CheerForm>>;
  submitLabel: string;
}) {
  return (
    <>
      <label className="admin-cheer-field">
        <span>제목</span>
        <input
          autoComplete="off"
          name="cheerTitle"
          onChange={(event) =>
            setCheerForm((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          placeholder="응원가 제목…"
          value={cheerForm.title}
        />
      </label>
      <label className="admin-cheer-field">
        <span>유튜브 영상 ID</span>
        <input
          autoComplete="off"
          name="youtubeId"
          onChange={(event) =>
            setCheerForm((current) => ({
              ...current,
              youtubeId: event.target.value,
            }))
          }
          placeholder="예: dQw4w9WgXcQ…"
          spellCheck={false}
          value={cheerForm.youtubeId}
        />
      </label>
      <label className="admin-cheer-field">
        <span>가사</span>
        <textarea
          autoComplete="off"
          name="lyrics"
          onChange={(event) =>
            setCheerForm((current) => ({
              ...current,
              lyrics: event.target.value,
            }))
          }
          placeholder="가사 입력…"
          rows={8}
          value={cheerForm.lyrics}
        />
      </label>
      <button className="btn btn-primary" type="submit">
        {submitLabel}
      </button>
    </>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('users');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [playerCheers, setPlayerCheers] = useState<PlayerCheer[]>([]);
  const [teamCheers, setTeamCheers] = useState<TeamCheer[]>([]);
  const [playerCheerPagination, setPlayerCheerPagination] =
    useState<PlayerCheerPagination | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [keyword, setKeyword] = useState('');
  const [cheerKeyword, setCheerKeyword] = useState('');
  const [cheerTeamId, setCheerTeamId] = useState<number | null>(null);
  const [cheerPage, setCheerPage] = useState(1);
  const [cheerRosterScope, setCheerRosterScope] =
    useState<PlayerCheerRosterScope>('firstTeam');
  const [message, setMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheerSearching, setIsCheerSearching] = useState(false);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [gameForm, setGameForm] = useState<GameForm>(emptyGameForm);
  const [editingTeamCheerId, setEditingTeamCheerId] = useState<number | null>(null);
  const [editingCheerPlayerId, setEditingCheerPlayerId] = useState<number | null>(null);
  const [cheerForm, setCheerForm] = useState<CheerForm>(emptyCheerForm);
  const cheerFilterRef = useRef<CheerFilterInput>({
    keyword: '',
    page: 1,
    rosterScope: 'firstTeam',
    teamId: null,
  });
  const loadRequestIdRef = useRef(0);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    cheerFilterRef.current = {
      keyword: cheerKeyword,
      page: cheerPage,
      rosterScope: cheerRosterScope,
      teamId: cheerTeamId,
    };
  }, [cheerKeyword, cheerPage, cheerRosterScope, cheerTeamId]);

  const loadAll = useCallback(async (
    nextKeyword: string,
    cheerInput?: Partial<CheerFilterInput>,
  ) => {
    if (!token) return;
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const nextCheerInput = {
      ...cheerFilterRef.current,
      ...cheerInput,
    };
    const [
      summaryResponse,
      usersResponse,
      postsResponse,
      commentsResponse,
      gamesResponse,
      teamCheersResponse,
      cheersResponse,
    ] = await Promise.all([
        fetchAdminSummary(token),
        listAdminUsers(token, nextKeyword),
        listAdminPosts(token, nextKeyword),
        listAdminComments(token, nextKeyword),
        listAdminGames(token),
        listAdminTeamCheers(token),
        listAdminPlayerCheers(token, {
          keyword: nextCheerInput.keyword,
          page: nextCheerInput.page,
          rosterScope: nextCheerInput.rosterScope,
          size: 24,
          teamId: nextCheerInput.teamId,
        }),
      ]);
    if (requestId !== loadRequestIdRef.current) {
      return;
    }
    setSummary(summaryResponse);
    setUsers(usersResponse.items);
    setPosts(postsResponse.items);
    setComments(commentsResponse.items);
    setGames(gamesResponse.items);
    setTeamCheers(teamCheersResponse.items);
    setPlayerCheers(cheersResponse.items);
    setPlayerCheerPagination(cheersResponse.pagination);
  }, [token]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      setIsLoading(false);
      return;
    }

    Promise.all([fetchMe(token), listTeams()])
      .then(([me, teamResponse]) => {
        if (me.user.role !== 'admin') {
          setIsAdmin(false);
          return;
        }
        setIsAdmin(true);
        setCurrentUserId(me.user.id);
        setTeams(teamResponse.items);
        return loadAll('');
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setIsLoading(false));
  }, [hasHydrated, loadAll, token]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAll(keyword);
  }

  async function handleCheerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCheerSearching) {
      return;
    }
    setIsCheerSearching(true);
    setCheerPage(1);
    try {
      await loadAll(keyword, {
        keyword: cheerKeyword,
        page: 1,
        rosterScope: cheerRosterScope,
        teamId: cheerTeamId,
      });
    } finally {
      setIsCheerSearching(false);
    }
  }

  async function updateCheerPage(nextPage: number) {
    setCheerPage(nextPage);
    await loadAll(keyword, {
      keyword: cheerKeyword,
      page: nextPage,
      rosterScope: cheerRosterScope,
      teamId: cheerTeamId,
    });
  }

  function editGame(game: AdminGame) {
    setEditingGameId(game.id);
    setGameForm({
      awayScore: game.awayScore?.toString() ?? '',
      awayTeamId: String(game.awayTeamId),
      gameDate: game.gameDate.slice(0, 16),
      homeScore: game.homeScore?.toString() ?? '',
      homeTeamId: String(game.homeTeamId),
      stadium: game.stadium,
      status: game.status,
      ticketOpenAt: game.ticketOpenAt?.slice(0, 16) ?? '',
      ticketUrl: game.ticketUrl ?? '',
    });
  }

  function editCheer(player: PlayerCheer) {
    setEditingTeamCheerId(null);
    setEditingCheerPlayerId(player.playerId);
    setCheerForm({
      lyrics: player.lyrics ?? '',
      title: player.cheerTitle ?? '',
      youtubeId: player.youtubeId ?? '',
    });
  }

  function editTeamCheer(cheer: TeamCheer) {
    setEditingCheerPlayerId(null);
    setEditingTeamCheerId(cheer.teamId);
    setCheerForm({
      lyrics: cheer.lyrics ?? '',
      title: cheer.cheerTitle ?? '',
      youtubeId: cheer.youtubeId ?? '',
    });
  }

  async function submitGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (editingGameId) {
      await updateAdminGame(editingGameId, toInput(gameForm), token);
      setMessage('경기 정보가 수정되었습니다.');
    } else {
      await createAdminGame(toInput(gameForm), token);
      setMessage('경기가 추가되었습니다.');
    }
    setGameForm(emptyGameForm);
    setEditingGameId(null);
    await loadAll(keyword);
  }

  async function submitCheer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !editingCheerPlayerId) return;

    await saveAdminPlayerCheer(
      editingCheerPlayerId,
      {
        lyrics: cheerForm.lyrics.trim() || null,
        title: cheerForm.title.trim() || null,
        youtubeId: cheerForm.youtubeId.trim() || null,
        youtubeUrl: null,
      },
      token,
    );
    setMessage('응원가 정보가 저장되었습니다.');
    setEditingCheerPlayerId(null);
    setCheerForm(emptyCheerForm);
    await loadAll(keyword);
  }

  async function submitTeamCheer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !editingTeamCheerId) return;

    await saveAdminTeamCheer(
      editingTeamCheerId,
      {
        lyrics: cheerForm.lyrics.trim() || null,
        title: cheerForm.title.trim() || null,
        youtubeId: cheerForm.youtubeId.trim() || null,
        youtubeUrl: null,
      },
      token,
    );
    setMessage('팀 응원가 정보가 저장되었습니다.');
    setEditingTeamCheerId(null);
    setCheerForm(emptyCheerForm);
    await loadAll(keyword);
  }

  if (isLoading) {
    return <main className="app-shell">관리자 데이터를 불러오는 중입니다.</main>;
  }

  if (!token || !isAdmin) {
    return (
      <main className="app-shell">
        <section className="card stack">
          <h1>관리자 권한이 필요합니다</h1>
          <p className="muted">관리자 계정으로 로그인한 뒤 다시 접근해주세요.</p>
          <Link className="btn btn-primary" href="/login">
            로그인
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell">
      <header className="app-page-header">
        <span className="eyebrow">Admin</span>
        <h1>운영 관리</h1>
        <p>사용자, 게시판, KBO 경기 데이터를 관리합니다.</p>
      </header>

      <section className="admin-summary-grid">
        {summary
          ? Object.entries(summary).map(([key, value]) => (
              <div className="admin-summary-card" key={key}>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))
          : null}
      </section>

      <form className="admin-toolbar" onSubmit={handleSearch}>
        <div className="admin-tabs" role="tablist" aria-label="관리 메뉴">
          {(['users', 'posts', 'comments', 'games', 'cheers'] as const).map((item) => (
            <button
              className={tab === item ? 'active' : ''}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <input
          aria-label="관리 데이터 검색"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="유저, 게시글, 댓글 검색"
          value={keyword}
        />
        <button className="btn btn-secondary" type="submit">
          검색
        </button>
      </form>

      {message ? <p className="form-success">{message}</p> : null}

      {tab === 'users' ? (
        <section className="admin-table-card">
          <h2>유저 관리</h2>
          <div className="admin-table">
            {users.map((user) => (
              <div className="admin-row admin-row--user" key={user.id}>
                <strong>{user.nickname}</strong>
                <span>{user.email}</span>
                <span>{user.favoriteTeamShortName ?? '팀 없음'}</span>
                <span>글 {user.postCount} / 댓글 {user.commentCount}</span>
                <select
                  aria-label={`${user.nickname} 역할`}
                  onChange={async (event) => {
                    if (!token) return;
                    await updateAdminUserRole(user.id, event.target.value, token);
                    setMessage('사용자 역할이 변경되었습니다.');
                    await loadAll(keyword);
                  }}
                  value={user.role}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <select
                  aria-label={`${user.nickname} 이메일 인증`}
                  onChange={async (event) => {
                    if (!token) return;
                    await updateAdminUserEmailVerification(
                      user.id,
                      event.target.value === 'verified',
                      token,
                    );
                    setMessage('이메일 인증 상태가 변경되었습니다.');
                    await loadAll(keyword);
                  }}
                  value={user.emailVerifiedAt ? 'verified' : 'unverified'}
                >
                  <option value="verified">인증됨</option>
                  <option value="unverified">미인증</option>
                </select>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={user.id === currentUserId}
                  onClick={async () => {
                    if (!token || user.id === currentUserId) return;
                    const ok = window.confirm(
                      `${user.nickname} 사용자를 삭제할까요? 게시글, 댓글, 직관 기록도 함께 삭제될 수 있어요.`,
                    );
                    if (!ok) return;
                    await deleteAdminUser(user.id, token);
                    setMessage('사용자가 삭제되었습니다.');
                    await loadAll(keyword);
                  }}
                  type="button"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'posts' ? (
        <section className="admin-table-card">
          <h2>게시글 관리</h2>
          <div className="admin-table">
            {posts.map((post) => (
              <div className="admin-row" key={post.id}>
                <Link href={`/posts/${post.id}`}>{post.title}</Link>
                <span>{post.authorNickname}</span>
                <span>댓글 {post.commentCount}</span>
                <time>{formatDate(post.createdAt)}</time>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    if (!token || !window.confirm('게시글을 삭제할까요?')) return;
                    await deleteAdminPost(post.id, token);
                    await loadAll(keyword);
                  }}
                  type="button"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'comments' ? (
        <section className="admin-table-card">
          <h2>댓글 관리</h2>
          <div className="admin-table">
            {comments.map((comment) => (
              <div className="admin-row" key={comment.id}>
                <span>{comment.content}</span>
                <Link href={`/posts/${comment.postId}`}>{comment.postTitle}</Link>
                <span>{comment.authorNickname}</span>
                <time>{formatDate(comment.createdAt)}</time>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    if (!token || !window.confirm('댓글을 삭제할까요?')) return;
                    await deleteAdminComment(comment.id, token);
                    await loadAll(keyword);
                  }}
                  type="button"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'cheers' ? (
        <section className="admin-table-card">
          <h2>응원가 관리</h2>
          <div className="admin-cheer-section-head">
            <div>
              <strong>팀 전체 응원가</strong>
              <p>라인업과 응원가 페이지에서 팀명 옆 버튼으로 노출됩니다.</p>
            </div>
          </div>
          <div className="admin-cheer-team-grid">
            {teamCheers.map((teamCheer) => (
              <article className="admin-team-cheer-card" key={teamCheer.teamId}>
                <div className="admin-team-cheer-card-main">
                  <span
                    className={`cheer-player-badge${
                      teamCheer.cheerId ? ' is-registered' : ''
                    }`}
                  >
                    {teamCheer.cheerId ? '등록됨' : '미등록'}
                  </span>
                  <strong>{teamCheer.teamShortName}</strong>
                  <p>{teamCheer.cheerTitle ?? '팀 전체 응원가 제목 없음'}</p>
                </div>
                <div className="admin-team-cheer-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => editTeamCheer(teamCheer)}
                    type="button"
                  >
                    {teamCheer.cheerId ? '수정' : '등록'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!teamCheer.cheerId}
                    onClick={async () => {
                      if (
                        !token ||
                        !teamCheer.cheerId ||
                        !window.confirm(
                          `${teamCheer.teamShortName} 팀 응원가 정보를 삭제할까요?`,
                        )
                      ) {
                        return;
                      }
                      await deleteAdminTeamCheer(teamCheer.teamId, token);
                      setMessage('팀 응원가 정보가 삭제되었습니다.');
                      await loadAll(keyword);
                    }}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
                {editingTeamCheerId === teamCheer.teamId ? (
                  <form
                    className="admin-cheer-form admin-cheer-form--panel"
                    onSubmit={submitTeamCheer}
                  >
                    <div className="admin-cheer-form-head">
                      <strong>{teamCheer.teamShortName} 팀 응원가</strong>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditingTeamCheerId(null);
                          setCheerForm(emptyCheerForm);
                        }}
                        type="button"
                      >
                        취소
                      </button>
                    </div>
                    <CheerFormFields
                      cheerForm={cheerForm}
                      setCheerForm={setCheerForm}
                      submitLabel="팀 응원가 저장"
                    />
                  </form>
                ) : null}
              </article>
            ))}
          </div>

          <div className="admin-cheer-section-head">
            <div>
              <strong>선수 응원가</strong>
              <p>선수를 검색하거나 팀/범위로 좁혀 개별 응원가를 등록합니다.</p>
            </div>
          </div>
          <form className="admin-cheer-filter" onSubmit={handleCheerSearch}>
            <label>
              <span>선수 검색</span>
              <input
                autoComplete="off"
                name="adminCheerKeyword"
                onChange={(event) => setCheerKeyword(event.target.value)}
                placeholder="선수명 또는 팀명 검색…"
                spellCheck={false}
                value={cheerKeyword}
              />
            </label>
            <label>
              <span>팀</span>
              <select
                name="adminCheerTeam"
                onChange={(event) => {
                  const nextTeamId = event.target.value
                    ? Number(event.target.value)
                    : null;
                  setCheerTeamId(nextTeamId);
                  setCheerPage(1);
                }}
                value={cheerTeamId ?? ''}
              >
                <option value="">전체 팀</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.shortName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>범위</span>
              <select
                name="adminCheerScope"
                onChange={(event) => {
                  const nextScope = event.target.value as PlayerCheerRosterScope;
                  setCheerRosterScope(nextScope);
                  setCheerPage(1);
                }}
                value={cheerRosterScope}
              >
                <option value="firstTeam">1군 경기 기준</option>
                <option value="all">전체 선수</option>
              </select>
            </label>
            <button
              className="btn btn-secondary"
              disabled={isCheerSearching}
              type="submit"
            >
              {isCheerSearching ? '검색 중' : '검색'}
            </button>
          </form>
          {!editingCheerPlayerId ? (
            <p className="muted">
              선수 행의 등록/수정 버튼을 누르면 응원가 정보를 입력할 수 있습니다.
            </p>
          ) : null}

          <div className="admin-table">
            {playerCheers.map((player) => (
              <Fragment key={player.playerId}>
                <div className="admin-row admin-row--cheer">
                  <strong>{player.name}</strong>
                  <span>
                    {player.teamShortName}
                    {player.backNumber ? ` · No.${player.backNumber}` : ''}
                    {player.position ? ` · ${player.position}` : ''}
                  </span>
                  <span>{player.cheerId ? '등록됨' : '미등록'}</span>
                  <span>{player.cheerTitle ?? '-'}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => editCheer(player)}
                    type="button"
                  >
                    {player.cheerId ? '수정' : '등록'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!player.cheerId}
                    onClick={async () => {
                      if (
                        !token ||
                        !player.cheerId ||
                        !window.confirm(`${player.name} 응원가 정보를 삭제할까요?`)
                      ) {
                        return;
                      }
                      await deleteAdminPlayerCheer(player.playerId, token);
                      setMessage('응원가 정보가 삭제되었습니다.');
                      await loadAll(keyword);
                    }}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
                {editingCheerPlayerId === player.playerId ? (
                  <form
                    className="admin-cheer-form admin-cheer-form--panel"
                    onSubmit={submitCheer}
                  >
                    <div className="admin-cheer-form-head">
                      <strong>{player.name}</strong>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditingCheerPlayerId(null);
                          setCheerForm(emptyCheerForm);
                        }}
                        type="button"
                      >
                        취소
                      </button>
                    </div>
                    <CheerFormFields
                      cheerForm={cheerForm}
                      setCheerForm={setCheerForm}
                      submitLabel="선수 응원가 저장"
                    />
                  </form>
                ) : null}
              </Fragment>
            ))}
          </div>
          {playerCheerPagination && playerCheerPagination.totalPages > 1 ? (
            <nav className="cheers-pagination" aria-label="응원가 관리 페이지">
              <button
                className="btn btn-ghost btn-sm"
                disabled={playerCheerPagination.page <= 1}
                onClick={() =>
                  updateCheerPage(Math.max(1, playerCheerPagination.page - 1))
                }
                type="button"
              >
                이전
              </button>
              <span>
                {playerCheerPagination.page} / {playerCheerPagination.totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={
                  playerCheerPagination.page >= playerCheerPagination.totalPages
                }
                onClick={() =>
                  updateCheerPage(
                    Math.min(
                      playerCheerPagination.totalPages,
                      playerCheerPagination.page + 1,
                    ),
                  )
                }
                type="button"
              >
                다음
              </button>
            </nav>
          ) : null}
        </section>
      ) : null}

      {tab === 'games' ? (
        <section className="admin-table-card">
          <h2>KBO 경기 데이터 관리</h2>
          <form className="admin-game-form" onSubmit={submitGame}>
            <input
              onChange={(event) =>
                setGameForm((current) => ({ ...current, gameDate: event.target.value }))
              }
              required
              type="datetime-local"
              value={gameForm.gameDate}
            />
            <input
              onChange={(event) =>
                setGameForm((current) => ({ ...current, stadium: event.target.value }))
              }
              placeholder="구장"
              required
              value={gameForm.stadium}
            />
            <select
              onChange={(event) =>
                setGameForm((current) => ({ ...current, homeTeamId: event.target.value }))
              }
              required
              value={gameForm.homeTeamId}
            >
              <option value="">홈팀</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.shortName}
                </option>
              ))}
            </select>
            <select
              onChange={(event) =>
                setGameForm((current) => ({ ...current, awayTeamId: event.target.value }))
              }
              required
              value={gameForm.awayTeamId}
            >
              <option value="">원정팀</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.shortName}
                </option>
              ))}
            </select>
            <input
              onChange={(event) =>
                setGameForm((current) => ({ ...current, homeScore: event.target.value }))
              }
              placeholder="홈 점수"
              type="number"
              value={gameForm.homeScore}
            />
            <input
              onChange={(event) =>
                setGameForm((current) => ({ ...current, awayScore: event.target.value }))
              }
              placeholder="원정 점수"
              type="number"
              value={gameForm.awayScore}
            />
            <select
              onChange={(event) =>
                setGameForm((current) => ({ ...current, status: event.target.value }))
              }
              value={gameForm.status}
            >
              <option value="scheduled">scheduled</option>
              <option value="finished">finished</option>
              <option value="cancelled">cancelled</option>
            </select>
            <input
              onChange={(event) =>
                setGameForm((current) => ({ ...current, ticketUrl: event.target.value }))
              }
              placeholder="예매 URL"
              value={gameForm.ticketUrl}
            />
            <input
              onChange={(event) =>
                setGameForm((current) => ({ ...current, ticketOpenAt: event.target.value }))
              }
              type="datetime-local"
              value={gameForm.ticketOpenAt}
            />
            <button className="btn btn-primary" type="submit">
              {editingGameId ? '경기 수정' : '경기 추가'}
            </button>
          </form>

          <div className="admin-table">
            {games.map((game) => (
              <div className="admin-row" key={game.id}>
                <strong>
                  {game.homeTeamShortName} vs {game.awayTeamShortName}
                </strong>
                <span>{game.stadium}</span>
                <time>{formatDate(game.gameDate)}</time>
                <span>
                  {game.homeScore ?? '-'} : {game.awayScore ?? '-'} / {game.status}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => editGame(game)}
                  type="button"
                >
                  수정
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
