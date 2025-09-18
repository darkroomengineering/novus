import { Lenis, useLenis } from "lenis/react";
import type { PropsWithChildren } from "react";
import { useTimelineAnimation } from "#/integrations/motion/use-timeline-animation";

export function ProgressAnimation({ children }: PropsWithChildren) {
  const [scope, animation] = useTimelineAnimation((tl) =>
    tl.add("#progress", {
      rotate: ["0deg", "360deg"],
    })
  );

  useLenis(
    ({ progress }) => {
      animation.time = progress * animation.duration;
    },
    [animation]
  );

  return (
    <div ref={scope}>
      <Lenis root>
        <div className="h-[200vh] bg-contrast" id="progress">
          {children}
        </div>
      </Lenis>
    </div>
  );
}
