import { useContext, useId, useLayoutEffect, useRef, useState } from "react";
import {
  type EnterFunction,
  type ExitFunction,
  type InitialFunction,
  TransitionContext,
  TransitionCoordinationContext,
  type TransitionInfo,
  type TransitionPhase,
} from "./context";

export interface PageTransitionConfig {
  /** Set element state before first paint. Fires during transitions and on first load when appear is enabled. */
  initial?: InitialFunction;
  /** Animate out. Call done() when finished. Return cleanup function for interruption. */
  exit?: ExitFunction;
  /** Animate in. Call done() when finished. Return cleanup function for interruption. */
  enter?: EnterFunction;
}

/**
 * Per-page transition hook. Mount this inside a page component (a descendant
 * of a `<TransitionOutlet>`); the hook auto-discovers the nearest outlet via
 * context and participates in its exit/enter lifecycle.
 *
 * For persistent components that live OUTSIDE the outlet (global header,
 * fixed canvas, etc.), use `useTransitionEvent` instead — that variant
 * addresses an outlet by `name` rather than relying on tree position.
 */
export function usePageTransition(config: PageTransitionConfig): {
  phase: TransitionPhase;
  isExiting: boolean;
  isEntering: boolean;
} {
  const context = useContext(TransitionContext);
  const coordination = useContext(TransitionCoordinationContext);
  const id = useId();

  const initialRef = useRef(config.initial);
  const exitRef = useRef(config.exit);
  const enterRef = useRef(config.enter);
  initialRef.current = config.initial;
  exitRef.current = config.exit;
  enterRef.current = config.enter;

  // Stable ref to context for registration (avoids re-registering on context value change)
  const registerRef = useRef(context);
  registerRef.current = context;

  // Apply initial state before first paint when mounting as the ENTERING page,
  // or on first load when appear is enabled. If the local outlet is idle but
  // an ancestor outlet is currently orchestrating (e.g. we just mounted
  // inside an ancestor's entering subtree), fall back to the ancestor's
  // transition info so initial() still fires with a sensible from/to.
  const phaseOnMount = useRef(context?.phase);
  const appearOnMount = useRef(context?.appear);
  // Lazy init via useState — `coordination?.activeTransition()` runs once on
  // mount instead of on every render (which `useRef(expr)` would do).
  const [infoOnMount] = useState<TransitionInfo | null>(() =>
    context?.from && context?.to
      ? {
          from: context.from,
          to: context.to,
          direction: context.direction ?? "push",
        }
      : (coordination?.activeTransition()?.info ?? null),
  );

  useLayoutEffect(() => {
    if (phaseOnMount.current === "exiting") return;
    if (infoOnMount) {
      initialRef.current?.(infoOnMount);
    } else if (appearOnMount.current) {
      // First-load appear — fire initial() with synthetic info
      initialRef.current?.({
        from: "",
        to: "",
        direction: "push",
      });
    }
  }, [infoOnMount]);

  // Register exit + enter — runs once on mount (useLayoutEffect guarantees
  // registration completes before the parent's orchestration useEffect fires)
  useLayoutEffect(() => {
    const ctx = registerRef.current;
    if (!ctx) return;

    const exitWrapper: ExitFunction = (exitCtx) => {
      if (exitRef.current) return exitRef.current(exitCtx);
      exitCtx.done();
    };

    const enterWrapper: EnterFunction = (enterCtx) => {
      if (enterRef.current) return enterRef.current(enterCtx);
      enterCtx.done();
    };

    const unregisterExit = ctx.registerExit(id, exitWrapper);
    const unregisterEnter = ctx.registerEnter(id, enterWrapper);

    return () => {
      unregisterExit();
      unregisterEnter();
    };
  }, [id]);

  return {
    phase: context?.phase ?? "idle",
    isExiting: context?.phase === "exiting",
    isEntering: context?.phase === "entering",
  };
}
