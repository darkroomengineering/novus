import { usePresence } from "motion/react"
import { useEffect, useRef } from "react";

type UsePresenceAnimationOptions = {
	enter?: () => VoidFunction
	exit?: (safeToRemove: VoidFunction) => () => void
}

export function usePresenceAnimation({ enter, exit }: UsePresenceAnimationOptions) {
	const [isPresent, safeToRemove] = usePresence()
	const isInitialRender = useRef(true)

	useEffect(() => {
		if (isInitialRender.current) {
			isInitialRender.current = false
			return
		}

		if (!isPresent) {
			return exit?.(safeToRemove)
		}

		return enter?.()
  }, [isPresent]);
}