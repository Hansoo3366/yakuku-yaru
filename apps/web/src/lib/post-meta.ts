import type { FeatureRequestStatus, PostCategory } from './post-api';

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  review: '직관 후기',
  free: '자유 이야기',
  info: '야구장 정보',
  feature: '기능 개선',
  notice: '공지',
};

export const FEATURE_STATUS_LABELS: Record<FeatureRequestStatus, string> = {
  received: '접수',
  reviewing: '검토 중',
  in_progress: '진행 중',
  completed: '반영 완료',
  deferred: '보류',
};

