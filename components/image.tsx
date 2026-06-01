import type { ImageData } from "@responsive-image/core";
import { ResponsiveImage } from "@responsive-image/react";
import cn from "clsx";
import type { ComponentProps, CSSProperties } from "react";
import { breakpoints } from "~/styles/layout";
import s from "./image.module.css";

type CommonProps = {
  /** Sizes hint on mobile (drives srcset selection) */
  mobileSize?: `${number}vw`;
  /** Sizes hint on desktop */
  desktopSize?: `${number}vw`;
  /** loading="eager" + fetchpriority="high" for LCP images */
  preload?: boolean;
};

type StringSrcProps = CommonProps &
  Omit<ComponentProps<"img">, "src"> & {
    src: string;
    aspectRatio?: number;
    placeholder?: string;
    widths?: readonly number[];
    variant?: (src: string, width: number) => string;
  };

export type ImageDataSrcProps = CommonProps &
  Omit<ComponentProps<"img">, "src" | "style"> & {
    src: ImageData;
    /** Fixed layout: width in px (renders 1x/2x variants) */
    width?: number;
    /** Fixed layout: height in px */
    height?: number;
    /** Single-value sizes shortcut: 80 → "80vw" */
    size?: number;
  };

export type ImageProps = StringSrcProps | ImageDataSrcProps;

export function Image({ className, ...props }: ImageProps) {
  if (typeof props.src === "string") {
    return <RawImage className={className} {...(props as StringSrcProps)} />;
  }
  return <ResponsiveImageInner className={className} {...(props as ImageDataSrcProps)} />;
}

function isPlaceholderUrl(value: string): boolean {
  return value.startsWith("data:") || value.startsWith("http") || value.startsWith("/");
}

function buildSrcSet(
  src: string,
  widths: readonly number[],
  variant: (src: string, width: number) => string,
): string {
  return widths.map((w) => `${variant(src, w)} ${w}w`).join(", ");
}

function RawImage({
  style,
  className,
  loading,
  fetchPriority,
  decoding,
  alt = "",
  mobileSize = "100vw",
  desktopSize = "100vw",
  sizes,
  src,
  srcSet,
  aspectRatio,
  preload = false,
  placeholder,
  widths,
  variant,
  ...props
}: StringSrcProps) {
  if (!src) return null;

  const finalLoading = loading ?? (preload ? "eager" : "lazy");
  const finalFetchPriority = fetchPriority ?? (preload ? "high" : "auto");
  const finalDecoding = decoding ?? "async";
  const finalSizes = sizes ?? `(max-width: ${breakpoints.dt}px) ${mobileSize}, ${desktopSize}`;
  const finalSrcSet = srcSet ?? (widths && variant ? buildSrcSet(src, widths, variant) : undefined);

  const placeholderStyle: CSSProperties | undefined = placeholder
    ? isPlaceholderUrl(placeholder)
      ? {
          backgroundImage: `url(${placeholder})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }
      : { backgroundColor: placeholder }
    : undefined;

  return (
    <img
      src={src}
      srcSet={finalSrcSet}
      sizes={finalSizes}
      alt={alt}
      loading={finalLoading}
      fetchPriority={finalFetchPriority}
      decoding={finalDecoding}
      style={{
        ...(aspectRatio ? { aspectRatio } : {}),
        ...placeholderStyle,
        ...style,
      }}
      className={cn(s.image, className)}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      {...props}
    />
  );
}

function ResponsiveImageInner({
  className,
  loading,
  fetchPriority,
  decoding,
  alt = "",
  mobileSize = "100vw",
  desktopSize = "100vw",
  sizes,
  size,
  src,
  width,
  height,
  preload = false,
  ...props
}: ImageDataSrcProps) {
  const finalLoading = loading ?? (preload ? "eager" : "lazy");
  const finalFetchPriority = fetchPriority ?? (preload ? "high" : "auto");
  const finalDecoding = decoding ?? "async";

  const isFixed = width !== undefined || height !== undefined;
  const finalSizes =
    sizes ??
    (isFixed
      ? undefined
      : size !== undefined
        ? `${size}vw`
        : `(max-width: ${breakpoints.dt}px) ${mobileSize}, ${desktopSize}`);

  return (
    <ResponsiveImage
      src={src}
      sizes={finalSizes}
      width={width}
      height={height}
      alt={alt}
      loading={finalLoading}
      fetchPriority={finalFetchPriority}
      decoding={finalDecoding}
      className={cn(s.image, className)}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      {...props}
    />
  );
}
