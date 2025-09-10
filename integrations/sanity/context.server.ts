import { unstable_createContext } from "react-router";
import type { QueryOptions } from "@sanity/client";

// This creates the server side context to share data between middleware, loaders and actions
export const sanityContext =
  unstable_createContext<{options: Pick<QueryOptions, 'perspective' | 'stega'>, preview: boolean}>({options: {perspective: 'published', stega: undefined}, preview: false});