import ttf2woff2 from "ttf2woff2";
import { subsetTtf } from "./harfbuzz-subset.ts";

// Parse a CSS unicode-range string into [start, end] codepoint pairs.
function parseUnicodeRange(range: string): [number, number][] {
  const pairs: [number, number][] = [];
  for (const part of range.split(",")) {
    const trimmed = part.trim();
    if (!trimmed.toUpperCase().startsWith("U+")) continue;
    const value = trimmed.slice(2);
    if (value.includes("-")) {
      const dashIdx = value.indexOf("-");
      const a = value.slice(0, dashIdx);
      const b = value.slice(dashIdx + 1);
      if (a && b) pairs.push([parseInt(a, 16), parseInt(b, 16)]);
    } else if (value.includes("?")) {
      pairs.push([
        parseInt(value.replace(/\?/g, "0"), 16),
        parseInt(value.replace(/\?/g, "F"), 16),
      ]);
    } else {
      const cp = parseInt(value, 16);
      if (!isNaN(cp)) pairs.push([cp, cp]);
    }
  }
  return pairs;
}

// Expand unicode-range pairs to a flat codepoint array.
function expandRangesToCodepoints(pairs: [number, number][]): number[] {
  const codepoints: number[] = [];
  for (const [start, end] of pairs) {
    for (let cp = start; cp <= end; cp++) {
      codepoints.push(cp);
    }
  }
  return codepoints;
}

// Subset a font to the codepoints described by `unicodeRange`.
// Returns WOFF2 bytes — harfbuzz produces TTF which is then re-encoded via ttf2woff2.
export async function subsetFont(
  sourceBytes: Uint8Array,
  unicodeRange: string,
): Promise<Uint8Array> {
  const pairs = parseUnicodeRange(unicodeRange);
  const codepoints = expandRangesToCodepoints(pairs);
  const ttfBytes = await subsetTtf(sourceBytes, codepoints);
  return ttf2woff2(ttfBytes);
}
