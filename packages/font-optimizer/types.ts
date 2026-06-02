export type SubsetPreset =
  | "latin"
  | "latin-ext"
  | "cyrillic"
  | "cyrillic-ext"
  | "greek"
  | "greek-ext"
  | "vietnamese";

export type SubsetConfig = SubsetPreset | { unicodeRange: string } | { chars: string };

export interface FontSrc {
  path: string;
  weight: string;
  style?: string;
}

export interface FontDefinition {
  family: string;
  src: string | FontSrc[];
  weight?: string;
  display?: "swap" | "optional" | "block" | "fallback" | "auto";
  variable: `--font-${string}`;
  fallback?: string;
  subset?: SubsetConfig;
  /** Set to false to skip @font-face and CSS variable generation (e.g. WebGL-only fonts). */
  css?: boolean;
}

export interface ResolvedFontSrc extends FontSrc {
  url: string;
}

export interface ResolvedFont extends FontDefinition {
  resolvedUrl: string | ResolvedFontSrc[];
}
