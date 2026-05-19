# Transition System — Architecture

Implementation guide for the transition system internals. For consumer-facing API docs, see [README.md](./README.md).

---

## File Map

```
context.ts              Types + React contexts (TransitionContext + TransitionCoordinationContext)
helpers.ts              wrapExit/wrapEnter + collectors (promise orchestration)
registry.ts             createRegistry — per-page and global callback storage
transition-outlet.tsx   Main component — state machine, effects, rendering
use-page-transition.ts Hook for page components (initial/exit/enter)
use-transition-event.ts Hook for persistent components (onExit/onEnter)
use-transition-state.ts Read-only observer hook
use-preserved-loader-data.ts  Freezes loader data at mount time
error-boundary.tsx      Catches errors in exiting pages
```

---

## State Machine

```
                    ┌─────────────────────────────────────────┐
                    │           rapid navigation              │
                    │  (cleanup + cancel RAF + restart)        │
                    ▼                                         │
idle ──[navigation]──> exiting ──[exits done]──>[1 RAF]──> entering ──[enters done]──> idle
```

**States:**

- `idle` — no transition in progress
- `exiting` — exit callbacks running on old page
- `entering` — enter callbacks running on new page (after 1-frame deferral)

**Transitions happen via two mechanisms:**

- Navigation detection: `useLayoutEffect` watching `location.key`
- Orchestration: `useEffect` triggered by `transitionGen` state change

---

## Core Data Flow

### 1. Navigation Detection (two-phase `useLayoutEffect`)

Two effects coordinate to ensure that when a nested outlet dispatches, its `useOutlet()` returns the post-navigation element (not the pre-nav one).

#### Phase 1 — detect (deps: `[location.key]`)

```
location.key changes
  │
  ├─ Same pathname? → skip (RR data update, not a real nav)
  │
  └─ Mark pending:
        • locationKey = new key
        • prevPathname (from pages[last])
        • ancestorCommitGenSnapshot = ancestor's commitGen.current (or 0 at root)
```

No dispatches happen here. The effect only records that a navigation needs processing.

#### Phase 2 — commit (no deps, runs each render)

```
pending? ───no──> return
  │
  yes
  │
  ├─ pending.locationKey !== location.key?
  │     → stale pending (a newer nav arrived), clear and return
  │
  ├─ Has ancestor AND ancestor.commitGen === snapshot?
  │     → ancestor hasn't committed yet. Return. Phase 2 will re-fire after
  │       the ancestor's state update triggers a re-render.
  │
  └─ Ancestor has committed (or we are root):
        • Outlet match id unchanged (a deeper outlet owns this nav, OR we are
          rendered inside a frozen exiting subtree where `useOutlet()` still
          returns the pre-nav element)?
        │     → SKIP_NAVIGATE (update outlet for React reconciliation), bump commitGen
        │
        • preventTransition vetoes?
        │     → SKIP_NAVIGATE, clear infoRef, bump commitGen, done
        │
        • Currently transitioning? → abort (clearTimeout, cleanups, clear registries)
        • Start new transition (infoRef, navIdRef++, dispatch NAVIGATE)
        • setPhase("exiting"), bump transitionGenRef → setTransitionGen
        • Bump commitGen to signal descendants
```

#### Match-based auto-ownership

Each outlet extracts the match id that its outlet directly renders, by inspecting the element returned from `useOutlet()` — specifically, the `match.route.id` baked into React Router's `RenderedRoute` / `RenderErrorBoundary` elements. See `getOutletMatchId` in `transition-outlet.tsx`.

The outlet owns a navigation iff `outletMatchId` changed from the previous render. This means:

- **Root outlet, `/ → /letter`**: `outletMatchId` goes from `home` to `letter/layout`. Different → root owns, runs transition.
- **Root outlet, `/letter → /letter/theme`**: `outletMatchId` stays `letter/layout`. Same → root SKIP_NAVIGATEs. Only its stored outlet reference changes (so the next-level content updates via reconciliation).
- **Letter-nested outlet, `/letter → /letter/theme`**: `outletMatchId` goes from `letter/index` to `letter/(editor)/layout`. Different → letter-nested owns.
- **Letter-nested outlet, `/letter/theme → /letter/message`**: `outletMatchId` stays `letter/(editor)/layout`. Same → letter-nested SKIP_NAVIGATEs. The `(editor)` layout reconciles in place, keeping tabs mounted; only the deepest child (theme vs message) swaps.
- **Letter-nested inside a frozen exiting subtree** (e.g., during `/letter → /gallery` at the root outlet): the frozen outlet element is still from the pre-nav render, so `outletMatchId` reads unchanged → SKIP_NAVIGATE (no-op with same outlet reference). The frozen content keeps rendering correctly.

This makes the nesting configuration-free: just place outlets where you want transition boundaries. Caveat: `getOutletMatchId` reads private React Router element shape; if an upgrade changes it, the extraction falls back to `null` and the outlet treats every outlet change as "different match" (safe but loses the optimization — `preventTransition` can be used as an override until the library is patched).

**Why two phases?** React fires layout effects child-first. When a nested outlet is inside a parent outlet, the nested outlet's layout effect fires **before** the parent's has dispatched its SKIP_NAVIGATE / NAVIGATE — which means the parent's `pages` state still holds the pre-nav outlet, and the RouteContext tree providing the nested outlet's `useOutlet()` is stale.

A single-phase layout effect in the nested outlet would read the stale outlet and dispatch NAVIGATE with the _previous_ page's content, producing a "one step behind" visual bug.

Splitting into phase 1 (mark) + phase 2 (commit-when-ready) lets the nested outlet wait for the ancestor to bump its `commitGen`. All of this happens within React's pre-paint cycle, so no intermediate stale state is ever painted — the dispatches just interleave across a few sub-renders.

#### Coordination via `TransitionCoordinationContext`

A private context exposes three things from each outlet to its descendants:

1. **`commitGen: { current: number }`** — bumped at the end of phase 2 (NAVIGATE or SKIP_NAVIGATE). Descendants wait on this so their own dispatch sees the post-navigation outlet. The ref is intentionally not React state — bumps don't re-render, they just signal; descendants already re-render because of the ancestor's state update.

2. **`registerAtCurrentPage(method, id, config)`** — registers the callback with this outlet's current latest-page registry AND recursively forwards up the chain. A component's `usePageTransition`/`useTransitionEvent` registration thus lands in every ancestor's current-page registry, so whichever outlet ends up orchestrating a given navigation finds the callbacks it needs.

3. **`activeTransition()`** — walks up the chain and returns the first ancestor currently mid-transition (with `phase` and `info`). Consumed by `usePageTransition` so a component mounting inside an ancestor's entering subtree still fires `initial()` with the ancestor's navigation info, even though the nested outlet itself is idle.

   **Pending appear** — also reports an entering-phase info when an outlet has `appear=true` but its appear effect hasn't fired yet (typically because `ready` is still `false`, gating on a preloader). Without this, descendants of an outlet whose appear is gated would skip `initial()` entirely: their local `appearOnMount` is `false` (no local `appear` configured) and the ancestor's `isTransitioningRef` doesn't flip true until the appear effect actually runs. They'd render at default opacity throughout the gate, defeating the point of the cover. The reported synthetic info uses `from = to = location.pathname` and `direction: "push"`.

#### Registration bubbling in detail

The outlet's `pageContext` and `topContextValue` don't expose the raw `pageRegistry.registerExit/Enter/Event`. Instead they expose a forwarding wrapper (`makeForwardingRegistrar`) that:

1. Registers the callback with the local page registry (or global for `topContextValue`).
2. Calls `ancestorCoordination.registerAtCurrentPage(method, prefixedId, config)` — prefix is `${outletId}:${pageKey}:${id}` to avoid collisions across sibling outlets or pages.
3. Returns a combined unregister that tears down both.

The ancestor's `registerAtCurrentPage` registers with its own current latest-page registry and recursively forwards to its ancestor. So a single registration from a deeply-nested component lands in N registries along the path to the root.

- **Owning-outlet sees the registration**: whichever outlet owns the current nav reads its own page registries and finds the forwarded entries. The transition runs.
- **Non-owning outlets' copies are harmless**: they're just sitting in a registry that isn't being read for the current nav.
- **Cleanup cascades**: when the component unmounts, `unregSelf` + chained `unregAncestor` calls remove all copies along the path.
- **Persist correctly**: the ancestor's `latestPageKey` is captured at registration time (via closure of the `unregAncestor` which points to a specific registry instance). When the ancestor transitions later, the registration stays in the page registry it was put in — which becomes the "exiting" registry when the ancestor moves on, so exit callbacks still fire.

#### Page-enter ownership rule

Forwarding makes a single registration land in N pageRegistries. To avoid double-firing, only **one** outlet runs the page enters per transition: the outermost active orchestrator. Other outlets along the chain skip their local pageRegistry's `runEnters` (still firing global + named registries, which aren't forwarded).

Today this rule is enforced at the descendant boundary — specifically the appear `useEffect` in `transition-outlet.tsx`. Before calling `enterRegistry.runEnters` it checks `ancestorCoordinationRef.current?.activeTransition()`; if non-null, an ancestor is mid-orchestration and is about to fire (or has already fired) the same page enters from its own pageRegistry, so the descendant skips. The standalone case (root outlet, or any outlet with no ancestor) returns `null` and runs as before.

Concrete: a cross-layout nav like `home → letter` is owned by the root outlet (its match changed). The freshly-mounted letter outlet has `appear` set; when its appear effect fires, it sees `ancestorCoordination.activeTransition()` reporting root's `entering` phase and skips its own page enters. The letter page's enter callback was forwarded up to root's pageRegistry at registration time and fires there. Letter outlet's named-event registry (`useTransitionEvent({ name: "letter", ... })`) is module-stored and not forwarded, so those callbacks still fire.

The mirror case (descendant orchestrates while ancestor SKIP_NAVIGATEs) is fine without any guard: the ancestor explicitly opted out of orchestrating this nav, so its pageRegistry isn't being read. Only the descendant runs.

Why not dedupe at the registrar instead? The forward path needs to land registrations in ancestor registries unconditionally — without forwarding, an ancestor that _does_ end up orchestrating a future nav wouldn't see the descendant's callbacks. Choosing one runner per transition is the right scope; deduplicating at registration time would break ownership transfer.

**Scope: appear path only (today).** The same dedup logic conceptually applies to the orchestration `useEffect`'s `triggerEnters` — it also calls `enterRegistry.runEnters` and could double-fire if a single nav had both an ancestor _and_ an already-mounted descendant orchestrating it. In practice this combination is unreachable with the current outlet layout: a descendant outlet only orchestrates a nav whose match it owns, which means its ancestor's match did **not** change (otherwise the descendant would be in the exiting subtree or freshly mounted in the entering subtree, both of which avoid the orchestration path). Mounting + ancestor-orchestration takes the appear path, which is guarded. If a future structural change makes a descendant outlet persist across an ancestor's layout swap (e.g. portal-mounted outlets, shared-layout features), `triggerEnters` would need the same `ancestorCoordinationRef.current?.activeTransition()` guard before calling `enterRegistry.runEnters`.

### 2. Orchestration (`useEffect`)

Triggers on `transitionGen` change. Fires after all layout effects (including children's registrations).

```
transitionGen changed
  │
  ├─ transitionGen === 0 or !isTransitioning? → skip
  ├─ pages.length < 2? → skip
  │
  ├─ Capture generation (stale check closure)
  ├─ Read exit/enter registries for exiting + entering pages
  ├─ Fire onExitStart callback
  ├─ Start safety timeout
  │
  ├─ onTransition provided? → hand full control to user (runExits/runEnters/next)
  │
  ├─ No exits registered? → triggerEnters() immediately
  │
  └─ Exits exist:
        • Pass enterCallback to runExits:
        │   stack mode: enterCallback = triggerEnters (early enter support)
        │   swap mode: enterCallback = no-op (enters wait for all exits)
        • Run page exits + global exits in parallel
        • Promise.all → triggerEnters()
```

### 3. Enter Trigger (`triggerEnters`)

Always deferred by 1 `requestAnimationFrame`. This is critical — without it, enter callbacks fire before `initial()`'s anime.js `duration:0` animations have applied (same frame as the effect), producing invisible animations.

```
triggerEnters() called
  │
  ├─ isStale() or already triggered? → bail
  ├─ enterTriggeredRef = true
  │
  └─ requestAnimationFrame:
        │
        ├─ isStale()? → bail (navigation happened during the 1-frame delay)
        ├─ Swap mode: dispatch(REMOVE_PAGE) for exiting page
        ├─ setPhase("entering")
        ├─ Fire onEnterStart
        ├─ Run page enters + global enters
        └─ Promise.all([entersDone, exitsDone]) → onEnterComplete
              → finishTransition (stack) or manual cleanup (swap)
```

**`onExitComplete` is fired separately**, on the orchestration effect's `exitsDonePromise.then` — i.e. when exits are truly done, not when `triggerEnters` starts. In stack mode with `enter()` called mid-exit, `triggerEnters` runs while exits are still animating, so firing `onExitComplete` inside `triggerEnters` would be premature.

**Why Promise.all over `[entersDone, exitsDone]`**: in stack mode, `enter()` can be called from within an exit callback to overlap animations. If the entering page has no registered enters, `entersDone` resolves immediately — calling `finishTransition` at that point would remove the exiting page while its exit animation is still running. Waiting on both guarantees the full duration of whichever side is longer.

### 4. Appear Flow (first-load enter)

Separate from the main orchestration. Triggers when both `appear` and `ready` props are true and no navigation has happened yet (`transitionGenRef === 0`).

```
appear effect fires (deps: [appear, ready])
  │
  ├─ transitionGenRef > 0? → skip (user already navigated)
  ├─ !appear or !ready? → skip
  ├─ appearDoneRef = true (one-shot guard)
  │
  └─ Create synthetic TransitionInfo (from = to = pathname)
     • isTransitioningRef = true
     • blockersRef = []
     • requestAnimationFrame:
        • setPhase("entering")
        • Skip pageRegistry.runEnters if an ancestor is mid-orchestration
          (registrations were forwarded; ancestor will fire them — see
          "Page-enter ownership rule" above). Standalone case fires page
          enters as before.
        • Always run global + named registry enters (not forwarded)
     • Promise.all → cleanup, phase → idle
```

`initial()` fires on mount because `usePageTransition` checks `context.appear` (which is `true` only when `transitionGenRef === 0`). Once any navigation happens, `appearActive` becomes `false` and subsequent mounts don't fire `initial()`.

---

## Registry System

Two-tier registry architecture:

```
TransitionOutlet
  ├─ globalRegistry (1 instance, persistent)
  │     └─ useTransitionEvent hooks register here (header, footer, WebGL)
  │
  └─ pageRegistries Map<pageKey, Registry>
        ├─ page-0 registry → initial page's usePageTransition hooks
        ├─ page-1 registry → second page's usePageTransition hooks
        └─ ...created per navigation, cleaned up on transition completion
```

Each `Registry` contains:

- `exitMap` / `enterMap` — callbacks from `usePageTransition`
- `eventMap` — callbacks from `useTransitionEvent`
- `exitResolvers` / `enterResolvers` — pending `done()` callbacks (for cancellation)

**Registration timing:** Components register in `useLayoutEffect` (before the orchestration `useEffect`). Unregistration happens on unmount, which also resolves any pending `done()` promises.

**Cleanup on interruption:** `registry.clear()` resolves all pending promises (settling stale `Promise.all` chains as no-ops via `isStale()`), then clears all maps.

---

## Page Stack

Managed by `useReducer` with three actions:

| Action          | Behavior                                                   |
| --------------- | ---------------------------------------------------------- |
| `NAVIGATE`      | Keep last page (frozen outlet), add new page. Max 2 pages. |
| `SKIP_NAVIGATE` | Replace entire stack with new page. No transition.         |
| `REMOVE_PAGE`   | Filter out page by key.                                    |

Pages are rendered with unique keys (`page-0`, `page-1`, ...) via `navIdRef`. Each page gets its own `TransitionContext.Provider` with a page-scoped registry. The top-level provider wraps everything (including children) with the global registry.

**Why unique keys instead of `location.key`?** Browser back-navigation reuses the original `location.key` for that history entry. If we used it as the React key, React would reconcile instead of remount — skipping `initial()` and breaking enter animations.

---

## Stale Transition Guard

Every async callback (Promise.then, RAF) captures a `generation` number and checks `isStale()` before proceeding:

```ts
const generation = transitionGenRef.current;
const isStale = () => transitionGenRef.current !== generation;
```

`transitionGenRef` is bumped synchronously in the layout effect (before any async work). All subsequent async callbacks from the old transition see a stale generation and bail. This prevents:

- Old exits calling `triggerEnters` after a new transition started
- Old enters calling `finishTransition` for the wrong page
- Old RAF callbacks from the 1-frame deferral firing after interruption

---

## Shared Context (`ctx`)

A plain `Record<string, unknown>` stored in `ctxRef`, reset to `{}` at the start of each transition. Threaded through the full call chain:

```
TransitionOutlet (ctxRef.current)
  → registry.runExits(info, enter, ctx)
    → collectExits(... ctx)
      → wrapExit(... ctx)
        → exitCallback({ done, enter, info, ctx })  ← user writes to ctx

  → registry.runEnters(info, ctx)
    → collectEnters(... ctx)
      → wrapEnter(... ctx)
        → enterCallback({ done, info, ctx })  ← user reads from ctx
```

Same object reference throughout a single transition. Exits write, enters read.

---

## Reveal Blockers (`block` / `awaitBlocks`)

A second per-transition channel, parallel to `ctx`, used by covers (preloaders, route overlays) to delay the entering page's reveal animation until the cover settles.

```
TransitionOutlet
  ├─ blockersRef: Promise<unknown>[]  ← reset to [] at start of every phase
  ├─ block(p)        ← push p into blockersRef
  └─ awaitBlocks()   ← microtask-defer, then Promise.all(blockersRef.slice())
```

Threaded through registry calls alongside `ctx`:

```
runExits(info, enter, ctx, block)
  → wrapExit(... block)
    → exitCallback({ done, enter, info, ctx, block })

runEnters(info, ctx, exit, block, awaitBlocks)
  → wrapEnter(... block, awaitBlocks)
    → enterCallback({ done, exit, info, ctx, block, awaitBlocks })
```

`block` and `awaitBlocks` are stable refs created once via `useRef` so the closures don't churn across renders. Both methods read/write `blockersRef.current` directly.

**Why the microtask defer in `awaitBlocks`.** Sibling enter callbacks all run synchronously inside the same orchestration tick (`Promise.all` over collected handles). If `awaitBlocks` snapshotted on call, an enter that runs before its sibling's `block(...)` line wouldn't see that block. Deferring one microtask via `Promise.resolve().then(...)` lets every synchronous body finish first, then snapshots `blockersRef.current.slice()` — registration order across page / global / named registries no longer matters.

**Reset semantics.** `blockersRef.current = []` runs at the top of:

- The orchestration `useEffect` (every navigation)
- The appear `useEffect` (first-load case)

This guarantees stale blockers from an interrupted transition can't leak forward — even if a cover's cleanup forgot to resolve its block, the reference is dropped at the start of the next phase.

**Failure mode.** If a cover registers a `block` but never resolves it (and never returns a cleanup that resolves it), entering pages that `awaitBlocks()` hang until the safety timeout (5s default), at which point the timeout calls `finishTransition` and the transition force-completes. The pages' enter `done()` may still hang if they were waiting on `awaitBlocks()` directly — covers must always resolve on cleanup.

---

## Mode Differences

| Behavior                             | Swap                                 | Stack                                |
| ------------------------------------ | ------------------------------------ | ------------------------------------ |
| Entering page visibility during exit | Hidden (`visibility: hidden`)        | Visible (behind exiting page)        |
| `enter()` from exit callbacks        | No-op                                | Triggers enters early                |
| Exiting page removal                 | Before enters start                  | After enters complete                |
| Exiting page position                | `position: relative` (drives layout) | `position: absolute` (floats behind) |

Both modes use the same state machine, registry system, and orchestration. The only branching points are:

1. `getPageStyle()` — 4 pre-allocated style constants
2. `enterCallback` — `triggerEnters` vs `() => {}`
3. `triggerEnters` — dispatches `REMOVE_PAGE` (swap) or not (stack)
4. Enter completion — calls `finishTransition` (stack) or inline cleanup (swap)

---

## Safety Mechanisms

| Mechanism                       | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| Safety timeout (5s)             | Force-proceeds if `done()` is never called                     |
| `done()` idempotency            | `resolved` flag prevents double-resolution                     |
| `isStale()` guard               | Prevents stale async callbacks from acting                     |
| `enterTriggeredRef`             | Prevents double-triggering of enters                           |
| RAF cancellation                | `cancelAnimationFrame` on cleanup                              |
| try/catch in wrapExit/wrapEnter | Animation errors don't hang the transition                     |
| Error boundary                  | Exiting page rendering errors don't crash the app              |
| Stale resolver cleanup          | `resolvers.get(id)?.()` before overwrite in wrapExit/wrapEnter |

---

## Effect Declaration Order

React fires layout effects and effects in declaration order within a component. The ordering in `TransitionOutlet` is intentional:

```
useLayoutEffect [location.key]     ← Navigation detection (dispatches, bumps generation)
useLayoutEffect (no deps)          ← Outlet ref sync (MUST be after navigation detection)
useEffect [appear, ready]          ← Appear (first-load enter, before orchestration)
useEffect [transitionGen]          ← Orchestration (main transition logic)
useEffect [phase]                  ← Data attribute sync
```

Children's layout effects fire between the parent's layout effects and the parent's regular effects. This is why registrations (in children's `useLayoutEffect`) are guaranteed to be complete before the orchestration `useEffect` runs.
