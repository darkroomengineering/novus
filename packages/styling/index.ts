/**
 * `@novus/styling` — design-token → CSS engine.
 *
 * The main entrypoint exposes the token-shape contracts an app's config files
 * conform to, the CSS string helpers, and a `FontDefinition` re-export. The
 * Vite plugin + Lightning CSS functions live under `@novus/styling/vite`.
 */
export type {
  Breakpoints,
  Colors,
  CustomSizes,
  Easings,
  Fonts,
  Layout,
  Responsive,
  Screens,
  Themes,
  Typography,
  TypeStyle,
} from "./types.ts";
export type { FontDefinition } from "./css.ts";
export {
  atRule,
  block,
  comment,
  indent,
  mapEntries,
  prop,
  scalingCalc,
  variable,
  variables,
} from "./css.ts";
