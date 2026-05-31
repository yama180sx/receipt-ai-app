/** カテゴリー用パレット（seed の色を含む。backend と同期すること） */
export const CATEGORY_COLOR_PALETTE = [
  '#e74c3c',
  '#3498db',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#84cc16',
  '#a855f7',
  '#795548',
  '#64748b',
  '#0d9488',
  '#db2777',
] as const;

const normalizeHex = (color: string | null | undefined): string =>
  (color ?? '').trim().toLowerCase();

/** 既存カテゴリーと異なる色をパレットから選ぶ。尽きたら色相をずらして生成 */
export function pickNextCategoryColor(
  existingColors: (string | null | undefined)[]
): string {
  const used = new Set(
    existingColors.map(normalizeHex).filter((c) => c.length > 0)
  );

  for (const candidate of CATEGORY_COLOR_PALETTE) {
    if (!used.has(normalizeHex(candidate))) {
      return candidate;
    }
  }

  const hue = (used.size * 137.508) % 360;
  return hslToHex(hue, 65, 45);
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toByte = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}
