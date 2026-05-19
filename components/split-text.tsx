import { splitText as animeSplitText } from "animejs";
import cn from "clsx";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import s from "./split-text.module.css";

// @refresh reset

interface SplitResult {
  chars: HTMLElement[];
  words: HTMLElement[];
  lines: HTMLElement[];
  revert: () => void;
}

interface SplitTextProps {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
  willAppear?: boolean;
  type?: "lines" | "words" | "chars";
  mask?: boolean;
  /**
   * Mirrors animejs's `splitText.accessible` option. Default `true`:
   * animejs inserts a 1×1 clipped span containing the full original
   * text for screen readers. Set `false` if a parent CSS context
   * (transforms, stacking, clip-path inheritance) defeats the clip and
   * the span renders as a visible duplicate.
   */
  accessible?: boolean;
  /**
   * Only relevant when `type === "lines"`. Default `false` (animejs
   * default) — word wrappers are preserved alongside line wrappers.
   * Set `true` to drop word wrappers so the line wrappers are the only
   * children; useful when animating each line as a single block.
   */
  linesOnly?: boolean;
}

export interface SplitTextRef {
  getNode: () => HTMLElement | null;
  getSplitText: () => SplitResult | null;
  splittedText: SplitResult | null;
}

export function SplitText({
  ref,
  children,
  className,
  as: Tag = "span",
  willAppear = false,
  type = "words",
  mask = true,
  accessible = true,
  linesOnly = false,
}: SplitTextProps & {
  ref?: React.RefObject<SplitTextRef | null> | ((node: SplitTextRef | null) => void);
}) {
  const splitRef = useRef<HTMLDivElement>(null);
  const splittedRef = useRef<SplitResult | null>(null);
  const [splittedText, setSplittedText] = useState<SplitResult | null>(null);

  useEffect(() => {
    function findDeepestElement(element: HTMLElement | null): HTMLElement | null {
      if (!element) return null;

      if (element.children.length !== element.childNodes.length) {
        return element;
      }

      if (element.children.length === 1) {
        return findDeepestElement(element.children[0] as HTMLElement);
      }

      return element as HTMLElement;
    }

    splittedRef.current?.revert();

    const target = findDeepestElement(splitRef.current);
    if (!target) return;

    const splitOptions: Record<
      string,
      | boolean
      | {
          wrap: string;
        }
    > = {
      accessible,
    };
    if (type === "chars" || type === "words") {
      splitOptions.words = mask
        ? {
            wrap: "clip",
          }
        : true;
    }
    if (type === "chars") {
      splitOptions.chars = true;
    }
    if (type === "lines") {
      // animejs defaults `words` to enabled when unspecified, leaving a
      // `<span>` around every word. Callers that animate per-line
      // (single block per line) can opt out via `linesOnly` so the line
      // wrappers are the only children.
      if (linesOnly) splitOptions.words = false;
      splitOptions.lines = mask
        ? {
            wrap: "clip",
          }
        : true;
    }

    const result = animeSplitText(target, splitOptions) as unknown as SplitResult;
    splittedRef.current = result;
    setSplittedText(result);

    return () => {
      result.revert();
    };
  }, [type, mask, accessible, linesOnly]);

  useImperativeHandle(
    ref,
    () => ({
      getSplitText: () => splittedRef.current,
      getNode: () => splitRef.current,
      splittedText,
    }),
    [splittedText],
  );

  return (
    <Tag
      className={cn(s.splitText, className)}
      ref={splitRef}
      style={{
        opacity: willAppear ? 0 : 1,
      }}
    >
      {children}
    </Tag>
  );
}
