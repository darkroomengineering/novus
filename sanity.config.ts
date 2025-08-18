import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";

import { structure, defaultDocumentNode } from "./sanity/structur";
import { schemas } from "./sanity/schemas";

export default defineConfig({
  name: "default",
  title: "Novus",
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID!,
  dataset: import.meta.env.VITE_SANITY_DATASET!,
  basePath: "/studio",
  plugins: [
    structureTool({structure, defaultDocumentNode}),
    presentationTool({
      previewUrl: {
        origin: import.meta.env.SANITY_STUDIO_PREVIEW_ORIGIN || "http://localhost:5173",
        preview: "/",
        previewMode: {
          enable: "/api/preview-mode/enable",
          disable: "/api/preview-mode/disable",
        },
      },
    }),
    visionTool(),
    // Add your other plugins here
  ],
  schema: {
    types: schemas,
  },
});
