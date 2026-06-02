import { createContext } from "react";
import type { CollectedHandle } from "./helpers";

export type TransitionPhase = "idle" | "exiting" | "entering";
export type TransitionDirection = "push" | "pop" | "replace";
export type TransitionMode = "swap" | "stack";
/**
 * Which side drives the transition timing.
 *
 * - `"exit"` (default, today's behavior): exit auto-fires on navigation. Enter
 *   waits for exits to call `done()` (or for `exit()` to call `enter()` early
 *   in stack mode). Exit-led.
 * - `"enter"`: exit is held until the entering page's enter callback calls
 *   `exit()`. Use when the entering page needs time to load (textures, data,
 *   etc.) before the previous page should leave. Enter-led.
 *
 * The `enter()` callable in exit ctx and `exit()` in enter ctx are both
 * idempotent — whichever side wasn't auto-fired is the one whose trigger
 * actually does work; the other becomes a no-op.
 */
export type TransitionDriver = "enter" | "exit";

export interface TransitionInfo {
  from: string;
  to: string;
  direction: TransitionDirection;
}

/** Cleanup function returned from exit/enter. Called on interruption. */
export type CleanupFunction = () => void;

/** Shared context object — writable by any exit, readable by any enter. Cleared between transitions. */
export type TransitionCtx = Record<string, unknown>;

/** Context passed to exit callbacks */
export interface ExitContext {
  /** Signal that the exit animation is complete. Must be called. */
  done: () => void;
  /**
   * Trigger the entering page's animations early, before done().
   * Idempotent. No-op in wait mode.
   * If never called, enters start automatically when done() fires.
   */
  enter: () => void;
  /** Navigation info */
  info: TransitionInfo;
  /** Shared context — write data here for enter callbacks to read */
  ctx: TransitionCtx;
  /**
   * Register a Promise that the entering page's `awaitBlocks()` will wait on
   * before doing its visual work. Use from cover/preloader components to
   * stagger page reveals after the cover animation is out of the way.
   * Multiple `block()` calls accumulate — `awaitBlocks()` resolves once all
   * registered Promises settle.
   */
  block: (promise: Promise<unknown>) => void;
}

/** Context passed to enter callbacks */
export interface EnterContext {
  /** Signal that the enter animation is complete. Must be called. */
  done: () => void;
  /**
   * Trigger the exiting page's exit animations. Idempotent.
   * Only meaningful in `driver="enter"` mode — the entering page is
   * authoritative and tells the exiting page when to leave (e.g. after
   * loading textures/data). In `driver="exit"` mode exits have already
   * fired by the time enter runs, so this is a no-op.
   * If never called in `driver="enter"` mode, the safety timeout fires it.
   */
  exit: () => void;
  /** Navigation info */
  info: TransitionInfo;
  /** Shared context — read data written by exit callbacks */
  ctx: TransitionCtx;
  /**
   * Register a Promise that the entering page's `awaitBlocks()` will wait on.
   * Same shape as ExitContext.block — useful for covers that don't have an
   * exit phase (e.g. a preloader on cold-load appear).
   */
  block: (promise: Promise<unknown>) => void;
  /**
   * Returns a Promise that resolves once every `block()` registered during
   * the current transition has settled. Awaiting this from inside an
   * entering page's async-IIFE delays its visual until covers are out of
   * the way. Resolves immediately if no blocks were registered.
   *
   * Internally defers one microtask before snapshotting the blocker list so
   * sibling enter callbacks have a chance to register their blocks first —
   * the convention is fire-and-snapshot, registration order doesn't matter.
   */
  awaitBlocks: () => Promise<void>;
}

/**
 * Exit animation function. Call done() when finished.
 * Optionally return a cleanup function (called on interruption).
 */
export type ExitFunction = (ctx: ExitContext) => void | CleanupFunction;

/**
 * Enter animation function. Call done() when finished.
 * Optionally return a cleanup function (called on interruption).
 */
export type EnterFunction = (ctx: EnterContext) => void | CleanupFunction;

export type InitialFunction = (info: TransitionInfo) => void;

export interface TransitionEventCallbacks {
  onExit?: ExitFunction;
  onEnter?: EnterFunction;
}

export interface TransitionRegistry {
  registerExit: (id: string, fn: ExitFunction) => () => void;
  registerEnter: (id: string, fn: EnterFunction) => () => void;
  registerEvent: (id: string, config: TransitionEventCallbacks) => () => void;
  runExits: (
    info: TransitionInfo,
    enter: () => void,
    ctx: TransitionCtx,
    block: (promise: Promise<unknown>) => void,
  ) => CollectedHandle;
  runEnters: (
    info: TransitionInfo,
    ctx: TransitionCtx,
    exit: () => void,
    block: (promise: Promise<unknown>) => void,
    awaitBlocks: () => Promise<void>,
  ) => CollectedHandle;
  hasExits: () => boolean;
  clear: () => void;
}

export interface TransitionPageState {
  key: string;
  pathname: string;
  phase: TransitionPhase;
}

export interface TransitionContextValue {
  phase: TransitionPhase;
  from: string | null;
  to: string | null;
  direction: TransitionDirection | null;
  mode: TransitionMode;
  /** Whether first-load enter animations are enabled */
  appear: boolean;
  pages: TransitionPageState[];
  /** The outlet's `name` prop, mirrored here so descendants can read it via
   *  `useTransitionState().name` without a separate label. */
  name: string | null;
  registerExit: (id: string, fn: ExitFunction) => () => void;
  registerEnter: (id: string, fn: EnterFunction) => () => void;
  registerEvent: (id: string, config: TransitionEventCallbacks) => () => void;
}

export interface TransitionOrchestratorContext {
  from: string;
  to: string;
  direction: TransitionDirection;
  runExits: () => Promise<void>;
  runEnters: () => Promise<void>;
  next: () => void;
}

export interface TransitionOutletProps {
  mode?: TransitionMode;
  /**
   * Which side drives the transition. Default `"exit"` (exit auto-fires on
   * nav, today's behavior). Set `"enter"` for enter-led navigation where the
   * entering page calls `exit()` from inside its enter callback to release
   * the held exit — useful when the entering page needs to load before the
   * old page leaves.
   */
  driver?: TransitionDriver;
  timeout?: number;
  onTransition?: (ctx: TransitionOrchestratorContext) => void | Promise<void>;
  preventTransition?: (
    from: string,
    to: string,
    navigation: {
      direction: TransitionDirection;
      trigger: "link" | "browser";
    },
  ) => boolean;
  onExitStart?: (info: TransitionInfo) => void;
  onExitComplete?: (info: TransitionInfo) => void;
  onEnterStart?: (info: TransitionInfo) => void;
  onEnterComplete?: (info: TransitionInfo) => void;
  /** Enable enter animations on first page load. Default: false (SSR-safe). */
  appear?: boolean;
  /** Gate enter animations — set to false while a preloader is active. Default: true. */
  ready?: boolean;
  /**
   * Optional name for store-based lookups. When provided, the outlet's state
   * is addressable from anywhere in the app via `useTransitionOutlet(name)`
   * or `getTransitionOutletState(name)`. Useful for components outside the
   * outlet's subtree (e.g. global nav). Default: undefined (outlet only
   * accessible via context to descendants).
   */
  name?: string;
  /**
   * When true, mounts the unified `TransitionDebug` panel inside this outlet.
   * The panel reads from the module-level store and shows every mounted
   * outlet (regardless of which has `debug` set), so set this on a single
   * outlet (typically root). Lazy-loaded and tree-shaken from production
   * builds via `import.meta.env.DEV`. Default: false.
   */
  debug?: boolean;
}

export const TransitionContext = createContext<TransitionContextValue | null>(null);

/**
 * Internal coordination channel between nested TransitionOutlets.
 *
 * Provides three responsibilities:
 *
 * 1. **commitGen** — bumped by each outlet after navDetect finishes
 *    processing a location change (NAVIGATE or SKIP_NAVIGATE). Descendants
 *    wait on this so their own dispatch sees the post-navigation outlet.
 *
 * 2. **registerAtCurrentPage** — a component registering exit/enter/event
 *    callbacks through this outlet's pageContext also has its callback
 *    registered with every ancestor's current latest-page registry. This
 *    way whichever outlet ends up orchestrating a given navigation (its
 *    own or an ancestor's) finds the registrations it needs to run.
 *
 * 3. **activeTransition** — walks up the chain and returns the first
 *    ancestor currently mid-transition. Consumed by `usePageTransition`
 *    so that a component mounting inside an ancestor's entering subtree
 *    still fires `initial()` with the ancestor's navigation info.
 */
export interface TransitionCoordinationValue {
  commitGen: { current: number };
  registerAtCurrentPage: (
    method: "registerExit" | "registerEnter" | "registerEvent",
    id: string,
    config: ExitFunction | EnterFunction | TransitionEventCallbacks,
  ) => () => void;
  activeTransition: () => {
    phase: TransitionPhase;
    info: TransitionInfo;
  } | null;
}

export const TransitionCoordinationContext = createContext<TransitionCoordinationValue | null>(
  null,
);
