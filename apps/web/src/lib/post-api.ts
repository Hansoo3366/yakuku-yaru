import { request } from './api';

export type PostListItem = {
  id: number;
  userId: number;
  title: string;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  authorFavoriteTeamShortName: string | null;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PostDetail = PostListItem & {
  content: string;
};

export type CommentItem = {
  id: number;
  postId: number;
  userId: number;
  content: string;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  authorFavoriteTeamShortName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostListResponse = {
  items: PostListItem[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export function listPosts(input: {
  page?: number;
  size?: number;
  keyword?: string;
}) {
  const params = new URLSearchParams();

  params.set('page', String(input.page ?? 1));
  params.set('size', String(input.size ?? 10));

  if (input.keyword) {
    params.set('keyword', input.keyword);
  }

  return request<PostListResponse>(`/posts?${params.toString()}`);
}

export function fetchPost(postId: number) {
  return request<{ post: PostDetail }>(`/posts/${postId}`);
}

export function createPost(
  input: { title: string; content: string },
  token: string,
) {
  return request<{ post: PostDetail }>('/posts', {
    method: 'POST',
    body: input,
    token,
  });
}

export function updatePost(
  postId: number,
  input: { title: string; content: string },
  token: string,
) {
  return request<{ post: PostDetail }>(`/posts/${postId}`, {
    method: 'PATCH',
    body: input,
    token,
  });
}

export function deletePost(postId: number, token: string) {
  return request<void>(`/posts/${postId}`, {
    method: 'DELETE',
    token,
  });
}

export function listComments(postId: number) {
  return request<{ items: CommentItem[] }>(`/posts/${postId}/comments`);
}

export function createComment(postId: number, content: string, token: string) {
  return request<{ comment: CommentItem }>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { content },
    token,
  });
}

export function deleteComment(commentId: number, token: string) {
  return request<void>(`/comments/${commentId}`, {
    method: 'DELETE',
    token,
  });
}
