import { visionTool } from "@sanity/vision";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";

// ================================
// Structure Setup
// ================================
const structure = structureTool({
  structure: (S) =>
    S.list()
      .id("root")
      .title("Content")
      .items([
        // Singleton, home page curation
        S.listItem()
          .id("home")
          .schemaType("home")
          .title("Home")
          .child(S.editor().id("home").schemaType("home").documentId("home")),
      ]),
});

// ================================
// Presentation Setup
// ================================
const presentation = presentationTool({
  previewUrl: {
    previewMode: {
      enable: "/api/preview",
    },
  },
});

// ================================
// Vision Setup
// ================================
const vision = visionTool();

// ================================
// Plugins
// ================================
export const plugins = [structure, presentation, vision];
