import type { Route } from "./+types/home";
import type { SanityDocument } from "@sanity/client";
import { useQuery } from "@sanity/react-loader";
import { loadQuery } from "~/sanity/loader";
import { previewContext } from "~/sanity/preview";

const query = `*[_type == "page"][0]{title, description}`;
type Response = SanityDocument<{ title?: string; description?: string }>;

export async function loader({ request }: Route.LoaderArgs) {
  const { options } = await previewContext(request.headers);
  const data = await loadQuery<Response>(query, {}, options);
  return data;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { data, encodeDataAttribute } = useQuery(
    query,
    {},
    { initial: loaderData }
  );

  return (
    <div>
      {data && (
        <div className="max-w-4xl mx-auto p-6">
          <h1 
            className="text-3xl font-bold mb-4"
            data-sanity={encodeDataAttribute(["title"])}
          >
            {data.title || "Welcome to React Router!"}
          </h1>
          {data.description && (
            <p 
              className="text-lg text-gray-600"
              data-sanity={encodeDataAttribute(["description"])}
            >
              {data.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
