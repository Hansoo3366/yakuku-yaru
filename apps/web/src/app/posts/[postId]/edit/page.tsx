'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PostEditor } from '@/components/PostEditor';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { fetchPost, updatePost } from '@/lib/post-api';
import { Skeleton } from '@/components/Skeleton';
import type { PostFormValues } from '@/lib/form-schemas';
import { queryKeys } from '@/lib/query-keys';
import { useMeQuery } from '@/lib/queries';

export default function EditPostPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  useAuthGuard();
  const token = useAuthStore((state) => state.token);
  const storedUser = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const meQuery = useMeQuery(token);
  const postId = Number(params.postId);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [initialValues, setInitialValues] = useState<PostFormValues | null>(null);
  const currentUser = meQuery.data?.user ?? storedUser;
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      router.replace('/');
      return;
    }

    fetchPost(postId)
      .then((response) => {
        setInitialValues({
          category:
            response.post.category === 'notice' && !isAdmin
              ? 'free'
              : response.post.category,
          title: response.post.title,
          content: response.post.content,
          isPinned: isAdmin ? response.post.isPinned : false,
        });
      })
      .finally(() => setIsLoaded(true));
  }, [hasHydrated, isAdmin, postId, router, token]);

  async function onSubmit(values: PostFormValues) {
    if (!token) {
      router.replace('/');
      return;
    }

    setErrorMessage('');

    try {
      const response = await updatePost(
        postId,
        {
          ...values,
          category:
            !isAdmin && values.category === 'notice'
              ? 'free'
              : values.category,
          isPinned: isAdmin ? values.isPinned : false,
        },
        token,
      );
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

  if (!isLoaded || !initialValues) {
    return (
      <main className="app-shell">
        <Skeleton height={32} width="60%" />
        <Skeleton height={200} radius={10} />
      </main>
    );
  }

  return (
    <PostEditor
      cancelHref={`/posts/${postId}`}
      description="글의 종류와 내용을 다시 확인하고 더 정확하게 다듬어주세요."
      errorMessage={errorMessage}
      initialValues={initialValues}
      isAdmin={isAdmin}
      key={`${postId}-${isAdmin}-${initialValues.category}-${initialValues.isPinned}`}
      mode="edit"
      onSubmit={onSubmit}
    />
  );
}
