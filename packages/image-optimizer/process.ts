import Vips from "wasm-vips";

type VipsModule = Awaited<ReturnType<typeof Vips>>;
// Image instances returned by the wasm-vips API
type VipsImage = ReturnType<VipsModule["Image"]["newFromBuffer"]>;

let vipsInstance: VipsModule | null = null;
let initPromise: Promise<VipsModule> | null = null;

export async function initVips(): Promise<VipsModule> {
  if (vipsInstance) return vipsInstance;
  if (initPromise) return initPromise;

  initPromise = Vips({ dynamicLibraries: ["vips-heif.wasm"] }).then((v) => {
    vipsInstance = v;
    return v;
  });

  return initPromise;
}

export async function getMetadata(
  bytes: Uint8Array,
): Promise<{ width: number; height: number; aspectRatio: number }> {
  const vips = await initVips();
  const img: VipsImage = vips.Image.newFromBuffer(bytes);
  try {
    const width = img.width;
    const height = img.height;
    return { width, height, aspectRatio: width / height };
  } finally {
    img.delete();
  }
}

export async function resizeAndEncode(
  bytes: Uint8Array,
  width: number,
  format: "webp" | "avif" | "jpeg" | "png",
  quality: number,
  avifEffort: number,
): Promise<Uint8Array> {
  const vips = await initVips();
  const img: VipsImage = vips.Image.newFromBuffer(bytes);
  const oriented: VipsImage = img.autorot();
  const resized: VipsImage = oriented.thumbnailImage(width);

  try {
    return encodeImage(vips, resized, format, quality, avifEffort);
  } finally {
    img.delete();
    oriented.delete();
    resized.delete();
  }
}

function encodeImage(
  vips: VipsModule,
  img: VipsImage,
  format: "webp" | "avif" | "jpeg" | "png",
  quality: number,
  avifEffort: number,
): Uint8Array {
  switch (format) {
    case "webp":
      return img.writeToBuffer(".webp", { Q: quality });
    case "avif":
      return img.writeToBuffer(".avif", {
        Q: quality,
        compression: vips.ForeignHeifCompression.av1,
        effort: avifEffort,
      });
    case "jpeg":
      return img.writeToBuffer(".jpg", { Q: quality });
    case "png":
      return img.writeToBuffer(".png");
  }
}
