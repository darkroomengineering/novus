import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { TransitionPhase } from "./context";
import { useAllTransitionOutlets } from "./store";
import s from "./transition-debug.module.css";

const CONTAINER_ID = "transition-debug-root";

function getSharedContainer(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById(CONTAINER_ID);
  if (existing instanceof HTMLDivElement) return existing;
  const el = document.createElement("div");
  el.id = CONTAINER_ID;
  // Container is dev-only: kept inline so production never ships any
  // `id="transition-debug-root"` styling, even cosmetically.
  el.style.position = "fixed";
  el.style.bottom = "8px";
  el.style.right = "8px";
  el.style.zIndex = "99999";
  el.style.pointerEvents = "none";
  el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
  el.style.fontSize = "11px";
  el.style.lineHeight = "1.35";
  document.body.appendChild(el);
  return el;
}

function phaseColor(phase: TransitionPhase): string {
  if (phase === "exiting") return "#f88";
  if (phase === "entering") return "#8f8";
  return "#aaa";
}

function phaseStyle(phase: TransitionPhase): CSSProperties {
  return { "--phase-color": phaseColor(phase) } as CSSProperties;
}

/**
 * Single unified debug panel that renders one section per mounted
 * TransitionOutlet. Reads from the module-level store so all outlets'
 * state is visible from a single mount point.
 *
 * Mounted automatically by `<TransitionOutlet debug />` — typically only on
 * the root outlet. The panel is lazy-loaded and tree-shaken from production
 * builds via the `devOnly()` wrapper inside TransitionOutlet.
 */
export default function TransitionDebug() {
  const outlets = useAllTransitionOutlets();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setContainer(getSharedContainer());
  }, []);

  if (!container) return null;
  if (outlets.length === 0) return null;

  // Aggregate phase for the panel-level border tint: any outlet exiting →
  // exiting, else any entering → entering, else idle. Mirrors the
  // <html data-transition-phase> aggregator in store.ts.
  let aggregated: TransitionPhase = "idle";
  for (const r of outlets) {
    if (r.phase === "exiting") {
      aggregated = "exiting";
      break;
    }
    if (r.phase === "entering") aggregated = "entering";
  }

  // Current pathname when idle — read from the root outlet (which always
  // commits its navDetect first, so its state is canonical).
  const currentPathname =
    outlets[0]?.pages.at(-1)?.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");

  // During a transition, surface the orchestrating outlet's from→to in the
  // header instead of the current pathname. The per-outlet section then only
  // needs to show the direction badge — the actual paths are also visible in
  // its expanded page list, so showing them three times in one panel was
  // redundant and the duplicate also got truncated in the cramped row.
  const activeOutlet = outlets.find((r) => r.phase !== "idle" && r.from && r.to);

  return createPortal(
    <div className={s.panel} style={phaseStyle(aggregated)}>
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>TRANSITIONS</span>
        {activeOutlet ? (
          <span className={s.panelPath}>
            {activeOutlet.from}
            <span className={s.arrow}> → </span>
            {activeOutlet.to}
          </span>
        ) : (
          <span className={s.panelPath}>{currentPathname}</span>
        )}
      </div>

      {outlets.map((outlet, idx) => {
        const isActive = outlet.phase !== "idle";
        const lastIdx = outlet.pages.length - 1;
        return (
          <div
            key={outlet.name ?? `outlet-${idx}`}
            className={s.section}
            style={phaseStyle(outlet.phase)}
          >
            <div className={s.outletHeader}>
              <span className={s.outletMarker} aria-hidden>
                {isActive ? "▸" : "●"}
              </span>
              <span className={s.outletName}>{outlet.name ?? "unnamed"}</span>
              <span className={s.outletPhase}>{outlet.phase}</span>
              {isActive && outlet.direction && (
                <span className={s.outletDir}>{outlet.direction}</span>
              )}
            </div>

            {/* Only show the page list for the orchestrating outlet (>1 page).
                Idle and SKIP_NAVIGATE'd outlets have just one page whose
                pathname is already in the panel header. */}
            {outlet.pages.length > 1 && (
              <div className={s.pages}>
                {outlet.pages.map((page, i) => {
                  const isPresent = i === lastIdx;
                  return (
                    <div key={page.key} className={s.pageRow} style={phaseStyle(page.phase)}>
                      <span className={isPresent ? s.pageMarkerPresent : s.pageMarker} aria-hidden>
                        {isPresent ? "●" : "▸"}
                      </span>
                      <span className={s.pageKey}>{page.key}</span>
                      <span className={s.pagePhase}>{page.phase}</span>
                      <span className={s.pagePathname}>{page.pathname}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>,
    container,
  );
}
