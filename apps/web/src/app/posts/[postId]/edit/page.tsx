'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { fetchPost, updatePost } from '@/lib/post-api';
import { Skeleton } from '@/components/Skeleton';
import {
  postFormSchema,
  type PostFormValues,
} from '@/lib/form-schemas';
import { queryKeys } from '@/lib/query-keys';

export default function EditPostPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  useAuthGuard();
  const postId = Number(params.postId);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PostFormValues>({
    defaultValues: { title: '', content: '' },
    resolver: zodResolver(postFormSchema),
  });

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/');
      return;
    }

    fetchPost(postId)
      .then((response) => {
        reset({
          title: response.post.title,
          content: response.post.content,
        });
      })
      .finally(() => setIsLoaded(true));
  }, [postId, reset, router]);

  async function onSubmit(values: PostFormValues) {
    const token = getAccessToken();

    if (!token) {
      router.replace('/');
      return;
    }

    setErrorMessage('');

    try {
      const response = await updatePost(postId, values, token);
      queryClient.setQueryData(queryKeys.post(postId), {
        post: response.post,
      });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.push(`/posts/${postId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('게시글 수정 중 오류가 발생했습니다.');
      }
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

      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <section className="card stack">
          <div className="field">
            <label className="field-label" htmlFor="title-input">
              제목
            </label>
            <input
              className="form-input"
              id="title-input"
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
