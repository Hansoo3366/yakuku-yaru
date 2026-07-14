'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import {
  DEFAULT_PLAYER_IMAGE_SRC,
  getPlayerProfileImageSrc,
} from '@/lib/player-image';

type Props = {
  profileImageUrl: string | null | undefined;
  className: string;
  height?: number;
  placeholderClassName?: string;
  width?: number;
};

export function PlayerPhoto({
  profileImageUrl,
  className,
  height = 80,
  placeholderClassName,
  width = 80,
}: Props) {
  const trimmedUrl = profileImageUrl?.trim() || null;
  const [src, setSrc] = useState(() => getPlayerProfileImageSrc(trimmedUrl));
  const isPlaceholder =
    !trimmedUrl || src === DEFAULT_PLAYER_IMAGE_SRC;
  const placeholderClass = placeholderClassName ?? `${className}--placeholder`;

  return (
    <img
      alt=""
      className={`${className}${isPlaceholder ? ` ${placeholderClass}` : ''}`}
      height={height}
      onError={() => {
        setSrc(DEFAULT_PLAYER_IMAGE_SRC);
      }}
      src={src}
      width={width}
    />
  );
}
