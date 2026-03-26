import { Suspense, lazy } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import { Link } from "~/components/link";
import { middleware as passwordMiddleware } from "~/lib/password-protection";
import { RAF } from "~/components/raf";
import { RealViewport } from "~/components/real-viewport";
import { ThemeProvider } from "~/components/theme";
import "~/styles/css/index.css";
import "~/styles/css/media.css";

export const middleware = [passwordMiddleware] as any[];

const GlobalCanvas = lazy(() => import("../webgl/components/global-canvas"));

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ThemeProvider theme="dark" global>
      <Outlet />
      <RealViewport />
      <RAF />
      <Suspense fallback={null}>
        <GlobalCanvas />
      </Suspense>
    </ThemeProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const isResponse = isRouteErrorResponse(error);

  const status = isResponse ? error.status : 500;
  const title = isResponse ? `${error.status} ${error.statusText}` : "Unexpected Error";
  const message = isResponse
    ? error.data
    : error instanceof Error
      ? error.message
      : "An unknown error occurred";
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      <h1 style={{ fontSize: "4rem", margin: 0, lineHeight: 1 }}>{status}</h1>
      <p style={{ fontSize: "1.25rem", margin: 0, opacity: 0.7 }}>{title}</p>
      {message && typeof message === "string" && (
        <p style={{ margin: 0, opacity: 0.5, maxWidth: "40ch", textAlign: "center" }}>
          {message}
        </p>
      )}
      {process.env.NODE_ENV === "development" && stack && (
        <pre
          style={{
            background: "rgba(255, 0, 0, 0.05)",
            border: "1px solid rgba(255, 0, 0, 0.15)",
            borderRadius: "0.5rem",
            padding: "1rem",
            fontSize: "0.75rem",
            maxWidth: "80ch",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {stack}
        </pre>
      )}
      <Link href="/" style={{ opacity: 0.7, textDecoration: "underline" }}>
        Go Home
      </Link>
    </div>
  );
}
