import { useQuery } from "@sanity/react-loader";
import { defineQuery } from "groq";
import { animate } from "motion";
import { useMemo } from "react";
import { usePresenceAnimation } from "#/hooks/use-presence-animation";
import { createTimeline } from "#/integrations/motion";
import { loadQuery } from "#/integrations/sanity/loader.server";
import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.data?.title || "New React Router App";
  const description =
    loaderData?.data?.description || "Welcome to React Router!";

  return [{ title }, { name: "description", content: description }];
}

const HOME_QUERY = defineQuery("*[_type == 'home'][0]");

export async function loader({ context }: Route.LoaderArgs) {
  const data = await loadQuery({
    query: HOME_QUERY,
    context,
  });
  return data;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  // NOTE: When animating and keeping a page mounted, the loaderData will get undefined.
  // biome-ignore lint/correctness/useExhaustiveDependencies: This is fine
  const memoizedLoaderData = useMemo(() => loaderData, []);
  const { data, encodeDataAttribute } = useQuery(
    HOME_QUERY,
    {},
    { initial: memoizedLoaderData }
  );

  usePresenceAnimation({
    enter: () => {
      const animation = animate(
        "#root",
        {
          opacity: [0, 1],
        },
        { duration: 1, ease: "easeInOut" }
      );

      return () => animation.cancel();
    },
    exit: (safeToRemove) => {
      const tl = createTimeline();
      tl.add(
        "#root",
        { position: "absolute", left: 0, width: "100%" },
        { duration: 0 }
      );
      tl.add(
        "#root",
        {
          opacity: [1, 0],
        },
        {
          duration: 1,
          ease: "easeInOut",
          onComplete: safeToRemove,
        }
      );

      const animation = animate(tl.sequence);

      return () => animation.cancel();
    },
  });

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
      id="root"
    >
      <div className="mx-auto max-w-4xl p-6">
        <header className="mb-12 text-center">
          <h1
            className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text font-bold text-5xl text-transparent"
            data-sanity={encodeDataAttribute(["title"])}
          >
            {data?.title}
          </h1>
          <p
            className="mx-auto max-w-2xl text-gray-700 text-xl leading-relaxed"
            data-sanity={encodeDataAttribute(["description"])}
          >
            {data?.description}
          </p>
        </header>

        <main className="rounded-xl bg-white p-8 shadow-lg">
          <div className="prose prose-lg max-w-none">
            <h2 className="mb-4 font-semibold text-2xl text-gray-800">
              Getting Started
            </h2>
            <p className="mb-6 text-gray-600">
              This is your homepage powered by Sanity CMS. You can edit the
              title and description above directly in your Sanity Studio, and
              the changes will appear here in real-time when preview mode is
              enabled.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-6">
                <h3 className="mb-2 font-semibold text-blue-800 text-lg">
                  Visual Editing
                </h3>
                <p className="text-blue-700">
                  Click on any content above to edit it directly in Sanity
                  Studio.
                </p>
              </div>

              <div className="rounded-lg bg-indigo-50 p-6">
                <h3 className="mb-2 font-semibold text-indigo-800 text-lg">
                  Preview Mode
                </h3>
                <p className="text-indigo-700">
                  Enable preview mode to see draft content and use Visual
                  Editing features.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
