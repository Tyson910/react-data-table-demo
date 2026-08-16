import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { authRoutes, verifySession } from "./auth.js";
import { mrfRoutes } from "./mrf.routes.js";

export const app = new Hono()
  .route("/api/auth", authRoutes)
  .use(async (c, next) => {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method);
    if (!isMutation) return next();
    const token = getCookie(c, "session");
    const userId = token ? await verifySession(token) : null;
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    await next();
  })
  .route("/api/mrf", mrfRoutes);

export type AppType = typeof app;
