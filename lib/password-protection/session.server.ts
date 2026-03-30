import { createCookieSessionStorage } from "react-router";
import { env } from "~/env";

type SessionData = {
  authenticated: boolean;
};

function getSecrets(): [string] {
  if (env.SESSION_SECRET) return [env.SESSION_SECRET];

  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production when SITE_PASSWORD is set");
  }

  // Dev-only fallback — never used in production
  return ["dev-only-insecure-secret"];
}

let _storage: ReturnType<typeof createCookieSessionStorage<SessionData>> | null = null;

function getStorage() {
  if (!_storage) {
    _storage = createCookieSessionStorage<SessionData>({
      cookie: {
        name: "__site_password",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
        sameSite: "lax",
        secrets: getSecrets(),
        secure: env.NODE_ENV === "production",
      },
    });
  }
  return _storage;
}

export function getSession(...args: Parameters<ReturnType<typeof createCookieSessionStorage<SessionData>>["getSession"]>) {
  return getStorage().getSession(...args);
}

export function commitSession(...args: Parameters<ReturnType<typeof createCookieSessionStorage<SessionData>>["commitSession"]>) {
  return getStorage().commitSession(...args);
}

export function destroySession(...args: Parameters<ReturnType<typeof createCookieSessionStorage<SessionData>>["destroySession"]>) {
  return getStorage().destroySession(...args);
}
