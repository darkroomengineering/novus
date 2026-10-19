---
paths:
  - "app/**/*.{ts,tsx}"
  - "example/**/*.{ts,tsx}"
  - "components/**/*.tsx"
  - "react-router.config.ts"
---

# React Router

React Router 7 rules that CLAUDE.md does not carry. CLAUDE.md owns the path alias, `Wrapper`, loaders for server data, and lazy loading.

`react-router.config.ts` sets `appDirectory` to `example/` by default. Routes are declared in `routes.ts` of the active app directory, not discovered from file names.

## Data and rendering

- Prefer loaders to component-level fetching for anything that could block first paint. Split independent fetches across nested routes (they load in parallel) or `Promise.all` them inside one loader.
- Client-side fetching is for post-mount state (autocomplete, polling, mutations). Data the user sees on first paint comes from a loader.
- Stream slow data by returning unresolved promises from a loader and reading them with `<Await>` inside `<Suspense>`.
- Components are isomorphic: there is no `'use client'` boundary to police, but the loader-versus-effect split has the same shape.
- Cache headers go on the route through the `headers` export, not a config file.
- Show markup per breakpoint with the `desktop-only` / `mobile-only` classes, never `useMediaQuery`. They need no JavaScript and match the server render; the hook has no value until mount.

## Next.js equivalents

| Next.js                                     | React Router 7                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `next/script`                               | Plain `<script>` in `<head>` via the `links()` route export, or `root.tsx` |
| Server Components (`'use client'` boundary) | Loaders run on the server; components are isomorphic                       |
| Server Actions (`'use server'`)             | `action()` route export                                                    |
| `app/layout.tsx`                            | `root.tsx` and nested route layouts                                        |
| `app/page.tsx`                              | A route module registered in `routes.ts`                                   |
| `generateMetadata`                          | `meta()` route export                                                      |
| `generateStaticParams`                      | Pre-render config in `react-router.config.ts`                              |
| `revalidatePath` / `revalidateTag`          | Redirect after an action, or `useRevalidator()`                            |
| `images.remotePatterns` in Next config      | Edge or server CSP and CORS config                                         |
