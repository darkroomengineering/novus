import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let cacheDir = "node_modules/.vite/.font-optimizer";

export function setCacheDir(dir: string) {
  cacheDir = dir;
}

function ensureCacheDir() {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

function harfbuzzjsVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("harfbuzzjs/package.json") as { version: string };
    return pkg.version;
  } catch {
    return "unknown";
  }
}

function ttf2woff2Version(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("ttf2woff2/package.json") as { version: string };
    return pkg.version;
  } catch {
    return "unknown";
  }
}

export function cacheKey(sourceBytes: Uint8Array, canonicalQuery: string): string {
  return createHash("sha256")
    .update(sourceBytes)
    .update(canonicalQuery)
    .update(harfbuzzjsVersion())
    .update(ttf2woff2Version())
    .digest("hex");
}

export function readCache(key: string): Uint8Array | null {
  const path = join(cacheDir, `${key}.woff2`);
  if (existsSync(path)) {
    return new Uint8Array(readFileSync(path));
  }
  return null;
}

export function writeCache(key: string, bytes: Uint8Array) {
  ensureCacheDir();
  writeFileSync(join(cacheDir, `${key}.woff2`), bytes);
}
