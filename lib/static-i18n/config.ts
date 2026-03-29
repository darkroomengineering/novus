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
 * ```ts
 * // react-router.config.ts
 * import { staticI18nConfig } from "./lib/static-i18n/config";
 *
 * export default staticI18nConfig({
 *   appDirectory: "translated",
 *   prerender: ["/", "/about", "/contact"],
 * });
 * ```
 */
export function staticI18nConfig(options: {
  appDirectory: string;
  prerender: string[];
}): Config {
  const lang = process.env.BUILD_LANG;

  // Preview deploy — SSR with no prerendering, loader fetches from CDN
  if (!lang) {
    return {
      ssr: true,
      appDirectory: options.appDirectory,
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
