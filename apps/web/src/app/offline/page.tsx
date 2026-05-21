import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="app-shell offline-shell">
      <section className="offline-panel">
        <p className="eyebrow">Offline</p>
        <h1>지금은 연결이 끊겼어요</h1>
        <p>
          네트워크가 다시 연결되면 캘린더와 직관 기록을 이어서 확인할 수
          있습니다.
        </p>
        <Link className="solid-link" href="/calendar">
          캘린더로 돌아가기
        </Link>
      </section>
    </main>
  );
}
