import type { Route } from "./+types/devtools";

// Fix chrome devtools json call so it doesnt spam the console
export function loader(_: Route.LoaderArgs) {
  return new Response("{}");
}
