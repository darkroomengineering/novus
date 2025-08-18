import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // Pages
  layout("./routes/layout.tsx", [
    index("./routes/home.tsx"),
    route("about", "./routes/about.tsx"),
  ]),
  route('studio/*', './routes/studio.tsx'),
  // API Routes
  route("api/preview-mode/enable", "./routes/api/preview-mode/enable.ts"),
  route("api/preview-mode/disable", "./routes/api/preview-mode/disable.ts"),
] satisfies RouteConfig;
