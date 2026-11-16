'use client';

import { useMutation } from '@tanstack/react-query';
import { ExternalLink, Pin } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  deleteAdminPost,
  updateAdminPostModeration,
  type AdminPost,
} from '@/lib/admin-api';
import { FEATURE_STATUS_LABELS, POST_CATEGORY_LABELS } from '@/lib/post-meta';
import type { FeatureRequestStatus, PostCategory } from '@/lib/post-api';
import {
  useAdminPostsQuery,
  useAdminToken,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { AdminDialog } from '../_components/AdminDialog';
import { useAdminFeedback } from '../_components/feedback';
import {
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
  ResultCount,
  SearchBox,
  Toolbar,
  type ChipTone,
} from '../_components/ui';

const FEATURE_STATUS_TONES: Record<FeatureRequestStatus, ChipTone> = {
  received: 'warning',
  reviewing: 'info',
  in_progress: 'info',
  completed: 'success',
  deferred: 'neutral',
};

export function PostsTab() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [pin, setPin] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const postsQuery = useAdminPostsQuery({ category, keyword, page, pin });
  const posts = postsQuery.data?.items;
  const pagination = postsQuery.data?.pagination;
  const selectedPost = posts?.find((post) => post.id === selectedId) ?? null;

  const state = listState({
    ...postsQuery,
    isEmpty: !posts?.length,
    empty: {
      title: '조건에 맞는 게시글이 없습니다',
      description: keyword ? '제목·내용·작성자 일부로 다시 찾아보세요.' : '분류나 고정 필터를 바꿔 보세요.',
    },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        description="분류를 바꾸거나 상단에 고정하고, 기능 제안의 처리 상태를 기록합니다."
        title="게시글"
      />
      <Toolbar>
        <SearchBox
          label="게시글 검색"
          onSearch={(next) => {
            setKeyword(next);
            setPage(1);
          }}
          placeholder="제목, 내용, 작성자"
        />
        <FilterSelect
          label="분류"
          onChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: '전체' },
            ...Object.entries(POST_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          value={category}
        />
        <FilterSelect
          label="고정"
          onChange={(value) => {
            setPin(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: '전체' },
            { value: 'pinned', label: '상단 고정' },
            { value: 'unpinned', label: '일반 글' },
          ]}
          value={pin}
        />
        <ResultCount fetching={postsQuery.isFetching && !postsQuery.isPending} total={pagination?.total} />
      </Toolbar>

      {state ?? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">제목</th>
                  <th scope="col">분류</th>
                  <th scope="col">작성자</th>
                  <th className="is-num" scope="col">댓글</th>
                  <th scope="col">작성</th>
                  <th className="is-actions" scope="col">
                    <span className="sr-only">관리</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts?.map((post) => (
                  <tr key={post.id}>
                    <td className="is-primary is-wide">
                      <span className="admin-title-cell">
                        {post.isPinned ? (
                          <Pin aria-label="상단 고정" className="admin-pin-icon" size={14} />
                        ) : null}
                        <Link href={`/posts/${post.id}`}>{post.title}</Link>
                      </span>
                      <small className="admin-excerpt">{post.content}</small>
                    </td>
                    <td data-label="분류">
                      <span className="admin-category">{POST_CATEGORY_LABELS[post.category]}</span>
                      {post.category === 'feature' && post.requestStatus ? (
                        <Chip tone={FEATURE_STATUS_TONES[post.requestStatus]}>
                          {FEATURE_STATUS_LABELS[post.requestStatus]}
                        </Chip>
                      ) : null}
                    </td>
                    <td data-label="작성자">{post.authorNickname}</td>
                    <td className="is-num" data-label="댓글">{formatCount(post.commentCount)}</td>
                    <td className="is-date" data-label="작성">
                      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                    </td>
                    <td className="is-actions">
                      <button
                        aria-label={`${post.title} 관리`}
                        className="admin-row-btn"
                        onClick={() => setSelectedId(post.id)}
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
          {pagination ? (
            <Pagination
              label="게시글 페이지"
              onChange={setPage}
              page={pagination.page}
              totalPages={pagination.totalPages}
            />
          ) : null}
        </>
      )}

      <PostSheet onClose={() => setSelectedId(null)} post={selectedPost} />
    </section>
  );
}

function PostSheet({ post, onClose }: { post: AdminPost | null; onClose: () => void }) {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { confirm, notify, notifyError } = useAdminFeedback();

  const moderationMutation = useMutation({
    mutationFn: (input: {
      post: AdminPost;
      change: Partial<Pick<AdminPost, 'category' | 'isPinned' | 'requestStatus'>>;
    }) =>
      updateAdminPostModeration(
        input.post.id,
        {
          category: input.change.category ?? input.post.category,
          isPinned: input.change.isPinned ?? input.post.isPinned,
          requestStatus:
            input.change.requestStatus === undefined
              ? input.post.requestStatus
              : input.change.requestStatus,
        },
        token,
      ),
    onSuccess: () => {
      notify('게시글 설정을 저장했습니다.');
      return invalidate(['admin', 'posts']);
    },
    onError: (error) => notifyError(error, '게시글 설정을 저장하지 못했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: AdminPost) => deleteAdminPost(target.id, token),
    onSuccess: () => {
      notify('게시글을 삭제했습니다.');
      onClose();
      return invalidate(['admin', 'posts'], ['admin', 'comments']);
    },
    onError: (error) => notifyError(error, '게시글을 삭제하지 못했습니다.'),
  });

  const busy = moderationMutation.isPending || deleteMutation.isPending;

  return (
    <AdminDialog eyebrow="게시글 관리" onClose={onClose} open={Boolean(post)} title={post?.title ?? ''}>
      {post ? (
        <>
          <DetailList>
            <DetailItem label="작성자">{post.authorNickname}</DetailItem>
            <DetailItem label="작성">{formatDate(post.createdAt)}</DetailItem>
            <DetailItem label="댓글">{formatCount(post.commentCount)}개</DetailItem>
          </DetailList>
          <blockquote className="admin-quote">{post.content}</blockquote>
          <Link className="admin-link" href={`/posts/${post.id}`}>
            게시글 보기
            <ExternalLink aria-hidden="true" size={14} />
          </Link>

          <div className="admin-setting">
            <div>
              <strong>분류</strong>
              <p>기능 개선으로 바꾸면 처리 상태가 &lsquo;접수&rsquo;로 시작합니다.</p>
            </div>
            <select
              aria-label="분류"
              className="admin-input"
              disabled={busy}
              onChange={(event) => {
                const category = event.target.value as PostCategory;
                moderationMutation.mutate({
                  post,
                  change: {
                    category,
                    requestStatus: category === 'feature' ? (post.requestStatus ?? 'received') : null,
                  },
                });
              }}
              value={post.category}
            >
              {Object.entries(POST_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {post.category === 'feature' ? (
            <div className="admin-setting">
              <div>
                <strong>처리 상태</strong>
                <p>제안한 사용자에게 보이는 진행 상황입니다.</p>
              </div>
              <select
                aria-label="처리 상태"
                className="admin-input"
                disabled={busy}
                onChange={(event) =>
                  moderationMutation.mutate({
                    post,
                    change: { requestStatus: event.target.value as FeatureRequestStatus },
                  })
                }
                value={post.requestStatus ?? 'received'}
              >
                {Object.entries(FEATURE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="admin-setting">
            <div>
              <strong>상단 고정</strong>
              <p>{post.isPinned ? '목록 맨 위에 고정되어 있습니다.' : '고정하면 목록 맨 위에 보입니다.'}</p>
            </div>
            <button
              aria-pressed={post.isPinned}
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => moderationMutation.mutate({ post, change: { isPinned: !post.isPinned } })}
              type="button"
            >
              {post.isPinned ? '고정 해제' : '상단 고정'}
            </button>
          </div>

          <DangerZone>
            <p>게시글과 달린 댓글 {formatCount(post.commentCount)}개가 함께 지워집니다.</p>
            <button
              className="btn admin-btn-danger btn-sm"
              disabled={busy}
              onClick={async () => {
                if (
                  await confirm({
                    title: '게시글을 삭제할까요?',
                    description: `'${post.title}' 글과 댓글 ${formatCount(post.commentCount)}개가 지워지고 되돌릴 수 없습니다.`,
                    confirmLabel: '게시글 삭제',
                  })
                ) {
                  deleteMutation.mutate(post);
                }
              }}
              type="button"
            >
              게시글 삭제
            </button>
          </DangerZone>
        </>
      ) : null}
    </AdminDialog>
  );
}
