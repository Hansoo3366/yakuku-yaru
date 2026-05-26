import type { PublicUser } from './auth';
import { getAssetUrl } from './api';
import { getTeamLogoSrc } from './team-logo';
import type { Team } from './baseball-api';

export function getProfileImageSrc(
  user: Pick<PublicUser, 'profileImageUrl'> | null | undefined,
  team?: Pick<Team, 'shortName'> | null,
) {
  if (user?.profileImageUrl) {
    return getAssetUrl(user.profileImageUrl);
  }

  return getTeamLogoSrc(team ?? null);
}

export function getAuthorProfileImageSrc(
  profileImageUrl: string | null | undefined,
  favoriteTeamShortName?: string | null,
) {
  if (profileImageUrl) {
    return getAssetUrl(profileImageUrl);
  }

  return (
    getTeamLogoSrc(
      favoriteTeamShortName ? { shortName: favoriteTeamShortName } : null,
    ) || '/icons/main_icon.png'
  );
}
