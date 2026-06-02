# @novus/orchestra

The starter's in-app dev debug panel. A keyboard-summoned command palette (`Ctrl/⌘+.` or `Ctrl+O`) that toggles a set of overlays — layout grid, scroll minimap, GPU stats, and a Theatre.js studio — plus the Theatre.js sheet/animation runtime those overlays drive.

Renders `null` in production (`process.env.NODE_ENV !== "development"`), so it's safe to mount unconditionally.

## Usage

Mount once, near the root, lazily:

```tsx
import { lazy } from "react";
const OrchestraTools = lazy(() => import("@novus/orchestra"));

// in dev only
{
  process.env.NODE_ENV === "development" && <OrchestraTools />;
}
```

## Exports

| Entry                         | Provides                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.`                           | `OrchestraTools` (default — the panel) and `useOrchestra()` (read toggle state)                                                                       |
| `./theatre`                   | Theatre.js runtime: `TheatreProjectProvider`, `SheetProvider`, `SheetContext`, `useSheet`, `useCurrentSheet`, `useSheetDuration`, `useCurrentProject` |
| `./theatre/hooks/use-theatre` | `useTheatre` / `useTheatreObject` — bind a Theatre sheet object to React                                                                              |

The Theatre runtime is consumed at app **runtime** (e.g. the WebGL layer drives meshes off sheets), not just in dev — only the studio editor is dev-gated.

## Peer dependencies

- **`react` >= 19** (required).
- **`three` >= 0.180** and **`@react-three/fiber` >= 9** (optional) — only needed for the internal Theatre-controlled R3F `Group` helper (`./theatre/r3f`); the panel and the rest of the Theatre runtime don't touch them.

## Soft expectations of the host app

These are debug-tool conveniences, not hard requirements — the package won't crash without them, but the overlays look right only when the host provides:

- **Tailwind v4** with the starter's `primary` / `secondary` color tokens — the command palette UI is styled with utility classes.
- **`--columns` CSS variable** and a grid utility class (defaults to `dr-layout-grid`, overridable via `GridDebugger`'s `gridClassName` prop) — the grid overlay reads the active column count from `--columns`.
