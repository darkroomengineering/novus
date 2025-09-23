import { createClient } from "@sanity/client";

import { apiVersion, dataset, projectId } from "~/sanity/project";

// ================================
// Base client
// ================================
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});
