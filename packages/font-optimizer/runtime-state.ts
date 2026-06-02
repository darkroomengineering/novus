// Internal bridge between the plugin-emitted virtual module and `defineFont`'s
// lazy url getters. Kept separate from `define.ts` so that loading the bundler
// config (vite.config.ts → styles/fonts.ts → defineFont) doesn't drag in the
// `virtual:font-optimizer/urls` import — Node's ESM loader can't resolve the
// `virtual:` scheme. The app explicitly imports `./runtime` to wire the maps.

export interface ResolvedFontUrl {
  weight: string;
  style: string;
  url: string;
}

let urls: Readonly<Record<string, string>> = {};
let urlsBySrc: Readonly<Record<string, ReadonlyArray<ResolvedFontUrl>>> = {};

export function _setRuntimeUrls(
  u: Readonly<Record<string, string>>,
  b: Readonly<Record<string, ReadonlyArray<ResolvedFontUrl>>>,
): void {
  urls = u;
  urlsBySrc = b;
}

export function _getFontUrl(family: string): string {
  return urls[family] ?? "";
}

export function _getFontUrlsBySrc(family: string): ReadonlyArray<ResolvedFontUrl> {
  return urlsBySrc[family] ?? [];
}
