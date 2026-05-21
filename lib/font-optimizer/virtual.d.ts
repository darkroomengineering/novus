declare module "virtual:font-optimizer/fonts.css";

declare module "virtual:font-optimizer/urls" {
  export const fontUrls: Readonly<Record<string, string>>;
  export const fontUrlsBySrc: Readonly<
    Record<string, ReadonlyArray<{ weight: string; style: string; url: string }>>
  >;
}
