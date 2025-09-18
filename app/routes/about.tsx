import { animate } from "motion";
import { createTimeline } from "#/integrations/motion/timeline";
import { usePresenceAnimation } from "#/integrations/motion/use-presence-animation";
import { ProgressAnimation } from "~/components/progress-animation";

export default function AboutPage() {
  usePresenceAnimation({
    enter: () => {
      const tl = createTimeline();
      tl.add(
        "#about",
        {
          opacity: [0, 1],
        },
        { duration: 1, ease: "easeInOut" }
      );

      const animation = animate(tl.sequence);

      return () => animation.cancel();
    },
    exit: (safeToRemove) => {
      const tl = createTimeline();
      tl.add(
        "#about",
        { position: "absolute", left: 0, width: "100%" },
        { duration: 0, onComplete: () => console.log("onComplete") }
      );
      tl.add(
        "#about",
        {
          opacity: [1, 0],
        },
        {
          duration: 1,
          ease: "easeInOut",
        }
      );

      const animation = animate(tl.sequence);
      animation.then(() => {
        safeToRemove();
      });

      return () => animation.cancel();
    },
  });

  return (
    <div className="flex min-h-screen justify-center" id="about">
      <ProgressAnimation>
        <p className="dr-text-100 font-replica-mono-ll uppercase">About</p>
      </ProgressAnimation>
    </div>
  );
}
