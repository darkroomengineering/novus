# Font-Optimizer: Move Optimized Fonts Into Vite's Asset Graph

## Context

Today the `font-optimizer` Vite plugin writes subsetted WOFF2 files to `public/fonts/` (gitignored, mirroring `assets/fonts/`) and emits a literal `styles/css/fonts.css` referencing them at `/fonts/...`. That works but lives outside Vite's bundle graph — no content hashing, no integration with the asset pipeline, two on-disk artifacts (`public/fonts/`, `styles/css/fonts.css`) that exist purely to bridge dev↔prod parity. The motivation for that workaround was Vite's `this.emitFile()` being unsupported in `vite dev` and Lightning CSS bypassing plugin hooks for CSS-level `url()` / `@import`.

The asset-graph route is now viable using the **vite-imagetools two-path pattern with a CSS twist**: a virtual CSS module whose `load` hook returns `url("__VITE_ASSET__...__")` markers in build (Vite's CSS transform substitutes them with hashed paths during finalization) and a `configureServer` middleware serving from an in-memory map in dev. The single open assumption — Lightning CSS preserves `__VITE_ASSET__` strings inside `url()` unchanged — is consistent with prior prototype findings ([[reference-vite-plugin-quirks-2026]]) and how the marker mechanism is designed to behave, but is worth a 5-minute smoke test before committing the full refactor.

Outcome: optimized fonts become first-class bundle assets with content-hashed filenames. `public/fonts/` and `styles/css/fonts.css` are deleted. `assets/fonts/` (source fonts, committed) is unchanged. `styles/fonts.ts` is unchanged.

## Design

### Plugin changes (`lib/font-optimizer/plugin.ts`)

1. **Stop writing to `public/fonts/`.** No `outDir` filesystem output. Keep `node_modules/.cache/font-optimizer/` for cache (already does this).
2. **Build per-environment state in `buildStart`**: for each font, subset → produce WOFF2 buffer → store in plugin-internal `Map<string, Uint8Array>` keyed by deterministic logical name (e.g. `ServerMono-Regular-<contentHash8>.woff2`). Register in registry.
3. **In build mode** (detect via `config.command === "build"` in `configResolved`): for each WOFF2 buffer, call `this.emitFile({ type: "asset", name: <logical name>, source: buffer })` and stash the returned ref id alongside the buffer.
4. **In serve/dev mode**: register `configureServer(server) { server.middlewares.use("/@font-optimizer/", ...) }` that looks up the logical name in the buffer map and streams it with `content-type: font/woff2`.
5. **Virtual module `virtual:font-optimizer/fonts.css`**:
   - `resolveId(id)`: return `\0virtual:font-optimizer/fonts.css` (the `\0` prefix marks it as a plugin-owned virtual module).
   - `load(id)`: synthesize `@font-face` CSS from the registry. The `url(...)` value differs by mode:
     - build: `url("__VITE_ASSET__${refId}__")`
     - dev: `url("/@font-optimizer/${logicalName}")`
6. **Virtual module `virtual:font-optimizer/urls`** (JS): exports a `{ [family]: url }` map for JS consumers (WebGL, preloads, etc.).
   - `load`: in dev returns `export const fontUrls = { ServerMono: "/@font-optimizer/..." }`. In build returns `export const fontUrls = { ServerMono: import.meta.ROLLUP_FILE_URL_${refId} }` — Rolldown substitutes the marker with the hashed asset URL at bundle finalization (JS-side equivalent of `__VITE_ASSET__`).
   - For multi-src fonts, the map value is the URL of the first src and a sibling map `fontUrlsBySrc: { [family]: { weight: url }[] }` carries the full list.
7. **Delete** `cssOutPath`, `outDir`, `publicPrefix` options and all disk writes outside of cache. Drop `mirroredPath` helper.

### `defineFont` ergonomics (`lib/font-optimizer/define.ts`)

Currently `defineFont` is a pass-through. Extend it to attach a lazy `url` getter (and `urls` for multi-src) that reads from the `virtual:font-optimizer/urls` map. Consumer code becomes:

```ts
import { serverMono } from "~/styles/fonts"

// WebGL or any JS consumer:
const buf = await fetch(serverMono.url).then((r) => r.arrayBuffer())

// Preload link in a route's links() export:
{ rel: "preload", href: serverMono.url, as: "font", type: "font/woff2", crossOrigin: "anonymous" }
```

Implementation sketch:

```ts
// lib/font-optimizer/define.ts
import { fontUrls, fontUrlsBySrc } from "virtual:font-optimizer/urls";

export function defineFont<T extends FontDefinition>(
  config: T,
): T & { readonly url: string; readonly urls: ResolvedFontSrc[] | null } {
  return {
    ...config,
    get url() {
      return fontUrls[config.family];
    },
    get urls() {
      return fontUrlsBySrc[config.family] ?? null;
    },
  };
}
```

Getters keep `defineFont` synchronous at module-init time (the virtual module is bundled in, so reading `fontUrls[family]` is just an object lookup). The plugin's `buildStart` populates the registry before any consumer's `load`.

### Consumer changes

7. **`styles/css/index.css`**: remove `@import "./fonts.css";` (line 4). Lightning CSS can't resolve a `@import "virtual:..."` from a CSS file, so we don't replace it there.
8. **`app/root.tsx`**: add `import "virtual:font-optimizer/fonts.css";` as a side-effect import alongside the existing `import "~/styles/css/index.css";` (line 17). Vite processes the virtual module through its CSS pipeline; the result is bundled into the same CSS chunk.
9. **Delete `styles/css/fonts.css`** (disk file).
10. **`.gitignore`**: remove `/public/fonts/` and `/styles/css/fonts.css` entries (both obsolete).
11. **`vite.config.ts`**: no change needed — `fontOptimizer({ fonts })` call stays the same; the option surface shrinks but defaults absorb that.

### Type / module touches

12. **TypeScript ambient module declarations** — add to `lib/font-optimizer/virtual.d.ts` (referenced from `tsconfig.json` or `app/env.d.ts`):
    ```ts
    declare module "virtual:font-optimizer/fonts.css";
    declare module "virtual:font-optimizer/urls" {
      export const fontUrls: Readonly<Record<string, string>>;
      export const fontUrlsBySrc: Readonly<
        Record<string, ReadonlyArray<{ weight: string; style?: string; url: string }>>
      >;
    }
    ```

### Out of scope (deliberately)

- `styles/fonts.ts` content — unchanged.
- `darkroom-styling` plugin — unchanged. It still consumes `fonts.ts` for tailwind font-family variables and the `generateFontOverrides` stub; that derivative consumption is unrelated to asset emission.
- Watch behavior on `fonts.ts` — pre-existing gap (darkroom-styling watches it, font-optimizer doesn't). Punt to a follow-up; not part of this refactor.
- ~~WebGL JS-side access to font URLs~~ — **now included** via `virtual:font-optimizer/urls` and the `defineFont` `.url` getter (see step 6 + ergonomics section).

## Critical files

| Path                                                      | Change                                                                                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/font-optimizer/plugin.ts`                            | Major rewrite — drop disk writes, add `configureServer` + `resolveId`/`load` for two virtual modules (`fonts.css`, `urls`), conditionally `emitFile` in build |
| `lib/font-optimizer/define.ts`                            | Add lazy `url` / `urls` getters reading from `virtual:font-optimizer/urls`                                                                                    |
| `lib/font-optimizer/types.ts`                             | Possibly add `logicalName` field on registered fonts; no external API change                                                                                  |
| `lib/font-optimizer/registry.ts`                          | Likely unchanged (already stores resolved URLs)                                                                                                               |
| `lib/font-optimizer/virtual.d.ts`                         | New — ambient declarations for both virtual modules                                                                                                           |
| `styles/css/index.css`                                    | Remove `@import "./fonts.css"`                                                                                                                                |
| `styles/css/fonts.css`                                    | Delete (file no longer exists)                                                                                                                                |
| `app/root.tsx`                                            | Add `import "virtual:font-optimizer/fonts.css"`                                                                                                               |
| `app/env.d.ts` (or new `lib/font-optimizer/virtual.d.ts`) | Ambient declaration for the virtual module                                                                                                                    |
| `.gitignore`                                              | Remove `/public/fonts/` and `/styles/css/fonts.css`                                                                                                           |

## Reuse / patterns referenced

- `vite-imagetools` `packages/vite/src/index.ts` — canonical two-path pattern (`emitFile` in build, `configureServer` map in dev).
- `vite-plugin-static-copy` `src/serve.ts` — middleware-with-in-memory-map shape to copy.
- Plugin's existing `cache.ts` (`cacheKey`, `readCache`, `writeCache`) — keep, unchanged.
- Plugin's existing `subset.ts`, `harfbuzz-subset.ts`, `presets.ts`, `define.ts`, `registry.ts` — unchanged.

## Verification

1. **Smoke test the unverified assumption first** (5-minute prototype, before refactor): a throwaway version of the plugin that just emits a single font via `emitFile` + `__VITE_ASSET__` in a virtual CSS module. Build it (`bun run build`), grep the output CSS for `__VITE_ASSET__` (should be 0 — substituted) and for a content-hashed `.woff2` URL (should be present). If markers survive into output, abandon the virtual-module path and re-plan; otherwise proceed.
2. **`bun run typecheck`** — clean.
3. **`bun run check`** — 0 warnings.
4. **`bun dev`**:
   - Network panel: WOFF2 loads from `/@font-optimizer/ServerMono-Regular-<hash>.woff2`, status 200, content-type `font/woff2`.
   - DOM `getComputedStyle` on a `test-mono`-styled element shows ServerMono applied.
   - Edit `assets/fonts/ServerMono-Regular.otf` (e.g. swap with a different OTF) — HMR or full reload reflects the change.
5. **`bun run build` + `bun run start`**:
   - Built CSS in `build/client/assets/*.css` contains `url(/assets/ServerMono-Regular-<rollupHash>.woff2)` (Vite-hashed filename), NOT the `/@font-optimizer/...` dev URL and NOT `__VITE_ASSET__`.
   - Built JS chunk that consumes `serverMono.url` resolves to the same hashed asset URL — grep for the hash in the JS bundles.
   - `public/fonts/` directory does not exist.
   - `styles/css/fonts.css` does not exist.
   - WOFF2 file exists in `build/client/assets/` with correct content.
6. **JS-side smoke**: in a route component or `useEffect`, log `serverMono.url` — should be a real URL in both dev and prod, and `await fetch(serverMono.url)` should succeed.
7. **Manual visual check** in a browser — ServerMono renders, no FOUT beyond expected `font-display: swap` behavior.
8. **Commit + push** once all the above pass.

## Risk / fallback

If the smoke test (step 1) shows Lightning CSS mangles `__VITE_ASSET__` markers in a virtual module's CSS output, the fallback is the **`generateBundle` post-rewrite path**: emit assets in `buildStart`, return CSS with placeholder URLs (`url("__FONT_OPT_${logicalName}__")`) from the virtual module, then in `generateBundle` rewrite the placeholders in the final CSS chunk using `this.getFileName(refId)`. Slightly less elegant, guaranteed to work. Decide based on prototype output.
