import { Studio } from "#/integrations/sanity/components/studio";
import type { Route } from "./+types/studio";

export const meta: Route.MetaFunction = () => [
  { title: "Sanity Studio" },
  { name: "robots", content: "noindex" },
];

export default function StudioPage() {
  return <Studio />;
}
