const DURATION_PATTERN = /^(\d+)([smhd])$/i;

const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function durationToMs(value: string) {
  const match = value.trim().match(DURATION_PATTERN);

  if (!match) {
    throw new Error(
      `Unsupported duration "${value}". Use an integer followed by s, m, h, or d.`,
    );
  }

  return Number(match[1]) * UNIT_TO_MS[match[2].toLowerCase()];
}
