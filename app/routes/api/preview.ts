import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {type ActionFunction, data, redirect} from 'react-router'

import {client} from '#/integrations/sanity/client'
import {commitSession, destroySession, getSession} from '#/integrations/sanity/session.server'

import type {Route} from './+types/preview'
import { env } from '#/lib/env'

// A `POST` request to this route will exit preview mode
export const action: ActionFunction = async ({request}) => {
  if (request.method !== 'POST') {
    return data({message: 'Method not allowed'}, 405)
  }

  const session = await getSession(request.headers.get('Cookie'))

  return redirect('/', {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  })
}

// A `GET` request to this route will enter preview mode
export const loader = async ({request}: Route.LoaderArgs) => {
  if (!env.SANITY_VIEWER_TOKEN) {
    throw new Response('Preview mode missing token', {status: 401})
  }

  const clientWithToken = client.withConfig({
    token: env.SANITY_VIEWER_TOKEN,
  })

	console.log(request.url)

  const {isValid, redirectTo = '/'} = await validatePreviewUrl(
    clientWithToken,
    request.url,
  )

  if (!isValid) {
    throw new Response('Invalid secret', {status: 401})
  }

  const session = await getSession(request.headers.get('Cookie'))
  session.set('projectId', client.config().projectId)

	console.log("set cookie")

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  })
}