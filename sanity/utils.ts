import { client } from "./client";
import type { FilteredResponseQueryOptions } from "@sanity/client";

export function getClient(options?: FilteredResponseQueryOptions) {
  return options ? client.withConfig(options) : client;
}

export async function fetchQuery<T>(
  query: string,
  options?: FilteredResponseQueryOptions
): Promise<T> {
  const sanityClient = getClient(options);
  return sanityClient.fetch<T>(query);
}

export async function fetchQueryWithParams<T>(
  query: string,
  params: Record<string, any>,
  options?: FilteredResponseQueryOptions
): Promise<T> {
  const sanityClient = getClient(options);
  return sanityClient.fetch<T>(query, params);
}
