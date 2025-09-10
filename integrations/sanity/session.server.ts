import { env } from '#/lib/env';
import { createCookieSessionStorage } from 'react-router';

export const PREVIEW_SESSION_NAME = '__sanity_preview'

const {getSession, commitSession, destroySession} = createCookieSessionStorage({
  cookie: {
    httpOnly: true,
    name: PREVIEW_SESSION_NAME,
    secrets: [env.SANITY_SESSION_SECRET],
    sameSite: !import.meta.env.DEV ? "none" : "lax",
    secure: !import.meta.env.DEV,
  },
})

export {commitSession, destroySession, getSession}