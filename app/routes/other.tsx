import { animate, JSAnimation } from "animejs";
import { usePresenceAnimation } from "~/hooks/use-presence-animation";
import { useLocation } from "react-router";

export default function OtherPage() {
	const { pathname } = useLocation()
	usePresenceAnimation({
		enter: () => {	
			const animation = animate("#other", {
				opacity: [0, 1],
				duration: 1000,
				easing: "easeInOut"
			})
			return () => animation.revert()
		},
		exit: (safeToRemove) => {
			let animation: JSAnimation | undefined
			if (pathname === "/") {
				animation = animate("#other", {
				opacity: [1, 0],
				duration: 1000,
				easing: "easeInOut",
				onComplete: safeToRemove
			})
		} else {
			animation = animate("#other", {
				opacity: [1, .4],
				translateX: ["0%", "100%"],
				duration: 1000,
				easing: "easeInOut",
				onComplete: safeToRemove
			})
		}
			return () => animation.revert()
		}
	})

	return <div id="other">Other</div>
}