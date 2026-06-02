import { animate, createTimeline } from "animejs";
import { useLenis } from "lenis/react";
import { useLayoutEffect, useRef } from "react";
import { ProgressText } from "~/components/progress-text";
import { Wrapper } from "~/components/wrapper";
import { usePageTransition } from "@novus/transitions";
import { PALETTES, useShaderStore } from "../store";
import s from "./about/about.module.css";
import type { Route } from "./+types/about";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "About — Satus" },
    { name: "description", content: "About Darkroom Engineering" },
  ];
}

const TEXT_1 =
  "Darkroom Engineering builds digital experiences for brands that demand excellence. We are a studio of designers and engineers working at the intersection of technology and craft.";

const TEXT_2 =
  "Satus is our foundation. Every project starts here. It encodes our opinions about performance, animation, and developer experience into a starter that gets out of your way.";

export default function About() {
  const setTargetPalette = useShaderStore((s) => s.setTargetPalette);
  const pageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const lenis = useLenis();

  useLayoutEffect(() => {
    setTargetPalette(PALETTES.about);
  }, [setTargetPalette]);

  usePageTransition({
    initial: () => {
      animate(pageRef.current!, { opacity: 0, y: 50, duration: 0 });
      animate(titleRef.current!, { opacity: 0, y: 80, duration: 0 });
    },
    exit: ({ done, enter, ctx }) => {
      // Share the title's position with the entering page via ctx
      ctx.titleRect = titleRef.current!.getBoundingClientRect();

      const runExit = () => {
        const tl = createTimeline({ onComplete: done });
        tl.call(() => enter(), 150);
        tl.add(titleRef.current!, { opacity: 0, y: -30, duration: 400, ease: "inCubic" }, 0);
        tl.add(pageRef.current!, { opacity: 0, duration: 400, ease: "inCubic" }, 0);
        return tl;
      };

      if (lenis && lenis.scroll > 0) {
        let tl: ReturnType<typeof createTimeline> | undefined;
        lenis.scrollTo(0, {
          onComplete: () => {
            tl = runExit();
          },
        });
        return () => tl?.revert();
      }

      const tl = runExit();
      return () => tl.revert();
    },
    enter: ({ done }) => {
      const tl = createTimeline({ onComplete: done });
      tl.add(pageRef.current!, { opacity: 1, y: 0, duration: 400, ease: "outCubic" }, 0);
      tl.add(titleRef.current!, { opacity: 1, y: 0, duration: 400, ease: "outCubic" }, 0);
      return () => tl.revert();
    },
  });

  return (
    <Wrapper lenis={false}>
      <div ref={pageRef} className={s.page}>
        <section className={s.heroSection}>
          <h1 ref={titleRef} className={s.title}>
            About
          </h1>
        </section>

        <section className={s.textSection}>
          <ProgressText className={s.bodyText ?? ""} start="top bottom" end="center center">
            {TEXT_1}
          </ProgressText>
        </section>

        <section className={s.textSection}>
          <ProgressText className={s.bodyText ?? ""} start="top bottom" end="center center">
            {TEXT_2}
          </ProgressText>
        </section>
      </div>
    </Wrapper>
  );
}
