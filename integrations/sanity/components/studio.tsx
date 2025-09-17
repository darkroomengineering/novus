import { Studio as SanityStudio } from "sanity";
import { Hydrated } from "#/components/hydrated";

import "./studio.css";

import config from "#/integrations/sanity/sanity.config";

export function Studio() {
  return (
    <Hydrated>
      <SanityStudio config={config} />
    </Hydrated>
  );
}
