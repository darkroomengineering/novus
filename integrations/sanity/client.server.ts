import {createClient} from '@sanity/client'

import { projectId, dataset, apiVersion } from '~/sanity/project'
import { env } from '#/lib/env'

export const viewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: env.SANITY_VIEWER_TOKEN,
})