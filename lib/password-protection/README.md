# Password Protection

Simple site-wide password gate using React Router middleware. Renders a password form on any page when not authenticated — no separate route needed.

## Setup

### 1. Enable middleware in `react-router.config.ts`

```ts
export default {
  future: {
    v8_middleware: true,
  },
} satisfies Config;
```

### 2. Export middleware from your `root.tsx`

```ts
import { middleware as passwordMiddleware } from "~/lib/password-protection";
import type { Route } from "./+types/root";

export const middleware: Route.MiddlewareFunction[] = [passwordMiddleware];
```

### 3. Set environment variables

```env
SITE_PASSWORD=your-password-here
SESSION_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
```

That's it. Every page is now gated behind a password form.

### 4. Protect static assets (Vercel)

React Router middleware only runs on route requests — static files in `public/` (images, fonts, etc.) bypass it and are served directly from the CDN.

To protect those too, create `middleware.ts` at the **project root**:

```ts
export { default } from "./lib/password-protection/vercel";
```

> **Note:** Use `./lib/...` (not `~/`) — Vercel bundles this file separately from Vite, so path aliases don't exist.

This Vercel Edge Middleware runs before the CDN serves any file. It checks for the session cookie on static file requests and redirects unauthenticated users to `/` where the React Router middleware shows the password form.

**How the two middlewares work together:**

| Request type | Vercel Edge Middleware | React Router Middleware |
|---|---|---|
| Route (`/about`) | Passes through (not a static file) | Checks session, shows password form |
| Static file (`/logo.png`) | Checks cookie, redirects if missing | Never runs (static files skip RR) |
| After login (any request) | Sees cookie, passes through | Sees session, passes through |

## How it works

- Middleware checks for a signed session cookie on every request
- If not authenticated, returns a password form as raw HTML (no app code loads)
- On correct password, sets a session cookie and redirects to the same URL
- Cookie persists for 1 week
- If `SITE_PASSWORD` is not set, middleware is a no-op — site is open

## Disabling

Remove `SITE_PASSWORD` from your environment variables. The middleware becomes a passthrough.

## Security

- Password comparison uses `crypto.timingSafeEqual` (constant-time)
- Session cookie is signed, `httpOnly`, `sameSite: lax`, `secure` in production
- `SESSION_SECRET` is required in production — throws at startup if missing
- Password form returns `401` with `X-Frame-Options: DENY`
- No app code, loaders, actions, or meta leak to unauthenticated users
- Vercel middleware only checks cookie presence (gatekeeper) — signature verification happens in React Router middleware
- Rate limiting should be handled at the infrastructure layer (Vercel WAF, Cloudflare)

## Files

```
lib/password-protection/
  index.ts              # Barrel export
  middleware.ts         # React Router middleware + password form HTML
  vercel.ts            # Vercel Edge Middleware for static assets
  session.server.ts     # Cookie session storage
  README.md             # This file
```
