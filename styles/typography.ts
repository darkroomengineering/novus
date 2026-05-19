import type { CSSProperties } from "react";
import { serverMono } from "./fonts.ts";
import type { FontDefinition } from "./scripts/css.ts";

const typography: TypeStyles = {
  "test-mono": {
    font: serverMono,
    "font-style": "normal",
    "font-weight": 400,
    "line-height": "90%",
    "letter-spacing": "0em",
    "font-size": { mobile: 20, desktop: 24 },
  },
} as const;

export { typography };

export type Typography = TypeStyles;

type TypeStyles = Record<
  string,
  {
    font: FontDefinition;
    "font-style": CSSProperties["fontStyle"];
    "font-weight": CSSProperties["fontWeight"];
    "line-height": `${number}%` | { mobile: `${number}%`; desktop: `${number}%` };
    "letter-spacing": `${number}em` | { mobile: `${number}em`; desktop: `${number}em` };
    "font-feature-settings"?: string;
    "font-size": number | { mobile: number; desktop: number };
  }
>;
