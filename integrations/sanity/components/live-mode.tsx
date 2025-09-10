import { useLiveMode } from "@sanity/react-loader";
import { STUDIO_BASEPATH } from "~/sanity/project";
import { client } from "../client";

const liveClient = client.withConfig({
  stega: {
    enabled: true,
    studioUrl: STUDIO_BASEPATH,
  },
});

export function SanityLiveMode() {
  useLiveMode({ client: liveClient });

  return null;
}
