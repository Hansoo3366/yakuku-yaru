'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { deleteAdminComment, type AdminComment } from '@/lib/admin-api';
import {
  useAdminCommentsQuery,
  useAdminToken,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { useAdminFeedback } from '../_components/feedback';
import {
  formatDate,
  listState,
  PanelHeading,
  Pagination,
  paginate,
  ResultCount,
  SearchBox,
  Toolbar,
} from '../_components/ui';

const PAGE_SIZE = 20;

export function CommentsTab() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const commentsQuery = useAdminCommentsQuery(keyword);
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { confirm, notify, notifyError } = useAdminFeedback();
  const comments = commentsQuery.data?.items ?? [];
  const pageData = paginate(comments, page, PAGE_SIZE);

  const deleteMutation = useMutation({
    mutationFn: (comment: AdminComment) => deleteAdminComment(comment.id, token),
    onSuccess: () => {
      notify('댓글을 삭제했습니다.');
      return invalidate(['admin', 'comments'], ['admin', 'posts']);
    },
    onError: (error) => notifyError(error, '댓글을 삭제하지 못했습니다.'),
  });

  const state = listState({
    ...commentsQuery,
    isEmpty: comments.length === 0,
    empty: keyword
      ? { title: `'${keyword}'에 맞는 댓글이 없습니다`, description: '댓글 내용이나 작성자 일부로 다시 찾아보세요.' }
      : { title: '아직 댓글이 없습니다', description: '사용자가 댓글을 쓰면 최신순으로 여기에 모입니다.' },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        description="최근 댓글을 어느 글에 달렸는지와 함께 봅니다. 최신 100개까지 불러옵니다."
        title="댓글"
      />
      <Toolbar>
        <SearchBox
          label="댓글 검색"
          onSearch={(next) => {
            setKeyword(next);
            setPage(1);
          }}
          placeholder="댓글, 게시글 제목, 작성자"
        />
        <ResultCount
          fetching={commentsQuery.isFetching && !commentsQuery.isPending}
          total={commentsQuery.data ? comments.length : null}
        />
      </Toolbar>

      {state ?? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">댓글</th>
                  <th scope="col">게시글</th>
                  <th scope="col">작성자</th>
                  <th scope="col">작성</th>
                  <th className="is-actions" scope="col">
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.items.map((comment) => (
                  <tr key={comment.id}>
                    <td className="is-primary is-wide">
                      <p className="admin-comment-text">{comment.content}</p>
                    </td>
                    <td data-label="게시글">
                      <Link className="admin-inline-link" href={`/posts/${comment.postId}`}>
                        {comment.postTitle}
                      </Link>
                    </td>
                    <td data-label="작성자">{comment.authorNickname}</td>
                    <td className="is-date" data-label="작성">
                      <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                    </td>
                    <td className="is-actions">
                      <button
                        aria-label={`${comment.authorNickname}의 댓글 삭제`}
                        className="admin-row-btn admin-row-btn--danger"
                        disabled={deleteMutation.isPending && deleteMutation.variables?.id === comment.id}
                        onClick={async () => {
                          if (
                            await confirm({
                              title: '댓글을 삭제할까요?',
                              description: (
                                <>
                                  <q>{comment.content.slice(0, 80)}{comment.content.length > 80 ? '…' : ''}</q>
                                  <br />
                                  {comment.authorNickname}님의 댓글이 지워지고 되돌릴 수 없습니다.
                                </>
                              ),
                              confirmLabel: '댓글 삭제',
                            })
                          ) {
                            deleteMutation.mutate(comment);
                          }
                        }}
                        type="button"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            label="댓글 페이지"
            onChange={setPage}
            page={pageData.page}
            totalPages={pageData.totalPages}
          />
        </>
      )}
    </section>
  );
}
