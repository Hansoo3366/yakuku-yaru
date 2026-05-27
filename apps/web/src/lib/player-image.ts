import { getAssetUrl } from './api';

export const DEFAULT_PLAYER_IMAGE_SRC = '/icons/default_player.jpeg';

function normalizeProfileImageUrl(profileImageUrl: string | null | undefined) {
  const trimmed = profileImageUrl?.trim();
  return trimmed || null;
}

export function getPlayerProfileImageSrc(
  profileImageUrl: string | null | undefined,
) {
  const normalized = normalizeProfileImageUrl(profileImageUrl);

  if (normalized) {
    return getAssetUrl(normalized);
  }

  return DEFAULT_PLAYER_IMAGE_SRC;
}

export function hasPlayerProfileImage(
  profileImageUrl: string | null | undefined,
) {
  return normalizeProfileImageUrl(profileImageUrl) !== null;
}

export function applyPlayerPhotoFallback(image: HTMLImageElement) {
  image.onerror = null;
  image.src = DEFAULT_PLAYER_IMAGE_SRC;
}
