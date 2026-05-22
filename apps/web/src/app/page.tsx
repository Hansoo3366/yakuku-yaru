import Link from 'next/link';

const featureItems = [
  '내 팀 경기 일정 캘린더',
  '직관 사진 업로드와 썸네일',
  '스코어 수정과 승률 계산',
  '승률 50% 이상 승리요정 타이틀',
];

const milestoneItems = [
  '회원가입/로그인',
  '게시판과 댓글',
  '경기 일정 캘린더',
  '직관 기록',
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">KBO 직관 기록 PWA</p>
          <h1>야크크 야르</h1>
          <p className="description">
            내 팀 경기 일정부터 직관 사진, 스코어, 승률까지 한 화면에서 이어지는
            야구 기록 웹앱입니다.
          </p>
          <div className="actions">
            <Link href="/calendar">캘린더 보기</Link>
            <Link href="/posts" className="secondary">
              후기 게시판
            </Link>
            <Link href="/me" className="secondary">
              마이페이지
            </Link>
          </div>
        </div>
        <div className="score-card" aria-label="직관 통계 미리보기">
          <span>승리요정 기준</span>
          <strong>50%</strong>
          <p>직관 승률이 50% 이상이면 마이페이지에서 타이틀이 열립니다.</p>
        </div>
      </section>

      <section className="content-grid" aria-label="기능 요약">
        <div>
          <h2>핵심 기능</h2>
          <ul>
            {featureItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>첫 마일스톤</h2>
          <ul>
            {milestoneItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
