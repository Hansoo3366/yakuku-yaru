'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const STAT_GLOSSARY: Record<string, string> = {
  ERA: '평균자책점 — 9이닝당 허용한 평균 실점입니다. 낮을수록 좋습니다.',
  WHIP: '이닝당 출루 허용 — 1이닝당 허용한 출루(안타+볼넷) 수입니다. 낮을수록 좋습니다.',
  WAR: '대체 선수 대비 기여도 — 팀 승리에 얼마나 기여했는지 추정한 지표입니다.',
  QS: '퀄리티 스타트 — 선발이 6이닝 이상, 3실점 이하로 던진 경기 횟수입니다.',
  OPS: '출루율+장타율 — 공격 종합 지표입니다. 높을수록 좋습니다.',
};

const POPOVER_MAX_WIDTH = 320;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;

type PopoverPlacement = 'above' | 'below';

type PopoverPosition = {
  left: number;
  top: number;
  placement: PopoverPlacement;
};

function getPopoverPosition(anchorRect: DOMRect, popoverHeight: number): PopoverPosition {
  const width = Math.min(POPOVER_MAX_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
  const left = Math.min(
    Math.max(
      VIEWPORT_PADDING,
      anchorRect.left + anchorRect.width / 2 - width / 2,
    ),
    window.innerWidth - width - VIEWPORT_PADDING,
  );

  const belowTop = anchorRect.bottom + POPOVER_GAP;
  const fitsBelow =
    belowTop + popoverHeight <= window.innerHeight - VIEWPORT_PADDING;
  const fitsAbove =
    anchorRect.top - POPOVER_GAP - popoverHeight >= VIEWPORT_PADDING;

  if (fitsBelow || !fitsAbove) {
    return { left, top: belowTop, placement: 'below' };
  }

  return { left, top: anchorRect.top - POPOVER_GAP, placement: 'above' };
}

function StatTermPopover({
  hintId,
  abbr,
  description,
  anchorRect,
  onClose,
}: {
  hintId: string;
  abbr: string;
  description: string;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition>(() =>
    getPopoverPosition(anchorRect, 96),
  );

  const updatePosition = useCallback(() => {
    const height = popoverRef.current?.offsetHeight ?? 96;
    setPosition(getPopoverPosition(anchorRect, height));
  }, [anchorRect]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, description]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [onClose, updatePosition]);

  return createPortal(
    <div className="stat-term-popover-layer">
      <button
        aria-label="설명 닫기"
        className="stat-term-popover-backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        className={`stat-term-popover${
          position.placement === 'above' ? ' stat-term-popover--above' : ''
        }`}
        id={hintId}
        ref={popoverRef}
        role="tooltip"
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
        }}
      >
        <strong className="stat-term-popover-title">{abbr}</strong>
        <p>{description}</p>
      </div>
    </div>,
    document.body,
  );
}

type StatTermProps = {
  abbr: string;
  className?: string;
};

export function StatTerm({ abbr, className }: StatTermProps) {
  const description = STAT_GLOSSARY[abbr];
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();

  const closePopover = useCallback(() => {
    setOpen(false);
    setAnchorRect(null);
  }, []);

  const openPopover = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setAnchorRect(rect);
    setOpen(true);
  }, []);

  if (!description) {
    return <span className={className}>{abbr}</span>;
  }

  return (
    <span className={`stat-term${className ? ` ${className}` : ''}`}>
      <span className="stat-term-abbr">{abbr}</span>
      <button
        ref={buttonRef}
        aria-controls={open ? hintId : undefined}
        aria-expanded={open}
        aria-label={`${abbr} 설명`}
        className="stat-term-info"
        onClick={() => {
          if (open) {
            closePopover();
            return;
          }

          openPopover();
        }}
        type="button"
      >
        i
      </button>
      {open && anchorRect ? (
        <StatTermPopover
          abbr={abbr}
          anchorRect={anchorRect}
          description={description}
          hintId={hintId}
          onClose={closePopover}
        />
      ) : null}
    </span>
  );
}
