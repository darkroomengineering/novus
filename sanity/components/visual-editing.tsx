import { useEffect, useState } from "react";
import { VisualEditing } from "@sanity/visual-editing/react-router";

export function SanityVisualEditing() {
  return (
    <>
      <VisualEditing />
      <DisablePreviewMode />
    </>
  );
}

function DisablePreviewMode() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(window === window.parent && !window.opener);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <a
        href="/api/preview-mode/disable"
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 text-sm font-medium"
      >
        Disable Preview Mode
      </a>
    </div>
  );
}