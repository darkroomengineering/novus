import { createTimeline } from "animejs";
import { usePresenceAnimation } from "#/hooks/use-presence-animation";

export default function AboutPage() {
	usePresenceAnimation({
		enter: () => {
			const tl = createTimeline();
			tl.add('#about', {
				opacity: [0, 1],
				duration: 1000,
				easing: "easeInOut"
			})
			return () => tl.revert()
		},
		exit: (safeToRemove) => {
			const tl = createTimeline({onComplete: safeToRemove});
			tl.set("#about", {position: "absolute", left: 0, width: "100%"})
			tl.add('#about', {
				opacity: [1, 0],
				duration: 1000,
				easing: "easeInOut"
			})
			return () => tl.revert()
		}
	})

  return (
      <div id="about">About</div>
  );
}