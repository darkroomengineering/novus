import { Studio } from "#/integrations/sanity/components/studio";
import { PROJECT_TITLE } from "~/sanity/project";

export default function StudioPage() {
  return (
    <>
      <title>{PROJECT_TITLE} Studio</title>
      <meta content="noindex" name="robots" />
      <Studio />
    </>
  );
}
