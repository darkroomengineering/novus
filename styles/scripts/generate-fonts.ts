import type { FontDefinition, FontLangMap, FontSrc } from "./css.ts";

interface FontFaceParams {
  family: FontDefinition["family"];
  src: string;
  weight: NonNullable<FontDefinition["weight"]>;
  style: FontSrc["style"];
  display: FontDefinition["display"];
}

function fontFace({ family, src, weight, style, display }: FontFaceParams): string {
  return [
    "@font-face {",
    `  font-family: "${family}";`,
    `  src: url("${src}") format("woff2");`,
    `  font-weight: ${weight};`,
    `  font-style: ${style ?? "normal"};`,
    `  font-display: ${display ?? "swap"};`,
    "}",
  ].join("\n");
}

function isLangMap(src: FontDefinition["src"]): src is FontLangMap {
  return typeof src === "object" && !Array.isArray(src) && "default" in src;
}

export function generateFonts({
  fonts,
  buildLang,
}: {
  fonts: readonly FontDefinition[];
  buildLang: string | undefined;
}): string {
  const faces: string[] = [];

  for (const f of fonts) {
    if (f.css === false) continue;
    if (isLangMap(f.src)) {
      if (buildLang) {
        // Static build: only the matching language's font file
        const src = f.src[buildLang] ?? f.src.default;
        faces.push(
          fontFace({
            family: f.family,
            src,
            weight: f.weight ?? "400",
            style: "normal",
            display: f.display,
          }),
        );
      } else {
        // SSR/dev: generate a unique family per language variant
        for (const [lang, src] of Object.entries(f.src) as [string, string][]) {
          const family = lang === "default" ? f.family : `${f.family}-${lang}`;
          faces.push(
            fontFace({
              family,
              src,
              weight: f.weight ?? "400",
              style: "normal",
              display: f.display,
            }),
          );
        }
      }
    } else if (typeof f.src === "string") {
      faces.push(
        fontFace({
          family: f.family,
          src: f.src,
          weight: f.weight ?? "400",
          style: "normal",
          display: f.display,
        }),
      );
    } else {
      for (const s of f.src) {
        faces.push(
          fontFace({
            family: f.family,
            src: s.path,
            weight: s.weight,
            style: s.style,
            display: f.display,
          }),
        );
      }
    }
  }

  return faces.join("\n\n");
}
