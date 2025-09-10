import { projectId, STUDIO_BASEPATH } from "~/sanity/project";
// This is the file in which the middleware is used
import type { Route } from "../../app/routes/+types/layout";
import { sanityContext } from "./context.server";
import { getSession } from "./session.server";

// This is the middleware that is used to set the context for the sanity preview
export const sanityMiddleware: Route.unstable_MiddlewareFunction = async ({
  request,
  context,
}) => {
  const previewSession = await getSession(request.headers.get("Cookie"));
  const preview = previewSession.get("projectId") === projectId;

  context.set(sanityContext, {
    preview,
    options: {
      perspective: preview ? "previewDrafts" : "published",
      stega: preview
        ? { enabled: true, studioUrl: STUDIO_BASEPATH }
        : undefined,
    },
  });
};
