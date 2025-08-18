import { createClient } from "@sanity/client";

declare global {
  interface Window {
    ENV: {
      PUBLIC_SANITY_PROJECT_ID: string;
      PUBLIC_SANITY_DATASET: string;
      PUBLIC_SANITY_STUDIO_URL: string;
    };
  }
}

const env = typeof document === "undefined" ? process.env : window.ENV;

export const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET,
  apiVersion: "2024-12-01",
  useCdn: true,
  stega: {
    studioUrl: env.PUBLIC_SANITY_STUDIO_URL,
  },
});
