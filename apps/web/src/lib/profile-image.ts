import type { PublicUser } from './auth';
import { getAssetUrl } from './api';
import { getTeamLogoSrc } from './team-logo';
import type { Team } from './baseball-api';

export const DEFAULT_PROFILE_IMAGE_SRC = '/icons/default_profile.svg';

export function getProfileImageSrc(
  user: Pick<PublicUser, 'profileImageUrl'> | null | undefined,
  team?: Pick<Team, 'shortName'> | null,
) {
  if (user?.profileImageUrl) {
    return getAssetUrl(user.profileImageUrl);
  }

  const teamLogo = getTeamLogoSrc(team ?? null);
  if (teamLogo) {
    return teamLogo;
  }

  return DEFAULT_PROFILE_IMAGE_SRC;
}

export function getAuthorProfileImageSrc(
  profileImageUrl: string | null | undefined,
  favoriteTeamShortName?: string | null,
) {
  if (profileImageUrl) {
    return getAssetUrl(profileImageUrl);
  }

  const teamLogo = getTeamLogoSrc(
    favoriteTeamShortName ? { shortName: favoriteTeamShortName } : null,
  );
  if (teamLogo) {
    return teamLogo;
  }

  return DEFAULT_PROFILE_IMAGE_SRC;
}
