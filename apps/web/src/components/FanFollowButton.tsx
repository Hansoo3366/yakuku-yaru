'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { followFan, unfollowFan } from '@/lib/user-api';

type FanFollowButtonProps = {
  userId: number;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  isSelf?: boolean;
  compact?: boolean;
};

export function FanFollowButton({
  userId,
  initialIsFollowing,
  initialFollowerCount,
  isSelf = false,
  compact = false,
}: FanFollowButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
    setFollowerCount(initialFollowerCount);
  }, [initialFollowerCount, initialIsFollowing]);

  if (isSelf) {
    return null;
  }

  async function handleFollow() {
    if (!token) {
      router.push('/login');
      return;
    }

    if (isPending) return;
    setIsPending(true);
    setErrorMessage('');

    try {
      const response = isFollowing
        ? await unfollowFan(userId, token)
        : await followFan(userId, token);
      setIsFollowing(response.fan.isFollowing);
      setFollowerCount(response.fan.followerCount);
      void queryClient.invalidateQueries({ queryKey: ['fans'] });
      void queryClient.invalidateQueries({ queryKey: ['fan-profile', userId] });
    } catch {
      setErrorMessage('팔로우 상태를 변경하지 못했어요.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <span className="fan-follow-control">
      <button
        aria-label={isFollowing ? '팔로우 취소' : '이 팬 팔로우'}
        aria-pressed={isFollowing}
        className={`fan-follow-button${compact ? ' is-compact' : ''}${isFollowing ? ' is-following' : ''}`}
        disabled={isPending}
        onClick={handleFollow}
        type="button"
      >
        <span>{isPending ? '처리 중' : isFollowing ? '팔로잉' : '팔로우'}</span>
        {!compact ? <strong>{followerCount}</strong> : null}
      </button>
      {errorMessage ? (
        <span className="fan-follow-error" role="status">
          {errorMessage}
        </span>
      ) : null}
    </span>
  );
}
