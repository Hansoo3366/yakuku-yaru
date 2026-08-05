'use client';

/* eslint-disable @next/next/no-img-element */

import './PlayerCheerDialog.css';

import { type CSSProperties, useEffect, useMemo, useRef } from 'react';
import { PlayerPhoto } from '@/components/PlayerPhoto';
import {
  getPlayerCheerType,
  type PlayerCheer,
} from '@/lib/player-cheer-api';
import {
  getAccessibleTeamSurface,
  getContrastingTextColor,
  normalizeTeamColor,
} from '@/lib/team-color';

export type CheerDialogItem = {
  accentColor: string | null;
  cheerId: number | null;
  imageUrl: string | null;
  imageMode?: 'player' | 'raw';
  lyrics: string | null;
  meta: string;
  subtitle: string;
  title: string;
  cheerTitle: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
};

type Props = {
  cheer?: CheerDialogItem | null;
  player?: PlayerCheer | null;
  onClose: () => void;
};

function extractYoutubeId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^[A-Za-z0-9_-]{6,32}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
      return /^[A-Za-z0-9_-]{6,32}$/.test(id) ? id : null;
    }

    const queryId = url.searchParams.get('v') ?? '';

    if (/^[A-Za-z0-9_-]{6,32}$/.test(queryId)) {
      return queryId;
    }

    const embedMatch = url.pathname.match(/\/embed\/([A-Za-z0-9_-]{6,32})/);
    return embedMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

function toPlayerCheerDialogItem(player: PlayerCheer): CheerDialogItem {
  return {
    accentColor: player.teamPrimaryColor,
    cheerId: player.cheerId,
    imageUrl: player.profileImageUrl,
    imageMode: 'player',
    lyrics: player.lyrics,
    meta: [
      player.backNumber ? `No.${player.backNumber}` : '등번호 미등록',
      player.position,
    ]
      .filter(Boolean)
      .join(' · '),
    subtitle: player.teamShortName,
    title: player.name,
    cheerTitle: player.cheerTitle ?? getPlayerCheerType(player),
    youtubeId: player.youtubeId,
    youtubeUrl: player.youtubeUrl,
  };
}

export function PlayerCheerDialog({ cheer, player, onClose }: Props) {
  const item = useMemo(
    () => cheer ?? (player ? toPlayerCheerDialogItem(player) : null),
    [cheer, player],
  );
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!item) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [item]);

  if (!item) {
    return null;
  }

  const hasCheer = Boolean(item.cheerId);
  const youtubeId = item.youtubeId ?? extractYoutubeId(item.youtubeUrl);
  const accentColor = normalizeTeamColor(item.accentColor, '#183b66')!;
  const dialogStyle = {
    '--cheer-dialog-accent': accentColor,
    '--cheer-dialog-surface': getAccessibleTeamSurface(accentColor),
    '--cheer-dialog-contrast': getContrastingTextColor(accentColor),
  } as CSSProperties;

  return (
    <div
      aria-labelledby="player-cheer-dialog-title"
      aria-modal="true"
      className="cheer-dialog-backdrop"
      onClick={() => onCloseRef.current()}
      role="dialog"
    >
      <section
        className="cheer-dialog"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        style={dialogStyle}
      >
        <header className="cheer-dialog-titlebar">
          <div>
            <span>CHANT SHEET</span>
            <strong>{item.cheerTitle ?? '응원가'}</strong>
          </div>
          <button
            aria-label="응원가 팝업 닫기"
            className="cheer-dialog-close"
            onClick={() => onCloseRef.current()}
            ref={closeButtonRef}
            type="button"
          >
            ×
          </button>
        </header>
        <div className="cheer-dialog-scroll">
          <aside className="cheer-dialog-identity">
            {item.imageMode === 'raw' && item.imageUrl ? (
              <img
                alt={`${item.title} 로고`}
                className="cheer-dialog-photo cheer-dialog-photo--logo"
                src={item.imageUrl}
              />
            ) : (
              <PlayerPhoto
                className="cheer-dialog-photo"
                profileImageUrl={item.imageUrl}
              />
            )}
            <div className="cheer-dialog-identity__copy">
              <span>{item.subtitle}</span>
              <h2 id="player-cheer-dialog-title">{item.title}</h2>
              <p>{item.meta}</p>
            </div>
          </aside>

          {hasCheer ? (
            <div className="cheer-dialog-body">
              <header className="cheer-dialog-track">
                <span>NOW SINGING</span>
                <h3>{item.cheerTitle || '응원가'}</h3>
              </header>
              {youtubeId ? (
                <div className="cheer-dialog-video">
                  <iframe
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                    title={`${item.title} 응원가 영상`}
                  />
                </div>
              ) : null}
              {item.lyrics ? (
                <section
                  className="cheer-dialog-lyrics"
                  aria-label="응원가 가사"
                >
                  <h4>가사</h4>
                  <p>{item.lyrics}</p>
                </section>
              ) : null}
              {!youtubeId && !item.lyrics ? (
                <div className="cheer-dialog-media-empty">
                  영상과 가사를 준비하고 있습니다.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="cheer-dialog-empty">
              <span aria-hidden="true">♪</span>
              <strong>응원가를 준비하고 있습니다.</strong>
              <p>다른 선수를 선택하거나 나중에 다시 확인해주세요.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
