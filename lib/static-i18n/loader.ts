import * as v from "valibot";
import type { Translation } from "./schema";
import { TranslationSchema } from "./schema";

/**
 * Load a translation JSON for the current language.
 *
 * Resolution order:
 * 1. `BUILD_LANG` env var (static builds via build.ts)
 *    → reads from `TRANSLATIONS_DIR` on disk, validated against schema
 * 2. `?lang=` query param (preview deploys)
 *    → fetches from `TRANSLATIONS_CDN` URL, no validation
 * 3. No `?lang=` param → reads English from disk (the base translation)
 */
export async function loadTranslation(request: Request): Promise<Translation> {
  const buildLang = process.env.BUILD_LANG;

  if (buildLang) {
    return loadFromDisk(buildLang);
  }

  const url = new URL(request.url);
  const lang = url.searchParams.get("lang");

  if (lang) {
    return loadFromCDN(lang);
  }

  return loadFromDisk("en");
}

/**
 * Read translation JSON from the local file system.
 */
async function loadFromDisk(lang: string): Promise<Translation> {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  const dir = process.env.TRANSLATIONS_DIR || join(process.cwd(), "lib/static-i18n/translations");
  const filePath = join(dir, `${lang}.json`);

  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  return v.parse(TranslationSchema, raw);
}

/**
 * Fetch translation JSON from a CDN (preview deploys).
 *
 * No schema validation — translators may be testing incomplete JSONs.
 */
async function loadFromCDN(lang: string): Promise<Translation> {
  const cdnBase = process.env.TRANSLATIONS_CDN;

  if (!cdnBase) {
    throw new Error(
      "TRANSLATIONS_CDN env var is required for runtime translation loading. " +
        "Set it to the base URL where translation JSONs are hosted (e.g. https://cdn.example.com/translations).",
    );
  }

  const url = `${cdnBase.replace(/\/$/, "")}/${lang}.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch translation for "${lang}" from ${url} (${response.status})`);
  }

  return (await response.json()) as Translation;
}
