import { useEffect } from "react";

interface ScrollRestorationProps {
  type?: ScrollRestoration;
}

export function ScrollRestoration({ type = "auto" }: ScrollRestorationProps) {
  useEffect(() => {
    history.scrollRestoration = type;
    if (type === "manual") {
      window.scrollTo(0, 0);
    }
  }, [type]);

  return null;
}
