import type { FontDefinition, FontLangMap } from "./css.ts";

function isLangMap(src: FontDefinition["src"]): src is FontLangMap {
  return typeof src === "object" && !Array.isArray(src) && "default" in src;
}

/**
 * Generate [lang="xx"] CSS variable overrides for fonts with language maps.
 * Only needed for SSR/dev — static builds use a single font file.
 */
export function generateFontOverrides({ fonts }: { fonts: readonly FontDefinition[] }): string {
  const overrides: string[] = [];

  for (const f of fonts) {
    if (f.css === false) continue;
    if (!isLangMap(f.src)) continue;

    const varName = f.variable;
    const fallback = f.fallback ? `, ${f.fallback}` : "";

    for (const [lang, _src] of Object.entries(f.src) as [string, string][]) {
      if (lang === "default") continue;

      const family = `${f.family}-${lang}`;
      // `[lang|="ko"]` matches both `lang="ko"` and `lang="ko-KR"` per the
      // BCP-47 hyphen-prefix rule; plain `[lang="ko"]` is exact-match only.
      overrides.push(`[lang|="${lang}"] { ${varName}: '${family}'${fallback}; }`);
    }
  }

  return overrides.join("\n");
}
