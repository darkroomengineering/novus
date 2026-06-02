import type { Breakpoints, CustomSizes, Layout, Screens } from "@novus/styling";

const breakpoints = {
  dt: 800,
} satisfies Breakpoints;

const screens = {
  mobile: { width: 375, height: 650 },
  desktop: { width: 1440, height: 816 },
} satisfies Screens;

const layout = {
  columns: { mobile: 4, desktop: 12 },
  gap: { mobile: 16, desktop: 16 },
  safe: { mobile: 16, desktop: 16 },
} satisfies Layout;

const customSizes = {
  "header-height": { mobile: 58, desktop: 98 },
} satisfies CustomSizes;

export { breakpoints, customSizes, layout, screens };
