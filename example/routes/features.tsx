import { animate, createTimeline } from "animejs";
import { useLenis } from "lenis/react";
import { useLayoutEffect, useRef } from "react";
import { Wrapper } from "~/components/wrapper";
import { usePageTransition } from "~/lib/transitions";
import { PALETTES, useShaderStore } from "../store";
import s from "./features/features.module.css";
import type { Route } from "./+types/features";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Features — Satus" }, { name: "description", content: "What Satus gives you" }];
}

const FEATURES = [
  {
    title: "Page Transitions",
    desc: "Overlap mode with anime.js choreography. Exit, enter, crossfade — all orchestrated.",
  },
  {
    title: "WebGL Canvas",
    desc: "Persistent global canvas with tunnels. Flowmap and fluid sim built in.",
  },
  {
    title: "Scroll Animations",
    desc: "Fold sections, progress text, scroll triggers. All hooked to Lenis.",
  },
  {
    title: "Design System",
    desc: "Themes, responsive tokens, generated CSS custom properties.",
  },
  {
    title: "Performance",
    desc: "React Compiler. Tempus RAF. Lazy loading. Code splitting. Zero overhead.",
  },
  {
    title: "Developer Tools",
    desc: "Orchestra debug panel. Theatre.js integration. Grid overlay. Stats.",
  },
] as const;

export default function Features() {
  const setTargetPalette = useShaderStore((s) => s.setTargetPalette);
  const pageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const lenis = useLenis();

  useLayoutEffect(() => {
    setTargetPalette(PALETTES.features);
  }, [setTargetPalette]);

  usePageTransition({
    initial: () => {
      animate(pageRef.current!, { opacity: 0, y: 30, duration: 0 });
      animate(titleRef.current!, { opacity: 0, y: 30, duration: 0 });
    },
    exit: ({ done, enter }) => {
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
    enter: ({ done, ctx }) => {
      // ctx.titleRect is set by the about page's exit — log it to show shared context working
      if (ctx.titleRect) {
        console.log("[Features] Received title rect from previous page:", ctx.titleRect);
      }

      const tl = createTimeline({ onComplete: done });
      tl.add(pageRef.current!, { opacity: 1, y: 0, duration: 400, ease: "outCubic" }, 0);
      tl.add(titleRef.current!, { opacity: 1, y: 0, duration: 400, ease: "outCubic" }, 0);
      return () => tl.revert();
    },
  });

  return (
    <Wrapper lenis={false}>
      <div ref={pageRef} className={s.page}>
        <h1 ref={titleRef} className={s.title}>
          Features
        </h1>
        <div ref={gridRef} className={s.grid}>
          {FEATURES.map((feature) => (
            <div key={feature.title} className={s.card}>
              <h2 className={s.cardTitle}>{feature.title}</h2>
              <p className={s.cardDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}
