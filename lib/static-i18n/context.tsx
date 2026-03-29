import { createContext } from "react";
import type { ReactNode } from "react";
import type { Translation } from "./schema";

export const TranslationContext = createContext<Translation | null>(null);

export function TranslationProvider({
  value,
  children,
}: {
  value: Translation;
  children: ReactNode;
}) {
  return <TranslationContext value={value}>{children}</TranslationContext>;
}
