'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdminBadge } from '@/components/AdminBadge';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { getAuthorProfileImageSrc } from '@/lib/profile-image';
import {
  createComment,
  deleteComment,
  deletePost,
} from '@/lib/post-api';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ReportButton } from '@/components/ReportButton';
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
import { FEATURE_STATUS_LABELS, POST_CATEGORY_LABELS } from '@/lib/post-meta';
import styles from './post-detail.module.css';

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

  if (postQuery.isLoading) {
    return (
      <main className={`app-shell ${styles.page}`}>
        <div className={styles.loading}>
          <Skeleton height={36} width={140} radius={0} />
          <Skeleton height={250} radius={0} />
          <Skeleton height={280} radius={0} />
        </div>
      </main>
    );
  }

  if (postQuery.isError || !post) {
    return (
      <main className={`app-shell ${styles.page}`}>
        <Link className={styles.backLink} href="/posts">
          ← 팬 라운지
        </Link>
        <div className={styles.errorState}>
          <EmptyState
            icon="!"
            title="글을 찾을 수 없어요"
            description="삭제되었거나 존재하지 않는 글입니다."
          />
        </div>
      </main>
    );
  }

  const isAuthor = currentUser?.id === post.userId;

  return (
    <main className={`app-shell with-bottom-nav ${styles.page}`}>
      <nav className={styles.sectionNav} aria-label="팬 커뮤니티 메뉴">
        <Link
          aria-current="page"
          className={styles.sectionNavActive}
          href="/posts"
        >
          팬 라운지
        </Link>
        <Link href="/fans">팬 찾기</Link>
      </nav>

      <Link className={styles.backLink} href="/posts">
        <span aria-hidden="true">←</span> 글 목록
      </Link>

      <article className={styles.article}>
        <header className={styles.articleHeader}>
          <div className={styles.articleLabelRow}>
            <span className={styles.articleKicker}>
              팬 라운지 · 글 #{String(post.id).padStart(3, '0')}
            </span>
            <span className={styles.articleCategory}>
              {post.isPinned ? '고정 · ' : ''}
              {POST_CATEGORY_LABELS[post.category]}
            </span>
            {post.requestStatus ? (
              <span className={styles.articleStatus}>
                {FEATURE_STATUS_LABELS[post.requestStatus]}
              </span>
            ) : null}
          </div>
          <div className={styles.articleTitleRow}>
            <h1>{post.title}</h1>
            {isAuthor ? (
              <div className={styles.articleActions} aria-label="게시글 관리">
                <Link
                  aria-label="게시글 수정"
                  className={styles.actionButton}
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
                  className={styles.actionButton}
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
            ) : (
              <ReportButton targetId={post.id} targetType="post" />
            )}
          </div>
          <div className={styles.articleMeta}>
            <Link className={styles.authorLink} href={`/fans/${post.userId}`}>
              <img
                alt={`${post.authorNickname} 프로필`}
                src={getAuthorProfileImageSrc(
                  post.authorProfileImageUrl,
                  post.authorFavoriteTeamShortName,
                )}
              />
              <span className={styles.authorCopy}>
                <span className={styles.authorNameRow}>
                  <strong>{post.authorNickname}</strong>
                  {post.authorRole === 'admin' ? <AdminBadge inverse /> : null}
                </span>
                <small>
                  {post.authorFavoriteTeamShortName
                    ? `${post.authorFavoriteTeamShortName} 팬`
                    : '야구팬'}
                </small>
              </span>
            </Link>
            <time dateTime={post.createdAt}>
              {formatKoreanDateTimeShort(post.createdAt)}
            </time>
          </div>
        </header>
        <div className={styles.articleBody}>
          <p className={styles.articleContent}>{post.content}</p>
        </div>
      </article>

      <section className={styles.commentsSection} aria-labelledby="comments-title">
        <header className={styles.commentsHeader}>
          <h2 id="comments-title">댓글</h2>
          <span>{String(comments.length).padStart(2, '0')}</span>
        </header>

        {commentsQuery.isError ? (
          <p className={styles.commentsError} role="status">
            댓글을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.
          </p>
        ) : comments.length ? (
          <div className={styles.commentList}>
            {comments.map((comment) => (
              <article className={styles.comment} key={comment.id}>
                <header className={styles.commentHead}>
                  <Link
                    className={styles.commentAuthor}
                    href={`/fans/${comment.userId}`}
                  >
                    <img
                      alt={`${comment.authorNickname} 프로필`}
                      src={getAuthorProfileImageSrc(
                        comment.authorProfileImageUrl,
                        comment.authorFavoriteTeamShortName,
                      )}
                    />
                    <span className={styles.commentAuthorText}>
                      <span className={styles.commentAuthorNameRow}>
                        <strong>{comment.authorNickname}</strong>
                        {comment.authorRole === 'admin' ? <AdminBadge /> : null}
                      </span>
                      <span className={styles.commentMeta}>
                        {comment.authorFavoriteTeamShortName ? (
                          <em>{comment.authorFavoriteTeamShortName}</em>
                        ) : null}
                        <time dateTime={comment.createdAt}>
                          {formatKoreanDateTimeShort(comment.createdAt)}
                        </time>
                      </span>
                    </span>
                  </Link>
                  {currentUser?.id === comment.userId ? (
                    <button
                      aria-label="댓글 삭제"
                      className={styles.commentDelete}
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
                  ) : (
                    <ReportButton targetId={comment.id} targetType="comment" />
                  )}
                </header>
                <p className={styles.commentContent}>{comment.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.commentEmpty}>
            <EmptyState
              icon="✎"
              title="아직 댓글이 없어요"
              description="가장 먼저 이야기를 이어가 보세요."
            />
          </div>
        )}

        {currentUser ? (
          <form
            className={styles.composer}
            onSubmit={handleSubmit(handleCreateComment)}
          >
            <div className={styles.composerHead}>
              <strong>댓글 남기기</strong>
              <span>{currentUser.nickname}</span>
            </div>
            <label className="sr-only" htmlFor="comment-content">
              댓글 내용
            </label>
            <textarea
              id="comment-content"
              placeholder="이 글에 대한 생각을 남겨주세요."
              rows={4}
              {...register('content')}
            />
            <div className={styles.composerFooter}>
              <div className={styles.composerMessages}>
                {errors.content?.message ? (
                  <p className={styles.composerError}>{errors.content.message}</p>
                ) : null}
                {errorMessage ? (
                  <p className={styles.composerError}>{errorMessage}</p>
                ) : null}
              </div>
              <button
                className={styles.submitButton}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? '등록 중' : '댓글 작성'}
              </button>
            </div>
          </form>
        ) : (
          <p className={styles.loginNote}>
            댓글을 남기려면 <Link href="/login">로그인</Link>이 필요해요.
          </p>
        )}
      </section>
    </main>
  );
}
