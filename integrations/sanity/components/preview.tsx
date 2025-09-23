import { VisualEditing } from "@sanity/visual-editing/react-router";
import { useEffect, useState } from "react";
import s from "./preview.module.css";

export default function SanityPreview() {
  return (
    <>
      <VisualEditing />
      <ExitPreview />
    </>
  );
}

function ExitPreview() {
  const [inIframe, setInIframe] = useState(true);

  useEffect(() => {
    setInIframe(window.self !== window.top);
  }, []);

  if (inIframe) {
    return null;
  }

  return (
    <form action="/api/preview" className={s.form} method="POST">
      <div className={s.container}>
        <p className={s.text}>
          D<span className={s.hiddenText}>raft </span>
          <span className={s.hiddenText}>Content </span>A
          <span className={s.hiddenText}>ctive</span>
        </p>
        <button className={s.button} type="submit">
          <div className={s.line} />
          <div className={s.line} />
        </button>
      </div>
    </form>
  );
}
