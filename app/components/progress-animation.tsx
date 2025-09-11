import { Lenis, useLenis } from "lenis/react";
import { useState } from "react";
import { useTimelineAnimation } from "#/integrations/motion/use-timeline-animation";

export function ProgressAnimation() {
  const [state, setState] = useState(0);

  const [scope, animation] = useTimelineAnimation((tl) =>
    tl.add("#progress", {
      opacity: [1, 0.5],
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
        <div className="h-[200vh] bg-red-500" id="progress">
          ProgressAnimation
          <button
            onClick={() => {
              setState(state + 1);
            }}
            type="button"
          >
            State {state}
          </button>
        </div>
      </Lenis>
    </div>
  );
}
