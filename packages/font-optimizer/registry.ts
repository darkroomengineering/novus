import type { ResolvedFont } from "./types.ts";

// Populated by the plugin's load() hook as fonts are processed.
// Keyed by font family name.
const registry = new Map<string, ResolvedFont>();

export function registerFont(font: ResolvedFont) {
  registry.set(font.family, font);
}

export function getRegistry(): ResolvedFont[] {
  return Array.from(registry.values());
}

export function clearRegistry() {
  registry.clear();
}
