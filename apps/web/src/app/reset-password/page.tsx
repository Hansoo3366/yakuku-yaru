'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ApiError } from '@/lib/api';
import { resetPassword } from '@/lib/auth-api';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/lib/user-input';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!token) {
      setErrorMessage('재설정 링크가 올바르지 않습니다. 비밀번호 찾기를 다시 요청해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ token, password });
      setSuccessMessage('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('비밀번호 변경 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token && !successMessage) {
    return (
      <section className="auth-card">
        <header className="auth-header">
          <span className="eyebrow">Password reset</span>
          <h1>링크가 유효하지 않아요</h1>
          <p>비밀번호 찾기에서 이메일을 다시 요청해주세요.</p>
        </header>
        <Link className="btn btn-primary btn-lg btn-block" href="/forgot-password">
          비밀번호 찾기
        </Link>
      </section>
    );
  }

  return (
    <section className="auth-card">
      <header className="auth-header">
        <span className="eyebrow">Password reset</span>
        <h1>{successMessage ? '변경 완료' : '새 비밀번호 설정'}</h1>
        <p>
          {successMessage
            ? successMessage
            : `영문·숫자 포함 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 설정해주세요.`}
        </p>
      </header>

      {successMessage ? (
        <Link className="btn btn-primary btn-lg btn-block" href="/login">
          로그인하러 가기
        </Link>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="password">
              새 비밀번호
            </label>
            <input
              autoComplete="new-password"
              className="form-input"
              id="password"
              maxLength={PASSWORD_MAX_LENGTH}
              minLength={PASSWORD_MIN_LENGTH}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="passwordConfirm">
              새 비밀번호 확인
            </label>
            <input
              autoComplete="new-password"
              className="form-input"
              id="passwordConfirm"
              maxLength={PASSWORD_MAX_LENGTH}
              minLength={PASSWORD_MIN_LENGTH}
              name="passwordConfirm"
              onChange={(event) => setPasswordConfirm(event.target.value)}
              required
              type="password"
              value={passwordConfirm}
            />
          </div>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <button
            className="btn btn-primary btn-lg btn-block"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '저장 중' : '비밀번호 변경'}
          </button>
        </form>
      )}
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <p className="loading-text">불러오는 중</p>
        </main>
      }
    >
      <main className="auth-shell">
        <Link className="back-link" href="/login">
          로그인으로
        </Link>
        <ResetPasswordForm />
      </main>
    </Suspense>
  );
}
