import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("action", "routes/action/route.tsx"),
  route("state-action", "routes/state-action/route.tsx"),
  route("state-action-override", "routes/state-action-override/route.tsx"),
] satisfies RouteConfig;
