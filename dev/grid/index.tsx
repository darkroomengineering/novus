import cn from "clsx";
import { useWindowSize } from "hamo";
import { useMemo } from "react";
import s from "./grid.module.css";

type GridDebuggerProps = {
  gridClassName?: string;
};

export default function GridDebugger({ gridClassName = "dr-layout-grid" }: GridDebuggerProps) {
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const columns = useMemo(
    () =>
      Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--columns"), 10),
    [windowWidth, windowHeight],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-10000">
      <div className={cn(gridClassName, "absolute inset-0", s.debugger)}>
        {Array.from({ length: columns }).map((_, index) => (
          <span
            key={`column-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
