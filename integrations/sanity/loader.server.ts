import * as queryStore from '@sanity/react-loader'
import type { SanityQueries } from "@sanity/client";

import {client} from './client'
import {STUDIO_BASEPATH} from '~/sanity/project'
import { env } from '#/lib/env'
import type { AppLoadContext } from 'react-router';
import { sanityContext } from './context';

const clientWithToken = client.withConfig({
  // Token required for when perspective: 'previewDrafts'
  token: env.SANITY_READ_TOKEN,
  // Minimum required stega config
  stega: {studioUrl: STUDIO_BASEPATH},
})

queryStore.setServerClient(clientWithToken)

const {loadQuery} = queryStore

type LoadQueryOptions<Q extends keyof SanityQueries> = {
  query: Q
  params: Parameters<typeof loadQuery>[1]
  context: AppLoadContext
}

function typedLoadQuery<Q extends keyof SanityQueries>({query, params, context}: LoadQueryOptions<Q>) {
  const {options} = context.get(sanityContext)
  return loadQuery<SanityQueries[Q]>(query, params, options);
}

export { typedLoadQuery as loadQuery };