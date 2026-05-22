import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <header className="auth-header">
          <span className="eyebrow">Offline</span>
          <h1>지금은 연결이 끊겼어요</h1>
          <p>
            네트워크가 다시 연결되면 캘린더와 직관 기록을 이어서 확인할 수 있어요.
          </p>
        </header>
        <Link className="btn btn-primary btn-lg btn-block" href="/calendar">
          캘린더로 돌아가기
        </Link>
      </section>
    </main>
  );
}
