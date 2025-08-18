import { redirect } from "react-router";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { client } from "~/sanity/client";
import { commitSession, getSession } from "~/sanity/preview";

export async function loader({ request }: { request: Request }) {
  if (!process.env.SANITY_VIEWER_TOKEN) {
    throw new Response("Preview mode missing token", { status: 401 });
  }

  const clientWithToken = client.withConfig({
    token: process.env.SANITY_VIEWER_TOKEN,
  });

  const { isValid, redirectTo = "/" } = await validatePreviewUrl(
    clientWithToken,
    request.url
  );

  if (!isValid) {
    throw new Response("Invalid secret", { status: 401 });
  }

  const session = await getSession(request.headers.get("Cookie"));
  session.set("projectId", import.meta.env.VITE_SANITY_PROJECT_ID);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}
