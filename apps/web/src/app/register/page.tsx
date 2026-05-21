'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { register } from '@/lib/auth-api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setVerificationToken('');
    setIsSubmitting(true);

    try {
      const response = await register({ email, nickname, password });
      setVerificationToken(response.verificationToken);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Link className="back-link" href="/">
          Yakuku Yaru
        </Link>
        <h1>회원가입</h1>
        <p>좋아하는 팀을 고르기 전, 먼저 계정을 만들어주세요.</p>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            이메일
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            닉네임
            <input
              autoComplete="nickname"
              name="nickname"
              onChange={(event) => setNickname(event.target.value)}
              required
              type="text"
              value={nickname}
            />
          </label>
          <label>
            비밀번호
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? '가입 중' : '회원가입'}
          </button>
        </form>

        {verificationToken ? (
          <div className="notice-box">
            <strong>개발용 이메일 인증 토큰</strong>
            <p>{verificationToken}</p>
            <button type="button" onClick={() => router.push('/login')}>
              로그인하러 가기
            </button>
          </div>
        ) : null}

        <p className="auth-footnote">
          이미 계정이 있다면 <Link href="/login">로그인</Link>
        </p>
      </section>
    </main>
  );
}
