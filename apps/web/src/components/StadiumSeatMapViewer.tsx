'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { getStadiumSeatMap, type StadiumSeatMap } from '@/lib/stadium-seat-map';

type Props = {
  stadium: string;
};

function StadiumSeatMapModal({
  seatMap,
  stadium,
  onClose,
}: {
  seatMap: StadiumSeatMap;
  stadium: string;
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
    <div className="stadium-seat-modal">
      <button
        aria-label="닫기"
        className="stadium-seat-modal__backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        className="stadium-seat-modal__panel"
        role="dialog"
      >
        <div className="stadium-seat-modal__head">
          <div>
            <h3 id={titleId}>{seatMap.label}</h3>
            <p className="stadium-seat-modal__stadium">{stadium}</p>
          </div>
          <button
            aria-label="닫기"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="stadium-seat-modal__body">
          {/* eslint-disable-next-line @next/next/no-img-element -- 구장 좌석 배치도 정적 이미지 */}
          <img
            alt={seatMap.label}
            className="stadium-seat-modal__image"
            src={seatMap.src}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function StadiumSeatMapViewer({ stadium }: Props) {
  const seatMap = getStadiumSeatMap(stadium);
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = useCallback(() => setIsOpen(false), []);

  if (!seatMap) {
    return null;
  }

  return (
    <>
      <button
        className="btn btn-secondary stadium-seat-map__open"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        좌석 배치도
      </button>
      {isOpen ? (
        <StadiumSeatMapModal
          onClose={closeModal}
          seatMap={seatMap}
          stadium={stadium}
        />
      ) : null}
    </>
  );
}
