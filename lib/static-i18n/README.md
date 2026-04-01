# Static i18n

Build the same page as standalone static sites in multiple languages. One JSON per language, one ZIP per language. Supports live preview from a CDN for translators.

## Setup

### 1. Create your app directory

Create a folder (e.g. `translated/`) with your routes. Use `useTranslation()` for typed access:

```tsx
import { useTranslation } from "~/lib/static-i18n/context";

export default function Home() {
  const t = useTranslation();
  return <h1>{t.home.title}</h1>;
}
```

`t` is fully typed from the valibot schema — autocomplete and compile-time errors.

### 2. Set up your root layout

The translated app's `root.tsx` loads translations and wraps children with `TranslationProvider`:

```tsx
import { useEffect } from "react";
import { Outlet } from "react-router";
import { TranslationProvider } from "~/lib/static-i18n/context";
import { loadTranslation } from "~/lib/static-i18n/loader.server";
import type { Route } from "./+types/root";

export async function loader({ request }: Route.LoaderArgs) {
  return { translation: await loadTranslation(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { translation } = loaderData;

  useEffect(() => {
    document.documentElement.lang = translation.locale.lang;
    document.documentElement.dir = translation.locale.dir;
  }, [translation.locale.lang, translation.locale.dir]);

  return (
    <TranslationProvider value={translation}>
      <Outlet />
    </TranslationProvider>
  );
}
```

### 3. Define your schema

Edit `lib/static-i18n/schema.ts` to match your content structure:

```ts
export const TranslationSchema = v.object({
  locale: v.object({
    lang: v.string(),
    dir: v.picklist(["ltr", "rtl"]),
    basePath: v.optional(v.string(), "/"),
  }),
  home: v.object({
    meta: v.object({ title: v.string(), description: v.string() }),
    title: v.string(),
  }),
  // ...
});
```

### 4. Add translation JSONs

Translation files live in `lib/static-i18n/translations/` by default. The loader bundles them via `import.meta.glob` at build time — no filesystem access at runtime, so it works on Vercel serverless and other platforms where `process.cwd()` doesn't resolve to the project root.

Projects that move translations elsewhere should update the glob pattern in `loader.server.ts` to match. The build script (`build.ts`) uses `TRANSLATIONS_DIR` separately to locate files for validation.

```
translations/
  en.json
  de.json
  ja.json
  ar.json   ← RTL support via locale.dir
```

Every file must match the schema. The build validates all files before starting.

### 5. Configure React Router

```ts
// react-router.config.ts
import { staticI18nConfig } from "./lib/static-i18n/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default staticI18nConfig({
  appDirectory: "translated",
  ssr: {
    presets: [vercelPreset()],
    future: { v8_middleware: true },
  },
});
```

When `BUILD_LANG` is set, this produces a static SPA build that prerenders all routes into `dist/<lang>/`. The `ssr` bag is only applied to preview deploys — static builds ignore it.

### 6. Build

```bash
bun lib/static-i18n/build.ts --translations ./translations
bun lib/static-i18n/build.ts --translations ./translations --concurrency 8
```

## Output

```
output/
  en.zip    # Complete standalone static site
  de.zip
  ja.zip
```

Each ZIP contains `index.html` + `assets/` — host anywhere.

## How it works

1. **Validates** all JSONs against the valibot schema (fails fast before any builds)
2. **Builds** each language in parallel via `BUILD_LANG=xx react-router build`
3. **Root loader** reads the translation from the bundle (via `import.meta.glob`), data is prerendered into static HTML
4. **Zips** each build output into `output/<lang>.zip`
5. **Cleans up** intermediate build files

## Preview deploys

For translator preview environments, the root loader fetches translations from a CDN at runtime instead of reading from disk.

Set the `TRANSLATIONS_CDN` env var to the base URL where translation JSONs are hosted:

```
TRANSLATIONS_CDN=https://cdn.example.com/translations
```

Translators can then swap languages via query param:

```
https://preview.example.com/?lang=fr
https://preview.example.com/about?lang=de
```

When `?lang=` is set, the loader resolves in order: CDN (if `TRANSLATIONS_CDN` is configured), then the bundle, then falls back to English. Schema validation is skipped for CDN fetches so translators can preview incomplete translations.

When no `?lang=` param is present, English is loaded from the bundle.

## `locale.basePath` — subpath deployments

For sites that need a language under a subpath (e.g. `ca.example.com/fr`), set `basePath` in the locale:

```json
{ "locale": { "lang": "fr", "dir": "ltr", "basePath": "/fr" } }
```

This sets React Router's `basename`, so all `<Link>` and prerendered output will be prefixed automatically. Defaults to `"/"` when omitted.

## Route meta

Use `loaderData` in the `meta` export for translated page metadata:

```tsx
import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  const t = loaderData.translation;
  return [
    { title: t.home.meta.title },
    { name: "description", content: t.home.meta.description },
  ];
}
```

## Conditional routes for static builds

Static builds use `ssr: false`, which validates all registered routes — any route with `action` or server-only exports will fail the build even if it wouldn't be reached. Use conditional routes in `routes.ts` to only register safe routes during static builds:

```ts
// routes.ts
// process.env directly — routes.ts runs at Vite config time, not in the app server
const isStaticBuild = !!process.env.BUILD_LANG;

const staticRoutes: RouteConfig = [
  index("routes/home/page.tsx"),
  route("not-found", "routes/not-found.tsx"),
];

const routes: RouteConfig = isStaticBuild
  ? staticRoutes
  : [
      ...staticRoutes,
      route("*", "routes/catchall.tsx"),
      // ... other SSR-only routes
    ];

export default routes;
```

## Files

```
lib/static-i18n/
  schema.ts           # Valibot schema (customize per project)
  config.ts           # React Router config helper (static build vs preview deploy)
  loader.server.ts    # Translation loader (disk at build time, CDN at runtime)
  context.tsx         # TranslationProvider + useTranslation hook
  build.ts            # Build orchestrator (validate + parallel builds + zip)
  translations/       # Default translations folder (configurable via TRANSLATIONS_DIR)
  README.md
```
