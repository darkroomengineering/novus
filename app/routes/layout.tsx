import { VisualEditing } from "@sanity/visual-editing/react-router";
import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { AnimatePresenceOutlet } from "#/integrations/motion/animate-presence-outlet";
import { sanityContext } from "#/integrations/sanity/context.server";
import { sanityMiddleware } from "#/integrations/sanity/middleware.server";
import type { Route } from "./+types/layout";

const SanityLiveMode = lazy(() =>
  import("#/integrations/sanity/components/live-mode").then((module) => ({
    default: module.SanityLiveMode,
  }))
);
const ExitPreview = lazy(() =>
  import("#/integrations/sanity/components/exit-preview").then((module) => ({
    default: module.ExitPreview,
  }))
);

export const middleware: Route.MiddlewareFunction[] = [sanityMiddleware];

export function loader({ context }: Route.LoaderArgs) {
  const sanity = context.get(sanityContext);
  return {
    sanity,
  };
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
      {sanity?.preview && (
        <Suspense>
          <VisualEditing />
          <SanityLiveMode />
          <ExitPreview />
        </Suspense>
      )}
    </>
  );
}
