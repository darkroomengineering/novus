/**
 * CSS code generation helpers.
 *
 * These are string formatting functions — not a CSS-in-JS runtime.
 * They produce readable, well-indented CSS strings for the style generators.
 */

/** `property: value;` */
export function prop(property: string, value: string | number): string {
  return `${property}: ${value};`;
}

/** `--name: value;` */
export function variable(name: string, value: string | number): string {
  return `--${name}: ${value};`;
}

/** Wraps lines in a block: `selector { ... }` */
export function block(selector: string, lines: string[]): string {
  const body = indent(lines).join("\n");
  return `${selector} {\n${body}\n}`;
}

/** `@rule;` or `@rule { ... }` */
export function atRule(rule: string, lines?: string[]): string {
  if (!lines) return `@${rule};`;
  return block(`@${rule}`, lines);
}

/** Comment: `/** text **\/` */
export function comment(text: string): string {
  return `/** ${text} **/`;
}

/** Indent lines by `level` tabs */
export function indent(lines: string[], level = 1): string[] {
  const prefix = "\t".repeat(level);
  return lines.map((line) => (line === "" ? "" : `${prefix}${line}`));
}

/**
 * Type-safe Object.entries mapper.
 * Unlike formatObject, this preserves the value type.
 */
export function mapEntries<V>(
  obj: Record<string, V>,
  fn: (key: string, value: V) => string | string[],
): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const result = fn(key, value);
    return Array.isArray(result) ? result : [result];
  });
}

/** Responsive scaling calc: `calc(((value * 100) / var(--device-width)) * 1vw)` */
export function scalingCalc(value: number): string {
  return `calc(((${value} * 100) / var(--device-width)) * 1vw)`;
}

/** Maps an object to `--prefix-key: value;` lines */
export function variables(obj: Record<string, string | number>, prefix?: string): string[] {
  return mapEntries(obj, (key, value) =>
    prefix ? variable(`${prefix}-${key}`, value) : variable(key, value),
  );
}

// Font definitions — typed config for @font-face generation and CSS variable reference

export interface FontSrc {
  path: string;
  weight: string;
  style?: string;
}

/**
 * Language-specific font source overrides for non-Latin scripts. Keys are
 * BCP-47 lang subtags (e.g. `ko`, `ja`, `zh-Hans`). Project-defined; no
 * compile-time validation against a market list.
 */
export type FontLangMap = { default: string } & Record<string, string>;

export interface FontDefinition {
  family: string;
  src: string | FontSrc[] | FontLangMap;
  weight?: string;
  display?: "swap" | "optional" | "block" | "fallback" | "auto";
  variable: `--font-${string}`;
  fallback?: string;
  /** Set to false to skip @font-face and CSS variable generation (e.g. WebGL-only fonts). */
  css?: boolean;
}

export function defineFont(config: FontDefinition): FontDefinition {
  return config;
}
