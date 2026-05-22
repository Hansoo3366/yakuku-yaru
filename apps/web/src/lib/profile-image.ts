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
