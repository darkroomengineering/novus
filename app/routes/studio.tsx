import type {MetaFunction} from 'react-router'
import {Studio} from 'sanity'

import {Hydrated} from '#/components/hydrated'
import '~/styles/studio.css'

import config from '#/sanity.config'

export const meta: MetaFunction = () => [
  {title: 'Sanity Studio'},
  {name: 'robots', content: 'noindex'},
]

export default function StudioPage() {
  return (
    <Hydrated>
      <Studio
        config={config}
        // To enable guests view-only access to your Studio,
        // uncomment this line!
        // unstable_noAuthBoundary
      />
    </Hydrated>
  )
}