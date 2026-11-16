'use client';

import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  clearAdminUserProfileImage,
  deleteAdminUser,
  updateAdminUserEmailVerification,
  updateAdminUserRole,
  type AdminUser,
} from '@/lib/admin-api';
import { getAssetUrl } from '@/lib/api';
import { useTeamsQuery } from '@/lib/queries';
import {
  useAdminToken,
  useAdminUsersQuery,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { AdminDialog } from '../_components/AdminDialog';
import { useAdminFeedback } from '../_components/feedback';
import {
  Avatar,
  Chip,
  DangerZone,
  DetailItem,
  DetailList,
  FilterSelect,
  formatCount,
  formatDate,
  listState,
  PanelHeading,
  Pagination,
  paginate,
  ResultCount,
  SearchBox,
  TeamName,
  Toolbar,
} from '../_components/ui';

const PAGE_SIZE = 20;
const SERVER_LIMIT = 100;

export function UsersTab({ currentUserId }: { currentUserId: number }) {
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('all');
  const [verification, setVerification] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const usersQuery = useAdminUsersQuery(keyword);
  const teamsQuery = useTeamsQuery();

  const teamColors = useMemo(
    () => new Map((teamsQuery.data?.items ?? []).map((team) => [team.id, team.primaryColor])),
    [teamsQuery.data],
  );

  const allUsers = usersQuery.data?.items;
  const filtered = useMemo(
    () =>
      (allUsers ?? []).filter(
        (user) =>
          (role === 'all' || user.role === role) &&
          (verification === 'all' ||
            (verification === 'verified') === Boolean(user.emailVerifiedAt)),
      ),
    [allUsers, role, verification],
  );
  const pageData = paginate(filtered, page, PAGE_SIZE);
  const selectedUser = allUsers?.find((user) => user.id === selectedId) ?? null;

  const state = listState({
    ...usersQuery,
    isEmpty: filtered.length === 0,
    empty: keyword
      ? { title: `'${keyword}'에 맞는 사용자가 없습니다`, description: '닉네임이나 이메일 일부로 다시 찾아보세요.' }
      : { title: '조건에 맞는 사용자가 없습니다', description: '역할·인증 필터를 바꿔 보세요.' },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        description="가입 정보와 권한을 확인합니다. 행을 누르면 권한·인증·사진·삭제를 처리할 수 있습니다."
        title="사용자"
      />
      <Toolbar>
        <SearchBox
          label="사용자 검색"
          onSearch={(next) => {
            setKeyword(next);
            setPage(1);
          }}
          placeholder="닉네임 또는 이메일"
        />
        <FilterSelect
          label="역할"
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: '전체' },
            { value: 'user', label: '일반' },
            { value: 'admin', label: '관리자' },
          ]}
          value={role}
        />
        <FilterSelect
          label="이메일 인증"
          onChange={(value) => {
            setVerification(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: '전체' },
            { value: 'verified', label: '인증됨' },
            { value: 'unverified', label: '미인증' },
          ]}
          value={verification}
        />
        <ResultCount fetching={usersQuery.isFetching && !usersQuery.isPending} total={allUsers ? filtered.length : null} unit="명" />
      </Toolbar>
      {allUsers && allUsers.length >= SERVER_LIMIT ? (
        <p className="admin-hint">최근 가입한 {SERVER_LIMIT}명까지만 불러옵니다. 그보다 오래된 사용자는 검색으로 찾으세요.</p>
      ) : null}

      {state ?? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">사용자</th>
                  <th scope="col">응원 팀</th>
                  <th className="is-num" scope="col">글</th>
                  <th className="is-num" scope="col">댓글</th>
                  <th scope="col">권한</th>
                  <th scope="col">이메일</th>
                  <th scope="col">가입</th>
                  <th className="is-actions" scope="col">
                    <span className="sr-only">관리</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.items.map((user) => (
                  <tr key={user.id}>
                    <td className="is-primary">
                      <span className="admin-person">
                        <Avatar
                          name={user.nickname}
                          src={user.profileImageUrl ? getAssetUrl(user.profileImageUrl) : null}
                        />
                        <span>
                          <strong>
                            {user.nickname}
                            {user.id === currentUserId ? <em className="admin-me">나</em> : null}
                          </strong>
                          <small>{user.email}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="응원 팀">
                      <TeamName
                        color={user.favoriteTeamId ? teamColors.get(user.favoriteTeamId) : null}
                        name={user.favoriteTeamShortName}
                      />
                    </td>
                    <td className="is-num" data-label="글">{formatCount(user.postCount)}</td>
                    <td className="is-num" data-label="댓글">{formatCount(user.commentCount)}</td>
                    <td data-label="권한">
                      {user.role === 'admin' ? <Chip tone="info">관리자</Chip> : <span className="admin-muted">일반</span>}
                    </td>
                    <td data-label="이메일">
                      {user.emailVerifiedAt ? (
                        <Chip tone="success">인증</Chip>
                      ) : (
                        <Chip tone="warning">미인증</Chip>
                      )}
                    </td>
                    <td className="is-date" data-label="가입">
                      <time dateTime={user.createdAt}>{formatDate(user.createdAt)}</time>
                    </td>
                    <td className="is-actions">
                      <button
                        aria-label={`${user.nickname} 관리`}
                        className="admin-row-btn"
                        onClick={() => setSelectedId(user.id)}
                        type="button"
                      >
                        관리
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            label="사용자 페이지"
            onChange={setPage}
            page={pageData.page}
            totalPages={pageData.totalPages}
          />
        </>
      )}

      <UserSheet
        currentUserId={currentUserId}
        onClose={() => setSelectedId(null)}
        teamColor={selectedUser?.favoriteTeamId ? teamColors.get(selectedUser.favoriteTeamId) : null}
        user={selectedUser}
      />
    </section>
  );
}

function UserSheet({
  user,
  currentUserId,
  teamColor,
  onClose,
}: {
  user: AdminUser | null;
  currentUserId: number;
  teamColor: string | null | undefined;
  onClose: () => void;
}) {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { confirm, notify, notifyError } = useAdminFeedback();
  const isSelf = user?.id === currentUserId;

  const roleMutation = useMutation({
    mutationFn: (input: { user: AdminUser; role: 'admin' | 'user' }) =>
      updateAdminUserRole(input.user.id, input.role, token),
    onSuccess: (_data, input) => {
      notify(`${input.user.nickname}님을 ${input.role === 'admin' ? '관리자로 지정' : '일반 사용자로 변경'}했습니다.`);
      return invalidate(['admin', 'users']);
    },
    onError: (error) => notifyError(error, '역할을 바꾸지 못했습니다.'),
  });

  const verifyMutation = useMutation({
    mutationFn: (input: { user: AdminUser; verified: boolean }) =>
      updateAdminUserEmailVerification(input.user.id, input.verified, token),
    onSuccess: (_data, input) => {
      notify(input.verified ? '이메일을 인증 처리했습니다.' : '이메일 인증을 해제했습니다.');
      return invalidate(['admin', 'users']);
    },
    onError: (error) => notifyError(error, '인증 상태를 바꾸지 못했습니다.'),
  });

  const photoMutation = useMutation({
    mutationFn: (target: AdminUser) => clearAdminUserProfileImage(target.id, token),
    onSuccess: () => {
      notify('프로필 사진을 내렸습니다.');
      return invalidate(['admin', 'users']);
    },
    onError: (error) => notifyError(error, '프로필 사진을 내리지 못했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: AdminUser) => deleteAdminUser(target.id, token),
    onSuccess: (_data, target) => {
      notify(`${target.nickname}님을 삭제했습니다.`);
      onClose();
      return invalidate();
    },
    onError: (error) => notifyError(error, '사용자를 삭제하지 못했습니다.'),
  });

  const busy =
    roleMutation.isPending ||
    verifyMutation.isPending ||
    photoMutation.isPending ||
    deleteMutation.isPending;

  return (
    <AdminDialog
      eyebrow="사용자 관리"
      onClose={onClose}
      open={Boolean(user)}
      title={user?.nickname ?? ''}
    >
      {user ? (
        <>
          <div className="admin-sheet-identity">
            <Avatar
              name={user.nickname}
              src={user.profileImageUrl ? getAssetUrl(user.profileImageUrl) : null}
            />
            <div>
              <strong>{user.email}</strong>
              <span>회원 번호 {user.id}</span>
            </div>
          </div>

          <DetailList>
            <DetailItem label="응원 팀">
              <TeamName color={teamColor} name={user.favoriteTeamShortName} />
            </DetailItem>
            <DetailItem label="가입">{formatDate(user.createdAt)}</DetailItem>
            <DetailItem label="작성">
              글 {formatCount(user.postCount)} · 댓글 {formatCount(user.commentCount)}
            </DetailItem>
          </DetailList>

          <div className="admin-setting">
            <div>
              <strong>권한</strong>
              <p>{isSelf ? '내 계정의 관리자 권한은 여기서 바꿀 수 없습니다.' : '관리자는 이 화면 전체에 접근합니다.'}</p>
            </div>
            <div className="admin-segmented" role="radiogroup" aria-label="권한">
              {(['user', 'admin'] as const).map((value) => (
                <button
                  aria-checked={user.role === value}
                  className={user.role === value ? 'is-active' : ''}
                  disabled={busy || isSelf}
                  key={value}
                  onClick={async () => {
                    if (user.role === value) return;
                    if (
                      value === 'admin' &&
                      !(await confirm({
                        title: `${user.nickname}님을 관리자로 지정할까요?`,
                        description: '관리자는 모든 사용자·게시글·경기 데이터를 바꾸거나 지울 수 있습니다.',
                        confirmLabel: '관리자로 지정',
                        tone: 'default',
                      }))
                    ) {
                      return;
                    }
                    roleMutation.mutate({ user, role: value });
                  }}
                  role="radio"
                  type="button"
                >
                  {value === 'admin' ? '관리자' : '일반'}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-setting">
            <div>
              <strong>이메일 인증</strong>
              <p>
                {user.emailVerifiedAt
                  ? `${formatDate(user.emailVerifiedAt)}에 인증했습니다.`
                  : '아직 인증하지 않았습니다. 인증 메일을 못 받는 경우 직접 처리할 수 있습니다.'}
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() =>
                verifyMutation.mutate({ user, verified: !user.emailVerifiedAt })
              }
              type="button"
            >
              {user.emailVerifiedAt ? '인증 해제' : '인증 처리'}
            </button>
          </div>

          <div className="admin-setting">
            <div>
              <strong>프로필 사진</strong>
              <p>
                {user.profileImageUrl
                  ? '부적절하거나 권리를 침해하는 사진을 내리면 기본 이미지로 바뀝니다.'
                  : '기본 이미지를 쓰고 있습니다.'}
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              disabled={busy || !user.profileImageUrl}
              onClick={async () => {
                if (
                  await confirm({
                    title: '프로필 사진을 내릴까요?',
                    description: `${user.nickname}님의 사진 파일이 지워지고 기본 이미지로 바뀝니다.`,
                    confirmLabel: '사진 내리기',
                  })
                ) {
                  photoMutation.mutate(user);
                }
              }}
              type="button"
            >
              사진 내리기
            </button>
          </div>

          <DangerZone>
            <p>
              {isSelf
                ? '내 계정은 삭제할 수 없습니다.'
                : '계정과 함께 이 사용자의 게시글·댓글·직관 기록과 올린 사진이 모두 지워집니다.'}
            </p>
            <button
              className="btn admin-btn-danger btn-sm"
              disabled={busy || isSelf}
              onClick={async () => {
                if (
                  await confirm({
                    title: `${user.nickname}님을 삭제할까요?`,
                    description: (
                      <>
                        글 {formatCount(user.postCount)}개, 댓글 {formatCount(user.commentCount)}개와 직관 기록이 함께 지워지고
                        되돌릴 수 없습니다.
                      </>
                    ),
                    confirmLabel: '사용자 삭제',
                  })
                ) {
                  deleteMutation.mutate(user);
                }
              }}
              type="button"
            >
              사용자 삭제
            </button>
          </DangerZone>
        </>
      ) : null}
    </AdminDialog>
  );
}
