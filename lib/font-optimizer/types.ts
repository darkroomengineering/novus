export type SubsetPreset =
  | "latin"
  | "latin-ext"
  | "cyrillic"
  | "cyrillic-ext"
  | "greek"
  | "greek-ext"
  | "vietnamese";

export type SubsetConfig =
  | SubsetPreset
  | { unicodeRange: string }
  | { chars: string };

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
}

export interface ResolvedFontSrc extends FontSrc {
  url: string;
}

export interface ResolvedFont extends FontDefinition {
  resolvedUrl: string | ResolvedFontSrc[];
}
