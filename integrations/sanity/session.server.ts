import { createCookieSessionStorage } from "react-router";
import { env } from "#/lib/env";

export const PREVIEW_SESSION_NAME = "__sanity_preview";

// This is the session storage for the sanity preview
const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      httpOnly: true,
      name: PREVIEW_SESSION_NAME,
      secrets: [env.SANITY_SESSION_SECRET],
      sameSite: import.meta.env.DEV ? "lax" : "none",
      secure: !import.meta.env.DEV,
    },
  });

export { commitSession, destroySession, getSession };
