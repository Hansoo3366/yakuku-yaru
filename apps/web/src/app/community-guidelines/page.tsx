import type { Metadata } from 'next';
import { SERVICE_CONTACT_EMAIL } from '@/lib/service-contact';
import styles from '../legal.module.css';

export const metadata: Metadata = { title: '커뮤니티 운영정책' };

export default function CommunityGuidelinesPage() {
  return (
    <main className={`app-shell ${styles.page}`}>
      <header className={styles.header}>
        <span>Community rules · 2026.08.03</span>
        <h1>커뮤니티 운영정책</h1>
        <p>응원 팀은 달라도 사람을 존중하는 야구 팬 커뮤니티를 지향합니다.</p>
      </header>
      <div className={styles.body}>
        <section className={styles.section}>
          <h2>환영하는 콘텐츠</h2>
          <ul>
            <li>직관·집관 후기, 좌석 시야와 구장 이용 팁</li>
            <li>출처가 명확한 야구 정보와 건전한 의견</li>
            <li>서비스를 더 낫게 만드는 구체적인 기능 제안</li>
          </ul>
        </section>
        <section className={styles.section}>
          <h2>허용하지 않는 콘텐츠</h2>
          <ul>
            <li>욕설, 혐오, 괴롭힘, 위협, 선수·이용자에 대한 인신공격</li>
            <li>개인정보 노출, 사칭, 불법 촬영물과 권리 침해 콘텐츠</li>
            <li>도배, 광고, 피싱, 불법 예매·암표 거래</li>
            <li>허위 사실을 사실처럼 단정하거나 경기장 안전을 해치는 정보</li>
          </ul>
        </section>
        <section className={styles.section}>
          <h2>신고와 조치</h2>
          <p>
            게시글과 댓글의 신고 기능을 이용해주세요. 운영자는 신고 내용을 검토해
            콘텐츠 삭제, 경고, 이용 제한 등의 조치를 할 수 있습니다. 긴급한 권리
            침해 문의는{' '}
            <a href={`mailto:${SERVICE_CONTACT_EMAIL}`}>{SERVICE_CONTACT_EMAIL}</a>로
            보내주세요.
          </p>
        </section>
      </div>
    </main>
  );
}
