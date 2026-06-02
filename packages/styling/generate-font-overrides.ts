import type { FontToken } from "./types.ts";

/**
 * Per-language CSS variable overrides for fonts with language maps.
 * Language maps are out of scope for v1; this always returns empty string.
 * Kept as a typed stub so callers in darkroom-styling.ts need no changes.
 */
export function generateFontOverrides({ fonts: _ }: { fonts: readonly FontToken[] }): string {
  return "";
}
