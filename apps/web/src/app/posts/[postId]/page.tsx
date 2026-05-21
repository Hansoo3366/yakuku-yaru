'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { fetchMe } from '@/lib/auth-api';
import { getAccessToken, type PublicUser } from '@/lib/auth';
import {
  createComment,
  deleteComment,
  deletePost,
  fetchPost,
  listComments,
  type CommentItem,
  type PostDetail,
} from '@/lib/post-api';

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const postId = Number(params.postId);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchPost(postId).then((response) => setPost(response.post));
    listComments(postId).then((response) => setComments(response.items));

    const token = getAccessToken();

    if (token) {
      fetchMe(token)
        .then((response) => setCurrentUser(response.user))
        .catch(() => setCurrentUser(null));
    }
  }, [postId]);

  async function handleDeletePost() {
    const token = getAccessToken();

    if (!token) {
      router.push('/login');
      return;
    }

    await deletePost(postId, token);
    router.push('/posts');
  }

  async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();

    if (!token) {
      router.push('/login');
      return;
    }

    setErrorMessage('');

    try {
      const response = await createComment(postId, commentContent, token);
      setComments((current) => [...current, response.comment]);
      setCommentContent('');
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
      router.push('/login');
      return;
    }

    await deleteComment(commentId, token);
    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );
  }

  if (!post) {
    return (
      <main className="app-shell">
        <p className="loading-text">게시글을 불러오는 중</p>
      </main>
    );
  }

  const isAuthor = currentUser?.id === post.userId;

  return (
    <main className="app-shell">
      <article className="detail-panel">
        <Link className="back-link" href="/posts">
          게시판으로
        </Link>
        <div className="detail-heading">
          <div>
            <h1>{post.title}</h1>
            <p>
              {post.authorNickname} ·{' '}
              {new Date(post.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
          {isAuthor ? (
            <div className="inline-actions">
              <Link href={`/posts/${post.id}/edit`}>수정</Link>
              <button type="button" onClick={handleDeletePost}>
                삭제
              </button>
            </div>
          ) : null}
        </div>
        <p className="post-content">{post.content}</p>
      </article>

      <section className="comments-panel">
        <h2>댓글</h2>
        <form className="comment-form" onSubmit={handleCreateComment}>
          <textarea
            onChange={(event) => setCommentContent(event.target.value)}
            placeholder="댓글을 입력하세요"
            required
            rows={3}
            value={commentContent}
          />
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <button type="submit">댓글 작성</button>
        </form>

        <div className="comment-list">
          {comments.length ? (
            comments.map((comment) => (
              <div className="comment-item" key={comment.id}>
                <p>{comment.content}</p>
                <span>
                  {comment.authorNickname} ·{' '}
                  {new Date(comment.createdAt).toLocaleString('ko-KR')}
                </span>
                {currentUser?.id === comment.userId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="empty-text">아직 댓글이 없습니다.</p>
          )}
        </div>
      </section>
    </main>
  );
}
