import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminConsole, AdminConsoleFallback } from './_components/AdminConsole';

export const metadata: Metadata = {
  title: '운영 관리',
  robots: { index: false, follow: false },
};

/**
 * 관리자 화면. 권한 확인과 탭 전환만 여기서 하고, 각 탭은 _tabs/ 의 파일이 자기 필터와 데이터를 갖는다.
 * 지금 탭은 ?tab= 에 둔다. useSearchParams 를 쓰므로 Suspense 로 감싼다.
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<AdminConsoleFallback />}>
      <AdminConsole />
    </Suspense>
  );
}
