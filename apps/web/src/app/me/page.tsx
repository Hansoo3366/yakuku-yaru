'use client';

/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  fetchMe,
  PROFILE_PHOTO_ACCEPT,
  updateNickname,
  uploadProfilePhoto,
} from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
import {
  fetchAttendanceStats,
  type AttendanceStats,
} from '@/lib/attendance-api';
import { listTeams, updateFavoriteTeam, type Team } from '@/lib/baseball-api';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { getProfileImageSrc } from '@/lib/profile-image';
import { applyTeamTheme, useTeamTheme } from '@/lib/team-theme';
import { NICKNAME_MAX_LENGTH, validateNicknameClient } from '@/lib/user-input';
import { Skeleton } from '@/components/Skeleton';

export default function MyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    Promise.all([fetchMe(token), fetchAttendanceStats(token), listTeams()])
      .then(([meResponse, statsResponse, teamsResponse]) => {
        setUser(meResponse.user);
        setNicknameDraft(meResponse.user.nickname);
        setStats(statsResponse);
        setTeams(teamsResponse.items);
      })
      .catch(() => {
        clearAccessToken();
        router.replace('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  const favoriteTeam = teams.find((team) => team.id === user?.favoriteTeamId);
  useTeamTheme(favoriteTeam?.primaryColor ?? null);

  const profileImageSrc = getProfileImageSrc(user, favoriteTeam);
  const hasCustomProfilePhoto = Boolean(user?.profileImageUrl);

  if (isLoading || !stats) {
    return (
      <main className="app-shell">
        <Skeleton height={200} radius={10} />
        <Skeleton height={120} radius={10} />
        <Skeleton height={140} radius={10} />
      </main>
    );
  }

  async function handleFavoriteTeamChange(teamId: number) {
    if (user?.favoriteTeamId === teamId) {
      setShowTeamPicker(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const nextTeam = teams.find((team) => team.id === teamId);
    applyTeamTheme(nextTeam?.primaryColor ?? null);

    const response = await updateFavoriteTeam(teamId, token);
    setUser(response.user);
    setStatusMessage('내 팀이 변경되었습니다.');
    setShowTeamPicker(false);
  }

  async function handleNicknameSave() {
    if (isSavingNickname) return;
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
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
      setUser(response.user);
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
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const response = await uploadProfilePhoto(file, token);
      setUser(response.user);
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
    <main className="app-shell">
      <section className="profile-hero" aria-label="내 프로필 요약">
        <div className="profile-hero-top profile-hero-top-with-avatar">
          <div className="profile-header-main">
            <div className="profile-avatar-wrap">
              <img
                alt=""
                className={`profile-avatar ${hasCustomProfilePhoto ? '' : 'is-team-logo'}`}
                src={profileImageSrc}
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
                    className="form-input profile-nickname-input"
                    maxLength={NICKNAME_MAX_LENGTH}
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
            </div>
          </div>
          {favoriteTeam ? (
            <span className="profile-hero-team">
              <img alt="" src={getTeamLogoSrc(favoriteTeam)} />
              {favoriteTeam.shortName}
            </span>
          ) : (
            <span className="badge badge-gold">팀 미설정</span>
          )}
        </div>
        <div className="profile-hero-stats">
          <div className="profile-rate">
            <span>직관 승률</span>
            <strong>{stats.winRate}%</strong>
          </div>
          {stats.title ? (
            <span className="profile-title-pill">{stats.title}</span>
          ) : (
            <span
              className="muted"
              style={{ fontSize: 'var(--text-xs)', justifySelf: 'end' }}
            >
              승률 50%부터 타이틀이 열려요
            </span>
          )}
        </div>
      </section>

      <section className="stat-grid" aria-label="직관 통계">
        <div className="stat-card" data-tone="total">
          <span>전체 기록</span>
          <strong>{stats.totalCount}</strong>
        </div>
        <div className="stat-card" data-tone="stadium">
          <span>직관</span>
          <strong>{stats.stadiumCount}</strong>
        </div>
        <div className="stat-card" data-tone="home">
          <span>집관</span>
          <strong>{stats.homeCount}</strong>
        </div>
        <div className="stat-card" data-tone="win">
          <span>승</span>
          <strong>{stats.winCount}</strong>
        </div>
        <div className="stat-card" data-tone="lose">
          <span>패</span>
          <strong>{stats.loseCount}</strong>
        </div>
        <div className="stat-card" data-tone="draw">
          <span>무</span>
          <strong>{stats.drawCount}</strong>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <h2>승률 상세</h2>
            <p>관람 유형별 승률을 비교합니다.</p>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-card" data-tone="total">
            <span>전체</span>
            <strong>{stats.winRate}%</strong>
          </div>
          <div className="stat-card" data-tone="stadium">
            <span>직관</span>
            <strong>{stats.stadiumWinRate}%</strong>
          </div>
          <div className="stat-card" data-tone="home">
            <span>집관</span>
            <strong>{stats.homeWinRate}%</strong>
          </div>
        </div>
      </section>

      <section className="card">
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
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              gap: 'var(--space-3)',
            }}
          >
            {favoriteTeam ? (
              <>
                <img
                  alt=""
                  src={getTeamLogoSrc(favoriteTeam)}
                  style={{ height: 44, width: 44 }}
                />
                <div>
                  <strong
                    style={{ display: 'block', fontSize: 'var(--text-md)' }}
                  >
                    {favoriteTeam.name}
                  </strong>
                  <span
                    className="muted"
                    style={{ fontSize: 'var(--text-xs)' }}
                  >
                    {favoriteTeam.shortName}
                  </span>
                </div>
              </>
            ) : (
              <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                아직 응원 팀을 선택하지 않았어요. `변경하기`를 눌러 설정하세요.
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
                  <img alt="" src={getTeamLogoSrc(team)} />
                  <span>{team.shortName}</span>
                </button>
              );
            })}
          </div>
        )}
        {statusMessage ? (
          <p
            className="muted"
            style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}
          >
            {statusMessage}
          </p>
        ) : null}
      </section>

      <section className="card stack-sm" aria-label="계정">
        <div className="section-heading" style={{ marginBottom: 0 }}>
          <h2>계정</h2>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            clearAccessToken();
            applyTeamTheme(null);
            router.push('/');
          }}
          type="button"
        >
          로그아웃
        </button>
      </section>
    </main>
  );
}
