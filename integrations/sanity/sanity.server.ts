import type {
  ClientReturn,
  QueryOptions,
  SanityQueries,
  SyncTag,
} from "@sanity/client";
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
  token?: string;
}>({
  options: { perspective: "published", stega: undefined },
  preview: false,
  token: undefined,
});

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

// Override loadQuery to make it simpler to use
type LoadQueryOptions<Q extends keyof SanityQueries> = {
  query: Q;
  params?: Parameters<typeof serverClient.fetch>[1];
  context: Readonly<RouterContextProvider>;
  request: Request;
};

export async function loadQuery<const QueryString extends keyof SanityQueries>({
  query,
  params = {},
  context,
  request,
}: LoadQueryOptions<QueryString>): Promise<{
  data: ClientReturn<QueryString, unknown>;
  tags?: SyncTag[];
}> {
  const { options } = context.get(sanityContext);
  const lastLiveEventId = getLastLiveEventId(request);

  const { result: data, syncTags: tags } = await serverClient.fetch(
    query,
    params,
    {
      ...options,
      useCdn: options.perspective === "published",
      filterResponse: false,
      lastLiveEventId,
    }
  );
  return { data, tags };
}

function getLastLiveEventId(request: Request) {
  const cookiesHeader = request.headers.get("Cookie");
  const cookiesArray =
    cookiesHeader?.split("; ").map((c) => c.split("=")) ?? [];
  const cookiesRecord = Object.fromEntries(cookiesArray ?? []) as Record<
    string,
    string
  >;
  return cookiesRecord["sanity-live-event"];
}

// ================================
// Middleware to activate preview mode
// ================================
export const sanityMiddleware: MiddlewareFunction<Response> = async ({
  request,
  context,
}) => {
  const previewSession = await getSanitySession(request.headers.get("Cookie"));
  const preview = previewSession.get("projectId") === projectId;

  context.set(sanityContext, {
    preview,
    token: preview ? env.SANITY_VIEWER_TOKEN : undefined,
    options: {
      perspective: preview ? "drafts" : "published",
      stega: preview
        ? { enabled: true, studioUrl: STUDIO_BASEPATH }
        : undefined,
    },
  });
};
