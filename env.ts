// Variable names (not values) are visible in client bundle.
// Split into env.server.ts if variable names are sensitive.
import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

export const env = createEnv({
  clientPrefix: "PUBLIC_",

  client: {
    PUBLIC_BASE_URL: v.optional(v.string()),

    // Sanity
    PUBLIC_SANITY_PROJECT_ID: v.optional(v.string()),
    PUBLIC_SANITY_DATASET: v.optional(v.string()),
    PUBLIC_SANITY_API_VERSION: v.optional(v.string()),
    PUBLIC_SANITY_STUDIO_URL: v.optional(v.string()),

    // HubSpot
    // PUBLIC_HUBSPOT_PORTAL_ID: v.string(),

    // Turnstile
    // PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: v.string(),

    // Analytics
    // PUBLIC_GOOGLE_ANALYTICS: v.string(),
    // PUBLIC_GOOGLE_TAG_MANAGER_ID: v.string(),
  },

  server: {
    NODE_ENV: v.picklist(["development", "production", "test"]),

    // Sanity
    SANITY_API_READ_TOKEN: v.optional(v.string()),

    // Shopify
    // SHOPIFY_STORE_DOMAIN: v.string(),
    // SHOPIFY_STOREFRONT_ACCESS_TOKEN: v.string(),
    // SHOPIFY_REVALIDATION_SECRET: v.string(),

    // HubSpot
    // HUBSPOT_ACCESS_TOKEN: v.string(),

    // Mailchimp
    // MAILCHIMP_API_KEY: v.string(),
    // MAILCHIMP_SERVER_PREFIX: v.string(),
    // MAILCHIMP_AUDIENCE_ID: v.string(),

    // Turnstile
    // CLOUDFLARE_TURNSTILE_SECRET_KEY: v.string(),

    // Static i18n
    TRANSLATIONS_DIR: v.optional(v.string()),
    TRANSLATIONS_CDN: v.optional(v.pipe(v.string(), v.url())),
    // Injected by build.ts — do NOT set in .env
    BUILD_LANG: v.optional(v.string()),
    BUILD_BASENAME: v.optional(v.string()),

    // Password protection (optional)
    SITE_PASSWORD: v.optional(v.string()),
    SESSION_SECRET: v.optional(v.string()),
  },

  runtimeEnv: { ...process.env, ...import.meta.env },
  emptyStringAsUndefined: true,
});
