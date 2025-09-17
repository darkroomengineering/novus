const breakpoints = {
  dt: 800,
} as const;

const screens = {
  mobile: { width: 375, height: 650 },
  desktop: { width: 1640, height: 816 },
} as const;

const layout = {
  columns: { mobile: 4, desktop: 12 },
  gap: { mobile: 16, desktop: 16 },
  safe: { mobile: 16, desktop: 16 },
} as const;

const customSizes = {
  "header-height": { mobile: 58, desktop: 98 },
} as const;

export { breakpoints, customSizes, layout, screens };
