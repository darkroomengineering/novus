import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";

import {
  apiVersion,
  dataset,
  projectId,
  STUDIO_BASEPATH,
} from "~/sanity/project";
import { structure } from "~/sanity/structure";
import { types } from "~/sanity/types";

export default defineConfig({
  name: "novus",
  title: "Novus",
  projectId,
  dataset,
  apiVersion,
  basePath: STUDIO_BASEPATH,
  plugins: [
    structureTool({ structure }),
    presentationTool({
      previewUrl: {
        previewMode: {
          enable: "/api/preview",
        },
      },
    }),
    visionTool(),
  ],
  schema: {
    types,
  },
});
