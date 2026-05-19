/**
 * Smoke test for lib/font-optimizer/subset.ts
 * Run: bun run lib/font-optimizer/__smoke__/run.ts
 * Not committed to CI — one-off manual verification.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineFont } from "../define.ts";
import { PRESET_RANGES } from "../presets.ts";
import { subsetFont } from "../subset.ts";

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "../../..");

const font = defineFont({
  family: "ServerMono",
  src: "assets/fonts/ServerMono-Regular.otf",
  variable: "--font-server-mono",
  subset: "latin",
});

const fontPath = join(root, typeof font.src === "string" ? font.src : "");
const sourceBytes = new Uint8Array(readFileSync(fontPath));

console.log(`Source: ${fontPath}`);
console.log(`Source size: ${sourceBytes.byteLength} bytes`);

const unicodeRange = PRESET_RANGES["latin"];
if (!unicodeRange) throw new Error("Missing latin preset");

const subsetted = await subsetFont(sourceBytes, unicodeRange);

const outPath = join(dir, "output.woff2");
writeFileSync(outPath, subsetted);

// Verify WOFF2 magic bytes: 'wOF2' = 0x77 0x4F 0x46 0x32
const magic = Array.from(subsetted.subarray(0, 4));
const expectedMagic = [0x77, 0x4f, 0x46, 0x32];
const magicValid = magic.every((b, i) => b === expectedMagic[i]);

const ratio = (subsetted.byteLength / sourceBytes.byteLength) * 100;
console.log(`Subset size:  ${subsetted.byteLength} bytes`);
console.log(`Compression:  ${ratio.toFixed(1)}% of original (${(100 - ratio).toFixed(1)}% savings)`);
console.log(`Output:       ${outPath}`);
console.log(`Magic bytes:  ${magic.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ")} — ${magicValid ? "valid wOF2" : "INVALID — expected 77 4F 46 32"}`);

if (!magicValid) {
  throw new Error("Output is not a valid WOFF2 file");
}

if (subsetted.byteLength >= sourceBytes.byteLength) {
  console.warn("WARNING: subset is not smaller than source — check unicode range or font content");
} else {
  console.log("OK: subset is smaller than source");
}
