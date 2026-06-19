'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect } from 'react';
import { PlayerPhoto } from '@/components/PlayerPhoto';
import type { PlayerCheer } from '@/lib/player-cheer-api';

export type CheerDialogItem = {
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
    cheerTitle: player.cheerTitle,
    youtubeId: player.youtubeId,
    youtubeUrl: player.youtubeUrl,
  };
}

export function PlayerCheerDialog({ cheer, player, onClose }: Props) {
  const item = cheer ?? (player ? toPlayerCheerDialogItem(player) : null);

  useEffect(() => {
    if (!item) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [item]);

  if (!item) {
    return null;
  }

  const hasCheer = Boolean(item.cheerId);
  const youtubeId = item.youtubeId ?? extractYoutubeId(item.youtubeUrl);

  return (
    <div
      aria-labelledby="player-cheer-dialog-title"
      aria-modal="true"
      className="player-cheer-dialog-backdrop"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="player-cheer-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="player-cheer-dialog-titlebar">
          <strong>응원가</strong>
          <button
            aria-label="응원가 팝업 닫기"
            className="icon-button player-cheer-dialog-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="player-cheer-dialog-scroll">
          <div className="player-cheer-dialog-head">
            {item.imageMode === 'raw' && item.imageUrl ? (
              <img
                alt=""
                className="player-cheer-dialog-photo player-cheer-dialog-photo--logo"
                src={item.imageUrl}
              />
            ) : (
              <PlayerPhoto
                className="player-cheer-dialog-photo"
                profileImageUrl={item.imageUrl}
              />
            )}
            <div>
              <span>{item.subtitle}</span>
              <h2 id="player-cheer-dialog-title">{item.title}</h2>
              <p>{item.meta}</p>
            </div>
          </div>

          {hasCheer ? (
            <div className="player-cheer-dialog-body">
              <h3>{item.cheerTitle || `${item.title} 응원가`}</h3>
              {youtubeId ? (
                <div className="player-cheer-video">
                  <iframe
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                    title={`${item.title} 응원가 영상`}
                  />
                </div>
              ) : null}
              {item.lyrics ? (
                <p className="player-cheer-dialog-lyrics">{item.lyrics}</p>
              ) : null}
            </div>
          ) : (
            <div className="player-cheer-dialog-empty">
              <strong>아직 등록된 응원가 정보가 없어요.</strong>
              <p>관리자 페이지에서 유튜브 링크와 가사를 등록할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
