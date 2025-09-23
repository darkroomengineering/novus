import type { LiveEvent } from "@sanity/client";
import { CorsOriginError } from "@sanity/client";
import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useMatches,
  useNavigate,
  useRevalidator,
} from "react-router";
import { useEffectEvent } from "use-effect-event";
import { client as baseClient } from "../client";

type SanityLiveProps = {
  token?: string;
};

export default function SanityLive({ token }: SanityLiveProps) {
  const matches = useMatches();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const revalidator = useRevalidator();
  const [inIframe, setInIframe] = useState(true);

  useEffect(() => {
    setInIframe(window.self !== window.top);
  }, []);

  const allTags = matches.flatMap((match) => {
    if (
      typeof match.loaderData === "object" &&
      match.loaderData !== null &&
      "tags" in match.loaderData
    ) {
      return match.loaderData.tags as string[];
    }
    return [];
  });

  const client = useMemo(
    () =>
      baseClient.withConfig({
        token,
        perspective: token ? "drafts" : "published",
        useCdn: !token,
        // This component is only mounted with token after preview mode is enabled so we are ignoring the token warning
        ignoreBrowserTokenWarning: true,
      }),
    [token]
  );

  const handleLiveEvent = useEffectEvent((event: LiveEvent) => {
    if (event.type === "welcome") {
      console.info(
        `Sanity is live with automatic invalidation of ${token ? "draft" : "published"} content`
      );
      // @ts-expect-error - `@sanity/client` isnt updated with the id of welcome events
      updateLiveEventIdCookie(event.id);
      navigate(pathname, {
        preventScrollReset: true,
        replace: true,
      });
    }

    if (event.type === "message") {
      if (event.tags.some((tag) => allTags.includes(tag))) {
        updateLiveEventIdCookie(event.id);
        navigate(pathname, {
          preventScrollReset: true,
          replace: true,
        });
      } else {
        console.log("no match", event.tags, { allTags });
      }
    }

    if (event.type === "restart") {
      updateLiveEventIdCookie(null);
      revalidator.revalidate();
    }
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: An effect event should not be a dependency, biome doesn't know that as the api is not in react yet
  useEffect(() => {
    // If we are in the studio iframe it will reload preview on changes
    if (inIframe) return;

    const subscription = client.live
      .events({ includeDrafts: !!token })
      .subscribe({
        next: handleLiveEvent,
        error: handleLiveEventError,
      });

    return () => subscription.unsubscribe();
  }, [client, token, inIframe]);

  return null;
}

function handleLiveEventError(error: unknown) {
  if (error instanceof CorsOriginError) {
    console.warn(
      `Sanity Live is unable to connect to the Sanity API as the current origin - ${window.origin} - is not in the list of allowed CORS origins for this Sanity Project.`,
      error.addOriginUrl && "Add it here:",
      error.addOriginUrl?.toString()
    );
  } else {
    console.error(error);
  }
}

async function updateLiveEventIdCookie(eventId: string | null) {
  if ("cookieStore" in window) {
    if (eventId === null) {
      return await cookieStore.delete("sanity-live-event");
    }
    return await cookieStore.set({
      name: "sanity-live-event",
      value: eventId,
      expires: Date.now() + 24 * 60 * 60 * 1000, // 1 day
      path: "/",
      sameSite: "lax",
    });
  }

  // Fallback for browsers without Cookie Store API
  if (eventId === null) {
    // biome-ignore lint/suspicious/noDocumentCookie: This is just a fallback
    document.cookie = "sanity-live-event=; path=/; max-age=0; samesite=lax";
    return;
  }
  // biome-ignore lint/suspicious/noDocumentCookie: This is just a fallback
  document.cookie = `sanity-live-event=${eventId}; path=/; max-age=86400; samesite=lax`;
}
