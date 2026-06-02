import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Translation } from "./schema";

const TranslationContext = createContext<Translation | null>(null);

export function TranslationProvider({
  value,
  children,
}: {
  value: Translation;
  children: ReactNode;
}) {
  return <TranslationContext value={value}>{children}</TranslationContext>;
}

export function useTranslation(): Translation {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
