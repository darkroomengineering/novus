import type { Route } from "./+types/home";
import { useQuery } from "@sanity/react-loader";
import { loadQuery } from "#/integrations/sanity/loader.server";
import { useMemo, useRef } from "react";
import { usePresenceAnimation } from "#/hooks/use-presence-animation";
import { defineQuery } from "groq";
import { createTimeline } from "#/integrations/motion";
import { useAnimate } from "motion/react";
import { animate } from "motion";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.data?.title || "New React Router App";
  const description = loaderData?.data?.description || "Welcome to React Router!";
  
  return [
    { title },
    { name: "description", content: description },
  ];
}


const HOME_QUERY = defineQuery("*[_type == 'home'][0]")

export async function loader({ context }: Route.LoaderArgs) {
  const data = await loadQuery({
    query: HOME_QUERY,
    context,
  });
  return data;
}


export default function Home({ loaderData }: Route.ComponentProps) {
  // NOTE: When animating and keeping a page mounted, the loaderData will get undefined.
  const memoizedLoaderData = useMemo(() => loaderData, [])
  const { data, encodeDataAttribute } = useQuery(
    HOME_QUERY,
    {},
    { initial: memoizedLoaderData }
  );
  
  usePresenceAnimation({
    enter: () => {
      const animation = animate('#root', {
        opacity: [0, 1],
      }, {duration: 1, ease: "easeInOut"})

      return () => animation.cancel()
    },
    exit: (safeToRemove) => {
      
      const tl = createTimeline();
      tl.add("#root", {position: "absolute", left: 0, width: "100%"}, {duration: 0})
      tl.add('#root', {
          opacity: [1, 0],
        }, {
          duration: 1,
          ease: "easeInOut",
          onComplete: safeToRemove
        })

        const animation = animate(tl.sequence)

        return () => animation.cancel()
    }
  })

  return (
    <div id="root" className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        <header className="text-center mb-12">
          <h1 
            className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            data-sanity={encodeDataAttribute(["title"])}
          >
            {data?.title}
          </h1>
            <p 
              className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto"
              data-sanity={encodeDataAttribute(["description"])}
            >
              {data?.description}
            </p>
        </header>
        
        <main className="bg-white rounded-xl shadow-lg p-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Getting Started
            </h2>
            <p className="text-gray-600 mb-6">
              This is your homepage powered by Sanity CMS. You can edit the title and description 
              above directly in your Sanity Studio, and the changes will appear here in real-time 
              when preview mode is enabled.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Visual Editing</h3>
                <p className="text-blue-700">
                  Click on any content above to edit it directly in Sanity Studio.
                </p>
              </div>
              
              <div className="bg-indigo-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-indigo-800">Preview Mode</h3>
                <p className="text-indigo-700">
                  Enable preview mode to see draft content and use Visual Editing features.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
