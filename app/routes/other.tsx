import { animate } from "motion";
import type { AnimationPlaybackControlsWithThen } from "motion/react";
import { useLocation } from "react-router";
import { usePresenceAnimation } from "#/hooks/use-presence-animation";

export default function OtherPage() {
  const { pathname } = useLocation();

  usePresenceAnimation({
    enter: () => {
      const animation = animate(
        "#other",
        {
          opacity: [0, 1],
        },
        {
          duration: 1,
          ease: "easeInOut",
        }
      );
      return () => animation.cancel();
    },
    exit: (safeToRemove) => {
      let animation: AnimationPlaybackControlsWithThen | undefined;
      if (pathname === "/") {
        animation = animate(
          "#other",
          {
            opacity: [1, 0],
          },
          {
            duration: 1,
            ease: "easeInOut",
            onComplete: safeToRemove,
          }
        );
      } else {
        animation = animate(
          "#other",
          {
            opacity: [1, 0.4],
            translateX: ["0%", "100%"],
          },
          {
            duration: 1,
            ease: "easeInOut",
            onComplete: safeToRemove,
          }
        );
      }
      return () => animation.cancel();
    },
  });

  return <div id="other">Other</div>;
}
