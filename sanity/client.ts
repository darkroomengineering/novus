import { createClient } from "@sanity/client";

export const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET,
  apiVersion: "2025-08-18",
  useCdn: true,
  stega: {
    studioUrl: import.meta.env.VITE_SANITY_STUDIO_URL,
  },
});
