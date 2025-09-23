import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { data, redirect } from "react-router";

import { client } from "#/integrations/sanity/client";
import {
  commitSanitySession,
  destroySanitySession,
  getSanitySession,
} from "#/integrations/sanity/sanity.server";
import { env } from "#/lib/env";
import type { Route } from "./+types/preview";

// A `POST` request to this route will exit preview mode
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ message: "Method not allowed" }, 405);
  }

  const session = await getSanitySession(request.headers.get("Cookie"));

  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySanitySession(session),
    },
  });
}

// A `GET` request to this route will enter preview mode
export async function loader({ request }: Route.LoaderArgs) {
  if (!env.SANITY_VIEWER_TOKEN) {
    throw new Response("Preview mode missing token", { status: 401 });
  }

  const clientWithToken = client.withConfig({
    token: env.SANITY_VIEWER_TOKEN,
  });

  const { isValid, redirectTo = "/" } = await validatePreviewUrl(
    clientWithToken,
    request.url
  );

  if (!isValid) {
    throw new Response("Invalid secret", { status: 401 });
  }

  const session = await getSanitySession(request.headers.get("Cookie"));
  session.set("projectId", client.config().projectId);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await commitSanitySession(session),
    },
  });
}
