'use client';

import './SiteGuide.css';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  CalendarDays,
  ClipboardPen,
  MapPin,
  MessageSquareText,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import {
  SITE_GUIDE_OPEN_EVENT,
  SITE_GUIDE_SKIP_PATHS,
  hasSeenSiteGuide,
  markSiteGuideSeen,
} from '@/lib/site-guide';

type GuideStep = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string[];
  cta?: { href: string; label: string };
};

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: Sparkles,
    eyebrow: '환영합니다',
    title: '야크크 야르~에 오신 걸 환영해요',
    body: [
      '야구장 직관과 집에서 본 집관 기록을 캘린더에 모아두는 KBO 팬 서비스예요.',
      '1분만 투자해서 주요 기능을 둘러볼까요?',
    ],
  },
  {
    icon: CalendarDays,
    eyebrow: '캘린더',
    title: '캘린더로 경기 일정 보기',
    body: [
      '회원가입 때 고른 내 팀 기준으로 경기 일정·결과·선발 투수가 캘린더에 표시돼요.',
      '상단 필터로 내 팀/전체 경기, 직관/집관, 기록 있는 날만 골라 볼 수 있고, 오늘 버튼으로 바로 돌아와요.',
    ],
    cta: { href: '/calendar', label: '캘린더 열기' },
  },
  {
    icon: ClipboardPen,
    eyebrow: '기록',
    title: '직관·집관 기록 남기기',
    body: [
      '경기를 눌러 직관 또는 집관 기록을 남기세요. 사진, 메모, 함께 간 친구 태그까지 저장돼요.',
      '승패가 난 경기를 3번 이상 보고 승률이 60% 이상이면 승리요정 타이틀이 붙어요.',
    ],
  },
  {
    icon: Trophy,
    eyebrow: '경기 상세',
    title: '경기 상세와 응원가',
    body: [
      '경기 상세에서 선발 투수 기록과 라인업을 확인하고, 선수를 누르면 응원가를 볼 수 있어요.',
      '라인업은 경기 전에 발표되는 대로 자동으로 채워져요.',
    ],
    cta: { href: '/cheers', label: '응원가 보기' },
  },
  {
    icon: MapPin,
    eyebrow: '구장',
    title: '구장 정보와 팬 메모',
    body: [
      '구장별로 팬들이 남긴 맛집·주차·교통 메모를 모아 볼 수 있어요.',
      '맛·음식, 주차 같은 키워드 필터를 누르면 해당 단어가 들어간 메모만 하이라이트돼요.',
    ],
    cta: { href: '/stadiums', label: '구장 정보 보기' },
  },
  {
    icon: MessageSquareText,
    eyebrow: '커뮤니티',
    title: '팬 라운지와 앱 설치',
    body: [
      '팬 라운지에 직관 후기를 쓰고, 팬 찾기에서 같은 팀 팬을 팔로우해 보세요.',
      '브라우저 메뉴의 "홈 화면에 추가"로 앱처럼 설치할 수 있어요. 이 가이드는 상단/하단의 "가이드"에서 언제든 다시 볼 수 있어요.',
    ],
    cta: { href: '/posts', label: '팬 라운지 가기' },
  },
];

export function SiteGuide() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  // 첫 방문자에게는 화면을 가리는 모달 대신 작은 안내 카드만 띄운다.
  const [isInviteVisible, setIsInviteVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const step = GUIDE_STEPS[stepIndex];
  const isLastStep = stepIndex === GUIDE_STEPS.length - 1;

  const open = useCallback(() => {
    setStepIndex(0);
    setIsInviteVisible(false);
    setIsOpen(true);
  }, []);

  const dismissInvite = useCallback(() => {
    markSiteGuideSeen();
    setIsInviteVisible(false);
  }, []);

  const close = useCallback(() => {
    markSiteGuideSeen();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener(SITE_GUIDE_OPEN_EVENT, open);
    return () => window.removeEventListener(SITE_GUIDE_OPEN_EVENT, open);
  }, [open]);

  // 첫 방문에는 가이드 모달을 바로 열지 않고, 내용을 가리지 않는 안내 카드만 보여 준다.
  // 경로만 바뀌는 client navigation마다 다시 확인해도 본 뒤엔 뜨지 않는다.
  useEffect(() => {
    if (
      SITE_GUIDE_SKIP_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
      ) ||
      hasSeenSiteGuide()
    ) {
      setIsInviteVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsInviteVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close();
      } else if (event.key === 'ArrowRight') {
        setStepIndex((index) => Math.min(index + 1, GUIDE_STEPS.length - 1));
      } else if (event.key === 'ArrowLeft') {
        setStepIndex((index) => Math.max(index - 1, 0));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close, isOpen]);

  if (!isOpen) {
    if (!isInviteVisible) {
      return null;
    }

    return (
      <aside aria-label="사이트 가이드 안내" className="site-guide-invite">
        <p>
          <strong>처음 오셨나요?</strong>
          1분 가이드로 주요 기능을 둘러보세요.
        </p>
        <div className="site-guide-invite__actions">
          <button className="btn btn-primary btn-sm" onClick={open} type="button">
            가이드 보기
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={dismissInvite}
            type="button"
          >
            닫기
          </button>
        </div>
      </aside>
    );
  }

  const Icon = step.icon;

  return (
    <div
      className="site-guide-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="site-guide"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="site-guide-top">
          <span className="site-guide-step">
            {stepIndex + 1} / {GUIDE_STEPS.length}
          </span>
          <button className="site-guide-skip" onClick={close} type="button">
            건너뛰기
          </button>
        </div>

        <div className="site-guide-body" key={stepIndex}>
          <span aria-hidden="true" className="site-guide-icon">
            <Icon size={28} strokeWidth={2.2} />
          </span>
          <span className="site-guide-eyebrow">{step.eyebrow}</span>
          <h2 id={titleId}>{step.title}</h2>
          {step.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {step.cta ? (
            <Link
              className="site-guide-cta"
              href={step.cta.href}
              onClick={close}
            >
              {step.cta.label} →
            </Link>
          ) : null}
        </div>

        <div className="site-guide-dots" aria-label="가이드 단계">
          {GUIDE_STEPS.map((guideStep, index) => (
            <button
              aria-current={index === stepIndex ? 'step' : undefined}
              aria-label={`${index + 1}단계: ${guideStep.title}`}
              className={index === stepIndex ? 'is-active' : ''}
              key={guideStep.title}
              onClick={() => setStepIndex(index)}
              type="button"
            />
          ))}
        </div>

        <div className="site-guide-actions">
          <button
            className="btn btn-secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((index) => index - 1)}
            type="button"
          >
            이전
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              isLastStep ? close() : setStepIndex((index) => index + 1)
            }
            type="button"
          >
            {isLastStep ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
