/**
 * SEO component — renders meta tags using React 19's built-in head hoisting.
 *
 * Drop `<SEO>` anywhere in your route component. React 19 automatically
 * hoists `<title>`, `<meta>`, and `<link>` to `<head>`.
 *
 * @example
 * ```tsx
 * export default function Home() {
 *   return (
 *     <Wrapper>
 *       <SEO title="Home — Acme" description="Welcome to Acme." />
 *       <h1>Home</h1>
 *     </Wrapper>
 *   );
 * }
 *
 * // With all options
 * <SEO
 *   title="About — Acme"
 *   description="Learn about Acme."
 *   url="https://acme.com/about"
 *   image="https://acme.com/og.jpg"
 * />
 * ```
 */

interface SEOProps {
  /** Page title (browser tab + search results) */
  title: string;
  /** Meta description (~155 chars, search result snippets) */
  description: string;
  /** Canonical URL — prevents duplicate content */
  url?: string | undefined;
  /** OG image URL (1200x630 recommended) */
  image?: string | undefined;
  /** OG image alt text — defaults to title */
  imageAlt?: string | undefined;
  /** Site name for og:site_name */
  siteName?: string | undefined;
  /** OG type — defaults to "website" */
  type?: "website" | "article" | "product";
  /** Twitter card type — defaults to "summary_large_image" */
  twitterCard?: "summary" | "summary_large_image";
  /** Twitter @handle */
  twitterSite?: string | undefined;
  /** Locale — defaults to "en_US" */
  locale?: string;
  /** Disable indexing for this page */
  noIndex?: boolean | undefined;
  /** React children — additional meta/link elements */
  children?: React.ReactNode;
}

export function SEO({
  title,
  description,
  url,
  image,
  imageAlt,
  siteName,
  type = "website",
  twitterCard = "summary_large_image",
  twitterSite,
  locale = "en_US",
  noIndex = false,
  children,
}: SEOProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={locale} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      {image && imageAlt && <meta property="og:image:alt" content={imageAlt} />}
      {siteName && <meta property="og:site_name" content={siteName} />}

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {image && imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}

      {/* Canonical */}
      {url && <link rel="canonical" href={url} />}

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {children}
    </>
  );
}
