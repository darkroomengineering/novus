import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Pages
  index("routes/home.tsx"),
  route('studio/*', 'routes/studio.tsx'),
  // API Routes
  route("api/preview-mode/enable", "routes/api/preview-mode/enable.ts"),
  route("api/preview-mode/disable", "routes/api/preview-mode/disable.ts"),
] satisfies RouteConfig;
