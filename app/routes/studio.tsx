import { Studio } from "sanity";
import { Hydrated } from "#/components/hydrated";
import config from "#/integrations/sanity/sanity.config";
import { PROJECT_TITLE } from "~/sanity/project";

export default function StudioPage() {
  return (
    <>
      <title>{`${PROJECT_TITLE} Studio`}</title>
      <meta content="noindex" name="robots" />
      <style>{studioStyles}</style>
      <Hydrated>
        <Studio config={config} />
      </Hydrated>
    </>
  );
}

const studioStyles = `
html {
  background-color: #111111;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
} 
`;
