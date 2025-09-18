import { animate } from "motion";
import { createTimeline } from "#/integrations/motion/timeline";
import { usePresenceAnimation } from "#/integrations/motion/use-presence-animation";

export default function OtherPage() {
  usePresenceAnimation({
    enter: () => {
      const tl = createTimeline();
      tl.add(
        "#other",
        {
          x: ["100%", 0],
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
        "#other",
        { position: "absolute", left: "50%", x: "50%" },
        { duration: 0, onComplete: () => console.log("onComplete") }
      );
      tl.add(
        "#other",
        {
          x: ["0%", "100vw"],
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
    <div className="flex min-h-screen items-center justify-center" id="other">
      <p className="dr-text-100 font-replica-mono-ll uppercase">Other</p>
    </div>
  );
}
