import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin, Rolldown } from "vite";
import { cacheKey, readCache, writeCache } from "./cache.ts";
import { PRESET_RANGES } from "./presets.ts";
import { clearRegistry, getRegistry, registerFont } from "./registry.ts";
import { subsetFont } from "./subset.ts";
import type {
  FontDefinition,
  FontSrc,
  ResolvedFontSrc,
  SubsetPreset,
} from "./types.ts";

const VIRTUAL_REGISTRY = "virtual:font-optimizer/registry";
const RESOLVED_VIRTUAL_REGISTRY = "\0virtual:font-optimizer/registry";

// All optimizer-tagged imports carry ?fopt=<value>.
// The v1: version prefix lets us evolve the format without breaking caches.
const FOPT_PARAM = "fopt";
const FOPT_VERSION = "v1";

export interface FontOptimizerOptions {
  fonts: FontDefinition[];
}

// ── Query encoding ─────────────────────────────────────────────────────────

function subsetToSegment(subset: FontDefinition["subset"]): string {
  if (!subset) return "passthrough";
  if (typeof subset === "string") return subset;
  if ("unicodeRange" in subset) {
    return `range=${subset.unicodeRange.replace(/\s*,\s*/g, ",")}`;
  }
  return `chars=${[...new Set([...subset.chars])].sort().join("")}`;
}

function buildFoptQuery(subset: FontDefinition["subset"]): string {
  return `${FOPT_PARAM}=${FOPT_VERSION}:${subsetToSegment(subset)}:woff2`;
}

function parseFoptValue(value: string): { unicodeRange: string | null; passthrough: boolean } {
  const colonIdx = value.indexOf(":");
  if (colonIdx === -1) return { unicodeRange: null, passthrough: true };
  const seg = value.slice(colonIdx + 1).replace(/:(?:ttf|woff2)$/, "");

  if (seg === "passthrough") return { unicodeRange: null, passthrough: true };
  if (seg in PRESET_RANGES) {
    return { unicodeRange: PRESET_RANGES[seg as SubsetPreset], passthrough: false };
  }
  if (seg.startsWith("range=")) {
    return { unicodeRange: seg.slice(6), passthrough: false };
  }
  if (seg.startsWith("chars=")) {
    const range = [...seg.slice(6)]
      .map((c) => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`)
      .join(", ");
    return { unicodeRange: range, passthrough: false };
  }
  return { unicodeRange: null, passthrough: true };
}

// ── Asset naming ───────────────────────────────────────────────────────────

function assetName(filePath: string, foptValue: string): string {
  const base = (filePath.split("/").pop() ?? "font").replace(/\.[^.]+$/, "");
  const hash = createHash("sha256").update(foptValue).digest("hex").slice(0, 8);
  return `${base}-${hash}.woff2`;
}

// ── Registry helpers ───────────────────────────────────────────────────────

function fontSrcPaths(font: FontDefinition): string[] {
  if (typeof font.src === "string") return [font.src];
  return (font.src as FontSrc[]).map((s) => s.path);
}

function matchFontByPath(fonts: FontDefinition[], filePath: string): FontDefinition | undefined {
  return fonts.find((f) => fontSrcPaths(f).some((p) => filePath.endsWith(p)));
}

function updateRegistry(filePath: string, resolvedUrl: string, fonts: FontDefinition[]) {
  const font = matchFontByPath(fonts, filePath);
  if (!font) return;

  if (typeof font.src === "string") {
    registerFont({ ...font, resolvedUrl });
    return;
  }

  const srcs = font.src as FontSrc[];
  const entry = srcs.find((s) => filePath.endsWith(s.path));
  if (!entry) return;

  const existing = getRegistry().find((r) => r.family === font.family);
  if (existing && Array.isArray(existing.resolvedUrl)) {
    const urls = existing.resolvedUrl as ResolvedFontSrc[];
    const idx = urls.findIndex((u) => u.path === entry.path);
    if (idx >= 0) {
      // noUncheckedIndexedAccess: guard the assignment explicitly
      const updated: ResolvedFontSrc = { ...entry, url: resolvedUrl };
      urls.splice(idx, 1, updated);
    } else {
      urls.push({ ...entry, url: resolvedUrl });
    }
  } else {
    registerFont({ ...font, resolvedUrl: [{ ...entry, url: resolvedUrl }] });
  }
}

// ── Emit helper ────────────────────────────────────────────────────────────

function emitAsset(
  ctx: Rolldown.PluginContext,
  id: string,
  filePath: string,
  name: string,
  bytes: Uint8Array,
  fonts: FontDefinition[],
  emittedRefs: Map<string, string>,
): string {
  let refId = emittedRefs.get(id);
  if (!refId) {
    const emitted = ctx.emitFile({ type: "asset", name, source: bytes });
    if (!emitted) throw new Error(`font-optimizer: emitFile returned no id for ${id}`);
    refId = emitted;
    emittedRefs.set(id, refId);
  }
  updateRegistry(filePath, `import.meta.ROLLUP_FILE_URL_${refId}`, fonts);
  return `export default import.meta.ROLLUP_FILE_URL_${refId};`;
}

// ── Plugin ─────────────────────────────────────────────────────────────────

export function fontOptimizer(options: FontOptimizerOptions): Plugin {
  const emittedRefs = new Map<string, string>();

  return {
    name: "font-optimizer",
    enforce: "pre",

    buildStart() {
      clearRegistry();
      emittedRefs.clear();
    },

    resolveId(source, importer) {
      if (source === VIRTUAL_REGISTRY) return RESOLVED_VIRTUAL_REGISTRY;

      const knownExts = [".ttf", ".otf", ".woff", ".woff2"];
      const qMark = source.indexOf("?");
      const rawPath = qMark === -1 ? source : source.slice(0, qMark);
      const rawQuery = qMark === -1 ? "" : source.slice(qMark + 1);

      if (!knownExts.some((ext) => rawPath.endsWith(ext))) return null;
      if (rawQuery.split("&").some((p) => p.startsWith(`${FOPT_PARAM}=`))) return null;

      const font = matchFontByPath(options.fonts, rawPath);
      if (!font) return null;

      const absPath = rawPath.startsWith("/")
        ? rawPath
        : importer
          ? resolve(importer, "..", rawPath)
          : resolve(rawPath);

      return `${absPath}?${buildFoptQuery(font.subset)}`;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_REGISTRY) {
        return `export const fonts = ${JSON.stringify(getRegistry())};`;
      }

      const qIdx = id.indexOf(`?${FOPT_PARAM}=`);
      if (qIdx === -1) return null;

      // Only emit assets from the client environment — avoid double-emit during SSR.
      if (
        this.environment != null &&
        "name" in this.environment &&
        (this.environment as { name: string }).name !== "client"
      ) {
        return null;
      }

      const filePath = id.slice(0, qIdx);
      const foptValue = id.slice(qIdx + FOPT_PARAM.length + 2);
      const { unicodeRange, passthrough } = parseFoptValue(foptValue);
      const name = assetName(filePath, foptValue);
      const sourceBytes = new Uint8Array(readFileSync(filePath));

      if (passthrough || !unicodeRange) {
        return emitAsset(this, id, filePath, name, sourceBytes, options.fonts, emittedRefs);
      }

      const key = cacheKey(sourceBytes, foptValue);
      const cached = readCache(key);
      if (cached) {
        return emitAsset(this, id, filePath, name, cached, options.fonts, emittedRefs);
      }

      // Vite load() supports returning a Promise — await WASM subset then emit.
      const ctx = this;
      return (async () => {
        const bytes = await subsetFont(sourceBytes, unicodeRange);
        writeCache(key, bytes);
        return emitAsset(ctx, id, filePath, name, bytes, options.fonts, emittedRefs);
      })();
    },
  };
}
