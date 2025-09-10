import * as queryStore from '@sanity/react-loader'
import type { SanityQueries } from "@sanity/client";

import {client} from './client'
import {STUDIO_BASEPATH} from '~/sanity/project'
import { env } from '#/lib/env'
import type { unstable_RouterContextProvider } from 'react-router';
import { sanityContext } from './context.server';

// Extend the client-side client with the token and stega config for server-side use
const clientWithToken = client.withConfig({
  token: env.SANITY_VIEWER_TOKEN,
  stega: {studioUrl: STUDIO_BASEPATH},
})

queryStore.setServerClient(clientWithToken)

// Override loadQuery to make it simpler to use
type LoadQueryOptions<Q extends keyof SanityQueries> = {
  query: Q
  params?: Parameters<typeof queryStore.loadQuery>[1]
  context: Readonly<unstable_RouterContextProvider>
}

export function loadQuery<Q extends keyof SanityQueries>({query, params = {}, context}: LoadQueryOptions<Q>) {
  const {options} = context.get(sanityContext)
  return queryStore.loadQuery<SanityQueries[Q]>(query, params, options);
}