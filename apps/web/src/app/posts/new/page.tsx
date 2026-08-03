'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PostEditor } from '@/components/PostEditor';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { createPost } from '@/lib/post-api';
import type { PostFormValues } from '@/lib/form-schemas';
import { useMeQuery } from '@/lib/queries';

export default function NewPostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useAuthGuard();
  const token = useAuthStore((state) => state.token);
  const storedUser = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const meQuery = useMeQuery(token);
  const [errorMessage, setErrorMessage] = useState('');
  const currentUser = meQuery.data?.user ?? storedUser;
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace('/');
    }
  }, [hasHydrated, router, token]);

  async function onSubmit(values: PostFormValues) {
    if (!token) {
      router.replace('/');
      return;
    }

    setErrorMessage('');

    try {
      const response = await createPost(
        {
          ...values,
          category:
            !isAdmin && values.category === 'notice'
              ? 'review'
              : values.category,
          isPinned: isAdmin ? values.isPinned : false,
        },
        token,
      );
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
    <PostEditor
      cancelHref="/posts"
      description="직관 후기부터 야구장 정보, 자유로운 이야기와 기능 제안까지 함께 나눠요."
      errorMessage={errorMessage}
      initialValues={{
        category: 'review',
        content: '',
        isPinned: false,
        title: '',
      }}
      isAdmin={isAdmin}
      mode="create"
      onSubmit={onSubmit}
    />
  );
}
