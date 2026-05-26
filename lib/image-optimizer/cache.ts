import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let cacheDir = "node_modules/.vite/.image-optimizer";

export function setCacheDir(dir: string) {
  cacheDir = dir;
}

function ensureCacheDir() {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

function wasmVipsVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("wasm-vips/package.json") as { version: string };
    return pkg.version;
  } catch {
    return "unknown";
  }
}

export function cacheKey(sourceBytes: Uint8Array, params: string): string {
  return createHash("sha256")
    .update(sourceBytes)
    .update(params)
    .update(wasmVipsVersion())
    .digest("hex");
}

export function readCache(key: string, ext: string): Uint8Array | null {
  const path = join(cacheDir, `${key}.${ext}`);
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  return null;
}

export function writeCache(key: string, ext: string, bytes: Uint8Array) {
  ensureCacheDir();
  writeFileSync(join(cacheDir, `${key}.${ext}`), bytes);
}
