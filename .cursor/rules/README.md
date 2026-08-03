# Cursor Rules Documentation

This directory contains Cursor AI rules for the **Novus** project (React
Router 7 starter by darkroom.engineering), organized into 5 focused files.

## File Structure

### 1. `main.mdc` — Project Overview & Cross-Cutting Concerns

Technology stack (React Router 7, React 19, TypeScript, Tailwind v4, Bun),
path alias (`~/`), file organization, critical rules (Wrapper, image/link
components, no manual memoization, `import type`, env pattern).

### 2. `architecture.mdc` — Architecture Patterns & Best Practices

Type safety, state management (React state, Zustand), routing & data loading
(React Router loaders), root layout pattern (`app/root.tsx`), workspace
packages (`packages/*`), security (env validation), code quality, dev workflow.

### 3. `components.mdc` — React Component Patterns & WebGL

Component structure, CSS Modules, props interfaces, lazy loading, the list of
reusable `components/`, and the WebGL system (`webgl/`: Canvas, Tunnel, R3F,
Drei, post-processing).

### 4. `styling.mdc` — CSS Modules, Tailwind CSS v4 & Custom Utilities

CSS Modules conventions, design tokens (`styles/*.ts`), Lightning CSS custom
functions (`mobile-vw()`, `desktop-vw()`, `columns()`), Tailwind v4 basics, and
the generated `dr-*` utility classes from `@novus/styling`.

### 5. `integrations.mdc` — Third-Party Integrations

Sanity CMS only: client setup, env vars (`PUBLIC_SANITY_*`), GROQ queries,
data fetching via loaders, images, SEO, schema conventions. Also notes the
opt-in `lib/` and `packages/*` modules (password-protection, static-i18n,
transitions).

## Quick Reference

- **Start a new feature** → `main.mdc`, then `architecture.mdc`
- **Build a component** → `components.mdc`
- **Add WebGL/Three.js** → `components.mdc` § WebGL Components
- **Style a component** → `styling.mdc`
- **Fetch Sanity content** → `integrations.mdc`
- **State management / routing** → `architecture.mdc`

## Maintenance

- Keep claims verified against the actual codebase, not assumed from other
  darkroom.engineering starters (e.g. `satus`, which is built on a different
  meta-framework — its rules do not apply here).
- Update the "Last updated" date at the bottom of a file when editing it.
- If `packages/*` workspace extraction moves more `lib/` modules, update
  `architecture.mdc` § Workspace Packages and `integrations.mdc` accordingly.

Last updated: 2026-08-03
