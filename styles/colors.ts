import type { Colors as ColorsContract, Themes as ThemesContract } from "@novus/styling";

const colors = {
  black: "#000000",
  white: "#ffffff",
  red: "#e30613",
  blue: "#0070f3",
  green: "#00ff88",
  purple: "#7928ca",
  pink: "#ff0080",
} as const satisfies ColorsContract;

const themeNames = ["light", "dark", "red", "evil"] as const;
const colorNames = ["primary", "secondary", "contrast"] as const;

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
  evil: {
    primary: colors.black,
    secondary: colors.red,
    contrast: colors.white,
  },
  red: {
    primary: colors.red,
    secondary: colors.black,
    contrast: colors.white,
  },
} as const satisfies ThemesContract;

export { colors, themeNames, themes };

export type ThemeName = keyof typeof themes;
export type Themes = Record<
  (typeof themeNames)[number],
  Record<(typeof colorNames)[number], string>
>;
