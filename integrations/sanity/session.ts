import type { loadQuery } from "@sanity/react-loader";
import { createCookieSessionStorage } from "react-router";
import { env } from "~/env";

if (!env.SANITY_SESSION_SECRET) {
  throw new Error(
    "SANITY_SESSION_SECRET is required to use Sanity preview mode. Generate with: openssl rand -hex 32",
  );
}

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    httpOnly: true,
    name: "__sanity_preview",
    path: "/",
    // "lax" assumes Studio is same-origin (e.g. mounted at /studio). If Studio
    // is hosted on a separate domain and posts preview cookies cross-origin,
    // switch to `sameSite: "none"` (which requires `secure: true`).
    sameSite: "lax",
    secrets: [env.SANITY_SESSION_SECRET],
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
