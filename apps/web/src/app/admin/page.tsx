'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { getAccessToken } from '@/lib/auth';
import { fetchMe } from '@/lib/auth-api';
import { listTeams, type Team } from '@/lib/baseball-api';

type AdminTab = 'users' | 'posts' | 'comments' | 'games';

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
  return new Date(value).toLocaleString('ko-KR');
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('users');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [keyword, setKeyword] = useState('');
  const [message, setMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [gameForm, setGameForm] = useState<GameForm>(emptyGameForm);

  const token = useMemo(() => getAccessToken(), []);

  async function loadAll(nextKeyword = keyword) {
    if (!token) return;
    const [summaryResponse, usersResponse, postsResponse, commentsResponse, gamesResponse] =
      await Promise.all([
        fetchAdminSummary(token),
        listAdminUsers(token, nextKeyword),
        listAdminPosts(token, nextKeyword),
        listAdminComments(token, nextKeyword),
        listAdminGames(token),
      ]);
    setSummary(summaryResponse);
    setUsers(usersResponse.items);
    setPosts(postsResponse.items);
    setComments(commentsResponse.items);
    setGames(gamesResponse.items);
  }

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAll(keyword);
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
    await loadAll();
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
          {(['users', 'posts', 'comments', 'games'] as const).map((item) => (
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
                    await loadAll();
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
                    await loadAll();
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
                    await loadAll();
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
                    await loadAll();
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
                    await loadAll();
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
