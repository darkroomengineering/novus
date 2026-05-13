import type { loadQuery } from "@sanity/react-loader";
import { createCookieSessionStorage } from "react-router";
import { env } from "~/env";

function getSecrets(): [string] {
  if (env.SANITY_SESSION_SECRET) return [env.SANITY_SESSION_SECRET];

  if (env.NODE_ENV === "production") {
    throw new Error(
      "SANITY_SESSION_SECRET is required in production. Generate with: openssl rand -hex 32",
    );
  }

  // Dev-only fallback — stable across module reloads, never used in production.
  return ["dev-only-insecure-sanity-secret"];
}

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    httpOnly: true,
    name: "__sanity_preview",
    path: "/",
    // "lax" is correct unless Sanity Studio runs on a different origin and
    // needs to send cookies on cross-origin POSTs. Switch to "none" + secure
    // only when documented in the project README.
    sameSite: "lax",
    secrets: getSecrets(),
    secure: env.NODE_ENV === "production",
  },
});

export async function getPreviewData(request: Request): Promise<{
  preview: boolean;
  options: Parameters<typeof loadQuery>[2];
}> {
  const session = await getSession(request.headers.get("Cookie"));
  const preview = session.get("previewMode");
  const perspective = session.get("perspective");

  return {
    preview,
    options: preview
      ? {
          perspective: typeof perspective === "string" ? perspective.split(",") : "drafts",
          stega: true,
        }
      : {
          perspective: "published",
          stega: false,
        },
  };
}

export { commitSession, destroySession, getSession };
