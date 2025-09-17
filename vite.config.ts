import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fontless } from "fontless";
import { composeVisitors } from "lightningcss";
import { defineConfig } from "vite";
// import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";
import { lightningcssFunctions } from "./styles/scripts/vite/lightningcss-functions";
import { prependCss } from "./styles/scripts/vite/prepend-css";
import { watchStyles } from "./styles/scripts/vite/watch-styles";
import { fonts } from "./styles/typography";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    // React Compiler Config
    // babel({
    //   filter: /\.[jt]sx?$/,
    //   babelConfig: {
    //     presets: ["@babel/preset-typescript"],
    //     plugins: ["babel-plugin-react-compiler"],
    //   },
    // }),
    fontless({
      families: Object.values(fonts),
      providers: {
        adobe: false,
        bunny: false,
        googleicons: false,
      },
      assets: {},
    }),
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
