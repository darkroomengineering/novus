import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";
import { cacheKey, readCache, setCacheDir, writeCache } from "./cache.ts";
import { generateInlineLqip } from "./lqip.ts";
import { getMetadata, resizeAndEncode } from "./process.ts";
import type { ImageOptimizerOptions } from "./types.ts";

const QUERY_RE = /[?&]responsive(?:[&=]|$)/;
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);
const MIDDLEWARE_PREFIX = "/@image-optimizer/";

function hasResponsiveQuery(id: string): boolean {
  return QUERY_RE.test(id);
}

function idWithoutQuery(id: string): string {
  const qIdx = id.indexOf("?");
  return qIdx === -1 ? id : id.slice(0, qIdx);
}

function isImageExt(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.has(ext);
}

// Sort formats in browser-preference order: avif > webp > jpeg/png
function sortFormats(
  formats: Array<"jpeg" | "png" | "webp" | "avif">,
): Array<"jpeg" | "png" | "webp" | "avif"> {
  const order: Record<string, number> = { avif: 0, webp: 1, jpeg: 2, png: 2 };
  return [...formats].sort((a, b) => (order[a] ?? 3) - (order[b] ?? 3));
}

export function imageOptimizer(options: ImageOptimizerOptions = {}): Plugin {
  const widths = options.widths ?? [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
  const formats = options.formats ?? ["avif", "webp", "original"];
  const quality = { webp: 80, avif: 60, jpeg: 85, ...options.quality };
  const lqipStrategy = options.lqip ?? "inline";
  const avifEffort = options.avifEffort ?? 4;

  let isBuild = false;
  let root = process.cwd();

  // Dev: serve processed buffers from this map at MIDDLEWARE_PREFIX
  // Key: middleware URL path; Value: { bytes, mime }
  const devAssets = new Map<string, { bytes: Uint8Array; mime: string }>();

  return {
    name: "image-optimizer",
    enforce: "pre",

    configResolved(config) {
      root = config.root;
      isBuild = config.command === "build";
      setCacheDir(join(config.cacheDir, ".image-optimizer"));
    },

    resolveId(id) {
      // Claim any `*.{jpg,jpeg,png,webp}?responsive` id so other plugins skip it.
      if (hasResponsiveQuery(id) && isImageExt(idWithoutQuery(id))) {
        return id;
      }
      return null;
    },

    async load(id) {
      if (!hasResponsiveQuery(id)) return null;
      const filePath = idWithoutQuery(id);
      if (!isImageExt(filePath)) return null;

      const absPath = resolve(root, filePath.startsWith("/") ? filePath.slice(1) : filePath);
      const sourceBytes = new Uint8Array(readFileSync(absPath));

      const ext = filePath.split(".").pop()!.toLowerCase();
      const originalFormat: "jpeg" | "png" = ext === "png" ? "png" : "jpeg";

      // Resolve concrete output format list
      const resolvedFormats = formats.map((f) =>
        f === "original" ? originalFormat : (f as "webp" | "avif"),
      );
      // Dedupe and sort in browser-preference order
      const uniqueFormats = sortFormats(
        Array.from(new Set(resolvedFormats)) as Array<"jpeg" | "png" | "webp" | "avif">,
      );

      // Metadata for aspectRatio + LQIP svg viewBox
      const meta = await getMetadata(sourceBytes);

      // Process every (width × format) combo
      const variants: Array<{
        width: number;
        format: string;
        refId?: string;
        devUrl?: string;
      }> = [];

      for (const format of uniqueFormats) {
        for (const width of widths) {
          if (width > meta.width) continue; // never upscale

          const qualityForFormat = quality[format as keyof typeof quality] ?? 85;
          const cacheParams = `${width}|${format}|${qualityForFormat}|${format === "avif" ? avifEffort : 0}`;
          const key = cacheKey(sourceBytes, cacheParams);
          const outExt = format === "jpeg" ? "jpg" : format;

          let bytes = readCache(key, outExt);
          if (!bytes) {
            bytes = await resizeAndEncode(
              sourceBytes,
              width,
              format as "webp" | "avif" | "jpeg" | "png",
              qualityForFormat,
              avifEffort,
            );
            writeCache(key, outExt, bytes);
          }

          const baseName = filePath
            .split(/[\\/]/)
            .pop()!
            .replace(/\.[^.]+$/, "");
          const assetName = `${baseName}-${width}w.${outExt}`;

          if (isBuild) {
            const refId = this.emitFile({ type: "asset", name: assetName, source: bytes });
            variants.push({ width, format, refId });
          } else {
            const devUrl = `${MIDDLEWARE_PREFIX}${key}/${assetName}`;
            devAssets.set(devUrl, { bytes, mime: `image/${format}` });
            variants.push({ width, format, devUrl });
          }
        }
      }

      // LQIP
      let lqipDataUri = "";
      if (lqipStrategy === "inline") {
        lqipDataUri = await generateInlineLqip(sourceBytes, meta.width, meta.height);
      }

      // Build variants JS — use ROLLUP_FILE_URL marker in build, dev URL string in dev
      const variantsJs = variants
        .map((v) => {
          const urlExpr = isBuild
            ? `import.meta.ROLLUP_FILE_URL_${v.refId}`
            : JSON.stringify(v.devUrl);
          return `{ width: ${v.width}, format: ${JSON.stringify(v.format)}, url: ${urlExpr} }`;
        })
        .join(",\n  ");

      const imageTypesJs = JSON.stringify(uniqueFormats.map((f) => (f === "jpeg" ? "jpeg" : f)));
      const widthsActuallyUsed = Array.from(new Set(variants.map((v) => v.width))).sort(
        (a, b) => a - b,
      );

      const lqipSection = lqipDataUri
        ? `  lqip: { inlineStyles: { "background-image": \`url("${lqipDataUri}")\`, "background-size": "cover" } },`
        : "";

      return `
const variants = [
  ${variantsJs}
];
const findMatch = (width, type) => {
  const candidates = variants.filter(v => !type || v.format === type);
  const sorted = candidates.sort((a, b) => a.width - b.width);
  return (sorted.find(v => v.width >= width) ?? sorted[sorted.length - 1])?.url;
};
export default {
  imageTypes: ${imageTypesJs},
  availableWidths: ${JSON.stringify(widthsActuallyUsed)},
  aspectRatio: ${meta.aspectRatio},
  imageUrlFor: findMatch,
${lqipSection}
};
`;
    },

    configureServer(server) {
      server.middlewares.use(MIDDLEWARE_PREFIX, (req, res, next) => {
        const url = req.url ?? "";
        const fullPath = MIDDLEWARE_PREFIX + url.replace(/^\//, "").split("?")[0];
        const asset = devAssets.get(fullPath);
        if (!asset) {
          next();
          return;
        }
        res.setHeader("Content-Type", asset.mime);
        res.setHeader("Cache-Control", "no-cache");
        res.end(Buffer.from(asset.bytes));
      });
    },
  };
}
