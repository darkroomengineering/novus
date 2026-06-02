import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";
import { cacheKey, readCache, setCacheDir, writeCache } from "./cache.ts";
import { PRESET_RANGES } from "./presets.ts";
import { clearRegistry, registerFont } from "./registry.ts";
import { subsetFont } from "./subset.ts";
import type { FontDefinition, FontSrc, SubsetConfig } from "./types.ts";

export interface FontOptimizerOptions {
  fonts: FontDefinition[];
}

// NOTE on `\0` prefixing: Vite's convention is for plugins to prefix virtual
// resolved ids with `\0` so other plugins skip them. For the CSS virtual
// module we deliberately do NOT prefix — Vite's CSS dep tracker drops
// `\0`-prefixed ids from the chunk graph and the @font-face never ships.
// The JS urls module also stays prefix-free for symmetry / `import.meta`
// support inside the load() output.
const FONTS_CSS_ID = "virtual:font-optimizer/fonts.css";
const URLS_ID = "virtual:font-optimizer/urls";
const MIDDLEWARE_PREFIX = "/@font-optimizer/";

interface ProcessedSrc {
  srcPath: string;
  weight: string;
  style: string;
  buffer: Uint8Array;
  logicalName: string;
  refId?: string;
}

interface ProcessedFont {
  font: FontDefinition;
  srcs: ProcessedSrc[];
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

function shortContentHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 8);
}

function makeLogicalName(srcPath: string, bytes: Uint8Array): string {
  const filename = srcPath.split(/[\\/]/).pop() ?? "font";
  const base = filename.replace(/\.[^.]+$/, "");
  return `${base}-${shortContentHash(bytes)}.woff2`;
}

async function processSrc(
  srcPath: string,
  weight: string,
  style: string,
  subset: SubsetConfig | undefined,
  root: string,
): Promise<ProcessedSrc> {
  const absSrc = resolve(root, srcPath);
  const sourceBytes = new Uint8Array(readFileSync(absSrc));

  const unicodeRange = resolveUnicodeRange(subset);
  if (!unicodeRange) {
    throw new Error(
      `font-optimizer: ${srcPath} has no subset config — passthrough not supported in v1`,
    );
  }

  const key = cacheKey(sourceBytes, unicodeRange);
  let buffer = readCache(key);
  if (!buffer) {
    buffer = await subsetFont(sourceBytes, unicodeRange);
    writeCache(key, buffer);
  }

  return {
    srcPath,
    weight,
    style,
    buffer,
    logicalName: makeLogicalName(srcPath, buffer),
  };
}

function fontFaceBlock(
  family: string,
  url: string,
  weight: string,
  style: string,
  display: string,
): string {
  return [
    "@font-face {",
    `  font-family: "${family}";`,
    `  src: url("${url}") format("woff2");`,
    `  font-weight: ${weight};`,
    `  font-style: ${style};`,
    `  font-display: ${display};`,
    "}",
  ].join("\n");
}

export function fontOptimizer(options: FontOptimizerOptions): Plugin {
  let root = process.cwd();
  let isBuild = false;
  const processed: ProcessedFont[] = [];
  const buffersByName = new Map<string, Uint8Array>();

  const urlFor = (s: ProcessedSrc): string =>
    isBuild ? `__VITE_ASSET__${s.refId}__` : `${MIDDLEWARE_PREFIX}${s.logicalName}`;

  return {
    name: "font-optimizer",
    enforce: "pre",

    // Vite 8 Environment API: opt the virtual modules into the SSR pipeline.
    // Without this, server environments externalize `virtual:` specifiers
    // (Node has no handler for the scheme) and resolveId/load never fire.
    // Mirrors @responsive-image/vite-plugin.
    configEnvironment(name) {
      if (name === "ssr") {
        return { resolve: { noExternal: [/^virtual:font-optimizer\//] } };
      }
      return null;
    },

    configResolved(config) {
      root = config.root;
      isBuild = config.command === "build";
      setCacheDir(join(config.cacheDir, ".font-optimizer"));
    },

    async buildStart() {
      clearRegistry();
      processed.length = 0;
      buffersByName.clear();

      for (const font of options.fonts) {
        const srcs: ProcessedSrc[] = [];
        if (typeof font.src === "string") {
          srcs.push(await processSrc(font.src, font.weight ?? "400", "normal", font.subset, root));
        } else {
          for (const s of font.src as FontSrc[]) {
            srcs.push(await processSrc(s.path, s.weight, s.style ?? "normal", font.subset, root));
          }
        }

        if (isBuild) {
          for (const s of srcs) {
            s.refId = this.emitFile({
              type: "asset",
              name: s.logicalName,
              source: s.buffer,
            });
          }
        } else {
          for (const s of srcs) {
            buffersByName.set(s.logicalName, s.buffer);
          }
        }

        processed.push({ font, srcs });

        const firstSrc = srcs[0];
        if (!firstSrc) continue;

        if (typeof font.src === "string") {
          registerFont({ ...font, resolvedUrl: urlFor(firstSrc) });
        } else {
          const srcArr = font.src as FontSrc[];
          registerFont({
            ...font,
            resolvedUrl: srcs.map((s, i) => {
              const orig = srcArr[i];
              return {
                path: orig?.path ?? s.srcPath,
                weight: s.weight,
                style: s.style,
                url: urlFor(s),
              };
            }),
          });
        }
      }
    },

    configureServer(server) {
      server.middlewares.use(MIDDLEWARE_PREFIX, (req, res, next) => {
        const raw = req.url ?? "";
        const name = raw.replace(/^\//, "").split("?")[0] ?? "";
        const buffer = buffersByName.get(name);
        if (!buffer) {
          next();
          return;
        }
        res.setHeader("Content-Type", "font/woff2");
        res.setHeader("Cache-Control", "no-cache");
        res.end(Buffer.from(buffer));
      });
    },

    resolveId(id) {
      if (id === FONTS_CSS_ID) return id;
      if (id === URLS_ID) return id;
      return null;
    },

    load(id) {
      if (id === FONTS_CSS_ID) {
        const faces: string[] = [];
        for (const { font, srcs } of processed) {
          if (font.css === false) continue;
          for (const s of srcs) {
            faces.push(
              fontFaceBlock(font.family, urlFor(s), s.weight, s.style, font.display ?? "swap"),
            );
          }
        }
        return `${faces.join("\n\n")}\n`;
      }

      if (id === URLS_ID) {
        const exprFor = (s: ProcessedSrc): string =>
          isBuild
            ? `import.meta.ROLLUP_FILE_URL_${s.refId}`
            : JSON.stringify(`${MIDDLEWARE_PREFIX}${s.logicalName}`);

        const singleEntries: string[] = [];
        const bySrcEntries: string[] = [];
        for (const { font, srcs } of processed) {
          const first = srcs[0];
          if (!first) continue;
          singleEntries.push(`  ${JSON.stringify(font.family)}: ${exprFor(first)}`);
          const items = srcs.map(
            (s) =>
              `    { weight: ${JSON.stringify(s.weight)}, style: ${JSON.stringify(s.style)}, url: ${exprFor(s)} }`,
          );
          bySrcEntries.push(`  ${JSON.stringify(font.family)}: [\n${items.join(",\n")}\n  ]`);
        }
        return [
          `export const fontUrls = {\n${singleEntries.join(",\n")}\n};`,
          `export const fontUrlsBySrc = {\n${bySrcEntries.join(",\n")}\n};`,
        ].join("\n\n");
      }

      return null;
    },
  };
}
