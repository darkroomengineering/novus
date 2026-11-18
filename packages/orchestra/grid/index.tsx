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
    <div className={s.root}>
      <div className={gridClassName ? `${gridClassName} ${s.debugger}` : s.debugger}>
        {Array.from({ length: columns }).map((_, index) => (
          <span key={`column-${index}`} />
        ))}
      </div>
    </div>
  );
}
