import { redirect } from 'next/navigation';

/**
 * 예전 메일의 인증 링크(/verify-email?token=...)가 도착하는 곳.
 * 인증은 이제 회원가입 화면의 6자리 인증번호로만 하며, 미인증 계정은 로그인 시 그 화면으로 안내된다.
 */
export default function VerifyEmailPage() {
  redirect('/login');
}
