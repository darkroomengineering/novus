import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { type FontlessOptions, fontless } from "fontless";
import { composeVisitors } from "lightningcss";
import { defineConfig } from "vite";
import svgr, { type VitePluginSvgrOptions } from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

import { lightningcssFunctions } from "./styles/scripts/vite/lightningcss-functions";
import { prependCss } from "./styles/scripts/vite/prepend-css";
import { watchStyles } from "./styles/scripts/vite/watch-styles";
import { fonts } from "./styles/typography";

// Font Optimisation Config
const fontlessConfig: FontlessOptions = {
  families: Object.values(fonts),
  providers: {
    adobe: false,
    bunny: false,
    googleicons: false,
  },
  assets: {},
};

// SVG Optimisation Config
const svgrConfig: VitePluginSvgrOptions = {
  svgrOptions: {
    memo: true,
    dimensions: false,
    plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
    svgo: true,
    svgoConfig: {
      multipass: true,
      plugins: [
        "removeDimensions",
        "removeOffCanvasPaths",
        "reusePaths",
        "removeEmptyAttrs",
        "removeStyleElement",
        "removeScriptElement",
        "prefixIds",
        "cleanupIds",
        {
          name: "cleanupNumericValues",
          params: {
            floatPrecision: 1,
          },
        },
        {
          name: "convertPathData",
          params: {
            floatPrecision: 1,
          },
        },
        {
          name: "convertTransform",
          params: {
            floatPrecision: 1,
          },
        },
        {
          name: "cleanupListOfValues",
          params: {
            floatPrecision: 1,
          },
        },
      ],
    },
  },
};

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    svgr(svgrConfig),
    fontless(fontlessConfig),
    watchStyles(),
    prependCss("./styles/css/generated/media.css"),
  ],
  envPrefix: "PUBLIC_",
  css: {
    transformer: "lightningcss",
    lightningcss: {
      cssModules: true,
      drafts: {
        customMedia: true,
      },
      visitor: composeVisitors([lightningcssFunctions()]),
    },
  },
  build: {
    cssMinify: "lightningcss",
  },
});
