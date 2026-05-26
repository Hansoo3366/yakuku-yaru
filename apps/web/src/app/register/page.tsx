'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { checkRegistrationAvailability, register } from '@/lib/auth-api';
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

type Step = 'account' | 'team' | 'done';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('account');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);

  useEffect(() => {
    listTeams().then((response) => setTeams(response.items));
  }, []);

  async function handleAccountNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

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
    setIsSubmitting(true);

    try {
      const response = await register({
        email,
        nickname,
        password,
        favoriteTeamId,
      });
      setEmailSent(response.emailSent);
      setVerificationUrl(response.verificationUrl);
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

  return (
    <main className="auth-shell">
      <Link className="back-link" href="/">
        홈으로
      </Link>
      <section className="auth-card">
        <header className="auth-header">
          <span className="eyebrow">Sign up</span>
          <h1>야크크 야르 시작하기</h1>
          <p>좋아하는 팀을 고르고, 직관 기록을 캘린더에 남겨보세요.</p>
        </header>

        <ol className="auth-step-list">
          <li className={`auth-step ${step === 'account' ? 'is-active' : ''}`}>
            1. 계정 만들기
          </li>
          <li className={`auth-step ${step === 'team' ? 'is-active' : ''}`}>
            2. 응원 팀 선택
          </li>
          <li className={`auth-step ${step === 'done' ? 'is-active' : ''}`}>
            3. 인증 완료
          </li>
        </ol>

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
          <div className="form-grid">
            <div className="notice-card">
              <strong>이메일 인증 메일을 확인해주세요</strong>
              <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                {emailSent
                  ? `${email} 주소로 인증 링크를 보냈어요. 메일함에서 인증을 완료한 뒤 로그인해주세요.`
                  : 'SMTP 설정이 없어 메일을 보내지 못했어요. 개발 환경에서는 아래 링크로 인증을 테스트할 수 있어요.'}
              </span>
              {!emailSent && verificationUrl ? (
                <Link className="btn btn-ghost btn-sm" href={verificationUrl}>
                  개발용 인증 링크 열기
                </Link>
              ) : null}
            </div>
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={() => router.push('/login')}
              type="button"
            >
              로그인하러 가기
            </button>
          </div>
        ) : null}

        {step !== 'done' ? (
          <p className="auth-footnote">
            이미 계정이 있다면 <Link href="/login">로그인</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
