import { Hono } from "hono";
import { authRoutes } from "./auth.routes.js";
import { mrfRoutes } from "./mrf.routes.js";

export const app = new Hono().route("/api/auth", authRoutes).route("/api/mrf", mrfRoutes);

export type AppType = typeof app;
