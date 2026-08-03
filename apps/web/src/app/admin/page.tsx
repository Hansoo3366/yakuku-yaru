'use client';

/* eslint-disable @next/next/no-img-element */

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
  clearAdminAttendancePhoto,
  clearAdminUserProfileImage,
  createAdminGame,
  deleteAdminAttendanceRecord,
  deleteAdminComment,
  deleteAdminPost,
  deleteAdminUser,
  fetchAdminSummary,
  listAdminAttendanceRecords,
  listAdminComments,
  listAdminGames,
  listAdminPosts,
  listAdminReports,
  listAdminUsers,
  updateAdminGame,
  updateAdminPostModeration,
  updateAdminReport,
  updateAdminUserEmailVerification,
  updateAdminUserRole,
  type AdminAttendanceRecord,
  type AdminComment,
  type AdminGame,
  type AdminGameInput,
  type AdminPagination,
  type AdminPost,
  type AdminReport,
  type AdminSummary,
  type AdminUser,
} from '@/lib/admin-api';
import { getAssetUrl } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { fetchMe } from '@/lib/auth-api';
import { listTeams, type Team } from '@/lib/baseball-api';
import { formatKoreanDateTimeShort } from '@/lib/date-format';
import { FEATURE_STATUS_LABELS, POST_CATEGORY_LABELS } from '@/lib/post-meta';
import {
  deleteAdminPlayerCheer,
  deleteAdminTeamCheer,
  listAdminTeamCheers,
  listAdminPlayerCheers,
  saveAdminTeamCheer,
  saveAdminPlayerCheer,
  getPlayerCheerType,
  type PlayerCheer,
  type PlayerCheerPagination,
  type PlayerCheerRosterScope,
  type TeamCheer,
} from '@/lib/player-cheer-api';

type AdminTab =
  | 'users'
  | 'posts'
  | 'comments'
  | 'media'
  | 'reports'
  | 'games'
  | 'cheers';

const ADMIN_TAB_LABELS: Record<AdminTab, string> = {
  users: '사용자',
  posts: '게시글',
  comments: '댓글',
  media: '이미지',
  reports: '신고',
  games: '경기',
  cheers: '응원가',
};

const ADMIN_TABS: AdminTab[] = [
  'users',
  'posts',
  'comments',
  'media',
  'reports',
  'games',
  'cheers',
];

const SUMMARY_LABELS: Record<keyof AdminSummary, string> = {
  users: '사용자',
  posts: '게시글',
  comments: '댓글',
  games: 'KBO 경기 일정',
  pendingReports: '처리 대기 신고',
  photos: '직관 이미지',
};

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

type PostFilterInput = {
  category: string;
  page: number;
  pin: string;
};

type GameFilterInput = {
  page: number;
  status: string;
};

type EditingCheerTarget =
  | { kind: 'team'; id: number; label: string }
  | { kind: 'player'; id: number; label: string; autoTitle: string };

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
  autoTitle,
  cheerForm,
  setCheerForm,
}: {
  autoTitle?: string;
  cheerForm: CheerForm;
  setCheerForm: Dispatch<SetStateAction<CheerForm>>;
}) {
  return (
    <>
      {autoTitle ? (
        <div className="admin-cheer-auto-title">
          <span>곡 구분 자동 입력</span>
          <strong>{autoTitle}</strong>
          <p>선수 포지션을 기준으로 저장됩니다.</p>
        </div>
      ) : (
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
            placeholder="팀 응원가 제목…"
            value={cheerForm.title}
          />
        </label>
      )}
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
    </>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('users');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postPagination, setPostPagination] = useState<AdminPagination | null>(
    null,
  );
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AdminAttendanceRecord[]
  >([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [gamePagination, setGamePagination] = useState<AdminPagination | null>(
    null,
  );
  const [playerCheers, setPlayerCheers] = useState<PlayerCheer[]>([]);
  const [teamCheers, setTeamCheers] = useState<TeamCheer[]>([]);
  const [playerCheerPagination, setPlayerCheerPagination] =
    useState<PlayerCheerPagination | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [keyword, setKeyword] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userVerificationFilter, setUserVerificationFilter] = useState('all');
  const [postCategoryFilter, setPostCategoryFilter] = useState('all');
  const [postPinFilter, setPostPinFilter] = useState('all');
  const [postPage, setPostPage] = useState(1);
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [gameStatusFilter, setGameStatusFilter] = useState('all');
  const [gamePage, setGamePage] = useState(1);
  const [cheerKeyword, setCheerKeyword] = useState('');
  const [cheerTeamId, setCheerTeamId] = useState<number | null>(null);
  const [cheerPage, setCheerPage] = useState(1);
  const [cheerRosterScope, setCheerRosterScope] =
    useState<PlayerCheerRosterScope>('firstTeam');
  const [message, setMessage] = useState('');
  const [postError, setPostError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheerSearching, setIsCheerSearching] = useState(false);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [gameForm, setGameForm] = useState<GameForm>(emptyGameForm);
  const [editingCheerTarget, setEditingCheerTarget] =
    useState<EditingCheerTarget | null>(null);
  const [cheerForm, setCheerForm] = useState<CheerForm>(emptyCheerForm);
  const cheerFilterRef = useRef<CheerFilterInput>({
    keyword: '',
    page: 1,
    rosterScope: 'firstTeam',
    teamId: null,
  });
  const postFilterRef = useRef<PostFilterInput>({
    category: 'all',
    page: 1,
    pin: 'all',
  });
  const gameFilterRef = useRef<GameFilterInput>({
    page: 1,
    status: 'all',
  });
  const loadRequestIdRef = useRef(0);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    function syncTabWithHash() {
      const nextTab = window.location.hash.slice(1) as AdminTab;
      if (ADMIN_TABS.includes(nextTab)) {
        setTab(nextTab);
      }
    }

    syncTabWithHash();
    window.addEventListener('hashchange', syncTabWithHash);
    return () => window.removeEventListener('hashchange', syncTabWithHash);
  }, []);

  useEffect(() => {
    gameFilterRef.current = {
      page: gamePage,
      status: gameStatusFilter,
    };
  }, [gamePage, gameStatusFilter]);

  useEffect(() => {
    postFilterRef.current = {
      category: postCategoryFilter,
      page: postPage,
      pin: postPinFilter,
    };
  }, [postCategoryFilter, postPage, postPinFilter]);

  useEffect(() => {
    cheerFilterRef.current = {
      keyword: cheerKeyword,
      page: cheerPage,
      rosterScope: cheerRosterScope,
      teamId: cheerTeamId,
    };
  }, [cheerKeyword, cheerPage, cheerRosterScope, cheerTeamId]);

  const loadAll = useCallback(
    async (
      nextKeyword: string,
      cheerInput?: Partial<CheerFilterInput>,
      postInput?: Partial<PostFilterInput>,
      gameInput?: Partial<GameFilterInput>,
    ) => {
      if (!token) return;
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      const nextCheerInput = {
        ...cheerFilterRef.current,
        ...cheerInput,
      };
      const nextPostInput = {
        ...postFilterRef.current,
        ...postInput,
      };
      const nextGameInput = {
        ...gameFilterRef.current,
        ...gameInput,
      };
      const [
        summaryResponse,
        usersResponse,
        postsResponse,
        commentsResponse,
        attendanceResponse,
        reportsResponse,
        gamesResponse,
        teamCheersResponse,
        cheersResponse,
      ] = await Promise.all([
        fetchAdminSummary(token),
        listAdminUsers(token, nextKeyword),
        listAdminPosts(token, {
          category: nextPostInput.category,
          keyword: nextKeyword,
          page: nextPostInput.page,
          pin: nextPostInput.pin,
          size: 20,
        }),
        listAdminComments(token, nextKeyword),
        listAdminAttendanceRecords(token, nextKeyword),
        listAdminReports(token),
        listAdminGames(token, {
          page: nextGameInput.page,
          size: 25,
          status: nextGameInput.status,
        }),
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
      setPostPagination(postsResponse.pagination);
      setComments(commentsResponse.items);
      setAttendanceRecords(attendanceResponse.items);
      setReports(reportsResponse.items);
      setGames(gamesResponse.items);
      setGamePagination(gamesResponse.pagination);
      setTeamCheers(teamCheersResponse.items);
      setPlayerCheers(cheersResponse.items);
      setPlayerCheerPagination(cheersResponse.pagination);
    },
    [token],
  );

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
    setPostPage(1);
    await loadAll(keyword, undefined, { page: 1 });
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

  async function updatePostPage(nextPage: number) {
    setPostPage(nextPage);
    await loadAll(keyword, undefined, { page: nextPage });
  }

  async function updateGamePage(nextPage: number) {
    setGamePage(nextPage);
    await loadAll(keyword, undefined, undefined, { page: nextPage });
  }

  async function savePostModeration(
    post: AdminPost,
    input: Partial<Pick<AdminPost, 'category' | 'isPinned' | 'requestStatus'>>,
  ) {
    if (!token) return;

    setPostError('');
    try {
      await updateAdminPostModeration(
        post.id,
        {
          category: input.category ?? post.category,
          isPinned: input.isPinned ?? post.isPinned,
          requestStatus:
            input.requestStatus === undefined
              ? post.requestStatus
              : input.requestStatus,
        },
        token,
      );
      setMessage('게시글 관리 설정을 저장했습니다.');
      await loadAll(keyword);
    } catch (error) {
      setMessage('');
      setPostError(
        error instanceof Error
          ? error.message
          : '게시글 관리 설정을 저장하지 못했습니다.',
      );
    }
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
    const autoTitle = getPlayerCheerType(player);
    setEditingCheerTarget({
      kind: 'player',
      id: player.playerId,
      label: `${player.name}${player.kboPlayerId ? ` · KBO ${player.kboPlayerId}` : ''}`,
      autoTitle,
    });
    setCheerForm({
      lyrics: player.lyrics ?? '',
      title: autoTitle,
      youtubeId: player.youtubeId ?? '',
    });
  }

  function editTeamCheer(cheer: TeamCheer) {
    setEditingCheerTarget({
      kind: 'team',
      id: cheer.teamId,
      label: `${cheer.teamShortName} 팀 응원가`,
    });
    setCheerForm({
      lyrics: cheer.lyrics ?? '',
      title: cheer.cheerTitle ?? '',
      youtubeId: cheer.youtubeId ?? '',
    });
  }

  function closeCheerEditor() {
    setEditingCheerTarget(null);
    setCheerForm(emptyCheerForm);
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
    if (!token || !editingCheerTarget) return;

    const input = {
      lyrics: cheerForm.lyrics.trim() || null,
      title:
        editingCheerTarget.kind === 'player'
          ? editingCheerTarget.autoTitle
          : cheerForm.title.trim() || '팀 응원가',
      youtubeId: cheerForm.youtubeId.trim() || null,
      youtubeUrl: null,
    };

    if (editingCheerTarget.kind === 'team') {
      await saveAdminTeamCheer(editingCheerTarget.id, input, token);
      setMessage('팀 응원가 정보가 저장되었습니다.');
    } else {
      await saveAdminPlayerCheer(editingCheerTarget.id, input, token);
      setMessage('선수 응원가 정보가 저장되었습니다.');
    }

    closeCheerEditor();
    await loadAll(keyword);
  }

  const visibleUsers = users.filter(
    (user) =>
      (userRoleFilter === 'all' || user.role === userRoleFilter) &&
      (userVerificationFilter === 'all' ||
        (userVerificationFilter === 'verified'
          ? Boolean(user.emailVerifiedAt)
          : !user.emailVerifiedAt)),
  );
  const visiblePosts = posts;
  const visibleAttendanceRecords = attendanceRecords.filter(
    (record) =>
      record.photoUrl &&
      (mediaTypeFilter === 'all' || record.watchType === mediaTypeFilter),
  );
  const visibleReports = reports.filter(
    (report) =>
      reportStatusFilter === 'all' || report.status === reportStatusFilter,
  );
  const visibleGames = games;

  if (isLoading) {
    return (
      <main className="app-shell">관리자 데이터를 불러오는 중입니다.</main>
    );
  }

  if (!token || !isAdmin) {
    return (
      <main className="app-shell">
        <section className="card stack">
          <h1>관리자 권한이 필요합니다</h1>
          <p className="muted">
            관리자 계정으로 로그인한 뒤 다시 접근해주세요.
          </p>
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
        <p>사용자 콘텐츠와 신고, 이미지, KBO 경기 데이터를 검수·관리합니다.</p>
      </header>

      <section className="admin-summary-grid">
        {summary
          ? Object.entries(summary).map(([key, value]) => (
              <div className="admin-summary-card" key={key}>
                <span>{SUMMARY_LABELS[key as keyof AdminSummary]}</span>
                <strong>{value}</strong>
              </div>
            ))
          : null}
      </section>

      <form className="admin-toolbar" onSubmit={handleSearch}>
        <div className="admin-tabs" role="tablist" aria-label="관리 메뉴">
          {ADMIN_TABS.map((item) => (
            <button
              className={tab === item ? 'active' : ''}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              {ADMIN_TAB_LABELS[item]}
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

      {tab !== 'comments' && tab !== 'cheers' ? (
        <section className="admin-filter-rail" aria-label="현재 목록 필터">
          <div>
            <span>FILTER</span>
            <strong>{ADMIN_TAB_LABELS[tab]} 보기 조건</strong>
          </div>
          {tab === 'users' ? (
            <>
              <label>
                <span>역할</span>
                <select
                  onChange={(event) => setUserRoleFilter(event.target.value)}
                  value={userRoleFilter}
                >
                  <option value="all">전체 역할</option>
                  <option value="user">일반 사용자</option>
                  <option value="admin">관리자</option>
                </select>
              </label>
              <label>
                <span>이메일 인증</span>
                <select
                  onChange={(event) =>
                    setUserVerificationFilter(event.target.value)
                  }
                  value={userVerificationFilter}
                >
                  <option value="all">전체 상태</option>
                  <option value="verified">인증됨</option>
                  <option value="unverified">미인증</option>
                </select>
              </label>
              <b>{visibleUsers.length}명</b>
            </>
          ) : null}
          {tab === 'posts' ? (
            <>
              <label>
                <span>글 종류</span>
                <select
                  onChange={(event) => {
                    const nextCategory = event.target.value;
                    setPostCategoryFilter(nextCategory);
                    setPostPage(1);
                    void loadAll(keyword, undefined, {
                      category: nextCategory,
                      page: 1,
                    });
                  }}
                  value={postCategoryFilter}
                >
                  <option value="all">전체 글</option>
                  {Object.entries(POST_CATEGORY_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                <span>고정 상태</span>
                <select
                  onChange={(event) => {
                    const nextPin = event.target.value;
                    setPostPinFilter(nextPin);
                    setPostPage(1);
                    void loadAll(keyword, undefined, {
                      page: 1,
                      pin: nextPin,
                    });
                  }}
                  value={postPinFilter}
                >
                  <option value="all">전체 상태</option>
                  <option value="pinned">상단 고정</option>
                  <option value="unpinned">일반 글</option>
                </select>
              </label>
              <b>{postPagination?.total ?? visiblePosts.length}건</b>
            </>
          ) : null}
          {tab === 'media' ? (
            <>
              <label>
                <span>관람 유형</span>
                <select
                  onChange={(event) => setMediaTypeFilter(event.target.value)}
                  value={mediaTypeFilter}
                >
                  <option value="all">전체 이미지</option>
                  <option value="stadium">직관</option>
                  <option value="home">집관</option>
                </select>
              </label>
              <b>{visibleAttendanceRecords.length}건</b>
            </>
          ) : null}
          {tab === 'reports' ? (
            <>
              <label>
                <span>처리 상태</span>
                <select
                  onChange={(event) =>
                    setReportStatusFilter(event.target.value)
                  }
                  value={reportStatusFilter}
                >
                  <option value="all">전체 신고</option>
                  <option value="pending">처리 대기</option>
                  <option value="reviewing">확인 중</option>
                  <option value="resolved">조치 완료</option>
                  <option value="dismissed">문제 없음</option>
                </select>
              </label>
              <b>{visibleReports.length}건</b>
            </>
          ) : null}
          {tab === 'games' ? (
            <>
              <label>
                <span>경기 상태</span>
                <select
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    setGameStatusFilter(nextStatus);
                    setGamePage(1);
                    void loadAll(keyword, undefined, undefined, {
                      page: 1,
                      status: nextStatus,
                    });
                  }}
                  value={gameStatusFilter}
                >
                  <option value="all">전체 경기</option>
                  <option value="scheduled">예정</option>
                  <option value="finished">종료</option>
                  <option value="cancelled">취소</option>
                </select>
              </label>
              <b>{gamePagination?.total ?? visibleGames.length}건</b>
            </>
          ) : null}
        </section>
      ) : null}

      {postError ? (
        <p className="form-error" role="alert">
          {postError}
        </p>
      ) : null}
      {message ? <p className="form-success">{message}</p> : null}

      {tab === 'users' ? (
        <section className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>유저 관리</h2>
              <p>
                가입 정보와 권한을 확인하고, 부적절하거나 권리를 침해하는 프로필
                사진을 내릴 수 있습니다.
              </p>
            </div>
          </div>
          <div className="admin-table">
            {visibleUsers.map((user) => (
              <div className="admin-row admin-row--user" key={user.id}>
                <span className="admin-user-cell">
                  {user.profileImageUrl ? (
                    <img alt="" src={getAssetUrl(user.profileImageUrl)} />
                  ) : (
                    <i aria-hidden="true">{user.nickname.slice(0, 1)}</i>
                  )}
                  <span className="admin-user-copy">
                    <strong>{user.nickname}</strong>
                    <small>
                      가입{' '}
                      <time dateTime={user.createdAt}>
                        {formatDate(user.createdAt)}
                      </time>
                    </small>
                  </span>
                </span>
                <span>{user.email}</span>
                <span>{user.favoriteTeamShortName ?? '팀 없음'}</span>
                <span>
                  글 {user.postCount} / 댓글 {user.commentCount}
                </span>
                <select
                  aria-label={`${user.nickname} 역할`}
                  onChange={async (event) => {
                    if (!token) return;
                    await updateAdminUserRole(
                      user.id,
                      event.target.value,
                      token,
                    );
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
                {user.profileImageUrl ? (
                  <button
                    className="btn btn-ghost btn-sm admin-profile-photo-action"
                    onClick={async () => {
                      if (
                        !token ||
                        !window.confirm(
                          `${user.nickname}님의 프로필 사진을 내릴까요? 부적절하거나 권리 침해가 있는 사진을 비공개 처리할 때 사용하는 기능입니다.`,
                        )
                      ) {
                        return;
                      }
                      await clearAdminUserProfileImage(user.id, token);
                      setMessage('프로필 사진을 내렸습니다.');
                      await loadAll(keyword);
                    }}
                    title="부적절하거나 권리를 침해하는 프로필 사진을 내립니다."
                    type="button"
                  >
                    사진 내리기
                  </button>
                ) : (
                  <span className="admin-profile-photo-empty">기본 이미지</span>
                )}
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
            {!visibleUsers.length ? (
              <p className="admin-filter-empty">
                조건에 맞는 사용자가 없습니다.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'posts' ? (
        <section className="admin-table-card">
          <h2>게시글 관리</h2>
          <div className="admin-table">
            {visiblePosts.map((post) => (
              <article className="admin-content-card" key={post.id}>
                <div className="admin-content-card-head">
                  <div>
                    <span>{POST_CATEGORY_LABELS[post.category]}</span>
                    <Link href={`/posts/${post.id}`}>{post.title}</Link>
                    <small>
                      {post.authorNickname} · 댓글 {post.commentCount} ·{' '}
                      {formatDate(post.createdAt)}
                    </small>
                  </div>
                  {post.authorProfileImageUrl ? (
                    <img
                      alt={`${post.authorNickname} 프로필`}
                      src={getAssetUrl(post.authorProfileImageUrl)}
                    />
                  ) : null}
                </div>
                <p>{post.content}</p>
                <div className="admin-moderation-controls">
                  <select
                    aria-label={`${post.title} 분류`}
                    onChange={(event) => {
                      const category = event.target
                        .value as AdminPost['category'];
                      void savePostModeration(post, {
                        category,
                        requestStatus:
                          category === 'feature'
                            ? (post.requestStatus ?? 'received')
                            : null,
                      });
                    }}
                    value={post.category}
                  >
                    {Object.entries(POST_CATEGORY_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                  {post.category === 'feature' ? (
                    <select
                      aria-label={`${post.title} 처리 상태`}
                      onChange={(event) => {
                        void savePostModeration(post, {
                          requestStatus: event.target
                            .value as AdminPost['requestStatus'],
                        });
                      }}
                      value={post.requestStatus ?? 'received'}
                    >
                      {Object.entries(FEATURE_STATUS_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  ) : null}
                  <label className="admin-pin-control">
                    <input
                      checked={post.isPinned}
                      onChange={(event) => {
                        void savePostModeration(post, {
                          isPinned: event.target.checked,
                        });
                      }}
                      type="checkbox"
                    />
                    상단 고정
                  </label>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      if (!token || !window.confirm('게시글을 삭제할까요?'))
                        return;
                      await deleteAdminPost(post.id, token);
                      await loadAll(keyword);
                    }}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
            {!visiblePosts.length ? (
              <p className="admin-filter-empty">
                조건에 맞는 게시글이 없습니다.
              </p>
            ) : null}
          </div>
          {postPagination && postPagination.totalPages > 1 ? (
            <nav className="cheers-pagination" aria-label="게시글 관리 페이지">
              <button
                className="btn btn-ghost btn-sm"
                disabled={postPagination.page <= 1}
                onClick={() =>
                  updatePostPage(Math.max(1, postPagination.page - 1))
                }
                type="button"
              >
                이전
              </button>
              <span>
                {postPagination.page} / {postPagination.totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={postPagination.page >= postPagination.totalPages}
                onClick={() =>
                  updatePostPage(
                    Math.min(
                      postPagination.totalPages,
                      postPagination.page + 1,
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

      {tab === 'comments' ? (
        <section className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>댓글 관리</h2>
              <p>댓글 내용과 작성된 게시글을 구분해 확인할 수 있습니다.</p>
            </div>
          </div>
          <div className="admin-table">
            {comments.map((comment) => (
              <article className="admin-comment-card" key={comment.id}>
                <div className="admin-comment-body">
                  <span>댓글</span>
                  <p>{comment.content}</p>
                </div>
                <div className="admin-comment-context">
                  <span>작성된 게시글</span>
                  <Link href={`/posts/${comment.postId}`}>
                    {comment.postTitle}
                  </Link>
                  <small>
                    {comment.authorNickname} · {formatDate(comment.createdAt)}
                  </small>
                </div>
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
              </article>
            ))}
            {!comments.length ? (
              <p className="admin-filter-empty">댓글이 없습니다.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'media' ? (
        <section className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>직관 이미지 검수</h2>
              <p>사용자가 직관 기록에 올린 이미지와 메모를 함께 확인합니다.</p>
            </div>
            <strong>{visibleAttendanceRecords.length}</strong>
          </div>
          <div className="admin-media-grid">
            {visibleAttendanceRecords.map((record) => (
              <article className="admin-media-card" key={record.id}>
                <a
                  href={getAssetUrl(record.photoUrl)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <img
                    alt={`${record.authorNickname} 사용자가 올린 직관 이미지`}
                    src={getAssetUrl(record.photoUrl)}
                  />
                </a>
                <div>
                  <span>
                    {record.awayTeamShortName} @ {record.homeTeamShortName}
                  </span>
                  <strong>{record.authorNickname}</strong>
                  <p>{record.memo || '메모 없음'}</p>
                  <small>
                    {record.stadium} · {formatDate(record.gameDate)}
                  </small>
                </div>
                <div className="admin-media-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      if (!token || !window.confirm('이 이미지만 삭제할까요?'))
                        return;
                      await clearAdminAttendancePhoto(record.id, token);
                      setMessage('직관 이미지가 삭제되었습니다.');
                      await loadAll(keyword);
                    }}
                    type="button"
                  >
                    이미지 삭제
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      if (
                        !token ||
                        !window.confirm('직관 기록 전체를 삭제할까요?')
                      )
                        return;
                      await deleteAdminAttendanceRecord(record.id, token);
                      setMessage('직관 기록이 삭제되었습니다.');
                      await loadAll(keyword);
                    }}
                    type="button"
                  >
                    기록 삭제
                  </button>
                </div>
              </article>
            ))}
            {!visibleAttendanceRecords.length ? (
              <p className="admin-filter-empty">검수할 이미지가 없습니다.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'reports' ? (
        <section className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>신고 처리함</h2>
              <p>신고 대상 원문을 확인하고 처리 상태를 기록합니다.</p>
            </div>
            <strong>
              {reports.filter((report) => report.status === 'pending').length}
            </strong>
          </div>
          <div className="admin-report-list">
            {visibleReports.map((report) => (
              <article className="admin-report-card" key={report.id}>
                <div>
                  <span>
                    {report.targetType} #{report.targetId} · {report.reason}
                  </span>
                  {report.targetType === 'post' ? (
                    <Link href={`/posts/${report.targetId}`}>
                      {report.targetLabel ?? '삭제된 게시글'}
                    </Link>
                  ) : (
                    <strong>{report.targetLabel ?? '삭제된 콘텐츠'}</strong>
                  )}
                  <p>{report.detail || '상세 신고 내용 없음'}</p>
                  <small>
                    신고자 {report.reporterNickname} ·{' '}
                    {formatDate(report.createdAt)}
                  </small>
                </div>
                <select
                  aria-label={`신고 ${report.id} 처리 상태`}
                  onChange={async (event) => {
                    if (!token) return;
                    await updateAdminReport(
                      report.id,
                      {
                        status: event.target.value as AdminReport['status'],
                        adminNote: report.adminNote,
                      },
                      token,
                    );
                    setMessage('신고 상태가 변경되었습니다.');
                    await loadAll(keyword);
                  }}
                  value={report.status}
                >
                  <option value="pending">처리 대기</option>
                  <option value="reviewing">확인 중</option>
                  <option value="resolved">조치 완료</option>
                  <option value="dismissed">문제 없음</option>
                </select>
              </article>
            ))}
            {!visibleReports.length ? (
              <p className="admin-filter-empty">조건에 맞는 신고가 없습니다.</p>
            ) : null}
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
                  const nextScope = event.target
                    .value as PlayerCheerRosterScope;
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
          <p className="muted">
            선수 행의 등록/수정 버튼을 누르면 팝업에서 응원가 정보를 입력합니다.
          </p>

          <div className="admin-table">
            {playerCheers.map((player) => (
              <Fragment key={player.playerId}>
                <div className="admin-row admin-row--cheer">
                  <strong>{player.name}</strong>
                  <span>
                    {player.teamShortName}
                    {player.backNumber ? ` · No.${player.backNumber}` : ''}
                    {player.position ? ` · ${player.position}` : ''}
                    {player.kboPlayerId ? ` · KBO ${player.kboPlayerId}` : ''}
                  </span>
                  <span>{player.cheerId ? '등록됨' : '미등록'}</span>
                  <span>
                    {player.cheerId ? getPlayerCheerType(player) : '-'}
                  </span>
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
                        !window.confirm(
                          `${player.name} 응원가 정보를 삭제할까요?`,
                        )
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
                {playerCheerPagination.page} /{' '}
                {playerCheerPagination.totalPages}
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
                setGameForm((current) => ({
                  ...current,
                  gameDate: event.target.value,
                }))
              }
              required
              type="datetime-local"
              value={gameForm.gameDate}
            />
            <input
              onChange={(event) =>
                setGameForm((current) => ({
                  ...current,
                  stadium: event.target.value,
                }))
              }
              placeholder="구장"
              required
              value={gameForm.stadium}
            />
            <select
              onChange={(event) =>
                setGameForm((current) => ({
                  ...current,
                  homeTeamId: event.target.value,
                }))
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
                setGameForm((current) => ({
                  ...current,
                  awayTeamId: event.target.value,
                }))
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
                setGameForm((current) => ({
                  ...current,
                  homeScore: event.target.value,
                }))
              }
              placeholder="홈 점수"
              type="number"
              value={gameForm.homeScore}
            />
            <input
              onChange={(event) =>
                setGameForm((current) => ({
                  ...current,
                  awayScore: event.target.value,
                }))
              }
              placeholder="원정 점수"
              type="number"
              value={gameForm.awayScore}
            />
            <select
              onChange={(event) =>
                setGameForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              value={gameForm.status}
            >
              <option value="scheduled">scheduled</option>
              <option value="finished">finished</option>
              <option value="cancelled">cancelled</option>
            </select>
            <input
              onChange={(event) =>
                setGameForm((current) => ({
                  ...current,
                  ticketUrl: event.target.value,
                }))
              }
              placeholder="예매 URL"
              value={gameForm.ticketUrl}
            />
            <input
              onChange={(event) =>
                setGameForm((current) => ({
                  ...current,
                  ticketOpenAt: event.target.value,
                }))
              }
              type="datetime-local"
              value={gameForm.ticketOpenAt}
            />
            <button className="btn btn-primary" type="submit">
              {editingGameId ? '경기 수정' : '경기 추가'}
            </button>
          </form>

          <div className="admin-table">
            {visibleGames.map((game) => (
              <div className="admin-row" key={game.id}>
                <strong>
                  {game.homeTeamShortName} vs {game.awayTeamShortName}
                </strong>
                <span>{game.stadium}</span>
                <time>{formatDate(game.gameDate)}</time>
                <span>
                  {game.homeScore ?? '-'} : {game.awayScore ?? '-'} /{' '}
                  {game.status}
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
            {!visibleGames.length ? (
              <p className="admin-filter-empty">조건에 맞는 경기가 없습니다.</p>
            ) : null}
          </div>
          {gamePagination && gamePagination.totalPages > 1 ? (
            <nav className="cheers-pagination" aria-label="경기 관리 페이지">
              <button
                className="btn btn-ghost btn-sm"
                disabled={gamePagination.page <= 1}
                onClick={() =>
                  updateGamePage(Math.max(1, gamePagination.page - 1))
                }
                type="button"
              >
                이전
              </button>
              <span>
                {gamePagination.page} / {gamePagination.totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={gamePagination.page >= gamePagination.totalPages}
                onClick={() =>
                  updateGamePage(
                    Math.min(
                      gamePagination.totalPages,
                      gamePagination.page + 1,
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

      {editingCheerTarget ? (
        <div
          aria-labelledby="admin-cheer-dialog-title"
          aria-modal="true"
          className="admin-cheer-dialog-backdrop"
          onClick={closeCheerEditor}
          role="dialog"
        >
          <form
            className="admin-cheer-dialog"
            onClick={(event) => event.stopPropagation()}
            onSubmit={submitCheer}
          >
            <div className="admin-cheer-dialog-head">
              <div>
                <span>
                  {editingCheerTarget.kind === 'team'
                    ? '팀 전체 응원가'
                    : '선수 응원가'}
                </span>
                <h2 id="admin-cheer-dialog-title">
                  {editingCheerTarget.label}
                </h2>
              </div>
              <button
                aria-label="응원가 등록 팝업 닫기"
                className="icon-button"
                onClick={closeCheerEditor}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-cheer-dialog-body">
              <CheerFormFields
                autoTitle={
                  editingCheerTarget.kind === 'player'
                    ? editingCheerTarget.autoTitle
                    : undefined
                }
                cheerForm={cheerForm}
                setCheerForm={setCheerForm}
              />
            </div>
            <div className="admin-cheer-dialog-actions">
              <button
                className="btn btn-ghost"
                onClick={closeCheerEditor}
                type="button"
              >
                취소
              </button>
              <button className="btn btn-primary" type="submit">
                응원가 저장
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
