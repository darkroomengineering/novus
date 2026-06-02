import { useSyncExternalStore } from "react";
import type {
  TransitionDirection,
  TransitionEventCallbacks,
  TransitionMode,
  TransitionPageState,
  TransitionPhase,
  TransitionRegistry,
} from "./context";
import { createRegistry } from "./registry";

/**
 * Public outlet state — the read-only view of a TransitionOutlet, queryable
 * from anywhere in the app via {@link useTransitionOutlet} or
 * {@link getTransitionOutletState}.
 *
 * Distinct from {@link TransitionState} (returned by `useTransitionState`)
 * which is per-page and context-scoped. This one is per-outlet, store-backed,
 * and addressable by name across the whole tree.
 */
export interface TransitionOutletState {
  phase: TransitionPhase;
  from: string | null;
  to: string | null;
  direction: TransitionDirection | null;
  mode: TransitionMode;
  appear: boolean;
  pages: TransitionPageState[];
  name: string | null;
}

type Subscriber = () => void;

// Map<outletId, state> — one slice per mounted TransitionOutlet.
let outlets: Map<string, TransitionOutletState> = new Map();
// Map<name, outletId> — names are user-supplied via the `name` prop and let
// outside-the-tree consumers address an outlet without knowing its useId().
const namesToIds = new Map<string, string>();
const subscribers = new Set<Subscriber>();

function notify() {
  for (const s of subscribers) s();
}

function subscribe(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot(): Map<string, TransitionOutletState> {
  return outlets;
}

function getServerSnapshot(): Map<string, TransitionOutletState> {
  // SSR: no outlets ever transitioning. Return a stable empty Map so
  // useSyncExternalStore is happy.
  return EMPTY_MAP;
}
const EMPTY_MAP: Map<string, TransitionOutletState> = new Map();

/** Internal — TransitionOutlet publishes its slice here. */
export function upsertOutletState(id: string, state: TransitionOutletState): void {
  const prev = outlets.get(id);
  if (prev?.name && prev.name !== state.name) namesToIds.delete(prev.name);
  if (state.name) namesToIds.set(state.name, id);
  outlets = new Map(outlets);
  outlets.set(id, state);
  notify();
}

/** Internal — TransitionOutlet calls this on unmount. */
export function removeOutletState(id: string): void {
  const prev = outlets.get(id);
  if (!prev) return;
  if (prev.name) namesToIds.delete(prev.name);
  outlets = new Map(outlets);
  outlets.delete(id);
  notify();
}

/**
 * Look up an outlet's public state by its `name` prop. Returns `null` if no
 * outlet with that name is currently mounted.
 *
 * Use the React hook {@link useTransitionOutlet} from components — this
 * imperative form is for non-React code (analytics, etc.).
 */
export function getTransitionOutletState(name: string): TransitionOutletState | null {
  const id = namesToIds.get(name);
  if (!id) return null;
  return outlets.get(id) ?? null;
}

/**
 * Subscribe to a named outlet's state from anywhere. Returns `null` when no
 * outlet with that name is mounted.
 *
 * For descendants of a TransitionOutlet, prefer `useTransitionState()` —
 * it's context-scoped and returns per-page state. This hook is for components
 * outside the transition tree (e.g. a global nav, or anything in app/root.tsx
 * above the outlets).
 */
export function useTransitionOutlet(name: string): TransitionOutletState | null {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Two-step lookup so we re-render when the name's owning outlet changes.
  const id = namesToIds.get(name);
  if (!id) return null;
  return snapshot.get(id) ?? null;
}

/**
 * Subscribe to ALL currently mounted outlets' state. Returns an array in
 * mount order (root mounts first, then nested outlets as they appear).
 * Useful for dev tooling that wants to render an overview of every active
 * outlet. Returns `[]` during SSR.
 */
export function useAllTransitionOutlets(): TransitionOutletState[] {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return Array.from(snapshot.values());
}

// ---------------------------------------------------------------------------
// Aggregated <html data-transition-phase> writer
//
// Single subscriber, mounted once at module init (browser-only). Aggregation
// rule: any outlet `exiting` -> "exiting"; else any `entering` -> "entering";
// else attribute is removed (idle is the absence of the attribute, so CSS
// selectors like `:not([data-transition-phase])` work cleanly).
//
// This replaces the previous per-outlet useEffect that wrote to `<html>` —
// which clobbered each other when nested outlets mounted during a parent's
// transition. With aggregation, all outlets contribute, none clobber.
// ---------------------------------------------------------------------------
function aggregatePhase(state: Map<string, TransitionOutletState>): TransitionPhase {
  let hasEntering = false;
  for (const [, slice] of state) {
    if (slice.phase === "exiting") return "exiting";
    if (slice.phase === "entering") hasEntering = true;
  }
  return hasEntering ? "entering" : "idle";
}

if (typeof window !== "undefined") {
  let lastWritten: TransitionPhase = "idle";
  subscribe(() => {
    const phase = aggregatePhase(outlets);
    if (phase === lastWritten) return;
    lastWritten = phase;
    if (phase === "idle") {
      delete document.documentElement.dataset.transitionPhase;
    } else {
      document.documentElement.dataset.transitionPhase = phase;
    }
  });
}

// ---------------------------------------------------------------------------
// Named-event registry — backs `useTransitionEvent({ name })`.
//
// Persistent components (header, footer, global UI) live OUTSIDE any outlet's
// subtree and can't reach a TransitionContext. They register here against an
// outlet by name; the matching TransitionOutlet pulls these registrations
// into its orchestration alongside its per-page and global registries.
//
// One registry per outlet name. Persists across transitions; not cleared on
// rapid-nav abort (registrations are tied to component lifetime, not to a
// single transition). Pending in-flight resolvers from an aborted transition
// are guarded by isStale() in the orchestration; they hang harmlessly until
// GC.
// ---------------------------------------------------------------------------
const namedRegistries = new Map<string, TransitionRegistry>();

/**
 * Internal — `useTransitionEvent` registers via this. Returns the standard
 * unregister cleanup. Auto-creates the registry for `outletName` if it
 * doesn't exist yet (handles the case where the consumer mounts before the
 * outlet does).
 */
export function registerNamedEvent(
  outletName: string,
  id: string,
  config: TransitionEventCallbacks,
): () => void {
  let registry = namedRegistries.get(outletName);
  if (!registry) {
    registry = createRegistry();
    namedRegistries.set(outletName, registry);
  }
  return registry.registerEvent(id, config);
}

/**
 * Internal — TransitionOutlet pulls its named-event registry during
 * orchestration to merge with per-page and global registries. Returns null
 * for unnamed outlets or names with no registrations.
 */
export function getNamedEventRegistry(outletName: string | null): TransitionRegistry | null {
  if (!outletName) return null;
  return namedRegistries.get(outletName) ?? null;
}
