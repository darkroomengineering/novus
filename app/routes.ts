import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  // Pages
  layout("./routes/layout.tsx", [
    index("./routes/home.tsx"),
    route("about", "./routes/about.tsx"),
    route("other", "./routes/other.tsx"),
  ]),
  route("studio/*", "./routes/studio.tsx"),
  // API Routes
  route("api/preview", "./routes/api/preview.ts"),
  // Fix chrome devtools json call
  ...(import.meta.env.DEV
    ? [
        route(
          ".well-known/appspecific/com.chrome.devtools.json",
          "./routes/api/devtools.ts"
        ),
      ]
    : []),
] satisfies RouteConfig;
