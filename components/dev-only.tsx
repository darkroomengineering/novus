import { type ComponentType, Suspense, lazy } from "react";

/**
 * Wrap a dynamic import of a dev-only component. Returns a component that
 * renders the loaded module in dev / SSR builds and `null` in static
 * zip builds, gated by the `__INCLUDE_DEV_TOOLS__` build-time constant
 * (defined in `vite.config.ts`).
 *
 * When the constant is `false`, the early return resolves at build time,
 * `lazy(() => import(...))` becomes unreachable, and Vite/Rolldown drops
 * the entire wrapped module and its transitive dependencies from the
 * bundle — no orphan chunk, nothing to post-prune.
 *
 * Portable across projects: change the `define` clause in `vite.config.ts`
 * to match the project's build-flag set; the helper itself is unchanged.
 *
 * @example
 *   const OrchestraTools = devOnly(() => import("../dev"));
 *   // ...
 *   <OrchestraTools />
 */
export function devOnly<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  if (!__INCLUDE_DEV_TOOLS__) {
    return function DevOnlyStub() {
      return null;
    };
  }
  const Lazy = lazy(loader);
  return function DevOnly(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
