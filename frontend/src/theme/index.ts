import { BREAKPOINTS } from './breakpoints';
import { colors } from './colors';
import { layout } from './layout';
import { borderRadius } from './radii';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';
import { tableStyles, listItemStyles } from './tableStyles';

export { BREAKPOINTS } from './breakpoints';
export { colors } from './colors';
export { layout } from './layout';
export { borderRadius } from './radii';
export { shadows } from './shadows';
export { spacing } from './spacing';
export { typography } from './typography';
export { tableStyles, listItemStyles } from './tableStyles';

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  layout,
  breakpoints: BREAKPOINTS,
  tableStyles,
  listItemStyles,
} as const;

export type Theme = typeof theme;
