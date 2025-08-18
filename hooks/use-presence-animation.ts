import { usePresence } from "motion/react"
import { useEffect } from "react";

type UsePresenceAnimationOptions = {
	enter?: () => VoidFunction
	exit?: (safeToRemove: VoidFunction) => () => void
}

export function usePresenceAnimation({ enter, exit }: UsePresenceAnimationOptions) {
	const [isPresent, safeToRemove] = usePresence()

	useEffect(() => {
		if (!isPresent) {
			return exit?.(safeToRemove)
		}

		return enter?.()
  }, [isPresent]);
}