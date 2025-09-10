import { sanityContext } from "./context";
import { projectId, STUDIO_BASEPATH } from "~/sanity/project";
import { getSession } from "./session.server";
import type { Route } from "../../app/routes/+types/layout";

export const sanityMiddleware: Route.unstable_MiddlewareFunction = async ({ request, context }) => {
  const previewSession = await getSession(request.headers.get('Cookie'))
  const preview = previewSession.get('projectId') === projectId

  console.log("middleware", previewSession.get('projectId'))

  context.set(sanityContext, {
    preview,
    options: {
      perspective: preview ? 'previewDrafts' : 'published',
      stega: preview ? {enabled: true, studioUrl: STUDIO_BASEPATH} : undefined,
    },
  })
}