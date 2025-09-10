import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // Pages
  layout("./routes/layout.tsx", [
    index("./routes/home.tsx"),
    route("about", "./routes/about.tsx"),
    route("other", "./routes/other.tsx"),
  ]),
  route('studio/*', './routes/studio.tsx'),
  // API Routes
  route("api/preview", "./routes/api/preview.ts"),
] satisfies RouteConfig;
