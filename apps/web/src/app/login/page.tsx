'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { login } from '@/lib/auth-api';
import { setAccessToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await login({ email, password });
      setAccessToken(response.accessToken);
      router.push('/calendar');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <Link className="back-link" href="/">
        홈으로
      </Link>
      <section className="auth-card">
        <header className="auth-header">
          <span className="eyebrow">Sign in</span>
          <h1>다시 만나서 반가워요</h1>
          <p>직관 캘린더와 승률 기록을 이어서 확인하세요.</p>
        </header>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="email">
              이메일
            </label>
            <input
              autoComplete="email"
              className="form-input"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="field">
            <div className="field-label-row">
              <label className="field-label" htmlFor="password">
                비밀번호
              </label>
              <Link className="field-inline-link" href="/forgot-password">
                비밀번호 찾기
              </Link>
            </div>
            <input
              autoComplete="current-password"
              className="form-input"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <button
            className="btn btn-primary btn-lg btn-block"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '로그인 중' : '로그인'}
          </button>
        </form>

        <p className="auth-footnote">
          아직 계정이 없다면 <Link href="/register">회원가입</Link>
        </p>
      </section>
    </main>
  );
}
