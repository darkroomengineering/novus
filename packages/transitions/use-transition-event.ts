import { useId, useLayoutEffect, useRef } from "react";
import type { EnterFunction, ExitFunction } from "./context";
import { registerNamedEvent } from "./store";

export interface TransitionEventConfig {
  /**
   * Name of the TransitionOutlet to subscribe to. The component will
   * participate in any transition that this outlet orchestrates. Set the
   * matching `name` prop on `<TransitionOutlet name="..." />` (typically
   * the root outlet for app-wide UI like nav and footer).
   */
  name: string;
  onExit?: ExitFunction;
  onEnter?: EnterFunction;
}

/**
 * Participate in transitions from a persistent component — anything that
 * stays mounted across navigations (global header, fixed nav, persistent
 * WebGL canvas, etc.). Address an outlet by name; the component itself can
 * mount anywhere in the React tree, no need to be a descendant of the
 * outlet.
 *
 * Same `{ done, info, ctx }` API as `usePageTransition`'s exit/enter.
 *
 * ```tsx
 * useTransitionEvent({
 *   name: "root",
 *   onExit: ({ done }) => {
 *     animate(menuRef.current, { y: "-100%", duration: 400, onComplete: done });
 *   },
 *   onEnter: ({ done }) => {
 *     animate(menuRef.current, { y: "0%", duration: 400, onComplete: done });
 *   },
 * });
 * ```
 *
 * If the named outlet doesn't exist yet at mount time the registration sits
 * in the store and gets picked up the first time that outlet runs a
 * transition — no error, no special handling needed.
 *
 * Treat `name` as a **static** prop. Changing `name` mid-mount unregisters
 * from the old outlet and re-registers against the new one; if a transition
 * is already collecting registries at that instant, the swap can race the
 * registry snapshot. Stable names (string literal, top-level constant) avoid
 * this entirely.
 */
export function useTransitionEvent(config: TransitionEventConfig): void {
  const id = useId();

  const onExitRef = useRef(config.onExit);
  const onEnterRef = useRef(config.onEnter);
  onExitRef.current = config.onExit;
  onEnterRef.current = config.onEnter;

  const { name } = config;

  useLayoutEffect(() => {
    return registerNamedEvent(name, id, {
      onExit: (ctx) => {
        if (onExitRef.current) return onExitRef.current(ctx);
        ctx.done();
      },
      onEnter: (ctx) => {
        if (onEnterRef.current) return onEnterRef.current(ctx);
        ctx.done();
      },
    });
  }, [name, id]);
}
