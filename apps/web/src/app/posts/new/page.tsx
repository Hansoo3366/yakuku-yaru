'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { createPost } from '@/lib/post-api';

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
    }
  }, [router]);

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
      const response = await createPost({ title, content }, token);
      router.push(`/posts/${response.post.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('게시글 작성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="editor-panel">
        <Link className="back-link" href="/posts">
          게시판으로
        </Link>
        <h1>후기 작성</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            제목
            <input
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label>
            본문
            <textarea
              onChange={(event) => setContent(event.target.value)}
              required
              rows={10}
              value={content}
            />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? '저장 중' : '작성 완료'}
          </button>
        </form>
      </section>
    </main>
  );
}
