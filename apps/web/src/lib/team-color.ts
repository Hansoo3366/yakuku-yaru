type Rgb = {
  red: number;
  green: number;
  blue: number;
};

function parseHexColor(value: string): Rgb | null {
  const normalized = value.trim().replace(/^#/, '');
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized;

  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return null;
  }

  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function toHexColor(color: Rgb) {
  return `#${[color.red, color.green, color.blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function normalizeTeamColor(
  value: string | null | undefined,
  fallback: string | null = null,
) {
  if (!value) {
    return fallback;
  }

  const color = parseHexColor(value);
  return color ? toHexColor(color) : fallback;
}

export function getLightenedTeamColor(primaryColor: string, whiteRatio = 0.05) {
  const source = parseHexColor(primaryColor);

  if (!source) {
    return '#111111';
  }

  const ratio = Math.min(1, Math.max(0, whiteRatio));
  const sourceRatio = 1 - ratio;

  return toHexColor({
    red: source.red * sourceRatio + 255 * ratio,
    green: source.green * sourceRatio + 255 * ratio,
    blue: source.blue * sourceRatio + 255 * ratio,
  });
}

function getRelativeLuminance(color: Rgb) {
  const [red, green, blue] = [color.red, color.green, color.blue].map(
    (channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    },
  );

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function getContrastRatio(foreground: string, background: string) {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);

  if (!foregroundRgb || !backgroundRgb) {
    return null;
  }

  const lighter = Math.max(
    getRelativeLuminance(foregroundRgb),
    getRelativeLuminance(backgroundRgb),
  );
  const darker = Math.min(
    getRelativeLuminance(foregroundRgb),
    getRelativeLuminance(backgroundRgb),
  );

  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastingTextColor(
  background: string,
  lightColor = '#ffffff',
  darkColor = '#111111',
) {
  const lightContrast = getContrastRatio(lightColor, background);
  const darkContrast = getContrastRatio(darkColor, background);

  if (lightContrast === null || darkContrast === null) {
    return lightColor;
  }

  return darkContrast > lightContrast ? darkColor : lightColor;
}

export function getAccessibleTeamSurface(
  primaryColor: string,
  minimumContrast = 7,
) {
  const source = parseHexColor(primaryColor);

  if (!source) {
    return '#111111';
  }

  for (let percentage = 100; percentage >= 0; percentage -= 1) {
    const factor = percentage / 100;
    const candidate = toHexColor({
      red: source.red * factor,
      green: source.green * factor,
      blue: source.blue * factor,
    });
    const contrast = getContrastRatio('#ffffff', candidate);

    if (contrast !== null && contrast >= minimumContrast) {
      return candidate;
    }
  }

  return '#000000';
}

/** 다크 모드의 카드 면 색. 팀 컬러를 어두운 바탕 위에서 쓸 때의 대비 기준이다. */
export const DARK_SURFACE_COLOR = '#171b21';

/**
 * 팀 컬러를 어두운 바탕 위에서 쓸 수 있게 밝힌다. 흰색을 조금씩 섞어 가며
 * 바탕과의 대비가 기준 이상이 되는 첫 색을 고른다.
 * (두산·롯데·KT 처럼 원래 어두운 팀 컬러는 어두운 바탕에서 보이지 않기 때문)
 */
export function getTeamColorOnDark(
  primaryColor: string,
  minimumContrast: number,
  background = DARK_SURFACE_COLOR,
) {
  const source = parseHexColor(primaryColor);

  if (!source) {
    return '#eceef1';
  }

  for (let percentage = 0; percentage <= 100; percentage += 2) {
    const ratio = percentage / 100;
    const candidate = toHexColor({
      red: source.red * (1 - ratio) + 255 * ratio,
      green: source.green * (1 - ratio) + 255 * ratio,
      blue: source.blue * (1 - ratio) + 255 * ratio,
    });
    const contrast = getContrastRatio(candidate, background);

    if (contrast !== null && contrast >= minimumContrast) {
      return candidate;
    }
  }

  return '#ffffff';
}
