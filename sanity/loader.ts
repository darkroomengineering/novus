import * as serverOnly from "@sanity/react-loader";
import { client } from "./client";
import type { SanityQueries } from "@sanity/client";

const { loadQuery, setServerClient } = serverOnly;

setServerClient(client.withConfig({ token: process.env.SANITY_VIEWER_TOKEN }));

function typedLoadQuery<Q extends keyof SanityQueries>(query: Q, params: Parameters<typeof loadQuery>[1], options: Parameters<typeof loadQuery>[2]) {
  return loadQuery<SanityQueries[Q]>(query, params, options);
}

export { typedLoadQuery as loadQuery };
