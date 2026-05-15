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
          <p className="eyebrow">PWA Baseball Attendance Log</p>
          <h1>Yakuku Yaru</h1>
          <p className="description">
            야구장 직관 기록을 캘린더에 남기고 사진, 스코어, 승률을
            한곳에서 관리하는 웹앱입니다.
          </p>
          <div className="actions">
            <a href="/calendar">캘린더 보기</a>
            <a href="/posts" className="secondary">
              후기 게시판
            </a>
          </div>
        </div>
        <div className="score-card" aria-label="직관 통계 미리보기">
          <span>직관 승률</span>
          <strong>50%</strong>
          <p>승리요정 타이틀 준비 중</p>
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
