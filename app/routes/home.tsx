import type { Route } from "./+types/home";
import type { Home } from "~/sanity/types/sanity.types";
import { useQuery } from "@sanity/react-loader";
import { loadQuery } from "~/sanity/loader";
import { previewContext } from "~/sanity/preview";
import { homeQuery } from "~/sanity/queries";

export async function loader({ request }: Route.LoaderArgs) {
  const { options } = await previewContext(request.headers);
  const data = await loadQuery(homeQuery, {}, options);
  return data;
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.data?.title || "New React Router App";
  const description = loaderData?.data?.description || "Welcome to React Router!";
  
  return [
    { title },
    { name: "description", content: description },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { data, encodeDataAttribute } = useQuery(
    homeQuery,
    {},
    { initial: loaderData }
  );

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Welcome to React Router!</h1>
        <p className="text-lg text-gray-600">
          No homepage content found. Please create a "home" document in your Sanity Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        <header className="text-center mb-12">
          <h1 
            className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            data-sanity={encodeDataAttribute(["title"])}
          >
            {data.title}
          </h1>
            <p 
              className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto"
              data-sanity={encodeDataAttribute(["description"])}
            >
              {data.description}
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
