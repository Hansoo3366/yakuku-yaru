'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { verifyEmail } from '@/lib/auth-api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('이메일 인증을 처리하고 있어요.');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('인증 토큰이 없습니다.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('이메일 인증이 완료되었습니다.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(
          error instanceof ApiError
            ? error.message
            : '이메일 인증 중 오류가 발생했습니다.',
        );
      });
  }, [token]);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <header className="auth-header">
          <span className="eyebrow">Email verification</span>
          <h1>{status === 'success' ? '인증 완료' : '이메일 인증'}</h1>
          <p>{message}</p>
        </header>
        {status === 'loading' ? null : (
          <Link className="btn btn-primary btn-lg btn-block" href="/login">
            로그인하러 가기
          </Link>
        )}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="auth-shell">이메일 인증을 확인하고 있어요.</main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
