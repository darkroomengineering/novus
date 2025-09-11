import type { AnimationPlaybackControlsWithThen } from "motion/react";
import { useAnimate } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { createTimeline } from "./timeline";

export function useTimelineAnimation(
  tlFn: (
    tl: ReturnType<typeof createTimeline>
  ) => ReturnType<typeof createTimeline>,
  deps: unknown[] = []
) {
  const [scope, animate] = useAnimate();
  const [animation, setAnimation] = useState<AnimationPlaybackControlsWithThen>(
    {} as AnimationPlaybackControlsWithThen
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Infinite loop with tlFn as dependency
  const tl = useMemo(() => {
    console.log("recreate timeline");
    return tlFn(createTimeline());
  }, [...deps]);

  useEffect(() => {
    const anim = animate(tl.sequence);
    anim.pause();
    setAnimation(anim);
  }, [animate, tl.sequence]);

  return [scope, animation] as const;
}
