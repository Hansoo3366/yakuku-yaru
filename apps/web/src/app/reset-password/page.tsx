'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ApiError } from '@/lib/api';
import { PasswordField } from '@/components/PasswordField';
import { resetPassword } from '@/lib/auth-api';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePasswordClient,
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

    const passwordError = validatePasswordClient(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
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
            : `${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 설정해주세요.`}
        </p>
      </header>

      {successMessage ? (
        <Link className="btn btn-primary btn-lg btn-block" href="/login">
          로그인하러 가기
        </Link>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit}>
          <PasswordField
            autoComplete="new-password"
            id="password"
            label="새 비밀번호"
            maxLength={PASSWORD_MAX_LENGTH}
            minLength={PASSWORD_MIN_LENGTH}
            name="password"
            onChange={setPassword}
            required
            value={password}
          />
          <PasswordField
            autoComplete="new-password"
            id="passwordConfirm"
            label="새 비밀번호 확인"
            maxLength={PASSWORD_MAX_LENGTH}
            minLength={PASSWORD_MIN_LENGTH}
            name="passwordConfirm"
            onChange={setPasswordConfirm}
            required
            value={passwordConfirm}
          />
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
