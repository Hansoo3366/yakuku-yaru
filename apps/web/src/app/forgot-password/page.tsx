'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { requestPasswordReset } from '@/lib/auth-api';
import { EMAIL_MAX_LENGTH } from '@/lib/user-input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setDevResetUrl(null);
    setIsSubmitting(true);

    try {
      const response = await requestPasswordReset(email.trim());
      setSuccessMessage(response.message);
      if (response.resetUrl) {
        setDevResetUrl(response.resetUrl);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('요청 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <Link className="back-link" href="/login">
        로그인으로
      </Link>
      <section className="auth-card">
        <header className="auth-header">
          <span className="eyebrow">Password reset</span>
          <h1>비밀번호 찾기</h1>
          <p>가입한 이메일로 재설정 링크를 보내드려요.</p>
        </header>

        {successMessage ? (
          <div className="stack-sm">
            <p className="form-success">{successMessage}</p>
            {devResetUrl ? (
              <p className="auth-footnote">
                개발 환경 링크:{' '}
                <a href={devResetUrl}>{devResetUrl}</a>
              </p>
            ) : null}
            <Link className="btn btn-primary btn-lg btn-block" href="/login">
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="email">
                이메일
              </label>
              <input
                autoComplete="email"
                className="form-input"
                id="email"
                maxLength={EMAIL_MAX_LENGTH}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <button
              className="btn btn-primary btn-lg btn-block"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? '보내는 중' : '재설정 링크 받기'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
