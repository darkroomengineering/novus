import type {MetaFunction} from 'react-router'
import {Studio} from 'sanity'

import {Hydrated} from '~/components/hydrated'
import '~/app/styles/studio.css'

import config from '~/sanity.config'

export function SanityStudio() {
  return (
    <Studio
      config={config}
      // To enable guests view-only access to your Studio,
      // uncomment this line!
      // unstable_noAuthBoundary
    />
  )
}

export const meta: MetaFunction = () => [
  {title: 'Sanity Studio'},
  {name: 'robots', content: 'noindex'},
]

export default function StudioPage() {
  return (
    <Hydrated>
      <SanityStudio />
    </Hydrated>
  )
}