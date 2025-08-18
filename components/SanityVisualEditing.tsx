import { VisualEditing } from "@sanity/visual-editing/react-router";
import { DisablePreviewMode } from "./DisablePreviewMode";

export function SanityVisualEditing() {
  return (
    <>
      <VisualEditing />
      <DisablePreviewMode />
    </>
  );
}
