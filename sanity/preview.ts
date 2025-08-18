import { createCookieSessionStorage } from "react-router";
import type { loadQuery } from "~/sanity/loader";
import crypto from "node:crypto";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      httpOnly: true,
      name: "__sanity_preview",
      path: "/",
      sameSite: !import.meta.env.DEV ? "none" : "lax",
      secrets: [crypto.randomBytes(16).toString("hex")],
      secure: !import.meta.env.DEV,
    },
  });

async function previewContext(
  headers: Headers
): Promise<{ preview: boolean; options: Parameters<typeof loadQuery>[2] }> {
  const previewSession = await getSession(headers.get("Cookie"));

  const preview =
    previewSession.get("projectId") === import.meta.env.VITE_SANITY_PROJECT_ID;

  return {
    preview,
    options: preview
      ? {
          perspective: "previewDrafts",
          stega: true,
        }
      : {
          perspective: "published",
          stega: false,
        },
  };
}

export { commitSession, destroySession, getSession, previewContext };
