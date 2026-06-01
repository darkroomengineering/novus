import { initVips } from "./process.ts";

/**
 * Generate an inline SVG LQIP (Low Quality Image Placeholder) as a data URI.
 * Returns a "data:image/svg+xml;base64,..." string suitable for use as a
 * CSS background-image value.
 */
export async function generateInlineLqip(
  bytes: Uint8Array,
  origWidth: number,
  origHeight: number,
): Promise<string> {
  const vips = await initVips();
  const img = vips.Image.newFromBuffer(bytes);
  const tiny = img.thumbnailImage(16);

  try {
    // Always encode as PNG for LQIP (handles alpha, ~200B at 16px)
    const tinyPngBytes = tiny.writeToBuffer(".png");
    const tinyB64 = Buffer.from(tinyPngBytes).toString("base64");
    const tinyDataUri = `data:image/png;base64,${tinyB64}`;

    // Build SVG with feGaussianBlur filter
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
      ` viewBox="0 0 ${origWidth} ${origHeight}">`,
      `<filter id="b"><feGaussianBlur stdDeviation="20" /></filter>`,
      `<image`,
      ` x="0" y="0"`,
      ` width="${origWidth}" height="${origHeight}"`,
      ` filter="url(#b)"`,
      ` preserveAspectRatio="none"`,
      ` href="${tinyDataUri}"`,
      `/>`,
      `</svg>`,
    ].join("");

    const svgB64 = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${svgB64}`;
  } finally {
    img.delete();
    tiny.delete();
  }
}
