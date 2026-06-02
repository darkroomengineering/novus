import { defineFont } from "@novus/font-optimizer";

export const serverMono = defineFont({
  family: "ServerMono",
  src: "assets/fonts/ServerMono-Regular.otf",
  weight: "400",
  display: "swap",
  variable: "--font-mono",
  fallback: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
  subset: "latin",
});

/** All font definitions for generation */
export const fonts = [serverMono] as const;

export type Fonts = typeof fonts;
