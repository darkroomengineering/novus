import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { Plugin } from "vite";
import { cacheKey, readCache, writeCache } from "./cache.ts";
import { PRESET_RANGES } from "./presets.ts";
import { clearRegistry, registerFont } from "./registry.ts";
import { subsetFont } from "./subset.ts";
import type { FontDefinition, FontSrc, ResolvedFontSrc, SubsetConfig } from "./types.ts";

export interface FontOptimizerOptions {
  fonts: FontDefinition[];
  /** Source font directory (relative to project root). Output mirrors this structure. */
  srcDir?: string;
  /** Output directory for optimized woff2 files (relative to project root). Served as static assets. */
  outDir?: string;
  /** Where to write the generated fonts.css file (relative to project root). */
  cssOutPath?: string;
  /** URL prefix for emitted woff2 files in fonts.css. */
  publicPrefix?: string;
}

function resolveUnicodeRange(subset: SubsetConfig | undefined): string | null {
  if (!subset) return null;
  if (typeof subset === "string") return PRESET_RANGES[subset] ?? null;
  if ("unicodeRange" in subset) return subset.unicodeRange;
  const cps = new Set<number>();
  for (const c of subset.chars) {
    const cp = c.codePointAt(0);
    if (cp !== undefined) cps.add(cp);
  }
  return Array.from(cps)
    .map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`)
    .join(", ");
}

function mirroredPath(srcRelToProject: string, srcDir: string): string {
  const fromSrcDir = relative(srcDir, srcRelToProject);
  return fromSrcDir.replace(/\.[^.]+$/, ".woff2");
}

function fontFaceBlock(
  family: string,
  srcUrl: string,
  weight: string,
  style: string,
  display: string,
): string {
  return [
    "@font-face {",
    `  font-family: "${family}";`,
    `  src: url("${srcUrl}") format("woff2");`,
    `  font-weight: ${weight};`,
    `  font-style: ${style};`,
    `  font-display: ${display};`,
    "}",
  ].join("\n");
}

async function produceWoff2(
  srcRelPath: string,
  subset: SubsetConfig | undefined,
  srcDir: string,
  outDirAbs: string,
  publicPrefix: string,
  root: string,
): Promise<string> {
  const absSrc = resolve(root, srcRelPath);
  const sourceBytes = new Uint8Array(readFileSync(absSrc));

  const unicodeRange = resolveUnicodeRange(subset);
  if (!unicodeRange) {
    throw new Error(
      `font-optimizer: ${srcRelPath} has no subset config — passthrough not supported in v1`,
    );
  }

  const key = cacheKey(sourceBytes, unicodeRange);
  let bytes = readCache(key);
  if (!bytes) {
    bytes = await subsetFont(sourceBytes, unicodeRange);
    writeCache(key, bytes);
  }

  const mirrored = mirroredPath(srcRelPath, srcDir);
  const outPath = join(outDirAbs, mirrored);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, bytes);
  return `${publicPrefix}/${mirrored}`;
}

export function fontOptimizer(options: FontOptimizerOptions): Plugin {
  const srcDir = options.srcDir ?? "assets/fonts";
  const outDir = options.outDir ?? "public/fonts";
  const cssOutPath = options.cssOutPath ?? "styles/css/fonts.css";
  const publicPrefix = options.publicPrefix ?? "/fonts";
  let resolvedRoot = process.cwd();

  return {
    name: "font-optimizer",
    enforce: "pre",

    configResolved(config) {
      resolvedRoot = config.root;
    },

    async buildStart() {
      clearRegistry();

      const outDirAbs = resolve(resolvedRoot, outDir);
      mkdirSync(outDirAbs, { recursive: true });

      const faces: string[] = [];

      for (const font of options.fonts) {
        if (typeof font.src === "string") {
          const url = await produceWoff2(
            font.src,
            font.subset,
            srcDir,
            outDirAbs,
            publicPrefix,
            resolvedRoot,
          );
          registerFont({ ...font, resolvedUrl: url });
          if (font.css !== false) {
            faces.push(
              fontFaceBlock(
                font.family,
                url,
                font.weight ?? "400",
                "normal",
                font.display ?? "swap",
              ),
            );
          }
        } else {
          const resolvedSrcs: ResolvedFontSrc[] = [];
          for (const s of font.src as FontSrc[]) {
            const url = await produceWoff2(
              s.path,
              font.subset,
              srcDir,
              outDirAbs,
              publicPrefix,
              resolvedRoot,
            );
            resolvedSrcs.push({ ...s, url });
            if (font.css !== false) {
              faces.push(
                fontFaceBlock(
                  font.family,
                  url,
                  s.weight,
                  s.style ?? "normal",
                  font.display ?? "swap",
                ),
              );
            }
          }
          registerFont({ ...font, resolvedUrl: resolvedSrcs });
        }
      }

      const banner = "/* GENERATED BY lib/font-optimizer — DO NOT EDIT */";
      const cssAbs = resolve(resolvedRoot, cssOutPath);
      writeFileSync(cssAbs, `${banner}\n\n${faces.join("\n\n")}\n`);
    },
  };
}
