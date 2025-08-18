import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";

export default defineConfig({
  name: "default",
  title: "Your Project Name",
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.PUBLIC_SANITY_DATASET!,
  basePath: "/studio",
  plugins: [
    presentationTool({
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_ORIGIN || "http://localhost:5173",
        preview: "/",
        previewMode: {
          enable: "/api/preview-mode/enable",
          disable: "/api/preview-mode/disable",
        },
      },
    }),
    // Add your other plugins here
  ],
  schema: {
    types: [
      // Define your schema types here
    ],
  },
});
