import type { QueryOptions, SanityQueries } from "@sanity/client";
import * as queryStore from "@sanity/react-loader";
import {
  createContext,
  createCookieSessionStorage,
  type MiddlewareFunction,
  type RouterContextProvider,
} from "react-router";

import { env } from "#/lib/env";
import { projectId, STUDIO_BASEPATH } from "~/sanity/project";
import { client } from "./client";

// ================================
// Shared Server Context
// ================================
export const sanityContext = createContext<{
  options: Pick<QueryOptions, "perspective" | "stega">;
  preview: boolean;
}>({ options: { perspective: "published", stega: undefined }, preview: false });

// ================================
// Server Session Storage
// ================================
const {
  getSession: getSanitySession,
  commitSession: commitSanitySession,
  destroySession: destroySanitySession,
} = createCookieSessionStorage({
  cookie: {
    httpOnly: true,
    name: "__sanity_preview",
    secrets: [env.SANITY_SESSION_SECRET],
    sameSite: import.meta.env.DEV ? "lax" : "none",
    secure: !import.meta.env.DEV,
  },
});

export { commitSanitySession, destroySanitySession, getSanitySession };

// ================================
// Server Client with Querystore and loader function
// ================================
const serverClient = client.withConfig({
  token: env.SANITY_VIEWER_TOKEN,
  stega: { studioUrl: STUDIO_BASEPATH },
});

queryStore.setServerClient(serverClient);

// Override loadQuery to make it simpler to use
type LoadQueryOptions<Q extends keyof SanityQueries> = {
  query: Q;
  params?: Parameters<typeof queryStore.loadQuery>[1];
  context: Readonly<RouterContextProvider>;
};

export function loadQuery<Q extends keyof SanityQueries>({
  query,
  params = {},
  context,
}: LoadQueryOptions<Q>) {
  const { options } = context.get(sanityContext);
  return queryStore.loadQuery<SanityQueries[Q]>(query, params, options);
}

// ================================
// Middleware to activate preview mode
// ================================
export const sanityMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  const previewSession = await getSanitySession(request.headers.get("Cookie"));
  const preview = previewSession.get("projectId") === projectId;

  context.set(sanityContext, {
    preview,
    options: {
      perspective: preview ? "previewDrafts" : "published",
      stega: preview
        ? { enabled: true, studioUrl: STUDIO_BASEPATH }
        : undefined,
    },
  });
};
