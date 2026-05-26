'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OpponentInsightItem } from '@/lib/calendar-opponent-insights';
import { getTeamLogoSrc } from '@/lib/team-logo';

const PREVIEW_RANK_COUNT = 3;

type OpponentInsightRankingProps = {
  items: OpponentInsightItem[];
  title: string;
  variant: 'high' | 'low';
  showViewAll?: boolean;
};

function formatRecord(item: OpponentInsightItem) {
  const parts = [`${item.wins}승`];

  if (item.draws > 0) {
    parts.push(`${item.draws}무`);
  }

  if (item.losses > 0) {
    parts.push(`${item.losses}패`);
  }

  return `${parts.join(' ')} · ${item.games}경기`;
}

function RankingEntry({
  item,
  rank,
  variant,
  compact,
}: {
  item: OpponentInsightItem;
  rank: number;
  variant: 'high' | 'low';
  compact: boolean;
}) {
  const logoSrc = getTeamLogoSrc({ shortName: item.shortName });

  return (
    <div
      className={`calendar-opponent-ranking__entry${
        compact ? ' calendar-opponent-ranking__entry--compact' : ''
      }`}
    >
      <span className="calendar-opponent-ranking__rank">{rank}</span>
      {logoSrc ? (
        <img
          alt=""
          className="calendar-opponent-ranking__logo"
          src={logoSrc}
        />
      ) : null}
      <span className="calendar-opponent-ranking__body">
        <span className="calendar-opponent-ranking__team">{item.shortName}</span>
        <span className="calendar-opponent-ranking__meta">
          <span className="calendar-opponent-ranking__rate">{item.rate}%</span>
          <span className="calendar-opponent-ranking__record">
            {formatRecord(item)}
          </span>
        </span>
      </span>
    </div>
  );
}

function OpponentRankingModal({
  items,
  title,
  variant,
  onClose,
}: {
  items: OpponentInsightItem[];
  title: string;
  variant: 'high' | 'low';
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="opponent-ranking-modal">
      <button
        aria-label="닫기"
        className="opponent-ranking-modal__backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        className="opponent-ranking-modal__panel"
        role="dialog"
      >
        <div className="opponent-ranking-modal__head">
          <h3 id={titleId}>{title}</h3>
          <button
            aria-label="닫기"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="opponent-ranking-modal__list">
          {items.map((item, index) => (
            <RankingEntry
              compact={index > 0}
              item={item}
              key={item.teamId}
              rank={index + 1}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function OpponentInsightRanking({
  items,
  title,
  variant,
  showViewAll = true,
}: OpponentInsightRankingProps) {
  const [open, setOpen] = useState(false);

  if (!items.length) {
    return <strong className="calendar-opponent-insight">—</strong>;
  }

  const previewCount = Math.min(items.length, PREVIEW_RANK_COUNT);
  const previewItems = items.slice(0, previewCount);
  const showMore = showViewAll && items.length > previewCount;

  return (
    <>
      <div className="calendar-opponent-ranking">
        <div className="calendar-opponent-ranking__list">
          {previewItems.map((item, index) => (
            <RankingEntry
              compact={index > 0}
              item={item}
              key={item.teamId}
              rank={index + 1}
              variant={variant}
            />
          ))}
        </div>
        {showMore ? (
          <button
            className="calendar-opponent-ranking__toggle"
            onClick={() => setOpen(true)}
            type="button"
          >
            전체 보기
          </button>
        ) : null}
      </div>
      {open ? (
        <OpponentRankingModal
          items={items}
          onClose={() => setOpen(false)}
          title={title}
          variant={variant}
        />
      ) : null}
    </>
  );
}
