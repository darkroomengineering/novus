export type ImageType = "png" | "jpeg" | "webp" | "avif";
export type ImageTypeAuto = "auto";

export interface Lqip {
  class?: string | (() => string);
  attribute?: string;
  inlineStyles?: Record<string, string> | (() => Record<string, string>);
}

export interface ImageData {
  imageTypes: ImageType[] | ImageTypeAuto;
  availableWidths?: number[];
  aspectRatio?: number;
  imageUrlFor(width: number, type?: ImageType): string | undefined;
  lqip?: Lqip;
}

export interface ImageOptimizerOptions {
  /** Output widths in pixels. Default: [640, 750, 828, 1080, 1200, 1920, 2048, 3840] */
  widths?: number[];
  /** Output formats. `original` preserves input format (jpeg/png). Default: ['avif', 'webp', 'original'] */
  formats?: Array<"avif" | "webp" | "original">;
  /** Per-format quality 1–100. Defaults: webp 80, avif 60, jpeg 85 */
  quality?: { webp?: number; avif?: number; jpeg?: number };
  /** LQIP strategy. `inline` = blurred SVG data URI. `false` = none. Default: 'inline' */
  lqip?: "inline" | false;
  /** AVIF encoder effort 0–9. Higher = smaller + slower. Default: 4 */
  avifEffort?: number;
}
