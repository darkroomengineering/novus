import * as v from "valibot";
import type { Translation } from "./schema";
import { TranslationSchema } from "./schema";

/**
 * Translations bundled via import.meta.glob — no filesystem access at runtime.
 * Vite resolves these at build time so they work on serverless (Vercel, etc).
 *
 * If your project moves translations to a different directory, update the
 * glob pattern here to match (e.g. "../../translations/*.json").
 */
const translationModules = import.meta.glob<Translation>("./translations/*.json", {
  eager: true,
  import: "default",
});

/**
 * Load a translation JSON for the current language.
 *
 * Resolution order:
 * 1. `BUILD_LANG` env var (static builds via build.ts)
 *    → from bundled translations
 * 2. `?lang=` query param (preview deploys)
 *    → CDN if `TRANSLATIONS_CDN` is set, else bundle, else falls back to "en"
 * 3. No `?lang=` param → English from bundle (the base translation)
 */
export async function loadTranslation(request: Request): Promise<Translation> {
  const buildLang = process.env.BUILD_LANG;

  if (buildLang) {
    return getFromBundle(buildLang);
  }

  const url = new URL(request.url);
  const lang = url.searchParams.get("lang");

  if (lang) {
    const cdnBase = process.env.TRANSLATIONS_CDN;

    if (cdnBase) {
      return loadFromCDN(cdnBase, lang);
    }

    // No CDN configured — try loading from bundle
    const bundled = tryGetFromBundle(lang);
    if (bundled) return bundled;
  }

  return getFromBundle("en");
}

/**
 * Get a translation from the bundled glob modules.
 */
function getFromBundle(lang: string): Translation {
  const key = `./translations/${lang}.json`;
  const translation = translationModules[key];

  if (!translation) {
    const available = Object.keys(translationModules)
      .map((k) => k.replace("./translations/", "").replace(".json", ""))
      .join(", ");
    throw new Error(
      `Translation "${lang}" not found in bundle. Available: ${available}`,
    );
  }

  return v.parse(TranslationSchema, translation);
}

/**
 * Try getting a translation from the bundle, returning null if not found.
 */
function tryGetFromBundle(lang: string): Translation | null {
  const key = `./translations/${lang}.json`;
  return translationModules[key] ?? null;
}

/**
 * Fetch translation JSON from a CDN (preview deploys).
 *
 * No schema validation — translators may be testing incomplete JSONs.
 */
async function loadFromCDN(cdnBase: string, lang: string): Promise<Translation> {
  const url = `${cdnBase.replace(/\/$/, "")}/${lang}.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch translation for "${lang}" from ${url} (${response.status})`);
  }

  return (await response.json()) as Translation;
}
