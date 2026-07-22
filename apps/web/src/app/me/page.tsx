'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ApiError } from '@/lib/api';
import {
  PROFILE_PHOTO_ACCEPT,
  updateNickname,
  uploadProfilePhoto,
} from '@/lib/auth-api';
import { useAuthStore } from '@/lib/auth-store';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { updateFavoriteTeam } from '@/lib/baseball-api';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { getProfileImageSrc } from '@/lib/profile-image';
import { applyTeamTheme, useTeamTheme } from '@/lib/team-theme';
import { NICKNAME_MAX_LENGTH, validateNicknameClient } from '@/lib/user-input';
import { Skeleton } from '@/components/Skeleton';
import {
  useAttendanceStatsQuery,
  useMeQuery,
  useTeamsQuery,
} from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';

type StatFilterKey = 'overall' | 'stadium' | 'home' | 'favoriteStadium';

type StatView = {
  key: StatFilterKey;
  label: string;
  description: string;
  total: number;
  win: number;
  lose: number;
  draw: number;
  cancelled: number;
  rate: number;
};

function getStatViewTotal(view: Pick<StatView, 'win' | 'lose' | 'draw'>) {
  return view.win + view.lose + view.draw;
}

export default function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useAuthGuard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = useAuthStore((state) => state.token);
  const statsYear = new Date().getFullYear();
  const statsRange = {
    from: `${statsYear}-01-01`,
    to: `${statsYear + 1}-01-01`,
  };
  const storedUser = useAuthStore((state) => state.user);
  const setStoredUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const meQuery = useMeQuery(token);
  const statsQuery = useAttendanceStatsQuery(token, statsRange);
  const teamsQuery = useTeamsQuery();
  const user = meQuery.data?.user ?? storedUser;
  const stats = statsQuery.data ?? null;
  const teams = teamsQuery.data?.items ?? [];
  const [statusMessage, setStatusMessage] = useState('');
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [activeStatFilter, setActiveStatFilter] =
    useState<StatFilterKey>('overall');

  useEffect(() => {
    if (meQuery.data?.user) {
      setStoredUser(meQuery.data.user);
      setNicknameDraft(meQuery.data.user.nickname);
    }
  }, [meQuery.data?.user, setStoredUser]);

  useEffect(() => {
    if (meQuery.isError) {
      clearSession();
      router.replace('/');
    }
  }, [clearSession, meQuery.isError, router]);

  const favoriteTeam = teams.find((team) => team.id === user?.favoriteTeamId);
  useTeamTheme(favoriteTeam?.primaryColor ?? null);

  const profileImageSrc = getProfileImageSrc(user, favoriteTeam);
  const hasCustomProfilePhoto = Boolean(user?.profileImageUrl);
  const statViews = useMemo<StatView[]>(
    () =>
      stats
        ? [
            {
              key: 'overall',
              label: '전체',
              description: '직관과 집관을 모두 합산한 전체 관람 결과',
              total: stats.totalCount,
              win: stats.overallWinCount ?? stats.winCount,
              lose: stats.overallLoseCount ?? stats.loseCount,
              draw: stats.overallDrawCount ?? stats.drawCount,
              cancelled: stats.overallCancelledCount ?? 0,
              rate: stats.overallWinRate ?? stats.winRate,
            },
            {
              key: 'stadium',
              label: '직관',
              description: '야구장에서 직접 본 경기 결과',
              total: stats.stadiumCount,
              win: stats.overallStadiumWinCount ?? stats.winCount,
              lose: stats.overallStadiumLoseCount ?? stats.loseCount,
              draw: stats.overallStadiumDrawCount ?? stats.drawCount,
              cancelled: stats.overallStadiumCancelledCount ?? 0,
              rate: stats.overallStadiumWinRate ?? stats.stadiumWinRate,
            },
            {
              key: 'home',
              label: '집관',
              description: '집에서 기록한 경기 결과',
              total: stats.homeCount,
              win: stats.overallHomeWinCount ?? 0,
              lose: stats.overallHomeLoseCount ?? 0,
              draw: stats.overallHomeDrawCount ?? 0,
              cancelled: stats.overallHomeCancelledCount ?? 0,
              rate: stats.overallHomeWinRate ?? stats.homeWinRate,
            },
            {
              key: 'favoriteStadium',
              label: '내팀 직관',
              description: favoriteTeam
                ? `${favoriteTeam.shortName} 경기를 야구장에서 본 결과`
                : '내 응원팀 경기를 야구장에서 본 결과',
              total: stats.favoriteTeamStadiumCount ?? 0,
              win: stats.favoriteTeamStadiumWinCount ?? 0,
              lose: stats.favoriteTeamStadiumLoseCount ?? 0,
              draw: stats.favoriteTeamStadiumDrawCount ?? 0,
              cancelled: stats.favoriteTeamStadiumCancelledCount ?? 0,
              rate: stats.favoriteTeamStadiumWinRate ?? stats.stadiumWinRate,
            },
          ]
        : [],
    [favoriteTeam, stats],
  );
  const selectedStatView =
    statViews.find((view) => view.key === activeStatFilter) ?? statViews[0];
  const selectedStatTotal = selectedStatView
    ? getStatViewTotal(selectedStatView)
    : 0;
  const statWinAngle = selectedStatTotal
    ? (selectedStatView.win / selectedStatTotal) * 360
    : 0;
  const statLoseAngle = selectedStatTotal
    ? statWinAngle + (selectedStatView.lose / selectedStatTotal) * 360
    : 0;
  const statDonutStyle = {
    '--stat-win-angle': `${statWinAngle}deg`,
    '--stat-lose-angle': `${statLoseAngle}deg`,
  } as CSSProperties;

  if (
    meQuery.isLoading ||
    statsQuery.isLoading ||
    teamsQuery.isLoading ||
    !stats
  ) {
    return (
      <main className="app-shell app-shell--profile">
        <Skeleton height={300} radius={0} />
        <Skeleton height={360} radius={0} />
        <Skeleton height={160} radius={0} />
      </main>
    );
  }

  async function handleFavoriteTeamChange(teamId: number) {
    if (user?.favoriteTeamId === teamId) {
      setShowTeamPicker(false);
      return;
    }

    if (!token) {
      router.replace('/');
      return;
    }

    const nextTeam = teams.find((team) => team.id === teamId);
    applyTeamTheme(nextTeam?.primaryColor ?? null);

    const response = await updateFavoriteTeam(teamId, token);
    setStoredUser(response.user);
    queryClient.setQueryData(queryKeys.me(token), { user: response.user });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.attendanceStats(token),
    });
    setStatusMessage('내 팀이 변경되었습니다.');
    setShowTeamPicker(false);
  }

  async function handleNicknameSave() {
    if (isSavingNickname) return;
    if (!token) {
      router.replace('/');
      return;
    }

    const validationError = validateNicknameClient(nicknameDraft);
    if (validationError) {
      setStatusMessage(validationError);
      return;
    }

    setIsSavingNickname(true);
    try {
      const response = await updateNickname(nicknameDraft, token);
      setStoredUser(response.user);
      queryClient.setQueryData(queryKeys.me(token), { user: response.user });
      setNicknameDraft(response.user.nickname);
      setIsEditingNickname(false);
      setStatusMessage('닉네임이 변경되었습니다.');
    } catch (error) {
      setStatusMessage(
        error instanceof ApiError ? error.message : '닉네임 변경에 실패했어요.',
      );
    } finally {
      setIsSavingNickname(false);
    }
  }

  async function handleProfilePhotoChange(file: File | undefined) {
    if (!file) return;
    if (isUploadingPhoto) return;
    if (!token) {
      router.replace('/');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const response = await uploadProfilePhoto(file, token);
      setStoredUser(response.user);
      queryClient.setQueryData(queryKeys.me(token), { user: response.user });
      setStatusMessage('프로필 사진이 등록되었습니다.');
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : '프로필 사진 업로드에 실패했어요.',
      );
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <main className="app-shell app-shell--profile">
      <section className="profile-hero" aria-label="내 프로필 요약">
        <div className="profile-hero-top profile-hero-top-with-avatar">
          <div className="profile-header-main">
            <div className="profile-avatar-wrap">
              <img
                alt={`${user?.nickname ?? '야구팬'} 프로필`}
                className={`profile-avatar ${hasCustomProfilePhoto ? '' : 'is-team-logo'}`}
                height={86}
                src={profileImageSrc}
                width={86}
              />
              <button
                aria-label="프로필 사진 변경"
                className="profile-avatar-edit"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {isUploadingPhoto ? '…' : '＋'}
              </button>
              <input
                accept={PROFILE_PHOTO_ACCEPT}
                className="sr-only"
                onChange={(event) =>
                  handleProfilePhotoChange(event.target.files?.[0])
                }
                ref={fileInputRef}
                type="file"
              />
            </div>
            <div className="profile-identity">
              <span className="eyebrow">My Page</span>
              {isEditingNickname ? (
                <div className="profile-nickname-edit">
                  <input
                    aria-label="닉네임"
                    autoComplete="off"
                    className="form-input profile-nickname-input"
                    maxLength={NICKNAME_MAX_LENGTH}
                    name="nickname"
                    onChange={(event) => setNicknameDraft(event.target.value)}
                    value={nicknameDraft}
                  />
                  <div className="profile-nickname-edit-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={isSavingNickname}
                      onClick={handleNicknameSave}
                      type="button"
                    >
                      저장
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setNicknameDraft(user?.nickname ?? '');
                        setIsEditingNickname(false);
                      }}
                      type="button"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-nickname-row">
                  <h1>{user?.nickname ?? '야구팬'}</h1>
                  <button
                    aria-label="닉네임 수정"
                    className="profile-edit-btn"
                    onClick={() => {
                      setNicknameDraft(user?.nickname ?? '');
                      setIsEditingNickname(true);
                    }}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                    >
                      <path
                        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Zm14.7-9.8 1.1-1.1a1.5 1.5 0 0 0 0-2.1l-1.6-1.6a1.5 1.5 0 0 0-2.1 0l-1.1 1.1 3.7 3.7Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              )}
              <p>{user?.email}</p>
              {user?.id ? (
                <Link className="profile-public-link" href={`/fans/${user.id}`}>
                  공개 프로필 보기 →
                </Link>
              ) : null}
            </div>
          </div>
          {favoriteTeam ? (
            <span className="profile-hero-team">
              <img
                alt=""
                height={48}
                src={getTeamLogoSrc(favoriteTeam)}
                width={48}
              />
              {favoriteTeam.shortName}
            </span>
          ) : (
            <span className="badge badge-gold">팀 미설정</span>
          )}
        </div>
        <div className="profile-hero-metrics">
          <div className="profile-metric profile-metric--primary">
            <span>직관 승률</span>
            <strong>{stats.winRate}%</strong>
          </div>
          <div className="profile-metric">
            <span>전체 기록</span>
            <strong>{stats.totalCount}</strong>
          </div>
          <div className="profile-metric">
            <span>직관</span>
            <strong>{stats.stadiumCount}</strong>
          </div>
          <div className="profile-metric">
            <span>집관</span>
            <strong>{stats.homeCount}</strong>
          </div>
        </div>
        {stats.titles?.length ? (
          <div className="profile-title-list profile-hero-titles">
            {stats.titles.map((title) => (
              <span
                className="profile-title-pill"
                data-description={title.description}
                data-kind={title.kind}
                key={title.key}
                tabIndex={0}
              >
                {title.label}
              </span>
            ))}
          </div>
        ) : (
          <span className="profile-hero-hint">
            기록을 남기면 승리요정·패배요정이 붙어요
          </span>
        )}
      </section>

      {statusMessage ? (
        <p className="profile-status-banner" role="status">
          {statusMessage}
        </p>
      ) : null}

      <section className="card profile-stat-explorer">
        <div className="section-heading profile-stat-explorer-head">
          <div>
            <h2>승패 분석</h2>
            <p>기준을 바꿔가며 승률과 승패 흐름을 봅니다.</p>
          </div>
          <div
            className="profile-stat-tabs"
            role="tablist"
            aria-label="통계 기준"
          >
            {statViews.map((view) => (
              <button
                aria-selected={activeStatFilter === view.key}
                className="profile-stat-tab"
                key={view.key}
                onClick={() => setActiveStatFilter(view.key)}
                role="tab"
                type="button"
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {selectedStatView ? (
          <div className="profile-stat-panel">
            <div className="profile-stat-chart-wrap">
              <div
                aria-label={`${selectedStatView.label} 승률 ${selectedStatView.rate}%`}
                className="profile-stat-donut"
                role="img"
                style={statDonutStyle}
              >
                <div className="profile-stat-donut-core">
                  <span>승률</span>
                  <strong>{selectedStatView.rate}%</strong>
                </div>
              </div>
              <div className="profile-stat-legend" aria-label="승패 범례">
                <span data-kind="win">승</span>
                <span data-kind="lose">패</span>
                <span data-kind="draw">무</span>
              </div>
            </div>

            <div className="profile-stat-detail">
              <div>
                <span>{selectedStatView.label}</span>
                <strong>{selectedStatView.total}경기</strong>
                <p>{selectedStatView.description}</p>
              </div>
              <div className="profile-stat-result-grid">
                <div className="profile-stat-result" data-kind="win">
                  <span>승</span>
                  <strong>{selectedStatView.win}</strong>
                </div>
                <div className="profile-stat-result" data-kind="lose">
                  <span>패</span>
                  <strong>{selectedStatView.lose}</strong>
                </div>
                <div className="profile-stat-result" data-kind="draw">
                  <span>무</span>
                  <strong>{selectedStatView.draw}</strong>
                </div>
                {selectedStatView.cancelled > 0 ? (
                  <div className="profile-stat-result" data-kind="cancelled">
                    <span>취소</span>
                    <strong>{selectedStatView.cancelled}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="profile-settings-grid">
        <section className="card profile-setting-card">
          <div className="section-heading">
            <div>
              <h2>응원 팀</h2>
              <p>경기 일정과 캘린더 필터에 사용되는 응원 팀이에요.</p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowTeamPicker((current) => !current)}
              type="button"
            >
              {showTeamPicker ? '닫기' : '변경하기'}
            </button>
          </div>
          {!showTeamPicker ? (
            <div className="profile-team-current">
              {favoriteTeam ? (
                <>
                  <img
                    alt=""
                    className="profile-team-current-logo"
                    height={48}
                    src={getTeamLogoSrc(favoriteTeam)}
                    width={48}
                  />
                  <div>
                    <strong className="profile-team-current-name">
                      {favoriteTeam.name}
                    </strong>
                    <span className="profile-team-current-short-name">
                      {favoriteTeam.shortName}
                    </span>
                  </div>
                </>
              ) : (
                <p className="profile-team-empty">
                  아직 응원 팀을 선택하지 않았어요. `변경하기`를 눌러
                  설정하세요.
                </p>
              )}
            </div>
          ) : (
            <div className="team-grid">
              {teams.map((team) => {
                const isSelected = user?.favoriteTeamId === team.id;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`team-grid-card ${isSelected ? 'is-selected' : ''}`}
                    key={team.id}
                    onClick={() => handleFavoriteTeamChange(team.id)}
                    type="button"
                  >
                    <img
                      alt=""
                      height={48}
                      loading="lazy"
                      src={getTeamLogoSrc(team)}
                      width={48}
                    />
                    <span>{team.shortName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section
          className="card stack-sm profile-setting-card profile-account-card"
          aria-label="계정"
        >
          <div className="section-heading profile-account-heading">
            <h2>계정</h2>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              clearSession();
              router.replace('/');
            }}
            type="button"
          >
            로그아웃
          </button>
        </section>
      </div>
    </main>
  );
}
