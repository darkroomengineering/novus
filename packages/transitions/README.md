# Transitions

Framework-agnostic page transition system for React Router. Inspired by Framer Motion's AnimatePresence but decoupled from any animation library — works with anime.js, CSS, WebGL, or anything that can call a callback.

## Quick Start

Wrap your root layout — no `<Outlet />` needed, the outlet handles it internally:

```tsx
import { TransitionOutlet } from "~/lib/transitions";

export default function App() {
  return <TransitionOutlet debug />;
}
```

Add transitions to any page component:

```tsx
import { animate, createTimeline } from "animejs";
import { usePageTransition } from "~/lib/transitions";

function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  usePageTransition({
    initial: () => animate(ref.current, { opacity: 0, y: 50, duration: 0 }),
    exit: ({ done }) => {
      const tl = createTimeline({ onComplete: done });
      tl.add(ref.current, { opacity: 0, y: -40, duration: 500 });
      return () => tl.revert();
    },
    enter: ({ done }) => {
      const tl = createTimeline({ onComplete: done });
      tl.add(ref.current, { opacity: 1, y: 0, duration: 600 });
      return () => tl.revert();
    },
  });

  return <div ref={ref}>...</div>;
}
```

---

## Architecture

Both modes use the same underlying page-stack mechanism:

1. Navigation happens → new page mounts alongside old page (max 2 in stack)
2. Exit animations run on the old page
3. Enter animations run on the new page
4. Old page is removed from the stack

The `mode` prop controls **when each page is visible** and **when enters can start** (see Modes below).

---

## Modes

### Swap Mode (default)

```tsx
<TransitionOutlet mode="swap" />
```

One page visible at a time. Both pages mount together (so the entering page can register its hooks and run `initial()` before paint), but the entering page is **hidden** during the exit phase. Once all exits call `done()`, the exiting page is removed and the entering page becomes visible. `enter()` from inside an exit callback is a no-op in this mode.

### Stack Mode

```tsx
<TransitionOutlet mode="stack" />
```

Both pages stacked in the DOM **and visible** simultaneously. The exiting page is positioned absolutely behind the entering page; the entering page renders on top.

- Max 2 pages in the stack
- Exit and enter sequenced by default (enter waits for exit `done()`)
- Call `enter()` from within exit to overlap them manually
- Rapid navigation calls cleanup functions and evicts the oldest page
- Pages with no registered transitions are removed instantly

---

## Driver — who kicks off first

The `driver` prop controls **which side of the transition starts immediately on navigation**:

| `driver`           | Behavior                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `"exit"` (default) | Exit fires immediately on navigation. Enter waits until exits call `done()` (or until an exit calls `enter()` early in stack mode). |
| `"enter"`          | Enter fires immediately. Exit is **held** until the entering page calls `ctx.exit()` from within its enter callback.                |

Use `driver="enter"` when the entering page must finish loading (textures, data, audio) before the previous page is allowed to leave — common for WebGL-heavy routes that would flash empty if exit ran on time.

```tsx
// On the outlet:
<TransitionOutlet mode="stack" driver="enter" />;

// On the entering page:
usePageTransition({
  enter: async ({ done, exit }) => {
    await loadTextures();
    exit(); // release the previous page now that we're ready
    animate(ref.current, { opacity: 1, onComplete: done });
  },
});
```

**Idempotency contract.** The `enter()` callable in `ExitContext` and `exit()` in `EnterContext` are both idempotent. Whichever side wasn't auto-fired by the driver is the one whose trigger does work; the other becomes a no-op. Calling either multiple times is safe.

**Fallback.** If `driver="enter"` and the entering page completes its enter without ever calling `ctx.exit()`, exits are auto-triggered after enters resolve so the transition still finishes gracefully (rather than waiting for the safety timeout).

---

## Layout requirements

The outlet's outer wrapper uses `display: contents` (layout-transparent) so its child page wrappers participate as direct flex/grid items of the consumer's parent. The page wrappers themselves use `flex: 1 1 auto` and `align-self: stretch` for in-flow rendering.

For **stack mode** to render correctly:

- Place `<TransitionOutlet>` inside a **`position: relative`** ancestor (the exiting page goes `position: absolute; inset: 0` and anchors against that ancestor).
- Prefer a **flex column parent** so the page wrappers can size correctly. In non-flex contexts the flex props are ignored and the outlet behaves as plain block-flow — that's fine for swap mode but stack mode may collapse the present page to content height while the exiting page fills the container.

If your design needs the parent's `align-items` to control content placement, anchor inside each page instead (`mt-auto`, `flex flex-col justify-end`, etc.) — both PRESENT and EXITING_STACK occupy the same box, so parent-level `items-end` / `items-center` no longer reaches page content.

---

## API

### `<TransitionOutlet>` Props

| Prop                | Type                                | Default  | Description                                                      |
| ------------------- | ----------------------------------- | -------- | ---------------------------------------------------------------- |
| `mode`              | `"swap" \| "stack"`                 | `"swap"` | Swap (one visible at a time) or stack (both visible)             |
| `driver`            | `"exit" \| "enter"`                 | `"exit"` | Which side auto-fires on navigation (see Driver above)           |
| `timeout`           | `number`                            | `5000`   | Safety timeout (ms) — force-proceeds if `done()` is never called |
| `appear`            | `boolean`                           | `false`  | Enable enter animations on first page load                       |
| `ready`             | `boolean`                           | `true`   | Gate enter animations — set `false` while a preloader is active  |
| `onTransition`      | `(ctx) => void \| Promise`          | —        | Centralized orchestration                                        |
| `preventTransition` | `(from, to, navigation) => boolean` | —        | Skip transition for specific navigations                         |
| `onExitStart`       | `(info) => void`                    | —        | Fires when exit phase begins                                     |
| `onExitComplete`    | `(info) => void`                    | —        | Fires when all exits finish                                      |
| `onEnterStart`      | `(info) => void`                    | —        | Fires when enter phase begins                                    |
| `onEnterComplete`   | `(info) => void`                    | —        | Fires when all enters finish                                     |
| `name`              | `string`                            | —        | Addressable name for store lookups (`useTransitionOutlet(name)`) |
| `debug`             | `boolean`                           | `false`  | Mount the bundled debug panel inside this outlet (dev-only)      |

The outlet renders the route's content internally via React Router's `useOutlet()`. Pass `debug` on a single outlet (typically root) to mount the bundled inspector panel — it reads from the store and shows every mounted outlet, lazy-loaded and tree-shaken from production builds.

#### Nesting & auto-ownership

Multiple `<TransitionOutlet>` instances can be nested — e.g., a root outlet in `root.tsx` plus a nested one inside a route layout to animate its sub-routes independently. Each outlet determines ownership of a navigation from the React Router match chain:

- If the match **directly below** this outlet's own route changes → this outlet owns the transition and runs its full exit/enter sequence.
- If only a **deeper** match changes → this outlet `SKIP_NAVIGATE`s (updates its stored outlet reference so React reconciles the same-typed outlet element in place, preserving the shared layout's mounted state). A descendant outlet handles the actual transition.
- If this outlet's own route is no longer in the chain (rendered inside a frozen exiting subtree during an ancestor's transition) → this outlet does nothing.

No configuration required — place outlets where you want boundaries, and ownership sorts itself out from the match id embedded in the outlet element. Descendants coordinate timing with their ancestor via a private context so nested dispatches see the post-navigation outlet, not the stale pre-nav one.

**Page-enter ownership during ancestor orchestration.** When a descendant outlet mounts inside a transition that an ancestor outlet is already orchestrating (typical case: cross-layout nav that mounts a new layout outlet with `appear` set), the descendant _does not_ re-fire its page enters locally. Each `usePageTransition` registration is forwarded up the chain, so the ancestor's pageRegistry already has it and will fire it during its own enter phase. Running it locally too would re-target the same animation library calls and the first invocation would never resolve. Outlet-scoped events (`useTransitionEvent` with a `name`) are unaffected — they fire on the named outlet regardless. Standalone outlets (no ancestor) fire their page enters as before.

#### `preventTransition`

Receives navigation context for direction-aware control:

```tsx
preventTransition={(from, to, { direction, trigger }) => {
  // direction: "push" | "pop" | "replace"
  // trigger: "link" (client navigation) | "browser" (back/forward buttons)
  return trigger === "browser"; // instant swap on browser back/forward
}}
```

#### `appear` + `ready`

Enable first-load enter animations with optional preloader gating:

```tsx
const [ready, setReady] = useState(false);

return (
  <>
    <TransitionOutlet appear ready={ready} />
    <Preloader onLoaded={() => setReady(true)} />
  </>
);
```

When `appear` is enabled, `initial()` fires on first mount (before paint) and enter animations run once `ready` is `true`. Without `appear`, the first page renders normally with no animation.

The appear sequence is one-shot per outlet lifetime: once it has fired successfully, toggling `ready` back and forth later will not re-trigger it. (Subsequent navigations follow the normal exit/enter path.)

**Nested descendants** — a page mounted inside an ancestor outlet that is mid-appear (or in pending-appear state, waiting on `ready`) fires its own `initial()` even when the local outlet has no `appear` configured. The lib's `activeTransition()` walks up the chain and reports pending-appear so descendants can stage their pre-enter visuals (e.g. opacity 0) during the wait. Without this, gating a route via an ancestor's `appear ready={…}` would leave nested pages at default visibility throughout the gate.

---

### `usePageTransition(config)`

For components that mount/unmount with the page (descendants of a `<TransitionOutlet>`). The hook auto-discovers the nearest outlet via context and participates in its lifecycle.

```tsx
interface PageTransitionConfig {
  initial?: (info: TransitionInfo) => void;
  exit?: (ctx: ExitContext) => void | CleanupFunction;
  enter?: (ctx: EnterContext) => void | CleanupFunction;
}
```

For persistent components OUTSIDE the outlet (global header, fixed canvas), use [`useTransitionEvent`](#usetransitioneventconfig) instead.

#### `initial(info)`

Sets element state **before first paint** when mounting as the entering page. Fires during transitions, and on first load when `appear` is enabled. SSR-safe. Receives the correct `direction` (`"push"`, `"pop"`, or `"replace"`) for directional animations.

```tsx
initial: (info) => {
  const dir = info.direction === "pop" ? 1 : -1;
  animate(ref.current, { opacity: 0, x: dir * 100, duration: 0 });
};
```

#### `exit({ done, enter, info, ctx })`

Animate out. **Call `done()` when finished.** The system waits for all registered exits to call `done()` before proceeding.

```tsx
// Simple
exit: ({ done }) => {
  animate(ref.current, { opacity: 0, duration: 500, onComplete: done });
};

// Timeline
exit: ({ done }) => {
  const tl = createTimeline({ onComplete: done });
  tl.add(title, { opacity: 0, y: -40, duration: 500 });
  tl.add(content, { opacity: 0, duration: 400 }, 100);
  return () => tl.revert(); // cleanup on interruption
};

// Trigger entering page mid-exit (stack mode only)
exit: ({ done, enter }) => {
  const tl = createTimeline({ onComplete: done });
  tl.add(hero, { opacity: 0, duration: 500 });
  tl.call(() => enter()); // new page starts entering here
  tl.add(bg, { opacity: 0, duration: 1000 }); // still animating
};

// Route-aware with shared context
exit: ({ done, info, ctx }) => {
  ctx.heroRect = heroRef.current.getBoundingClientRect();
  animate(ref.current, { opacity: 0, duration: 500, onComplete: done });
};
```

**`ExitContext`:**

| Field   | Type                            | Description                                                                                                          |
| ------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `done`  | `() => void`                    | Signal exit completion. Must be called.                                                                              |
| `enter` | `() => void`                    | Start entering page early (idempotent, no-op in swap mode)                                                           |
| `info`  | `TransitionInfo`                | `{ from, to, direction }`                                                                                            |
| `ctx`   | `Record<string, unknown>`       | Shared context — write data for enter callbacks                                                                      |
| `block` | `(p: Promise<unknown>) => void` | Register a reveal-blocker the entering page can `await` (see [Reveal blockers](#reveal-blockers-block--awaitblocks)) |

**Return value:** optionally return a cleanup function, called on interruption (rapid navigation). Same pattern as `useEffect`.

#### `enter({ done, exit, info, ctx })`

Animate in. **Call `done()` when finished.** When `driver="exit"` (default), only runs after the exiting page calls `done()` (or `enter()` for early start). When `driver="enter"`, runs immediately on navigation; call `exit()` to release the previous page when ready. Also runs on first load when `appear` is enabled.

```tsx
// Simple
enter: ({ done }) => {
  animate(ref.current, { opacity: 1, y: 0, duration: 600, onComplete: done });
};

// Read shared context from exit
enter: ({ done, ctx }) => {
  const fromRect = ctx.heroRect as DOMRect | undefined;
  // use fromRect for FLIP animation...
  animate(ref.current, { opacity: 1, duration: 800, onComplete: done });
};

// Enter-led navigation: hold the previous page until ready
enter: async ({ done, exit }) => {
  await loadTextures();
  exit(); // outlet must have driver="enter"
  animate(ref.current, { opacity: 1, duration: 600, onComplete: done });
};
```

**`EnterContext`:**

| Field         | Type                            | Description                                                                |
| ------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `done`        | `() => void`                    | Signal enter completion. Must be called.                                   |
| `exit`        | `() => void`                    | Release the held exit (idempotent, no-op outside `driver="enter"`)         |
| `info`        | `TransitionInfo`                | `{ from, to, direction }`                                                  |
| `ctx`         | `Record<string, unknown>`       | Shared context — read data from exit callbacks                             |
| `block`       | `(p: Promise<unknown>) => void` | Register a reveal-blocker (e.g. an enter-side cover that has its own fade) |
| `awaitBlocks` | `() => Promise<void>`           | Resolve once every `block()` registered this transition has settled        |

#### Return value

```tsx
const { phase, isExiting, isEntering } = usePageTransition({ ... });
```

---

### `useTransitionEvent(config)`

For **persistent components** (header, footer, WebGL canvas) that stay mounted across navigations. Address an outlet by `name` — the component itself can mount anywhere in the tree, no need to be a descendant of the outlet. Same `{ done, info, ctx }` API as `usePageTransition`:

```tsx
useTransitionEvent({
  name: "root",
  onExit: ({ done }) => {
    const tl = createTimeline({ onComplete: done });
    tl.add(menuRef.current, { y: "-100%", duration: 400 });
    return () => tl.revert();
  },
  onEnter: ({ done }) => {
    const tl = createTimeline({ onComplete: done });
    tl.add(menuRef.current, { y: "0%", duration: 400 });
    return () => tl.revert();
  },
});
```

Set the matching `name` prop on `<TransitionOutlet name="..." />` (typically the root outlet for app-wide UI). The component participates in any transition that outlet orchestrates. If the named outlet isn't mounted yet, the registration sits in the store and is picked up the first time that outlet runs a transition — no error path.

**Treat `name` as static.** Changing `name` mid-mount unregisters from the old outlet and re-registers against the new one; if a transition is already collecting registrations at that instant, the swap can race the snapshot. Stable names (string literal or top-level constant) avoid this entirely.

---

### `useTransitionState()`

Read-only observer. Returns the full picture:

```tsx
const { phase, from, to, direction, mode, pages, isTransitioning } = useTransitionState();
```

Each page in `pages` has `{ key, pathname, phase }`. Useful for debug panels or any UI that needs to react to transitions.

---

### `usePreservedLoaderData<T>()`

Returns loader data frozen at mount time. Use instead of `useLoaderData()` in components participating in transitions — prevents data from going stale during exit animations.

---

## Shared Context (`ctx`)

A plain object available in all exit and enter callbacks, cleared between transitions. Any exit can write to it, any enter can read from it — useful for passing data like bounding rects (FLIP animations), colors, or shared state across hooks and components.

```tsx
// Component A (exiting page)
exit: ({ done, ctx }) => {
  ctx.heroRect = heroRef.current.getBoundingClientRect();
  ctx.color = "#ff0000";
  // ...
};

// Component B (entering page)
enter: ({ done, ctx }) => {
  const rect = ctx.heroRect as DOMRect;
  const color = ctx.color as string;
  // ...
};
```

Typed as `Record<string, unknown>` — cast what you read. The system clears `ctx` to `{}` at the start of each transition.

---

## Reveal blockers (`block` / `awaitBlocks`)

A coordination primitive for covers — preloaders, route-change overlays, anything that visually masks the entering page until it settles. The cover registers a `Promise` via `block(p)`; entering pages await every registered block via `awaitBlocks()` before revealing themselves.

```tsx
// The cover (persistent, addressed by outlet name)
useTransitionEvent({
  name: "root",
  onEnter: ({ done, block }) => {
    let resolveBlock: () => void;
    block(new Promise<void>((res) => (resolveBlock = res))); // pages await this

    const tl = createTimeline({
      onComplete: () => {
        resolveBlock(); // release awaiting pages
        done();
      },
    }).add(coverRef.current, { opacity: ["1", "0"], duration: 1000 });

    return () => {
      tl.revert();
      resolveBlock(); // also release on interruption so awaiters don't hang
    };
  },
});
```

```tsx
// The entering page — wait for blockers before animating in
usePageTransition({
  enter: ({ done, awaitBlocks }) => {
    let cancelled = false;
    (async () => {
      await awaitBlocks(); // resolves once every block() has settled
      if (cancelled) return;
      animate(ref.current, { opacity: 1, duration: 600, onComplete: done });
    })();
    return () => {
      cancelled = true;
    };
  },
});
```

**Resolution rules.**

- `awaitBlocks()` resolves _immediately_ if nothing was blocked — pages can call it unconditionally.
- Internally it defers one microtask before snapshotting the blocker list, so a sibling enter callback that calls `block()` synchronously still gets included regardless of registration order.
- `block()` is available in both `ExitContext` and `EnterContext`. Register from whichever side controls the cover.
- Always resolve the blocker on cleanup too (interruption, unmount). Otherwise pages awaiting it hang until the safety timeout. Pattern: `return () => resolveBlock()` at the bottom of your callback.
- The blocker list is cleared at the start of every transition phase, so a stale block from a previous nav can't leak forward.

**When NOT to use it.** If the cover _is_ the only thing animating (e.g. nothing on the entering page is staged), you don't need this — the cover's own `done()` already gates the transition. `block` only matters when entering pages have their own staged animations that need to wait.

---

## Sequencing

**Default (`driver="exit"`, both modes):** enter waits for exit.

```
exit starts → exit calls done() → [1 frame] → enter starts → enter calls done() → cleanup
```

**Early enter (stack mode + driver="exit"):** call `enter()` from within exit to overlap.

```
exit starts → enter() called mid-exit → [1 frame] → enter starts → exit calls done() → enter calls done() → cleanup
```

**Enter-led (`driver="enter"`):** enter starts first, exit is held until enter calls `exit()`.

```
enter starts → enter() loads → enter calls exit() → exits run → both call done() → cleanup
```

**No transitions registered:** page appears after 1 frame. No waiting.

### 1-frame enter deferral

Enter animations are always deferred by one `requestAnimationFrame` after exits complete (or immediately if there are no exits). This ensures `initial()`'s animation-library calls (e.g., `animate(el, { opacity: 0, duration: 0 })`) have time to apply before enter callbacks fire. Without this, enter animations can start before the initial state is set, producing invisible animations. This matches Vue/Nuxt's internal approach of inserting a frame between initial state and animation start.

---

## Interruption

When a user navigates during an active transition:

1. Max 2 pages — oldest exiting page is evicted
2. Cleanup functions from exit/enter are called synchronously
3. Pending RAF for deferred enters is cancelled
4. New transition starts from scratch

Return cleanup functions from `exit`/`enter`:

```tsx
exit: ({ done }) => {
  const tl = createTimeline({ onComplete: done });
  tl.add(ref.current, { opacity: 0, duration: 1500 });
  return () => tl.revert(); // called on interruption
};
```

**Tip:** For smoother interruption during enters, consider returning `() => tl.pause()` instead of `() => tl.revert()`. Pausing freezes the element at its current state (e.g., opacity 0.5) while the new page enters on top, rather than snapping back to the initial state.

---

## CSS Hooks

**Per-outlet (scoped):** `data-transition-phase` on the outlet's own
wrapping div (also marked `data-transition-outlet`): `"idle"` |
`"exiting"` | `"entering"`. Scoped so multiple nested outlets don't
clobber each other.

```css
[data-transition-outlet][data-transition-phase="exiting"] a {
  pointer-events: none;
}
```

**Global (aggregated):** `data-transition-phase` on `<html>`. Aggregated
across all mounted outlets — any outlet exiting → `"exiting"`, else any
entering → `"entering"`, else attribute is removed. Use this for app-wide
behavior (e.g. a fixed nav reacting to any transition); use the scoped
attribute when you need to know _which_ outlet is transitioning.

```css
html[data-transition-phase] nav {
  pointer-events: none; /* any transition, anywhere */
}
```

## Reading State From Outside The Outlet

For components inside a TransitionOutlet's subtree, use
`useTransitionState()` — it returns _per-page_ state via React context.

For components OUTSIDE the outlet (e.g. a nav above the outlet, anything
in `app/root.tsx`), opt the outlet into the store by giving it a `name`
and read from anywhere with `useTransitionOutlet(name)`:

```tsx
<TransitionOutlet mode="stack" name="root" />;

// Anywhere in the app:
import { useTransitionOutlet } from "~/lib/transitions";
function Nav() {
  const outlet = useTransitionOutlet("root");
  const isTransitioning = outlet?.phase !== "idle" && outlet?.phase != null;
  // …
}
```

`getTransitionOutletState(name)` is the imperative form for non-React
code (analytics, etc.).

Per-page: `data-transition-page="present"` or `data-transition-page="exiting"`

---

## Safety

- `done()` is idempotent — calling twice is safe
- Timeout force-proceeds if `done()` is never called (default 5s)
- Errors in exit/enter are caught — transitions never get stuck
- Component unmount auto-resolves pending `done()` calls
- Zero registered animations = instant transition (no waiting)
- Error boundary wraps exiting pages
- Rapid navigation properly cleans up in-progress transitions via generation counter
