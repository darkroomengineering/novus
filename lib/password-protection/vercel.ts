const COOKIE_NAME = "__site_password";

/**
 * Vercel Edge Middleware for password-protecting static assets.
 *
 * React Router middleware only runs on route requests — static files
 * in `public/` bypass it entirely. This middleware runs at the edge
 * before Vercel serves static files, redirecting unauthenticated
 * requests to `/` where the React Router middleware shows the
 * password form.
 *
 * Create `middleware.ts` at the project root:
 *
 * ```ts
 * export { default, config } from "./lib/password-protection/vercel";
 * ```
 */
export default function middleware(request: Request) {
  // Disabled when SITE_PASSWORD is not set
  if (!process.env.SITE_PASSWORD) return;

  const url = new URL(request.url);

  // Only gate static files — route requests are handled by React Router middleware
  if (!isStaticFile(url.pathname)) return;

  // Check for session cookie
  const cookie = request.headers.get("cookie");
  if (cookie?.includes(`${COOKIE_NAME}=`)) return;

  // No cookie → redirect to origin (shows password form)
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
}

function isStaticFile(pathname: string) {
  const segment = pathname.split("/").pop() ?? "";
  return /\.\w{2,10}$/.test(segment);
}
