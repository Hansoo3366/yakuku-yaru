import type { Metadata } from 'next';
import { SERVICE_CONTACT_EMAIL } from '@/lib/service-contact';
import styles from '../legal.module.css';

export const metadata: Metadata = { title: '개인정보 처리방침' };

export default function PrivacyPage() {
  return (
    <main className={`app-shell ${styles.page}`}>
      <header className={styles.header}>
        <span>Privacy policy · 2026.08.03</span>
        <h1>개인정보 처리방침</h1>
        <p>
          야크크 야르는 서비스에 꼭 필요한 정보만 처리하고, 이용자가 자신의
          정보를 확인·수정·삭제할 수 있도록 운영합니다.
        </p>
      </header>
      <aside className={styles.index}>
        <strong>한눈에 보기</strong>
        <span>계정 운영, 야구 기록 저장, 커뮤니티 제공을 위해 정보를 사용합니다.</span>
        <span>회원 탈퇴 또는 목적 달성 후 지체 없이 파기하는 것을 원칙으로 합니다.</span>
      </aside>
      <div className={styles.body}>
        <section className={styles.section}>
          <h2>1. 처리하는 정보와 목적</h2>
          <ul>
            <li>이메일, 비밀번호 해시, 닉네임: 가입·로그인·본인 확인</li>
            <li>응원 팀, 프로필 이미지: 맞춤 화면과 공개 팬 프로필</li>
            <li>게시글, 댓글, 직관 기록, 사진, 메모: 커뮤니티와 기록 기능</li>
            <li>접속·오류 기록: 보안, 부정 이용 방지, 장애 대응</li>
          </ul>
        </section>
        <section className={styles.section}>
          <h2>2. 보유 및 파기</h2>
          <p>
            회원 정보와 이용자가 작성한 기록은 회원 탈퇴 시까지 보유합니다.
            관계 법령상 보존 의무가 있거나 분쟁·신고 처리에 필요한 경우에는 해당
            목적에 필요한 기간만 별도로 보관한 뒤 안전하게 파기합니다.
          </p>
        </section>
        <section className={styles.section}>
          <h2>3. 공개되는 정보</h2>
          <p>
            닉네임, 응원 팀, 프로필 이미지와 팬 라운지 게시글·댓글은 다른
            이용자에게 공개될 수 있습니다. 이메일과 비밀번호는 공개되지 않습니다.
            사진을 올릴 때 얼굴, 좌석 번호, 예매 정보 등 타인의 개인정보가 포함되지
            않도록 확인해주세요.
          </p>
        </section>
        <section className={styles.section}>
          <h2>4. 처리 위탁 및 국외 서비스</h2>
          <p>
            서버 운영, 이메일 발송 등 서비스 제공에 필요한 외부 인프라를 사용할 수
            있습니다. 실제 위탁·국외 이전 현황이 변경되면 이 방침에 제공자, 목적,
            항목과 보유 기간을 반영합니다.
          </p>
        </section>
        <section className={styles.section}>
          <h2>5. 이용자의 권리</h2>
          <p>
            자신의 개인정보 열람·수정·삭제·처리 정지를 요청할 수 있습니다. 계정
            삭제 또는 개인정보 관련 요청은 아래 연락처로 보내주세요.
          </p>
          <p>
            <a href={`mailto:${SERVICE_CONTACT_EMAIL}`}>{SERVICE_CONTACT_EMAIL}</a>
          </p>
        </section>
        <section className={styles.section}>
          <h2>6. 아동의 개인정보</h2>
          <p>
            야크크 야르는 만 14세 미만 이용자의 회원가입을 받지 않습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
