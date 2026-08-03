'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  postFormSchema,
  type PostFormValues,
} from '@/lib/form-schemas';
import type { PostCategory } from '@/lib/post-api';
import {
  POST_CONTENT_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
} from '@/lib/user-input';
import styles from './PostEditor.module.css';

const CATEGORY_OPTIONS: Array<{
  value: PostCategory;
  label: string;
  description: string;
}> = [
  { value: 'review', label: '직관 후기', description: '경기와 좌석 경험' },
  { value: 'free', label: '자유 이야기', description: '가볍게 나누는 야구 얘기' },
  { value: 'info', label: '야구장 정보', description: '구장 이용 팁과 정보' },
  { value: 'feature', label: '기능 개선', description: '서비스에 바라는 점' },
  { value: 'notice', label: '공지', description: '운영자가 전하는 안내' },
];

export function PostEditor({
  cancelHref,
  description,
  errorMessage,
  initialValues,
  isAdmin,
  mode,
  onSubmit,
}: {
  cancelHref: string;
  description: string;
  errorMessage: string;
  initialValues: PostFormValues;
  isAdmin: boolean;
  mode: 'create' | 'edit';
  onSubmit: (values: PostFormValues) => Promise<void>;
}) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<PostFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(postFormSchema),
  });
  const selectedCategory = watch('category');
  const title = watch('title');
  const content = watch('content');

  return (
    <main className={`app-shell ${styles.page}`}>
      <Link className={styles.backLink} href={cancelHref}>
        ← 팬 라운지
      </Link>
      <header className={styles.hero}>
        <div>
          <span>FAN LOUNGE · {mode === 'create' ? 'NEW ENTRY' : 'EDIT ENTRY'}</span>
          <h1>{mode === 'create' ? '새 글 쓰기' : '글 수정하기'}</h1>
          <p>{description}</p>
        </div>
        <aside>
          <strong>작성 순서</strong>
          <span>1. 글 종류 선택</span>
          <span>2. 제목과 본문 작성</span>
          <span>3. 내용 확인 후 게시</span>
        </aside>
      </header>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <section className={styles.section} aria-labelledby="category-title">
          <div className={styles.sectionHeading}>
            <span>01</span>
            <div>
              <h2 id="category-title">어떤 이야기인가요?</h2>
              <p>글과 가장 가까운 종류를 하나 골라주세요.</p>
            </div>
          </div>
          <div className={styles.categoryGrid}>
            {CATEGORY_OPTIONS.filter(
              (option) => isAdmin || option.value !== 'notice',
            ).map((option) => (
              <label className={styles.categoryOption} key={option.value}>
                <input
                  {...register('category')}
                  type="radio"
                  value={option.value}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                  <i aria-hidden="true">
                    {selectedCategory === option.value ? '선택됨' : '선택'}
                  </i>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="content-title">
          <div className={styles.sectionHeading}>
            <span>02</span>
            <div>
              <h2 id="content-title">이야기를 들려주세요</h2>
              <p>다른 팬이 내용을 바로 이해할 수 있게 적어주세요.</p>
            </div>
          </div>
          <div className={styles.fields}>
            <label>
              <span>
                제목
                <small>
                  {title.length}/{POST_TITLE_MAX_LENGTH}
                </small>
              </span>
              <input
                autoComplete="off"
                maxLength={POST_TITLE_MAX_LENGTH}
                placeholder="한눈에 내용을 알 수 있는 제목"
                {...register('title')}
              />
              {errors.title?.message ? (
                <em role="alert">{errors.title.message}</em>
              ) : null}
            </label>
            <label>
              <span>
                본문
                <small>
                  {content.length}/{POST_CONTENT_MAX_LENGTH}
                </small>
              </span>
              <textarea
                maxLength={POST_CONTENT_MAX_LENGTH}
                placeholder="경기 이야기, 구장 팁, 개선 아이디어를 자유롭게 적어주세요."
                rows={14}
                {...register('content')}
              />
              {errors.content?.message ? (
                <em role="alert">{errors.content.message}</em>
              ) : null}
            </label>
          </div>
        </section>

        {isAdmin ? (
          <section className={styles.adminOptions} aria-labelledby="admin-options-title">
            <div>
              <span>ADMIN ONLY</span>
              <strong id="admin-options-title">운영 노출 설정</strong>
              <p>공지 분류와 상단 고정은 관리자 계정에만 표시됩니다.</p>
            </div>
            <label>
              <input {...register('isPinned')} type="checkbox" />
              <span aria-hidden="true" />
              팬 라운지 상단에 고정
            </label>
          </section>
        ) : (
          <input {...register('isPinned')} hidden type="checkbox" />
        )}

        {errorMessage ? (
          <p className={styles.submitError} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <footer className={styles.actions}>
          <div>
            <strong>{mode === 'create' ? '게시할 준비가 됐나요?' : '수정을 저장할까요?'}</strong>
            <span>게시 후에도 내 글에서 다시 수정할 수 있어요.</span>
          </div>
          <Link href={cancelHref}>취소</Link>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting
              ? '저장 중…'
              : mode === 'create'
                ? '글 게시하기'
                : '수정 저장하기'}
          </button>
        </footer>
      </form>
    </main>
  );
}
