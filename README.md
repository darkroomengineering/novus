# Novus

A React Router starter with React 19, Tailwind CSS v4, and optional WebGL. _Novus_ means "new" in Latin.

## Requirements

| Tool    | Version   |
| ------- | --------- |
| Node.js | >= 22.0.0 |
| Bun     | >= 1.3.5  |

## Quick Start

```bash
bun install
cp .env.example .env.local
bun dev
```

> `bun dev` serves the bundled `example/` marketing site by default. To start your own app, point `appDirectory` at `app/` in `react-router.config.ts` and delete `example/`.

## Tech Stack

| Category  | Technologies                                    |
| --------- | ----------------------------------------------- |
| Framework | React Router 7 (SSR), React 19, TypeScript      |
| Styling   | Tailwind CSS v4, CSS Modules, Lightning CSS     |
| Optional  | React Three Fiber, Anime.js, Theatre.js, Sanity |
| Tooling   | Vite 8, Bun, Oxlint, Oxfmt                      |
| Env       | t3-env, Valibot                                 |

## Project Structure

```
app/                    # React Router routes and layouts
components/             # Reusable UI components
hooks/                  # Custom React hooks
utils/                  # Pure utility functions
styles/                 # Design system, Tailwind config, CSS generation
integrations/           # Third-party services (Sanity)
dev/                    # Debug tools (Orchestra, Theatre.js)
webgl/                  # 3D graphics system (R3F)
packages/               # Workspace packages
  font-optimizer/       # Vite plugin: font subsetting/optimization
  image-optimizer/      # Vite plugin: image processing
  orchestra/            # Dev debug panel (grid, stats, minimap, Theatre.js studio)
  password-protection/  # Site-wide password gate middleware
  static-i18n/          # Static i18n build + loader
  styling/              # darkroom-styling Vite plugin, CSS/design-token codegen
  transitions/          # Page-transition system
```

## Commands

```bash
bun dev              # Dev server
bun run build        # Production build
bun run check        # Lint + format + typecheck
bun run lint         # Oxlint
bun run format       # Oxfmt
bun run typecheck    # TypeScript check
```

## Key Conventions

- **Path alias**: `~/` maps to project root
- **Components**: Use `~/components/image` and `~/components/link`
- **CSS Modules**: Import as `s` → `import s from './component.module.css'`
- **Env vars**: `PUBLIC_` prefix for client, plain for server. Validated with t3-env + Valibot
- **Debug tools**: Toggle with `Ctrl+O` / `Cmd+Shift+O` / `Cmd+.`

## License

MIT — Built by [darkroom.engineering](https://darkroom.engineering)
