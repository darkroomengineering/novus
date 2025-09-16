import { AnimatePresence } from "motion/react";
import { Fragment } from "react";
import { useLocation, useOutlet } from "react-router";

export function AnimatePresenceOutlet() {
  const outlet = useOutlet();
  const location = useLocation();

  return (
    <AnimatePresence>
      <Fragment key={location.pathname}>{outlet}</Fragment>
    </AnimatePresence>
  );
}
