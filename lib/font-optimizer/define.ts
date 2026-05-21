import { _getFontUrl, _getFontUrlsBySrc, type ResolvedFontUrl } from "./runtime-state.ts";
import type { FontDefinition } from "./types.ts";

export type { ResolvedFontUrl };

export type DefinedFont<T extends FontDefinition = FontDefinition> = T & {
  readonly url: string;
  readonly urls: ReadonlyArray<ResolvedFontUrl>;
};

export function defineFont<T extends FontDefinition>(config: T): DefinedFont<T> {
  return {
    ...config,
    get url() {
      return _getFontUrl(config.family);
    },
    get urls() {
      return _getFontUrlsBySrc(config.family);
    },
  };
}
