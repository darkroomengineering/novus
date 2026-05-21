// Side-effect module. Importing this from app code wires the URLs emitted by
// the font-optimizer plugin into the runtime state that `defineFont`'s getters
// read from. Must be imported once at the app entry (e.g. app/root.tsx) before
// any code reads `font.url` / `font.urls`.

import { fontUrls, fontUrlsBySrc } from "virtual:font-optimizer/urls";
import { _setRuntimeUrls } from "./runtime-state.ts";

_setRuntimeUrls(fontUrls, fontUrlsBySrc);

export { fontUrls, fontUrlsBySrc };
