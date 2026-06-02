import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import browserslist from "browserslist";
import { browserslistToTargets, composeVisitors } from "lightningcss";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import svgr from "vite-plugin-svgr";
import { imageOptimizer } from "@novus/image-optimizer";
import { fontOptimizer } from "@novus/font-optimizer";
import { darkroomStyling, lightningcssFunctions } from "@novus/styling/vite";
import { fonts } from "./styles/fonts.ts";

export default defineConfig({
  define: {
    __INCLUDE_DEV_TOOLS__: "true",
  },
  plugins: [
    fontOptimizer({ fonts: [...fonts] }),
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
    imageOptimizer(),
    darkroomStyling({
      configDir: "styles",
      outDir: "styles/css",
      prependCss: "./styles/css/media.css",
    }),
  ],
  envPrefix: "PUBLIC_",
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    // `@responsive-image/react` ships a CSS side-effect import Node can't
    // resolve; the `@novus/*` workspace packages ship raw `.ts` (resolved via
    // node_modules symlinks, so Vite would otherwise externalize them and hand
    // Node `.ts` it can't run). Both must go through Vite's transform pipeline.
    noExternal: ["@responsive-image/react", /^@novus\//],
  },
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
