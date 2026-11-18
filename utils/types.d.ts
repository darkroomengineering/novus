import "react";

// Allow CSS custom properties in React's style prop
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

declare global {
  /**
   * Build-time constant injected by `vite.config.ts` via `define`. Used by
   * `components/dev-only` to drop dev-only modules from production bundles
   * via tree-shaking when set to `false`. Currently hardcoded to `true`;
   * wire to a build flag (e.g. `!process.env.BUILD_LANG`) when shipping
   * static zip variants.
   */
  const __INCLUDE_DEV_TOOLS__: boolean;
}
