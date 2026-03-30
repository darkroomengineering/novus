import type { Config } from "@react-router/dev/config";

/**
 * React Router config for static i18n.
 *
 * Returns a different config depending on the environment:
 *
 * - **Static build** (`BUILD_LANG` set): SPA + prerendering into `dist/<lang>/`,
 *   with optional `basename` from `BUILD_BASENAME`. Loaders run at build time.
 * - **Preview deploy** (no `BUILD_LANG`): SSR enabled so the root loader can
 *   fetch translations from CDN at runtime. No prerendering.
 *
 * The optional `ssr` bag is only merged into the preview deploy config,
 * keeping presets, middleware flags, and other SSR-specific config out
 * of static builds.
 *
 * ```ts
 * // react-router.config.ts
 * import { staticI18nConfig } from "./lib/static-i18n/config";
 * import { vercelPreset } from "@vercel/react-router/vite";
 *
 * export default staticI18nConfig({
 *   appDirectory: "app",
 *   prerender: ["/", "/about", "/contact"],
 *   ssr: {
 *     presets: [vercelPreset()],
 *     future: { v8_middleware: true },
 *   },
 * });
 * ```
 */
export function staticI18nConfig(options: {
  appDirectory: string;
  prerender: string[];
  ssr?: Omit<Config, "ssr" | "appDirectory">;
}): Config {
  const lang = process.env.BUILD_LANG;

  // Preview deploy — SSR with no prerendering, loader fetches from CDN
  if (!lang) {
    return {
      ssr: true,
      appDirectory: options.appDirectory,
      ...options.ssr,
    } satisfies Config;
  }

  // Static build — SPA + prerender into dist/<lang>/ (client-only output)
  const basename = process.env.BUILD_BASENAME || "/";

  return {
    ssr: false,
    prerender: options.prerender,
    buildDirectory: `dist/${lang}`,
    appDirectory: options.appDirectory,
    ...(basename !== "/" && { basename }),
  } satisfies Config;
}
