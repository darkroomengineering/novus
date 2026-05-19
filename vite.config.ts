import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import browserslist from "browserslist";
import { browserslistToTargets, composeVisitors } from "lightningcss";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import svgr from "vite-plugin-svgr";
import { darkroomStyling } from "./styles/scripts/vite/darkroom-styling.ts";
import { lightningcssFunctions } from "./styles/scripts/vite/lightningcss-functions.ts";

export default defineConfig({
  define: {
    __INCLUDE_DEV_TOOLS__: "true",
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    babel({
      include: /\.[jt]sx?$/,
      exclude: /node_modules/,
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    svgr(),
    darkroomStyling(),
  ],
  envPrefix: "PUBLIC_",
  build: {
    // Bundle all CSS into a single file instead of per-route chunks.
    // Prevents React Router's <Links> from removing route stylesheets
    // during page transitions (which breaks exiting page styles).
    cssCodeSplit: false,
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
      // Resolved from the `browserslist` field in package.json. Drives
      // auto-prefixing for properties like backdrop-filter (Safari < 18
      // needs -webkit-).
      targets: browserslistToTargets(browserslist()),
      drafts: {
        customMedia: true,
      },
      visitor: composeVisitors([lightningcssFunctions()]),
    },
  },
});
