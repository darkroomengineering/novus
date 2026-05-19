import {
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigationType, useOutlet } from "react-router";
import { devOnly } from "~/components/dev-only";
import {
  type CleanupFunction,
  type EnterFunction,
  type ExitFunction,
  TransitionContext,
  type TransitionContextValue,
  TransitionCoordinationContext,
  type TransitionCoordinationValue,
  type TransitionDirection,
  type TransitionEventCallbacks,
  type TransitionInfo,
  type TransitionMode,
  type TransitionOrchestratorContext,
  type TransitionOutletProps,
  type TransitionPageState,
  type TransitionPhase,
  type TransitionRegistry,
} from "./context";
import { TransitionErrorBoundary } from "./error-boundary";
import { runCleanups } from "./helpers";
import { createRegistry } from "./registry";
import { getNamedEventRegistry, removeOutletState, upsertOutletState } from "./store";

// Lazy-loaded debug panel. `devOnly` returns a no-op stub in static-zip
// builds (`__INCLUDE_DEV_TOOLS__` false), tree-shaking the entire panel
// module + its CSS chunk out of the bundle. Dev + SSR preview keep it;
// the chunk is fetched on first render of an outlet with `debug` set.
const TransitionDebug = devOnly(() => import("./transition-debug"));

// Lifecycle tracing — opt-in via localStorage. In the browser console:
//   localStorage.tr_trace = "1"   // enable
//   delete localStorage.tr_trace  // disable
// Default OFF. Tree-shaken from production builds via the import.meta.env.DEV
// guard. Future: wire this into Orchestra dev tooling.
const trace = (outlet: string | null | undefined, ev: string, data?: unknown) => {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;
  if (window.localStorage?.getItem("tr_trace") !== "1") return;
  if (data === undefined) console.log(`[TO:${outlet ?? "?"}] ${ev}`);
  else console.log(`[TO:${outlet ?? "?"}] ${ev}`, data);
};

// ---------------------------------------------------------------------------
// Outlet match-id extraction
//
// `useOutlet()` returns an `<OutletContext.Provider>` wrapping one of
// React Router's internal elements that carry the route match info. We read
// the `id` of the match so the outlet can tell whether the *same* outlet
// route is rendering different deeper children (SKIP_NAVIGATE + reconcile)
// or whether the outlet route itself has changed (NAVIGATE + full transition).
//
// This touches React Router's internal element shape. Both documented forms
// (RenderedRoute with a `match` prop and RenderErrorBoundary with a
// `routeContext.matches` array) are handled; any other shape yields `null`,
// which causes the caller to treat the change as "different match" — a safe
// fallback that just means the deeper-match optimization is skipped.
// ---------------------------------------------------------------------------
// One-shot DEV warn so an RR upgrade that changes the internal element shape
// doesn't silently disable the deeper-match optimization.
let warnedShapeMiss = false;
function getOutletMatchId(outlet: ReactNode): string | null {
  if (!isValidElement(outlet)) return null;
  const providerProps = outlet.props as { children?: ReactNode };
  const raw = providerProps.children;
  if (!isValidElement(raw)) return null;
  const rawProps = raw.props as {
    match?: { route?: { id?: string } };
    routeContext?: { matches?: { route?: { id?: string } }[] };
  };
  if (rawProps.match?.route?.id) return rawProps.match.route.id;
  const errMatches = rawProps.routeContext?.matches;
  if (errMatches && errMatches.length > 0) {
    return errMatches[errMatches.length - 1]?.route?.id ?? null;
  }
  if (import.meta.env.DEV && !warnedShapeMiss) {
    warnedShapeMiss = true;
    console.warn(
      "[TransitionOutlet] Could not extract match id from outlet element — " +
        "React Router internal shape changed? Match-based ownership will fall " +
        "back to treating every nav as a different match (safe but skips the " +
        "deeper-match optimization).",
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page stack reducer — max 2 pages (exiting + entering)
// ---------------------------------------------------------------------------

interface PageEntry {
  key: string;
  outlet: ReactNode;
  pathname: string;
}

type PageAction =
  | {
      type: "NAVIGATE";
      page: PageEntry;
      frozenOutlet: ReactNode;
    }
  | {
      type: "SKIP_NAVIGATE";
      page: PageEntry;
    }
  | {
      type: "REMOVE_PAGE";
      key: string;
    };

function pageReducer(state: PageEntry[], action: PageAction): PageEntry[] {
  switch (action.type) {
    case "NAVIGATE": {
      const current = state[state.length - 1];
      const kept = current
        ? [
            {
              ...current,
              outlet: action.frozenOutlet,
            },
          ]
        : [];
      return [...kept, action.page];
    }
    case "SKIP_NAVIGATE":
      return [action.page];
    case "REMOVE_PAGE":
      return state.filter((p) => p.key !== action.key);
  }
}

// ---------------------------------------------------------------------------
// Page styles — mode controls visibility during the exit phase
// ---------------------------------------------------------------------------

// Pre-allocated style objects — avoids creating new references on every render.
//
// `flex: 1 1 auto` + `min-height: 0` on the in-flow styles lets the page
// wrapper participate as a sized flex item when the consumer's parent is a
// flex container (the common case in this app — letter editor, gallery, etc.).
// `align-self: stretch` ensures the wrapper fills the cross-axis of its flex
// parent regardless of the parent's `align-items` (otherwise `align-items: end`
// or `align-items: center` shrinks the wrapper to content height, causing a
// visible jump in stack mode when the exiting page goes `position: absolute;
// inset: 0` and suddenly fills the full container). With this, both PRESENT
// and EXITING_STACK occupy the same box. Trade-off: parent's `items-end` /
// `items-center` no longer reaches page content; consumer anchors content
// inside the page itself (e.g. `mt-auto`, `flex flex-col justify-end`).
// In non-flex contexts these properties are ignored, so it's a safe default.
// `min-height: 0` overrides flex's default `min-height: auto` so the wrapper
// can shrink below content size when needed (avoids overflow in column flex).
const PAGE_STYLE_EXITING_SWAP: React.CSSProperties = {
  position: "relative",
  zIndex: 0,
  pointerEvents: "none",
  flex: "1 1 auto",
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};
const PAGE_STYLE_EXITING_STACK: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
};
const PAGE_STYLE_HIDDEN: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  visibility: "hidden",
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
};
const PAGE_STYLE_PRESENT: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  flex: "1 1 auto",
  alignSelf: "stretch",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

function getPageStyle(
  isPresent: boolean,
  mode: TransitionMode,
  phase: TransitionPhase,
  isTransitioning: boolean,
): React.CSSProperties {
  if (!isPresent) {
    // Swap: exiting page drives layout. Stack: exiting page floats behind.
    return mode === "swap" ? PAGE_STYLE_EXITING_SWAP : PAGE_STYLE_EXITING_STACK;
  }
  // Swap mode: entering page hidden during exit phase (in DOM for hook registration only)
  if (mode === "swap" && phase === "exiting" && isTransitioning) {
    return PAGE_STYLE_HIDDEN;
  }
  return PAGE_STYLE_PRESENT;
}

// ---------------------------------------------------------------------------
// TransitionOutlet — unified component
//
// State machine:
//   idle ──[navigation]──> exiting ──[exits done]──> entering ──[enters done]──> idle
//                              ^                                      |
//                              +──────────[rapid navigation]──────────+
//
// Both "wait" and "overlap" modes use the same page-stack approach.
// The mode controls:
//   - Whether the entering page is visible during exits
//   - Whether exit callbacks receive a functional enter() trigger
//   - When the exiting page is removed (before enters in wait, after in overlap)
// ---------------------------------------------------------------------------

export function TransitionOutlet({
  mode = "swap",
  driver = "exit",
  timeout = 5000,
  onTransition,
  preventTransition,
  onExitStart,
  onExitComplete,
  onEnterStart,
  onEnterComplete,
  appear = false,
  ready = true,
  name,
  debug = false,
}: TransitionOutletProps) {
  const outlet = useOutlet();
  const location = useLocation();
  const navigationType = useNavigationType();

  // Match-based ownership: an outlet owns a navigation when the match its
  // OUTLET renders changes. If only a deeper match changed, the outlet
  // SKIP_NAVIGATEs (updating its stored outlet so React can reconcile the
  // same-typed outlet element in place, preserving the shared layout's
  // mounted state). We determine this by extracting the match id that our
  // outlet directly wraps.
  const outletMatchId = getOutletMatchId(outlet);

  // CRITICAL: Monotonically increasing page key — ensures React always mounts
  // fresh components for each navigation. DO NOT replace with location.key.
  // location.key is reused on back-navigation (same history entry), causing
  // React to reconcile instead of remount — which skips initial() and produces
  // invisible enter animations.
  const navIdRef = useRef(0);

  const [pages, dispatch] = useReducer(pageReducer, [
    {
      key: "page-0",
      outlet,
      pathname: location.pathname,
    },
  ]);
  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const prevKeyRef = useRef(location.key);
  const prevOutletRef = useRef(outlet);
  const infoRef = useRef<TransitionInfo | null>(null);
  const cleanupsRef = useRef<CleanupFunction[]>([]);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const enterTriggeredRef = useRef(false);
  const exitTriggeredRef = useRef(false);
  const isTransitioningRef = useRef(false);

  // One-shot guard for the appear effect — once a successful first-load enter
  // has fired, we don't re-run it even if the consumer toggles `ready` later
  // in the session (e.g. a preloader that toggles back to false). Without
  // this, `[appear, ready]` deps would re-trigger appear on every false→true
  // edge.
  const appearDoneRef = useRef(false);

  // Mirrors of `appear` and `location` for synchronous read inside the
  // coordination methods (which are defined once via useRef and can't see
  // prop/hook updates through closure).
  const appearRef = useRef(appear);
  appearRef.current = appear;
  const locationRef = useRef(location);
  locationRef.current = location;

  // Per-transition reveal blockers — Promises registered by exit/enter
  // callbacks (typically covers like <PageTransition /> and <Preloader />)
  // that delay entering pages' visual until they settle. Pages opt into the
  // wait via `awaitBlocks()` from inside their async-IIFE. Reset at the
  // start of every transition phase (exit, enter, appear, manual).
  const blockersRef = useRef<Promise<unknown>[]>([]);
  const block = useRef((promise: Promise<unknown>) => {
    blockersRef.current.push(promise);
  }).current;
  // Microtask defer: by the time the `Promise.resolve().then(...)` callback
  // runs, every sibling enter/exit callback's synchronous body has executed
  // (including their own `block(...)` calls). Snapshotting at that moment
  // gives a complete blocker list regardless of registration order across
  // page / global / named registries.
  const awaitBlocks = useRef(() =>
    Promise.resolve().then(() => Promise.all(blockersRef.current.slice()).then(() => {})),
  ).current;

  // Tracks mount status for async callbacks. Promises/RAFs scheduled before
  // unmount can resolve afterwards; touching state then triggers React
  // warnings. Set to false in the unmount cleanup below.
  const mountedRef = useRef(true);

  // Wrapping div ref — phase data-attribute is written here (not on <html>)
  // so multiple TransitionOutlets don't clobber each other's phase.
  const containerRef = useRef<HTMLDivElement>(null);

  // Shared context object — writable by any exit, readable by any enter.
  // Cleared at the start of each transition.
  const ctxRef = useRef<Record<string, unknown>>({});

  // Generation counter: ref is source of truth (bumped synchronously in
  // useLayoutEffect), state copy triggers the orchestration useEffect.
  const transitionGenRef = useRef(0);
  const [transitionGen, setTransitionGen] = useState(0);

  // ---------------------------------------------------------------------------
  // Coordination with ancestor TransitionOutlet (if any)
  //
  // When this outlet is nested inside another, our `navDetect` layout effect
  // fires BEFORE the ancestor's (React fires layout effects child-first). At
  // that point the ancestor hasn't yet dispatched its SKIP_NAVIGATE / NAVIGATE,
  // so its pages state still holds the pre-nav outlet, which means the
  // RouteContext tree providing our `useOutlet()` is still stale. Reading
  // `outlet` synchronously would capture the pre-nav element.
  //
  // Solution: split navDetect into two phases. Phase 1 (layout effect on
  // location.key) marks a pending nav and snapshots the ancestor's commitGen.
  // Phase 2 (layout effect each render) commits the dispatch once the
  // ancestor's commitGen has advanced past the snapshot — which is when the
  // ancestor has re-rendered with its new state and our `useOutlet()` returns
  // the fresh element. All of this happens within React's pre-paint cycle, so
  // no intermediate state is ever painted.
  // ---------------------------------------------------------------------------
  const ancestorCoordination = useContext(TransitionCoordinationContext);
  const ancestorCoordinationRef = useRef(ancestorCoordination);
  ancestorCoordinationRef.current = ancestorCoordination;

  const commitGenRef = useRef(0);
  const outletId = useId();

  // Latest page key — tracks pages[pages.length - 1].key. Kept in sync each
  // render so coordination methods (called from descendant registrations) read
  // the current value.
  const latestPageKeyRef = useRef("page-0");
  latestPageKeyRef.current = pages[pages.length - 1]?.key ?? "page-0";

  // Phase as a ref mirror, for synchronous access from coordination methods.
  const phaseRef = useRef<TransitionPhase>("idle");
  phaseRef.current = phase;

  const coordinationValue = useRef<TransitionCoordinationValue>({
    commitGen: commitGenRef,
    registerAtCurrentPage: (method, id, config) => {
      const key = latestPageKeyRef.current;
      const registry = getOrCreatePageRegistry(key);
      const unregSelf =
        method === "registerExit"
          ? registry.registerExit(id, config as ExitFunction)
          : method === "registerEnter"
            ? registry.registerEnter(id, config as EnterFunction)
            : registry.registerEvent(id, config as TransitionEventCallbacks);
      const unregAncestor = ancestorCoordinationRef.current?.registerAtCurrentPage(
        method,
        `${outletId}:${key}:${id}`,
        config,
      );
      return () => {
        unregSelf();
        unregAncestor?.();
      };
    },
    activeTransition: () => {
      if (isTransitioningRef.current && infoRef.current) {
        return { phase: phaseRef.current, info: infoRef.current };
      }
      // Pending appear: this outlet has `appear` configured but its appear
      // effect hasn't fired yet (waiting on `ready` to flip true, or for
      // its scheduled RAF). Treat ourselves as entering so descendant
      // pages can fire `initial()` and stage their pre-enter visuals
      // during the wait — without this, descendants of an outlet that has
      // appear=true mounted with ready=false would render at default
      // opacity until enter fires, defeating the gate.
      if (appearRef.current && !appearDoneRef.current) {
        return {
          phase: "entering",
          info: {
            from: locationRef.current.pathname,
            to: locationRef.current.pathname,
            direction: "push",
          },
        };
      }
      return ancestorCoordinationRef.current?.activeTransition() ?? null;
    },
  }).current;

  const pendingNavRef = useRef<{
    locationKey: string;
    prevPathname: string;
    ancestorCommitGenSnapshot: number;
  } | null>(null);

  // Previous outlet match id, used by phase 2 to determine ownership.
  // Initialized to the current outletMatchId on mount; updated by the sync
  // effect at the end of each render.
  const prevOutletMatchIdRef = useRef<string | null>(outletMatchId);

  // Global event registry (for useTransitionEvent in persistent components)
  const globalRegistryRef = useRef(createRegistry());
  const globalRegistry = globalRegistryRef.current;

  // Per-page registries, keyed by page key
  const pageRegistries = useRef(new Map<string, TransitionRegistry>());

  // Callback refs — avoid stale closures in async animation callbacks
  const cbRef = useRef({
    onTransition,
    onExitStart,
    onExitComplete,
    onEnterStart,
    onEnterComplete,
  });
  cbRef.current = {
    onTransition,
    onExitStart,
    onExitComplete,
    onEnterStart,
    onEnterComplete,
  };

  function getOrCreatePageRegistry(key: string): TransitionRegistry {
    let reg = pageRegistries.current.get(key);
    if (!reg) {
      reg = createRegistry();
      pageRegistries.current.set(key, reg);
    }
    return reg;
  }

  function finishTransition(exitingKey: string, generation: number) {
    if (!mountedRef.current) {
      trace(name, "finishTransition BAIL mountedRef=false", { generation });
      return;
    }
    if (!isTransitioningRef.current) {
      trace(name, "finishTransition BAIL isTransitioning=false", {
        generation,
      });
      return;
    }
    if (transitionGenRef.current !== generation) {
      trace(name, "finishTransition BAIL stale gen", {
        generation,
        cur: transitionGenRef.current,
      });
      return;
    }
    trace(name, "finishTransition RUN", { generation, exitingKey });
    isTransitioningRef.current = false;
    clearTimeout(timeoutIdRef.current);
    cleanupsRef.current = [];
    trace(name, "setPhase idle (finishTransition)");
    setPhase("idle");
    trace(name, "dispatch REMOVE_PAGE", { key: exitingKey });
    dispatch({
      type: "REMOVE_PAGE",
      key: exitingKey,
    });
    pageRegistries.current.get(exitingKey)?.clear();
    pageRegistries.current.delete(exitingKey);
  }

  // ---------------------------------------------------------------------------
  // Navigation detection — Phase 1 (useLayoutEffect on location.key)
  //
  // Fires synchronously after DOM commit, in child-first order. Detects a
  // navigation and marks it "pending" along with a snapshot of the ancestor's
  // commitGen. The actual dispatch happens in Phase 2 below, once the ancestor
  // has committed (so our useOutlet() returns the fresh element).
  //
  // When there is no ancestor outlet, phase 2 proceeds immediately on the same
  // commit — no timing penalty for the root outlet.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (location.key === prevKeyRef.current) return;
    prevKeyRef.current = location.key;

    const prevPathname = pages[pages.length - 1]?.pathname;

    // Same pathname — skip. React Router handles data updates internally.
    if (location.pathname === prevPathname) return;

    trace(name, "navDetect Phase1 pending", {
      from: prevPathname,
      to: location.pathname,
      ancestorGen: ancestorCoordination?.commitGen.current ?? 0,
    });
    pendingNavRef.current = {
      locationKey: location.key,
      prevPathname: prevPathname ?? location.pathname,
      ancestorCommitGenSnapshot: ancestorCoordination?.commitGen.current ?? 0,
    };
  }, [location.key]);

  // ---------------------------------------------------------------------------
  // Navigation detection — Phase 2 (useLayoutEffect, runs every render)
  //
  // Checks the pending marker and only dispatches once the ancestor has
  // advanced its commitGen (signalling it re-rendered with new state, so our
  // `outlet` variable now points to the fresh element). All dispatches happen
  // in pre-paint layout-effect cycles; no intermediate state is painted.
  //
  // ORDERING: declared AFTER phase 1 and BEFORE the prevOutletRef sync below —
  // this effect needs to read the PREVIOUS render's outlet (captured by the
  // sync from the last render) to use as frozenOutlet for the exiting page.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    const pending = pendingNavRef.current;
    if (!pending) return;

    // Stale pending — a newer navigation arrived before this one committed.
    if (pending.locationKey !== location.key) {
      pendingNavRef.current = null;
      return;
    }

    // Wait for ancestor to finish its navDetect for this same location.
    // Until then, our `outlet` is still the pre-nav element (because the
    // ancestor hasn't re-rendered with its new pages state).
    if (
      ancestorCoordination &&
      ancestorCoordination.commitGen.current === pending.ancestorCommitGenSnapshot
    ) {
      return;
    }

    pendingNavRef.current = null;

    const direction = navigationType.toLowerCase() as TransitionDirection;
    const trigger = direction === "pop" ? ("browser" as const) : ("link" as const);

    // Match-based ownership: if our outlet's next-level match didn't change,
    // only a deeper match did — a descendant outlet owns this nav. Dispatch
    // SKIP_NAVIGATE so our stored outlet reference updates (React will
    // reconcile the same-type outlet element in place, preserving the shared
    // layout's mounted state and DOM).
    if (outletMatchId === prevOutletMatchIdRef.current) {
      trace(name, "navDetect SKIP_NAVIGATE (outlet match unchanged)", {
        to: location.pathname,
      });
      infoRef.current = null;
      dispatch({
        type: "SKIP_NAVIGATE",
        page: {
          key: pages[pages.length - 1]?.key ?? "page-0",
          outlet,
          pathname: location.pathname,
        },
      });
      commitGenRef.current++;
      return;
    }

    // Our outlet match changed — this outlet owns the transition, unless the
    // user's preventTransition callback vetoes it.
    if (
      preventTransition?.(pending.prevPathname, location.pathname, {
        direction,
        trigger,
      })
    ) {
      trace(name, "navDetect SKIP_NAVIGATE (preventTransition veto)", {
        to: location.pathname,
      });
      infoRef.current = null;
      dispatch({
        type: "SKIP_NAVIGATE",
        page: {
          key: pages[pages.length - 1]?.key ?? "page-0",
          outlet,
          pathname: location.pathname,
        },
      });
      commitGenRef.current++;
      return;
    }

    // Abort in-progress transition (rapid navigation)
    if (isTransitioningRef.current) {
      trace(name, "navDetect rapid-nav ABORT (in-progress transition)");
      clearTimeout(timeoutIdRef.current);
      runCleanups(cleanupsRef.current);
      cleanupsRef.current = [];
      isTransitioningRef.current = false;

      // Clear ALL page registries — we're aborting, start fresh
      for (const reg of pageRegistries.current.values()) {
        reg.clear();
      }
      pageRegistries.current.clear();
    }

    // Start new transition
    enterTriggeredRef.current = false;
    exitTriggeredRef.current = false;
    isTransitioningRef.current = true;
    ctxRef.current = {};
    infoRef.current = {
      from: pending.prevPathname,
      to: location.pathname,
      direction,
    };

    const prevOutlet = prevOutletRef.current;

    navIdRef.current++;
    const newKey = `page-${navIdRef.current}`;
    trace(name, "navDetect NAVIGATE", {
      from: pending.prevPathname,
      to: location.pathname,
      direction,
      newKey,
    });
    dispatch({
      type: "NAVIGATE",
      page: {
        key: newKey,
        outlet,
        pathname: location.pathname,
      },
      frozenOutlet: prevOutlet,
    });

    trace(name, "setPhase exiting (navDetect)");
    setPhase("exiting");

    // Bump generation to trigger orchestration effect
    transitionGenRef.current++;
    setTransitionGen(transitionGenRef.current);

    // Signal to descendants that we've committed this nav.
    commitGenRef.current++;
  });

  // Keep prevOutletRef and prevOutletMatchIdRef in sync on non-navigation
  // renders. ORDERING: must be declared AFTER phase 2 (which reads the prior
  // render's values for ownership detection and frozenOutlet).
  useLayoutEffect(() => {
    prevOutletRef.current = outlet;
    prevOutletMatchIdRef.current = outletMatchId;
  });

  // ---------------------------------------------------------------------------
  // Appear — first-load enter animation
  //
  // When appear is enabled, initial() fires on mount (via usePageTransition
  // reading context.appear). Enter animations are gated by the ready prop —
  // set ready={false} while a preloader is active, flip to true when done.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Only on first load — once a navigation happens, appear is irrelevant
    if (transitionGenRef.current > 0) return;
    if (!appear || !ready) return;
    // Already ran once this session — `ready` cycling doesn't re-fire enters.
    if (appearDoneRef.current) return;
    appearDoneRef.current = true;

    const pageKey = pages[0]?.key;
    if (!pageKey) return;

    const info: TransitionInfo = {
      from: location.pathname,
      to: location.pathname,
      direction: "push",
    };
    infoRef.current = info;
    isTransitioningRef.current = true;

    const enterRegistry = pageRegistries.current.get(pageKey);

    // Fresh blocker list for this transition (covers register Promises here
    // that entering pages await via `awaitBlocks()`).
    blockersRef.current = [];

    // Defer by 1 frame (same as normal enters) so initial() applies
    const rafId = requestAnimationFrame(() => {
      setPhase("entering");
      cbRef.current.onEnterStart?.(info);

      // No exiting page during appear — `exit` callable is a noop.
      const noopExit = () => {};
      // Skip page enters whenever an ancestor outlet exists: every page
      // registration is forwarded to the ancestor's pageRegistry via
      // makeForwardingRegistrar, so the ancestor fires it as part of its
      // own transition (or appear). Firing locally too would re-target the
      // same anime.js animations — the second invocation cancels the first
      // (its done() never resolves) and visually re-runs the enter (e.g.
      // opacity [0,1] snaps back to 0 mid-fade). Probing `activeTransition()`
      // here used to be the guard, but it races: if the ancestor's
      // transition completes before this RAF fires (fast WebGL ready in
      // prod, slow in dev), the probe returns null and we fire anyway.
      // Structural check (any ancestor present) is race-free. Outlet-scoped
      // named/global registries are module-stored and don't forward, so
      // they still fire — that's what `useTransitionEvent({ name })` relies
      // on for first-load animations on persistent components.
      const hasAncestor = ancestorCoordinationRef.current != null;
      const pageHandle =
        enterRegistry && !hasAncestor
          ? enterRegistry.runEnters(info, ctxRef.current, noopExit, block, awaitBlocks)
          : {
              promise: Promise.resolve(),
              cleanups: [] as CleanupFunction[],
            };
      const globalHandle = globalRegistry.runEnters(
        info,
        ctxRef.current,
        noopExit,
        block,
        awaitBlocks,
      );
      const namedRegistry = getNamedEventRegistry(name ?? null);
      const namedHandle = namedRegistry
        ? namedRegistry.runEnters(info, ctxRef.current, noopExit, block, awaitBlocks)
        : {
            promise: Promise.resolve(),
            cleanups: [] as CleanupFunction[],
          };

      cleanupsRef.current.push(
        ...pageHandle.cleanups,
        ...globalHandle.cleanups,
        ...namedHandle.cleanups,
      );

      void Promise.all([pageHandle.promise, globalHandle.promise, namedHandle.promise]).then(() => {
        cbRef.current.onEnterComplete?.(info);
        setPhase("idle");
        isTransitioningRef.current = false;
        infoRef.current = null;
        cleanupsRef.current = [];
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [appear, ready]);

  // ---------------------------------------------------------------------------
  // Orchestration (useEffect)
  //
  // By this point all children's useLayoutEffect registrations are complete.
  // The generation counter guards against stale callbacks from interrupted
  // transitions — each async callback checks isStale() before proceeding.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (transitionGen === 0 || !isTransitioningRef.current) return;

    const info = infoRef.current;
    if (!info || pages.length < 2) return;

    const generation = transitionGenRef.current;
    const isStale = () => transitionGenRef.current !== generation;

    const exitingKey = pages[0]!.key;
    const enteringKey = pages[1]!.key;
    const exitRegistry = pageRegistries.current.get(exitingKey);
    const enterRegistry = pageRegistries.current.get(enteringKey);

    trace(name, "orchestration ENTER", {
      generation,
      exitingKey,
      enteringKey,
      exitsRegistered: exitRegistry ? exitRegistry.hasExits() : false,
      mode,
      driver,
    });

    // Fresh blocker list for this transition.
    blockersRef.current = [];

    // Safety timeout — fires regardless of driver. In `driver="enter"` mode
    // it's the recovery path if the entering page never calls `exit()`.
    timeoutIdRef.current = setTimeout(() => {
      trace(name, "safety TIMEOUT — force-proceeding", { generation, timeout });
      console.warn(`[TransitionOutlet] Timed out after ${timeout}ms — force-proceeding`);
      finishTransition(exitingKey, generation);
    }, timeout);

    let enterRafId: number | undefined;

    // exits' Promise.all — `triggerExits` assigns this; `triggerEnters` waits
    // on it before finishing the transition. In stack mode enters can begin
    // mid-exit (or in driver="enter" mode, even before exits start) and finish
    // first; holding the transition open until `exitsDonePromise` settles
    // preserves the full exit animation.
    let exitsDonePromise: Promise<void> = Promise.resolve();
    // Resolves on first triggerExits call so triggerEnters' final Promise.all
    // can wait for "exits started" without blocking on a `.then` race.
    let resolveExitsStarted: () => void = () => {};
    const exitsStartedPromise = new Promise<void>((resolve) => {
      resolveExitsStarted = resolve;
    });

    // ---- triggerExits — idempotent. Fires onExitStart, runs exit registries,
    // sequences onExitComplete + triggerEnters when exits resolve. Called
    // automatically when driver="exit" (today's behavior); called by the
    // entering page via ctx.exit() when driver="enter".
    const triggerExits = () => {
      if (!mountedRef.current || isStale() || exitTriggeredRef.current) {
        trace(name, "triggerExits NOOP", {
          mounted: mountedRef.current,
          stale: isStale(),
          alreadyTriggered: exitTriggeredRef.current,
        });
        return;
      }
      trace(name, "triggerExits RUN");
      exitTriggeredRef.current = true;
      resolveExitsStarted();

      cbRef.current.onExitStart?.(info);

      // Stack: enter() lets the exiting page kick off the entering page mid-exit.
      // Swap: enter() is a no-op — enters always wait for ALL exits to call done().
      const enterCallback = mode === "stack" ? triggerEnters : () => {};

      const namedRegistryLocal = getNamedEventRegistry(name ?? null);

      const pageExitHandle = exitRegistry
        ? exitRegistry.runExits(info, enterCallback, ctxRef.current, block)
        : {
            promise: Promise.resolve(),
            cleanups: [] as CleanupFunction[],
          };
      const globalExitHandle = globalRegistry.runExits(info, enterCallback, ctxRef.current, block);
      const namedExitHandle = namedRegistryLocal
        ? namedRegistryLocal.runExits(info, enterCallback, ctxRef.current, block)
        : {
            promise: Promise.resolve(),
            cleanups: [] as CleanupFunction[],
          };

      cleanupsRef.current.push(
        ...pageExitHandle.cleanups,
        ...globalExitHandle.cleanups,
        ...namedExitHandle.cleanups,
      );

      exitsDonePromise = Promise.all([
        pageExitHandle.promise,
        globalExitHandle.promise,
        namedExitHandle.promise,
      ]).then(() => {});

      void exitsDonePromise.then(() => {
        trace(name, "exitsDone settled", {
          mounted: mountedRef.current,
          stale: isStale(),
        });
        if (!mountedRef.current || isStale()) return;
        cbRef.current.onExitComplete?.(info);
        // triggerEnters is idempotent — no-op if already triggered via overlap.
        triggerEnters();
      });
    };

    const triggerEnters = () => {
      if (!mountedRef.current || isStale() || enterTriggeredRef.current) {
        trace(name, "triggerEnters NOOP", {
          mounted: mountedRef.current,
          stale: isStale(),
          alreadyTriggered: enterTriggeredRef.current,
        });
        return;
      }
      trace(name, "triggerEnters scheduled (RAF)");
      enterTriggeredRef.current = true;

      // Always deferred by 1 requestAnimationFrame so initial()'s anime.js
      // duration:0 animations have time to apply before enter callbacks fire.
      // Matches Vue/Nuxt's approach of inserting a frame between initial state
      // and animation start.
      enterRafId = requestAnimationFrame(() => {
        if (!mountedRef.current || isStale()) {
          trace(name, "triggerEnters RAF skipped (stale/unmounted)");
          return;
        }

        // Swap mode: remove exiting page before enter phase so it's gone when entering page appears
        if (mode === "swap") {
          trace(name, "dispatch REMOVE_PAGE (swap pre-enter)", {
            key: exitingKey,
          });
          dispatch({
            type: "REMOVE_PAGE",
            key: exitingKey,
          });
          pageRegistries.current.get(exitingKey)?.clear();
          pageRegistries.current.delete(exitingKey);
        }

        trace(name, "setPhase entering (triggerEnters RAF)");
        setPhase("entering");
        cbRef.current.onEnterStart?.(info);

        const pageHandle = enterRegistry
          ? enterRegistry.runEnters(info, ctxRef.current, triggerExits, block, awaitBlocks)
          : {
              promise: Promise.resolve(),
              cleanups: [] as CleanupFunction[],
            };
        const globalHandle = globalRegistry.runEnters(
          info,
          ctxRef.current,
          triggerExits,
          block,
          awaitBlocks,
        );
        const namedEnterRegistry = getNamedEventRegistry(name ?? null);
        const namedHandle = namedEnterRegistry
          ? namedEnterRegistry.runEnters(info, ctxRef.current, triggerExits, block, awaitBlocks)
          : {
              promise: Promise.resolve(),
              cleanups: [] as CleanupFunction[],
            };

        cleanupsRef.current.push(
          ...pageHandle.cleanups,
          ...globalHandle.cleanups,
          ...namedHandle.cleanups,
        );

        const entersDonePromise = Promise.all([
          pageHandle.promise,
          globalHandle.promise,
          namedHandle.promise,
        ]).then(() => {});

        // driver="enter" fallback: if enters all complete without ever calling
        // ctx.exit(), trigger exits ourselves so the transition can finish
        // gracefully (rather than waiting for the safety timeout).
        if (driver === "enter") {
          void entersDonePromise.then(() => {
            if (!mountedRef.current || isStale()) return;
            if (!exitTriggeredRef.current) {
              trace(name, "driver=enter fallback — auto-triggering exits");
              triggerExits();
            }
          });
        }

        // Wait for BOTH enters AND exits to complete before finishing.
        // exitsStartedPromise pauses the chain until exits actually begin
        // (otherwise driver="enter" would resolve `exitsDonePromise` —
        // initialised to Promise.resolve() — before triggerExits replaces it).
        void exitsStartedPromise
          .then(() => Promise.all([entersDonePromise, exitsDonePromise]))
          .then(() => {
            trace(name, "Promise.all[enters,exits] settled", {
              mounted: mountedRef.current,
              stale: isStale(),
            });
            if (!mountedRef.current || isStale()) return;
            cbRef.current.onEnterComplete?.(info);

            if (mode === "stack") {
              // Stack: exiting page still in DOM — remove it now
              finishTransition(exitingKey, generation);
            } else {
              // Swap: exiting page already removed above
              trace(name, "setPhase idle (swap mode finish)");
              clearTimeout(timeoutIdRef.current);
              setPhase("idle");
              isTransitioningRef.current = false;
              infoRef.current = null;
              cleanupsRef.current = [];
            }
          });
      });
    };

    // Custom orchestration — user controls the entire flow
    if (cbRef.current.onTransition) {
      // Mark exits as "started" so any enter callbacks reached via runEnters
      // below don't deadlock on exitsStartedPromise — custom orchestration
      // bypasses our triggerExits/triggerEnters chain entirely.
      resolveExitsStarted();
      const ctx: TransitionOrchestratorContext = {
        from: info.from,
        to: info.to,
        direction: info.direction,
        runExits: () => {
          const noop = () => {};
          const pageExitHandle = exitRegistry
            ? exitRegistry.runExits(info, noop, ctxRef.current, block)
            : {
                promise: Promise.resolve(),
                cleanups: [] as CleanupFunction[],
              };
          const globalExitHandle = globalRegistry.runExits(info, noop, ctxRef.current, block);
          const namedRegistry = getNamedEventRegistry(name ?? null);
          const namedExitHandle = namedRegistry
            ? namedRegistry.runExits(info, noop, ctxRef.current, block)
            : {
                promise: Promise.resolve(),
                cleanups: [] as CleanupFunction[],
              };
          cleanupsRef.current.push(
            ...pageExitHandle.cleanups,
            ...globalExitHandle.cleanups,
            ...namedExitHandle.cleanups,
          );
          return Promise.all([
            pageExitHandle.promise,
            globalExitHandle.promise,
            namedExitHandle.promise,
          ]).then(() => {});
        },
        runEnters: () => {
          const noopExit = () => {};
          const pageHandle = enterRegistry
            ? enterRegistry.runEnters(info, ctxRef.current, noopExit, block, awaitBlocks)
            : {
                promise: Promise.resolve(),
                cleanups: [] as CleanupFunction[],
              };
          const globalHandle = globalRegistry.runEnters(
            info,
            ctxRef.current,
            noopExit,
            block,
            awaitBlocks,
          );
          const namedRegistry = getNamedEventRegistry(name ?? null);
          const namedHandle = namedRegistry
            ? namedRegistry.runEnters(info, ctxRef.current, noopExit, block, awaitBlocks)
            : {
                promise: Promise.resolve(),
                cleanups: [] as CleanupFunction[],
              };
          cleanupsRef.current.push(
            ...pageHandle.cleanups,
            ...globalHandle.cleanups,
            ...namedHandle.cleanups,
          );
          return Promise.all([pageHandle.promise, globalHandle.promise, namedHandle.promise]).then(
            () => {},
          );
        },
        next: () => finishTransition(exitingKey, generation),
      };

      const result = cbRef.current.onTransition(ctx);
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            if (!mountedRef.current) return;
            if (!isStale() && isTransitioningRef.current) {
              finishTransition(exitingKey, generation);
            }
          },
          (err: unknown) => {
            if (!mountedRef.current) return;
            console.warn("[TransitionOutlet] onTransition error:", err);
            finishTransition(exitingKey, generation);
          },
        );
      }
      // Don't clear the safety timeout here — if onTransition is synchronous
      // and never calls next(), the timeout is the only recovery path.
      // finishTransition clears it when the transition actually completes.
      return () => {
        if (enterRafId !== undefined) cancelAnimationFrame(enterRafId);
      };
    }

    // ---- Driver dispatch ----------------------------------------------------
    // driver="exit" (default): exit fires immediately. Enter waits for exits
    //   to complete (or for exit to call enter() in stack mode).
    // driver="enter": enter fires immediately. Exit is held until enter calls
    //   ctx.exit(). Use when the entering page must load before the previous
    //   page leaves.
    if (driver === "enter") {
      triggerEnters();
    } else {
      triggerExits();
    }

    return () => {
      if (enterRafId !== undefined) cancelAnimationFrame(enterRafId);
      clearTimeout(timeoutIdRef.current);
    };
  }, [transitionGen]);

  // Sync phase to a data attribute on the outlet's own wrapping div. Scoped
  // (not on <html>) so multiple TransitionOutlets can coexist without
  // overwriting each other. Consumers style descendants with
  // `[data-transition-outlet][data-transition-phase="exiting"] …`.
  useEffect(() => {
    containerRef.current?.setAttribute("data-transition-phase", phase);
  }, [phase]);

  // Unmount cleanup — marks the component unmounted (so async resolutions
  // become no-ops), fires any pending user cleanup callbacks (e.g.
  // anim.revert()) so animations don't leak when an outlet unmounts
  // mid-transition, and removes the store slice so the aggregated <html>
  // attribute clears correctly.
  //
  // Body resets mountedRef.current = true on (re-)mount. Critical for the
  // StrictMode-style mount→unmount→remount pattern that React applies to
  // children added during a parent's commit (which is exactly what happens
  // to nested TransitionOutlets mounted inside an ancestor's entering
  // subtree). Without the reset, mountedRef stays false after the first
  // unmount and every subsequent finishTransition bails on the guard,
  // leaving phase stuck at "exiting".
  useEffect(() => {
    mountedRef.current = true;
    trace(name, "MOUNT (effect run)");
    return () => {
      trace(name, "UNMOUNT/cleanup");
      mountedRef.current = false;
      clearTimeout(timeoutIdRef.current);
      for (const cleanup of cleanupsRef.current) {
        try {
          cleanup();
        } catch (err) {
          console.warn("[TransitionOutlet] cleanup error on unmount:", err);
        }
      }
      cleanupsRef.current = [];
      removeOutletState(outletId);
    };
  }, [outletId]);

  // ---------------------------------------------------------------------------
  // Build context values and render
  // ---------------------------------------------------------------------------
  const isTransitioning = pages.length > 1;
  const latestPage = pages[pages.length - 1];
  const direction = infoRef.current?.direction ?? null;

  const pageStates: TransitionPageState[] = pages.map((page) => ({
    key: page.key,
    pathname: page.pathname,
    phase:
      page.key === latestPage?.key
        ? isTransitioning
          ? phase === "entering"
            ? "entering"
            : "idle"
          : "idle"
        : "exiting",
  }));

  // appear is a one-shot: only true on the first load, before any navigation.
  // Once a transition has happened, appear is false so subsequent mounts
  // (e.g. prevented browser navigations) don't fire initial().
  const appearActive = appear && transitionGenRef.current === 0;

  // Publish public outlet state to the module-level store. Each outlet has
  // its own slice keyed by `outletId`. The store powers `useTransitionOutlet`
  // (cross-tree, by name) and the aggregated `<html data-transition-phase>`
  // attribute.
  //
  // `pageStates` is recreated on every render (mapped from `pages`); declaring
  // it as a dep means we publish whenever pages change. The store dedupes via
  // shallow comparison in `useSyncExternalStore`, so harmless re-publishes
  // don't trigger downstream re-renders.
  useEffect(() => {
    upsertOutletState(outletId, {
      phase,
      from: infoRef.current?.from ?? null,
      to: infoRef.current?.to ?? null,
      direction,
      mode,
      appear: appearActive,
      pages: pageStates,
      name: name ?? null,
    });
  }, [outletId, phase, direction, mode, appearActive, pageStates, name]);

  // Wraps a registry method so registrations also forward to any ancestor
  // outlet's coordination channel. This is what makes cross-boundary
  // transitions work: a component inside a nested outlet's subtree has its
  // exit/enter callbacks visible to whichever outlet ends up orchestrating
  // the current navigation.
  const makeForwardingRegistrar = <K extends "registerExit" | "registerEnter" | "registerEvent">(
    method: K,
    localRegistry: TransitionRegistry,
    forwardingKey: string,
  ): TransitionRegistry[K] => {
    return ((id: string, config: unknown): (() => void) => {
      const unregSelf = (localRegistry[method] as (id: string, config: unknown) => () => void)(
        id,
        config,
      );
      const unregAncestor = ancestorCoordinationRef.current?.registerAtCurrentPage(
        method,
        `${outletId}:${forwardingKey}:${id}`,
        config as ExitFunction | EnterFunction | TransitionEventCallbacks,
      );
      return () => {
        unregSelf();
        unregAncestor?.();
      };
    }) as TransitionRegistry[K];
  };

  // Top-level context for persistent components (useTransitionEvent)
  const topContextValue: TransitionContextValue = {
    phase,
    from: infoRef.current?.from ?? null,
    to: infoRef.current?.to ?? null,
    direction,
    mode,
    appear: appearActive,
    pages: pageStates,
    name: name ?? null,
    registerExit: makeForwardingRegistrar("registerExit", globalRegistry, "global"),
    registerEnter: makeForwardingRegistrar("registerEnter", globalRegistry, "global"),
    registerEvent: makeForwardingRegistrar("registerEvent", globalRegistry, "global"),
  };

  return (
    <TransitionCoordinationContext.Provider value={coordinationValue}>
      <TransitionContext.Provider value={topContextValue}>
        {/*
         * `display: contents` keeps the wrapper in the DOM (so
         * `data-transition-outlet` and `data-transition-phase` attribute
         * selectors still work) but makes it layout-transparent — its page
         * children participate as direct flex/grid items of the consumer's
         * parent. STACK MODE constraint: the consumer's nearest positioned
         * ancestor must be `position: relative` (or otherwise positioned),
         * since the exiting page is `position: absolute; inset: 0` and now
         * anchors against that ancestor instead of this wrapper.
         */}
        <div
          ref={containerRef}
          data-transition-outlet=""
          data-transition-phase="idle"
          style={{
            display: "contents",
          }}
        >
          {pages.map((page) => {
            const isPresent = page.key === latestPage?.key;
            const pageRegistry = getOrCreatePageRegistry(page.key);

            const pageContext: TransitionContextValue = {
              phase: !isPresent
                ? "exiting"
                : isTransitioning
                  ? phase === "entering"
                    ? "entering"
                    : "idle"
                  : "idle",
              from: infoRef.current?.from ?? null,
              to: infoRef.current?.to ?? null,
              direction,
              mode,
              appear: appearActive,
              pages: pageStates,
              name: name ?? null,
              registerExit: makeForwardingRegistrar("registerExit", pageRegistry, page.key),
              registerEnter: makeForwardingRegistrar("registerEnter", pageRegistry, page.key),
              registerEvent: makeForwardingRegistrar("registerEvent", pageRegistry, page.key),
            };

            return (
              <TransitionContext.Provider key={page.key} value={pageContext}>
                <div
                  style={getPageStyle(isPresent, mode, phase, isTransitioning)}
                  data-transition-page={isPresent ? "present" : "exiting"}
                >
                  <TransitionErrorBoundary
                    onError={() => {
                      dispatch({
                        type: "REMOVE_PAGE",
                        key: page.key,
                      });
                      pageRegistries.current.get(page.key)?.clear();
                      pageRegistries.current.delete(page.key);
                    }}
                  >
                    {page.outlet}
                  </TransitionErrorBoundary>
                </div>
              </TransitionContext.Provider>
            );
          })}
        </div>
        {/* Lazy-loaded debug panel — opt in per outlet via the `debug` prop.
            The panel itself reads from the store, so set this on a single
            outlet (typically root) and you get an overview of every mounted
            outlet. Stripped from prod builds via `devOnly`. */}
        {debug && <TransitionDebug />}
      </TransitionContext.Provider>
    </TransitionCoordinationContext.Provider>
  );
}
