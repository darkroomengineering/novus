import { defineFont } from "./scripts/css.ts";

export const serverMono = defineFont({
  family: "ServerMono",
  src: "/fonts/ServerMono/ServerMono-Regular.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-mono",
  fallback: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
});

/** All font definitions for generation */
export const fonts = [serverMono] as const;

export type Fonts = typeof fonts;
