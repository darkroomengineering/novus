import { Link } from "react-router";
import { AnimationOutlet } from "#/components/animation-outlet";
import {VisualEditing} from '@sanity/visual-editing/react-router'
import { lazy, Suspense } from "react";
import { sanityContext } from "#/integrations/sanity/context.server";
import { sanityMiddleware } from "#/integrations/sanity/middleware.server";
import type { Route } from "./+types/layout";

const SanityLiveMode = lazy(() =>
  import('#/integrations/sanity/components/live-mode').then((module) => ({
    default: module.SanityLiveMode,
  })),
)
const ExitPreview = lazy(() =>
  import('#/integrations/sanity/components/exit-preview').then((module) => ({
    default: module.ExitPreview,
  })),
)


export const unstable_middleware: Route.unstable_MiddlewareFunction[] =
  [sanityMiddleware];

export async function loader({context}: Route.LoaderArgs) {
		const sanity = context.get(sanityContext)
		return {
			sanity,
		}
	}

export default function RootLayout({loaderData}: Route.ComponentProps) {
	const {sanity} = loaderData
	return (
		<>
		<header>
			<Link to="/">Home</Link>
			<Link to="/about">About</Link>
			<Link to="/other">Other</Link>
		</header>
		<AnimationOutlet />
		{sanity?.preview && <Suspense>
			<VisualEditing />
				<SanityLiveMode />
				<ExitPreview />
			</Suspense>}
		</>
	)
}