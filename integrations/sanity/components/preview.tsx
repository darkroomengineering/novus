import { VisualEditing } from "@sanity/visual-editing/react-router";
import { useEffect, useState } from "react";

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
    <form
      action="/api/preview"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex w-full items-center justify-center gap-1 bg-black/10 py-1 text-sm"
      method="POST"
    >
      <p>You are currently in preview mode:</p>
      <button className="underline" type="submit">
        Exit Preview Mode
      </button>
    </form>
  );
}
