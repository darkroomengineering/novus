import type { FontlessOptions } from "fontless";
import type { CSSProperties } from "react";

const fonts = {
  "replica-mono-ll": {
    name: "Replica Mono LL",
    src: "/fonts/replica-mono-ll-regular.otf",
    weight: "400",
    style: "normal",
  },
} satisfies Fonts;

const typography = {
  "test-replice": {
    "font-family": "var(--font-replica-mono-ll)",
    "font-style": "normal",
    "font-weight": 400,
    "line-height": "90%",
    "letter-spacing": "0em",
    "font-size": { mobile: 20, desktop: 24 },
  },
} satisfies TypeStyles<keyof typeof fonts>;

export { fonts, typography };

// UTIL TYPES
type TypeStyles<N extends string> = Record<
  string,
  {
    "font-family": `var(--font-${N})`;
    "font-style": CSSProperties["fontStyle"];
    "font-weight": CSSProperties["fontWeight"];
    "line-height":
      | `${number}%`
      | { mobile: `${number}%`; desktop: `${number}%` };
    "letter-spacing":
      | `${number}em`
      | { mobile: `${number}em`; desktop: `${number}em` };
    "font-feature-settings"?: string;
    "font-size": number | { mobile: number; desktop: number };
  }
>;

type Fonts = Record<string, NonNullable<FontlessOptions["families"]>[number]>;
