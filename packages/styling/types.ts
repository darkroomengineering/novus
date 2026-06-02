import type { CSSProperties } from "react";
import type { FontDefinition } from "@novus/font-optimizer";

/**
 * Token-shape contracts for the styling engine.
 *
 * The consuming app provides the VALUES (in its `configDir`); these are the
 * structural shapes the generators read. App config files conform via
 * `as const satisfies <Shape>`, which keeps their precise literal types for
 * runtime consumers while catching drift against the engine's expectations.
 */

/** A value that differs between the mobile and desktop breakpoints. */
export interface Responsive<T> {
  mobile: T;
  desktop: T;
}

/** Named color palette: token name → CSS color string. */
export type Colors = Record<string, string>;

/** Theme name → role (primary/secondary/…) → CSS color string. */
export type Themes = Record<string, Record<string, string>>;

/** Easing name → `cubic-bezier(...)` string. */
export type Easings = Record<string, string>;

/**
 * Breakpoint name → px width. Must include `dt` — the desktop/mobile split the
 * engine uses for the `--mobile` / `--desktop` custom-media. Add others freely.
 */
export interface Breakpoints {
  dt: number;
  [key: string]: number;
}

/** Device screen dimensions per breakpoint. */
export interface Screens {
  mobile: { width: number; height: number };
  desktop: { width: number; height: number };
}

/** Grid/layout primitives (responsive px / counts). */
export interface Layout {
  columns: Responsive<number>;
  gap: Responsive<number>;
  safe: Responsive<number>;
}

/** Named custom sizes (e.g. `header-height`), responsive px. */
export type CustomSizes = Record<string, Responsive<number>>;

/** All font definitions for generation. */
export type Fonts = readonly FontDefinition[];

/**
 * A single named typography style. A `type` (not `interface`) so it carries an
 * implicit index signature — the generator iterates it via `Object.entries`.
 */
export type TypeStyle = {
  font: FontDefinition;
  "font-style": CSSProperties["fontStyle"];
  "font-weight": CSSProperties["fontWeight"];
  "line-height": `${number}%` | { mobile: `${number}%`; desktop: `${number}%` };
  "letter-spacing": `${number}em` | { mobile: `${number}em`; desktop: `${number}em` };
  "font-feature-settings"?: string;
  "font-size": number | { mobile: number; desktop: number };
};

/** Named typography styles. */
export type Typography = Record<string, TypeStyle>;
