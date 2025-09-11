import { Lenis, useLenis } from "lenis/react";
import type { PropsWithChildren } from "react";
import { useTimelineAnimation } from "#/integrations/motion/use-timeline-animation";

export function ProgressAnimation({ children }: PropsWithChildren) {
  const [scope, animation] = useTimelineAnimation((tl) =>
    tl.add("#progress", {
      opacity: [1, 0],
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
        <div
          className="h-[200vh] bg-gradient-to-b from-blue-500 to-purple-500"
          id="progress"
        >
          {children}
        </div>
      </Lenis>
    </div>
  );
}
