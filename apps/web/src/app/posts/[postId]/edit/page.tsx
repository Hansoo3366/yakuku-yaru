'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { fetchPost, updatePost } from '@/lib/post-api';
import { Skeleton } from '@/components/Skeleton';

export default function EditPostPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const postId = Number(params.postId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }

    fetchPost(postId)
      .then((response) => {
        setTitle(response.post.title);
        setContent(response.post.content);
      })
      .finally(() => setIsLoaded(true));
  }, [postId, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await updatePost(postId, { title, content }, token);
      router.push(`/posts/${postId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('게시글 수정 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <main className="app-shell">
        <Skeleton height={32} width="60%" />
        <Skeleton height={200} radius={10} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Link className="back-link" href={`/posts/${postId}`}>
        게시글로
      </Link>

      <header className="app-page-header">
        <span className="eyebrow">Edit Post</span>
        <h1>후기 수정</h1>
      </header>

      <form className="form-grid" onSubmit={handleSubmit}>
        <section className="card stack">
          <div className="field">
            <label className="field-label" htmlFor="title-input">
              제목
            </label>
            <input
              className="form-input"
              id="title-input"
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="content-input">
              본문
            </label>
            <textarea
              className="form-textarea"
              id="content-input"
              onChange={(event) => setContent(event.target.value)}
              required
              rows={10}
              value={content}
            />
          </div>
        </section>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="action-bar">
          <button
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '저장 중' : '수정 완료'}
          </button>
          <Link className="btn btn-ghost btn-lg" href={`/posts/${postId}`}>
            취소
          </Link>
        </div>
      </form>
    </main>
  );
}
