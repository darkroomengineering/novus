import { useQuery } from "@sanity/react-loader";
import cn from "clsx";
import { defineQuery } from "groq";
import { animate } from "motion";
import { useMemo } from "react";
import { createTimeline } from "#/integrations/motion/timeline";
import { usePresenceAnimation } from "#/integrations/motion/use-presence-animation";
import { loadQuery } from "#/integrations/sanity/loader.server";
import DarkroomLogo from "~/assets/svgs/darkroom-logo.svg?react";
import type { Route } from "./+types/home";
import s from "./home.module.css";

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
        { position: "absolute", left: "50%", transform: "translateX(-50%)" },
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
        }
      );

      const animation = animate(tl.sequence);
      animation.then(() => {
        safeToRemove();
      });

      return () => animation.cancel();
    },
  });

  return (
    <main className={cn(s.home, "mx-auto flex h-screen flex-col")} id="root">
      <div className="mb-12 bg-contrast text-center">
        <h1 className="mb-6" data-sanity={encodeDataAttribute(["title"])}>
          {data?.title}
        </h1>
        <p
          className="mx-auto max-w-2xl text-gray-700 text-xl leading-relaxed"
          data-sanity={encodeDataAttribute(["description"])}
        >
          {data?.description}
        </p>
      </div>

      <div className="dr-text-22 dr-gap-10 flex flex-1 flex-col justify-center font-replica-mono-ll uppercase leading-none">
        <DarkroomLogo />
        <p>
          devs who care about..................................KERNING
          <br />
          designers...........................................who code
        </p>
        <div className={cn(s.lines, "dr-h-140 w-full")} />
        <p>open source philosophy.........................©DRKRM-002025</p>
      </div>
    </main>
  );
}
