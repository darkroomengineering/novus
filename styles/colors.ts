const colors = {
  black: "#000000",
  white: "#ffffff",
  red: "#e30613",
} as const;

const themes = {
  light: {
    primary: colors.white,
    secondary: colors.black,
    contrast: colors.red,
  },
  dark: {
    primary: colors.black,
    secondary: colors.white,
    contrast: colors.red,
  },
  red: {
    primary: colors.red,
    secondary: colors.black,
    contrast: colors.white,
  },
} satisfies Themes;

const themeNames = Object.keys(themes) as (keyof typeof themes)[];

export { colors, themeNames, themes };

// UTIL TYPES
type Themes = Record<string, Record<string, string>>;
