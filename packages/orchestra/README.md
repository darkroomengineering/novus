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

### `window.THEATRE_PROJECT_ID`

Importing the Theatre runtime augments `Window` with a typed `THEATRE_PROJECT_ID?: string`. It's set at runtime once a Theatre project loads, so anywhere in the app can read the active project id off `window.THEATRE_PROJECT_ID` without re-declaring the global.

## Peer dependencies

- **`react` >= 19** and **`react-dom` >= 19** (required) — the panel renders through `createPortal`.
- **`three` >= 0.180** and **`@react-three/fiber` >= 9** (optional) — only needed for the Theatre-controlled R3F `Group` helper (`./theatre/r3f`); the panel and the rest of the Theatre runtime don't touch them.

The panel ships its own styles (CSS Modules — no Tailwind) and has no UI-primitive dependency, so it drops into any React app.

## Grid overlay

`GridDebugger` reads the active column count from a `--columns` CSS variable and paints over a grid class (defaults to `dr-layout-grid`, overridable via the `gridClassName` prop). If the host app doesn't define `--columns`, the overlay simply renders no columns — everything else works without it.
