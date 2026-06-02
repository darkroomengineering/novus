# @darkroom/font-optimizer

Vite plugin that subsets font files at build time and emits them through Vite's asset pipeline. Fonts are processed lazily on first import, cached content-addressably in `node_modules/.cache/font-optimizer/`, and exposed via a virtual module (`virtual:font-optimizer/registry`) that Phase 2 consumes to wire subsetted URLs into the styling generator.

## Query format (internal contract, consumed by Phase 2)

Font imports are tagged with a `?fopt=` query encoding the full subset config:

```
?fopt=v1:latin:woff2
?fopt=v1:range=U+0000-00FF,U+2000-206F:woff2
?fopt=v1:chars=abc123:woff2
?fopt=v1:passthrough:woff2
```

The `v1:` prefix is a schema version — increment it when the query format changes to bust content-addressed caches.

## Output format

Emits **WOFF2** bytes. harfbuzz produces a TTF subset which is immediately re-encoded to WOFF2 via `ttf2woff2` (pure WASM, synchronous). WOFF2 yields ~40–50% smaller files than TTF.

## Cache invalidation

Cache keys include the source font bytes, the subset query, the `harfbuzzjs` version, and the `ttf2woff2` version — upgrading either dependency automatically busts existing cache entries.
