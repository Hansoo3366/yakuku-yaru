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

export function getAccessibleTeamSurface(
  primaryColor: string,
  minimumContrast = 7,
) {
  const source = parseHexColor(primaryColor);

  if (!source) {
    return primaryColor;
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
