import { SEO } from "~/components/seo";
import { urlForImage } from "./image";

/**
 * Sanity metadata shape — matches the common `metadata` field
 * on page/article documents.
 */
interface SanityMetadata {
  title?: string;
  description?: string;
  image?: { asset?: { _ref: string } };
  noIndex?: boolean;
}

/**
 * Sanity document with optional metadata field.
 */
interface SanityDocument {
  title?: string;
  excerpt?: string;
  metadata?: SanityMetadata;
}

interface SanitySEOProps {
  /** The Sanity document (page, article, etc.) */
  document: SanityDocument;
  /** Base URL for canonical/OG URLs (e.g. "https://acme.com") */
  baseUrl?: string;
  /** Current path (e.g. "/about") */
  path?: string;
  /** Fallback site name */
  siteName?: string;
  /** React children — additional meta/link elements */
  children?: React.ReactNode;
}

/**
 * SEO component that reads from a Sanity document's metadata field.
 *
 * Falls back to `document.title` / `document.excerpt` when metadata
 * fields are missing.
 *
 * @example
 * ```tsx
 * export default function Page({ loaderData }: Route.ComponentProps) {
 *   return (
 *     <Wrapper>
 *       <SanitySEO
 *         document={loaderData.page}
 *         baseUrl="https://acme.com"
 *         path={`/pages/${loaderData.page.slug.current}`}
 *       />
 *       <h1>{loaderData.page.title}</h1>
 *     </Wrapper>
 *   );
 * }
 * ```
 */
export function SanitySEO({ document, baseUrl, path, siteName, children }: SanitySEOProps) {
  const meta = document.metadata;
  const title = meta?.title || document.title || "";
  const description = meta?.description || document.excerpt || "";

  const image = meta?.image?.asset?._ref
    ? urlForImage(meta.image).width(1200).height(630).format("jpg").url()
    : undefined;

  return (
    <SEO
      title={title}
      description={description}
      url={baseUrl && path ? `${baseUrl}${path}` : undefined}
      image={image}
      imageAlt={title}
      siteName={siteName}
      noIndex={meta?.noIndex}
    >
      {children}
    </SEO>
  );
}
