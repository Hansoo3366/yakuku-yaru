'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  checkRegistrationAvailability,
  fetchVerificationStatus,
  register,
  resendVerificationEmail,
  verifyEmail,
} from '@/lib/auth-api';
import { listTeams, type Team } from '@/lib/baseball-api';
import { PasswordField } from '@/components/PasswordField';
import { DEFAULT_PROFILE_IMAGE_SRC } from '@/lib/profile-image';
import { getTeamLogoSrc } from '@/lib/team-logo';
import {
  EMAIL_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateEmailClient,
  validateNicknameClient,
  validatePasswordClient,
} from '@/lib/user-input';

type Step = 'account' | 'team' | 'done' | 'complete';

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const isVerifyResume = searchParams.get('verify') === '1';
  const resumeEmail = searchParams.get('email')?.trim() ?? '';
  const [step, setStep] = useState<Step>(isVerifyResume && resumeEmail ? 'done' : 'account');
  const [email, setEmail] = useState(isVerifyResume ? resumeEmail : '');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [devVerificationCode, setDevVerificationCode] = useState<string | null>(null);
  const [resendsRemaining, setResendsRemaining] = useState(3);
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(0);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isLoadingVerification, setIsLoadingVerification] = useState(
    Boolean(isVerifyResume && resumeEmail),
  );

  useEffect(() => {
    if (!isVerifyResume) {
      listTeams().then((response) => setTeams(response.items));
    }
  }, [isVerifyResume]);

  useEffect(() => {
    if (!isVerifyResume || !resumeEmail) {
      return;
    }

    let isMounted = true;
    setEmail(resumeEmail);
    setStep('done');
    setIsLoadingVerification(true);

    fetchVerificationStatus(resumeEmail)
      .then((status) => {
        if (!isMounted) return;

        applyVerificationMeta({
          emailSent: status.emailSent,
          expiresAt: status.expiresAt,
          expiresInSeconds: status.expiresInSeconds,
          resendAvailableAt: status.resendAvailableAt,
          resendInSeconds: status.resendInSeconds,
          resendsRemaining: status.resendsRemaining,
          verificationCode: status.verificationCode ?? null,
        });

        if (status.needsResend) {
          setErrorMessage(
            '인증번호가 만료되었거나 없어요. 아래 재전송 버튼을 눌러 새 인증번호를 받아주세요.',
          );
        }
      })
      .catch((error) => {
        if (!isMounted) return;

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('인증 상태를 불러오지 못했어요.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingVerification(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isVerifyResume, resumeEmail]);

  useEffect(() => {
    if (step !== 'done') return;

    const timer = window.setInterval(() => {
      setCodeSecondsLeft((current) => Math.max(0, current - 1));
      setResendSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  function applyVerificationMeta(response: {
    emailSent: boolean;
    expiresAt: string | null;
    expiresInSeconds: number;
    resendAvailableAt: string;
    resendInSeconds: number;
    resendsRemaining: number;
    verificationCode?: string | null;
  }) {
    setEmailSent(response.emailSent);
    setResendsRemaining(response.resendsRemaining);
    setDevVerificationCode(response.verificationCode ?? null);
    setVerificationCode('');
    setCodeSecondsLeft(response.expiresInSeconds);
    setResendSecondsLeft(response.resendInSeconds);
  }

  async function handleAccountNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const emailError = validateEmailClient(email);
    const nicknameError = validateNicknameClient(nickname);
    const passwordError = validatePasswordClient(password);
    const passwordConfirmError =
      password !== passwordConfirm ? '비밀번호가 일치하지 않습니다.' : null;

    if (emailError || nicknameError || passwordError || passwordConfirmError) {
      setErrorMessage(
        emailError ??
          nicknameError ??
          passwordError ??
          passwordConfirmError ??
          '',
      );
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy || !confirmedAge) {
      setErrorMessage(
        '이용약관·개인정보 처리방침 동의와 만 14세 이상 확인이 필요합니다.',
      );
      return;
    }

    setIsCheckingAccount(true);

    try {
      const availability = await checkRegistrationAvailability({ email, nickname });

      if (!availability.emailAvailable) {
        setErrorMessage('이미 사용 중인 이메일입니다. 다른 이메일을 입력해주세요.');
        return;
      }

      if (!availability.nicknameAvailable) {
        setErrorMessage('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.');
        return;
      }

      setStep('team');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('중복 확인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsCheckingAccount(false);
    }
  }

  async function handleSubmit() {
    setErrorMessage('');
    setInfoMessage('');
    setIsSubmitting(true);

    try {
      const response = await register({
        email,
        nickname,
        password,
        favoriteTeamId,
        agreedToTerms,
        agreedToPrivacy,
        confirmedAge,
      });
      applyVerificationMeta(response);
      setInfoMessage(
        response.emailSent
          ? '인증번호를 보냈어요. 메일함을 확인한 뒤 아래에 입력해주세요.'
          : '인증번호를 발급했어요. 아래에 입력해주세요.',
      );
      setStep('done');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('회원가입 중 오류가 발생했습니다.');
      }
      setStep('account');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const normalizedCode = verificationCode.replace(/\D/g, '');

    if (normalizedCode.length !== 6) {
      setErrorMessage('6자리 인증번호를 입력해주세요.');
      return;
    }

    setIsVerifying(true);

    try {
      await verifyEmail({ email, code: normalizedCode });
      setStep('complete');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('인증번호 확인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (resendSecondsLeft > 0 || resendsRemaining <= 0 || isResending) {
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsResending(true);

    try {
      const response = await resendVerificationEmail(email);
      applyVerificationMeta(response);
      setInfoMessage(
        response.emailSent
          ? '인증번호를 다시 보냈어요. 메일함을 확인해주세요.'
          : '새 인증번호를 발급했어요. 아래에 입력해주세요.',
      );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'EMAIL_ALREADY_VERIFIED') {
          setStep('complete');
          return;
        }
        setErrorMessage(error.message);
      } else {
        setErrorMessage('인증번호 재전송 중 오류가 발생했습니다.');
      }
    } finally {
      setIsResending(false);
    }
  }

  const canResend = resendSecondsLeft <= 0 && resendsRemaining > 0 && !isResending;

  return (
    <main className="auth-shell">
      <Link className="back-link" href="/">
        홈으로
      </Link>
      <section className="auth-card">
        <header className="auth-header">
          <span className="eyebrow">{isVerifyResume ? 'Verify email' : 'Sign up'}</span>
          <h1>{isVerifyResume ? '이메일 인증' : '야크크 야르 시작하기'}</h1>
          <p>
            {isVerifyResume
              ? '인증을 완료하면 로그인할 수 있어요. 메일의 인증번호를 입력하거나 재전송해주세요.'
              : '좋아하는 팀을 고르고, 직관 기록을 캘린더에 남겨보세요.'}
          </p>
        </header>

        {isVerifyResume ? null : (
        <ol className="auth-step-list">
          <li className={`auth-step ${step === 'account' ? 'is-active' : ''}`}>
            1. 계정 만들기
          </li>
          <li className={`auth-step ${step === 'team' ? 'is-active' : ''}`}>
            2. 응원 팀 선택
          </li>
          <li className={`auth-step ${step === 'done' ? 'is-active' : ''}`}>
            3. 이메일 인증
          </li>
        </ol>
        )}

        {step === 'account' ? (
          <form className="form-grid" onSubmit={handleAccountNext}>
            <div className="field">
              <label className="field-label" htmlFor="email">
                이메일
              </label>
              <input
                autoComplete="email"
                className="form-input"
                id="email"
                maxLength={EMAIL_MAX_LENGTH}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="nickname">
                닉네임
              </label>
              <input
                autoComplete="nickname"
                className="form-input"
                id="nickname"
                maxLength={NICKNAME_MAX_LENGTH}
                name="nickname"
                onChange={(event) => setNickname(event.target.value)}
                placeholder="동행자 검색에 노출됩니다"
                required
                type="text"
                value={nickname}
              />
              <span className="field-hint">한글·영문·숫자·_만, 2~20자.</span>
            </div>
            <div className="stack-sm">
              <PasswordField
                autoComplete="new-password"
                id="password"
                label="비밀번호"
                maxLength={PASSWORD_MAX_LENGTH}
                minLength={PASSWORD_MIN_LENGTH}
                name="password"
                onChange={setPassword}
                placeholder={`${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자`}
                required
                value={password}
              />
              <span className="field-hint">
                {PASSWORD_MIN_LENGTH}~{PASSWORD_MAX_LENGTH}자.
              </span>
            </div>
            <PasswordField
              autoComplete="new-password"
              id="passwordConfirm"
              label="비밀번호 확인"
              maxLength={PASSWORD_MAX_LENGTH}
              minLength={PASSWORD_MIN_LENGTH}
              name="passwordConfirm"
              onChange={setPasswordConfirm}
              placeholder="비밀번호를 다시 입력"
              required
              value={passwordConfirm}
            />
            <fieldset className="consent-list">
              <legend className="field-label">필수 동의</legend>
              <label className="checkbox-field">
                <input
                  checked={agreedToTerms}
                  name="agreedToTerms"
                  onChange={(event) => setAgreedToTerms(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <Link href="/terms" target="_blank">
                    이용약관
                  </Link>
                  에 동의합니다.
                </span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={agreedToPrivacy}
                  name="agreedToPrivacy"
                  onChange={(event) => setAgreedToPrivacy(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <Link href="/privacy" target="_blank">
                    개인정보 처리방침
                  </Link>
                  에 동의합니다.
                </span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={confirmedAge}
                  name="confirmedAge"
                  onChange={(event) => setConfirmedAge(event.target.checked)}
                  type="checkbox"
                />
                <span>만 14세 이상입니다.</span>
              </label>
            </fieldset>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <button
              className="btn btn-primary btn-lg btn-block"
              disabled={isCheckingAccount}
              type="submit"
            >
              {isCheckingAccount ? '확인 중' : '다음'}
            </button>
          </form>
        ) : null}

        {step === 'team' ? (
          <div className="form-grid">
            <div>
              <h2 className="auth-section-title">응원하는 팀 선택</h2>
              <p
                className="muted"
                style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}
              >
                나중에 마이페이지에서 언제든 변경할 수 있어요.
              </p>
            </div>
            <fieldset className="team-grid">
              <button
                aria-pressed={favoriteTeamId === null}
                className={`team-grid-card team-grid-card--none ${favoriteTeamId === null ? 'is-selected' : ''}`}
                onClick={() => setFavoriteTeamId(null)}
                type="button"
              >
                <img alt="" src={DEFAULT_PROFILE_IMAGE_SRC} />
                <span>미선택</span>
              </button>
              {teams.map((team) => {
                const isSelected = favoriteTeamId === team.id;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`team-grid-card ${isSelected ? 'is-selected' : ''}`}
                    key={team.id}
                    onClick={() => {
                      if (isSelected) {
                        setFavoriteTeamId(null);
                        return;
                      }

                      setFavoriteTeamId(team.id);
                    }}
                    type="button"
                  >
                    <img alt="" src={getTeamLogoSrc(team)} />
                    <span>{team.shortName}</span>
                  </button>
                );
              })}
            </fieldset>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <div className="action-bar">
              <button
                className="btn btn-primary btn-lg"
                disabled={isSubmitting}
                onClick={handleSubmit}
                type="button"
              >
                {isSubmitting ? '가입 중' : '회원가입 완료'}
              </button>
              <button
                className="btn btn-ghost btn-lg"
                onClick={() => setStep('account')}
                type="button"
              >
                이전
              </button>
            </div>
            <p
              className="muted"
              style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}
            >
              팀을 고르지 않고 가입할 수도 있어요.
            </p>
          </div>
        ) : null}

        {step === 'done' ? (
          <form className="form-grid" onSubmit={handleVerifyCode}>
            {isLoadingVerification ? (
              <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                인증 정보를 불러오는 중이에요.
              </p>
            ) : null}
            <div className="notice-card">
              <strong>이메일 인증번호를 입력해주세요</strong>
              <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                {isVerifyResume && !emailSent
                  ? `${email} 계정의 인증이 아직 완료되지 않았어요. 인증번호를 재전송한 뒤 입력해주세요.`
                  : emailSent
                    ? `${email} 주소로 6자리 인증번호를 보냈어요. 3분 안에 입력해주세요.`
                    : 'SMTP 설정이 없어 메일을 보내지 못했어요. 개발 환경에서는 아래 인증번호로 테스트할 수 있어요.'}
              </span>
              {!emailSent && devVerificationCode ? (
                <span className="field-hint">개발용 인증번호: {devVerificationCode}</span>
              ) : null}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="verificationCode">
                인증번호
              </label>
              <input
                autoComplete="one-time-code"
                className="form-input verification-code-input"
                id="verificationCode"
                inputMode="numeric"
                maxLength={6}
                name="verificationCode"
                onChange={(event) =>
                  setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                pattern="[0-9]{6}"
                placeholder="6자리 숫자"
                required
                type="text"
                value={verificationCode}
              />
              <span className="field-hint">
                {codeSecondsLeft > 0
                  ? `남은 시간 ${formatCountdown(codeSecondsLeft)}`
                  : '인증번호가 만료되었습니다. 재전송해주세요.'}
              </span>
            </div>
            {infoMessage ? (
              <p className="field-hint" role="status">
                {infoMessage}
              </p>
            ) : null}
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <button
              className="btn btn-primary btn-lg btn-block"
              disabled={isVerifying || isLoadingVerification}
              type="submit"
            >
              {isVerifying ? '확인 중' : '인증번호 확인'}
            </button>
            <button
              className="btn btn-ghost btn-lg btn-block"
              disabled={!canResend}
              onClick={handleResend}
              type="button"
            >
              {isResending
                ? '재전송 중'
                : resendsRemaining <= 0
                  ? '재전송 횟수 초과'
                  : resendSecondsLeft > 0
                    ? `재전송 (${resendSecondsLeft}초)`
                    : `인증번호 재전송 (남은 ${resendsRemaining}회)`}
            </button>
          </form>
        ) : null}

        {step === 'complete' ? (
          <div className="form-grid">
            <div className="notice-card">
              <strong>가입을 완료했어요!</strong>
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                이메일 인증이 끝났어요. 로그인해서 직관 기록을 시작해보세요.
              </span>
            </div>
            <Link className="btn btn-primary btn-lg btn-block" href="/login">
              로그인하러 가기
            </Link>
          </div>
        ) : null}

        {step !== 'done' && step !== 'complete' ? (
          <p className="auth-footnote">
            이미 계정이 있다면 <Link href="/login">로그인</Link>
          </p>
        ) : step === 'done' ? (
          <p className="auth-footnote">
            인증을 마치면 <Link href="/login">로그인</Link>할 수 있어요.
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <section className="auth-card">회원가입 화면을 불러오는 중이에요.</section>
        </main>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
