import { useContext } from "react";
import type { Translation } from "./schema";
import { TranslationContext } from "./context";

export function useTranslation(): Translation {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
