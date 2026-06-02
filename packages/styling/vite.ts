/**
 * Build-time entrypoint: the Vite plugin that regenerates token CSS, and the
 * Lightning CSS custom functions (`mobile-vw()`, `columns()`, …). Wire both in
 * the app's `vite.config.ts`.
 */
export { darkroomStyling } from "./darkroom-styling.ts";
export type { DarkroomStylingOptions } from "./darkroom-styling.ts";
export { lightningcssFunctions } from "./lightningcss-functions.ts";
