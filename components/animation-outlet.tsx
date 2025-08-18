import { Fragment } from "react"
import { AnimatePresence } from "motion/react"
import { useLocation, useOutlet } from "react-router"

export function AnimationOutlet() {
	const outlet = useOutlet()
	const location = useLocation()

  return (
		<AnimatePresence>
    <Fragment
			key={location.pathname}
    >
      {outlet}
    </Fragment>
		</AnimatePresence>
  )
}