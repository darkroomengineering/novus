import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { AnimatePresenceOutlet } from "#/integrations/motion/animate-presence-outlet";
import {
  sanityContext,
  sanityMiddleware,
} from "#/integrations/sanity/sanity.server";
import type { Route } from "./+types/layout";

const SanityLive = lazy(() => import("#/integrations/sanity/components/live"));
const SanityPreview = lazy(
  () => import("#/integrations/sanity/components/preview")
);

export const middleware: Route.MiddlewareFunction[] = [sanityMiddleware];

export function loader({ context }: Route.LoaderArgs) {
  const sanity = context.get(sanityContext);
  return { sanity };
}

export default function RootLayout({ loaderData }: Route.ComponentProps) {
  const { sanity } = loaderData;

  return (
    <>
      <header className="fixed top-0 left-0 flex flex-col">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/other">Other</Link>
      </header>
      <AnimatePresenceOutlet />
      <Suspense fallback={null}>
        {sanity?.preview && <SanityPreview />}
        <SanityLive token={sanity?.token} />
      </Suspense>
    </>
  );
}
