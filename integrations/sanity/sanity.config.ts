import { defineConfig } from "sanity";

import { plugins } from "~/sanity/plugins";
import {
  apiVersion,
  dataset,
  PROJECT_TITLE,
  projectId,
  STUDIO_BASEPATH,
} from "~/sanity/project";
import { types } from "~/sanity/types";

export default defineConfig({
  name: PROJECT_TITLE.toLowerCase().replace(/ /g, "-"),
  title: PROJECT_TITLE,
  projectId,
  dataset,
  apiVersion,
  basePath: STUDIO_BASEPATH,
  plugins,
  schema: {
    types,
  },
});
