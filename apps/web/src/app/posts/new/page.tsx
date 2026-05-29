'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { createPost } from '@/lib/post-api';
import {
  postFormSchema,
  type PostFormValues,
} from '@/lib/form-schemas';

export default function NewPostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useAuthGuard();
  const [errorMessage, setErrorMessage] = useState('');
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PostFormValues>({
    defaultValues: { title: '', content: '' },
    resolver: zodResolver(postFormSchema),
  });

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/');
    }
  }, [router]);

  async function onSubmit(values: PostFormValues) {
    const token = getAccessToken();

    if (!token) {
      router.replace('/');
      return;
    }

    setErrorMessage('');

    try {
      const response = await createPost(values, token);
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.push(`/posts/${response.post.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('게시글 작성 중 오류가 발생했습니다.');
      }
    }
  }

  return (
    <main className="app-shell">
      <Link className="back-link" href="/posts">
        게시판으로
      </Link>

      <header className="app-page-header">
        <span className="eyebrow">New Post</span>
        <h1>후기 작성</h1>
        <p>경기장에서 느낀 분위기와 직관 팁을 공유해보세요.</p>
      </header>

      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <section className="card stack">
          <div className="field">
            <label className="field-label" htmlFor="title-input">
              제목
            </label>
            <input
              className="form-input"
              id="title-input"
              placeholder="예) 잠실 직관 첫 끝내기 승리 후기"
              {...register('title')}
            />
            {errors.title?.message ? (
              <p className="form-error">{errors.title.message}</p>
            ) : null}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="content-input">
              본문
            </label>
            <textarea
              className="form-textarea"
              id="content-input"
              placeholder="경기 분위기, 인상 깊었던 장면, 팁 등 자유롭게"
              rows={10}
              {...register('content')}
            />
            {errors.content?.message ? (
              <p className="form-error">{errors.content.message}</p>
            ) : null}
          </div>
        </section>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="action-bar">
          <button
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '저장 중' : '작성 완료'}
          </button>
          <Link className="btn btn-ghost btn-lg" href="/posts">
            취소
          </Link>
        </div>
      </form>
    </main>
  );
}
