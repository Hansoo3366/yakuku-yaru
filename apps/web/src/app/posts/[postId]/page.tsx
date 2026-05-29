'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useAuthStore } from '@/lib/auth-store';
import { getAuthorProfileImageSrc } from '@/lib/profile-image';
import {
  createComment,
  deleteComment,
  deletePost,
} from '@/lib/post-api';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import {
  commentFormSchema,
  type CommentFormValues,
} from '@/lib/form-schemas';
import {
  useCommentsQuery,
  useMeQuery,
  usePostQuery,
} from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { formatKoreanDateTimeShort } from '@/lib/date-format';

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const postId = Number(params.postId);
  const token = useAuthStore((state) => state.token);
  const storedUser = useAuthStore((state) => state.user);
  const postQuery = usePostQuery(postId);
  const commentsQuery = useCommentsQuery(postId);
  const meQuery = useMeQuery(token);
  const post = postQuery.data?.post ?? null;
  const comments = commentsQuery.data?.items ?? [];
  const currentUser = meQuery.data?.user ?? storedUser;
  const [errorMessage, setErrorMessage] = useState('');
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CommentFormValues>({
    defaultValues: { content: '' },
    resolver: zodResolver(commentFormSchema),
  });

  async function handleDeletePost() {
    const token = getAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }

    if (!window.confirm('이 글을 삭제할까요? 되돌릴 수 없어요.')) return;

    await deletePost(postId, token);
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
    router.push('/posts');
  }

  async function handleCreateComment(values: CommentFormValues) {
    const token = getAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }

    setErrorMessage('');

    try {
      const response = await createComment(postId, values.content, token);
      queryClient.setQueryData(queryKeys.comments(postId), {
        items: [...comments, response.comment],
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      reset();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('댓글 작성 중 오류가 발생했습니다.');
      }
    }
  }

  async function handleDeleteComment(commentId: number) {
    const token = getAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }

    await deleteComment(commentId, token);
    queryClient.setQueryData(queryKeys.comments(postId), {
      items: comments.filter((comment) => comment.id !== commentId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
  }

  if (!post) {
    return (
      <main className="app-shell">
        <Skeleton height={32} width="60%" />
        <Skeleton height={16} width="40%" />
        <Skeleton height={200} radius={10} />
      </main>
    );
  }

  const isAuthor = currentUser?.id === post.userId;

  return (
    <main className="app-shell">
      <Link className="back-link" href="/posts">
        게시판으로
      </Link>

      <article className="card">
        <header className="post-detail-header">
          <div>
            <h1>{post.title}</h1>
            <p className="post-detail-meta">
              <span className="author-inline">
                <img
                  alt=""
                  src={getAuthorProfileImageSrc(
                    post.authorProfileImageUrl,
                    post.authorFavoriteTeamShortName,
                  )}
                />
                <span>{post.authorNickname}</span>
              </span>
              <time dateTime={post.createdAt}>
                {formatKoreanDateTimeShort(post.createdAt)}
              </time>
            </p>
          </div>
          {isAuthor ? (
            <div className="icon-action-group" aria-label="게시글 관리">
              <Link
                aria-label="게시글 수정"
                className="icon-btn"
                href={`/posts/${post.id}/edit`}
                title="수정"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    d="M4 20h4.2L19.1 9.1a2.4 2.4 0 0 0 0-3.4l-.8-.8a2.4 2.4 0 0 0-3.4 0L4 15.8V20Zm2-2v-1.4L16.3 6.3a.4.4 0 0 1 .6 0l.8.8a.4.4 0 0 1 0 .6L7.4 18H6Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
              <button
                aria-label="게시글 삭제"
                className="icon-btn icon-btn-danger"
                onClick={handleDeletePost}
                title="삭제"
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm2.1 2 .45 7h4.9l.45-7h-5.8Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          ) : null}
        </header>
        <p className="post-content">{post.content}</p>
      </article>

      <section className="card">
        <div className="section-heading">
          <h2>댓글 {comments.length}</h2>
        </div>

        {comments.length ? (
          <div className="comment-list">
            {comments.map((comment) => (
              <div className="comment-card" key={comment.id}>
                <p>{comment.content}</p>
                <div className="comment-card-meta">
                  <span className="comment-card-author-line">
                    <span className="author-inline">
                      <img
                        alt=""
                        src={getAuthorProfileImageSrc(
                          comment.authorProfileImageUrl,
                          comment.authorFavoriteTeamShortName,
                        )}
                      />
                      <span>{comment.authorNickname}</span>
                    </span>
                    <time dateTime={comment.createdAt}>
                      {formatKoreanDateTimeShort(comment.createdAt)}
                    </time>
                  </span>
                  {currentUser?.id === comment.userId ? (
                    <button
                      aria-label="댓글 삭제"
                      className="icon-btn icon-btn-subtle"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="삭제"
                      type="button"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path
                          d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm2.1 2 .45 7h4.9l.45-7h-5.8Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="✎"
            title="아직 댓글이 없어요"
            description="가장 먼저 댓글을 남겨보세요."
          />
        )}

        {currentUser ? (
          <form
            className="form-grid-tight comment-write-form"
            onSubmit={handleSubmit(handleCreateComment)}
          >
            <textarea
              className="form-textarea"
              placeholder="댓글을 입력하세요"
              rows={3}
              {...register('content')}
            />
            {errors.content?.message ? (
              <p className="form-error">{errors.content.message}</p>
            ) : null}
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary btn-sm"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? '등록 중' : '댓글 작성'}
              </button>
            </div>
          </form>
        ) : (
          <p className="muted comment-login-note">
            댓글을 남기려면 <Link href="/login">로그인</Link>이 필요해요.
          </p>
        )}
      </section>
    </main>
  );
}
