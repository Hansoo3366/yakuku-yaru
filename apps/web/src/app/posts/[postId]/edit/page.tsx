'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { fetchPost, updatePost } from '@/lib/post-api';

export default function EditPostPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const postId = Number(params.postId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }

    fetchPost(postId).then((response) => {
      setTitle(response.post.title);
      setContent(response.post.content);
    });
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

  return (
    <main className="app-shell">
      <section className="editor-panel">
        <Link className="back-link" href={`/posts/${postId}`}>
          게시글로
        </Link>
        <h1>후기 수정</h1>
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
            {isSubmitting ? '저장 중' : '수정 완료'}
          </button>
        </form>
      </section>
    </main>
  );
}
