"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import s from "./cmdo.module.css";
import Orchestra from "./orchestra";
import { OrchestraToggle } from "./toggle";

export function Cmdo() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        (e.key === "o" && e.ctrlKey) ||
        (e.key === "." && (e.metaKey || e.ctrlKey)) ||
        (e.key === "o" && e.shiftKey && e.metaKey)
      ) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      // Toggle grid
      if (e.key === "G" && e.shiftKey) {
        e.preventDefault();
        Orchestra.setState((state) => ({
          grid: !state.grid,
        }));
      }

      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return createPortal(
    <div id="orchestra" className={s.root}>
      <button
        type="button"
        aria-label="Close debug panel"
        className={s.backdrop}
        onClick={() => setOpen(false)}
      />
      <div className={s.popup}>
        <OrchestraToggle id="grid">🌐</OrchestraToggle>
        <OrchestraToggle id="studio">⚙️</OrchestraToggle>
        <OrchestraToggle id="stats">📈</OrchestraToggle>
        <OrchestraToggle id="dev">🚧</OrchestraToggle>
        <OrchestraToggle id="minimap">🗺️</OrchestraToggle>
        <OrchestraToggle id="webgl" defaultValue={true}>
          🧊
        </OrchestraToggle>
        <OrchestraToggle id="screenshot">📸</OrchestraToggle>
      </div>
    </div>,
    document.body,
  );
}
