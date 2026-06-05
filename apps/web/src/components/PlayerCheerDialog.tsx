'use client';

import { PlayerPhoto } from '@/components/PlayerPhoto';
import type { PlayerCheer } from '@/lib/player-cheer-api';

type Props = {
  player: PlayerCheer | null;
  onClose: () => void;
};

export function PlayerCheerDialog({ player, onClose }: Props) {
  if (!player) {
    return null;
  }

  const hasCheer = Boolean(player.cheerId);

  return (
    <div
      aria-labelledby="player-cheer-dialog-title"
      aria-modal="true"
      className="player-cheer-dialog-backdrop"
      role="dialog"
    >
      <div className="player-cheer-dialog">
        <button
          aria-label="응원가 팝업 닫기"
          className="icon-button player-cheer-dialog-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <div className="player-cheer-dialog-head">
          <PlayerPhoto
            className="player-cheer-dialog-photo"
            profileImageUrl={player.profileImageUrl}
          />
          <div>
            <span>{player.teamShortName}</span>
            <h2 id="player-cheer-dialog-title">{player.name}</h2>
            <p>
              {player.backNumber ? `No.${player.backNumber}` : '등번호 미등록'}
              {player.position ? ` · ${player.position}` : ''}
            </p>
          </div>
        </div>

        {hasCheer ? (
          <div className="player-cheer-dialog-body">
            <h3>{player.cheerTitle || `${player.name} 응원가`}</h3>
            {player.youtubeUrl ? (
              <a
                className="btn btn-primary"
                href={player.youtubeUrl}
                rel="noreferrer"
                target="_blank"
              >
                유튜브로 듣기
              </a>
            ) : null}
            {player.lyrics ? (
              <p className="player-cheer-dialog-lyrics">{player.lyrics}</p>
            ) : (
              <p className="muted">등록된 가사가 없어요.</p>
            )}
          </div>
        ) : (
          <div className="player-cheer-dialog-empty">
            <strong>아직 등록된 응원가 정보가 없어요.</strong>
            <p>관리자 페이지에서 유튜브 링크와 가사를 등록할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
