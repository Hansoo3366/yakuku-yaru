import type { Metadata } from 'next';
import { SERVICE_CONTACT_EMAIL } from '@/lib/service-contact';
import styles from '../legal.module.css';

export const metadata: Metadata = { title: '이용약관' };

export default function TermsPage() {
  return (
    <main className={`app-shell ${styles.page}`}>
      <header className={styles.header}>
        <span>Terms of service · 2026.08.03</span>
        <h1>이용약관</h1>
        <p>야크크 야르를 안전하고 즐겁게 이용하기 위한 기본 약속입니다.</p>
      </header>
      <div className={styles.body}>
        <section className={styles.section}>
          <h2>1. 서비스의 성격</h2>
          <p>
            야크크 야르는 KBO 일정·기록과 팬 커뮤니티 기능을 제공하는 비공식 팬
            서비스입니다. KBO 및 각 구단과 제휴하거나 공식 운영되는 서비스가
            아닙니다.
          </p>
        </section>
        <section className={styles.section}>
          <h2>2. 계정과 이용 책임</h2>
          <ul>
            <li>정확한 이메일을 사용하고 계정 정보를 안전하게 관리해야 합니다.</li>
            <li>타인을 사칭하거나 다른 사람의 계정을 사용할 수 없습니다.</li>
            <li>만 14세 이상인 경우에만 가입할 수 있습니다.</li>
          </ul>
        </section>
        <section className={styles.section}>
          <h2>3. 게시물</h2>
          <p>
            작성자는 자신이 올린 글과 사진에 필요한 권리를 보유해야 합니다. 서비스
            화면에 게시물을 표시하고 운영·백업하는 데 필요한 범위에서 야크크 야르가
            해당 게시물을 이용할 수 있도록 허락합니다. 저작권은 작성자에게
            유지됩니다.
          </p>
        </section>
        <section className={styles.section}>
          <h2>4. 운영 조치</h2>
          <p>
            운영정책을 위반하거나 다른 이용자의 권리를 침해하는 콘텐츠는 사전 통지
            없이 숨김 또는 삭제될 수 있으며, 반복 위반 계정은 이용이 제한될 수
            있습니다.
          </p>
        </section>
        <section className={styles.section}>
          <h2>5. 데이터와 외부 링크</h2>
          <p>
            경기 정보는 수집 시점과 공식 기록 변경에 따라 지연되거나 달라질 수
            있습니다. 예매처 등 외부 사이트의 거래와 정책은 해당 서비스가
            책임집니다.
          </p>
        </section>
        <section className={styles.section}>
          <h2>6. 문의</h2>
          <p>
            약관 및 서비스 운영 문의는{' '}
            <a href={`mailto:${SERVICE_CONTACT_EMAIL}`}>{SERVICE_CONTACT_EMAIL}</a>로
            보내주세요.
          </p>
        </section>
      </div>
    </main>
  );
}
