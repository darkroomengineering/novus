import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot"
 
export const env = createEnv({
  server: {
		SANITY_SESSION_SECRET: v.pipe(v.string(), v.nonEmpty()),
		SANITY_READ_TOKEN: v.pipe(v.string(), v.nonEmpty()),
	},
  client: {
    PUBLIC_SANITY_PROJECT_ID: v.pipe(v.string(), v.nonEmpty()),
		PUBLIC_SANITY_DATASET: v.pipe(v.string(), v.nonEmpty()),
		PUBLIC_SANITY_API_VERSION: v.pipe(v.string(), v.nonEmpty()),
  },
  clientPrefix: "PUBLIC_",
  runtimeEnv: typeof window === "undefined" ? process.env : import.meta.env,
  emptyStringAsUndefined: true,
  isServer: typeof window === "undefined",
});