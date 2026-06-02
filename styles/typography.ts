import type { Typography } from "@novus/styling";
import { serverMono } from "./fonts.ts";

export const typography = {
  "test-mono": {
    font: serverMono,
    "font-style": "normal",
    "font-weight": 400,
    "line-height": "90%",
    "letter-spacing": "0em",
    "font-size": { mobile: 20, desktop: 24 },
  },
} as const satisfies Typography;
