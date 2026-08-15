import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { initDb } from "./db.js";
import { authRoutes, verifySession } from "./auth.js";

const app = new Hono()
  .route("/api/auth", authRoutes)
  // Middleware: require a valid session for mutation endpoints
  .use(async (c, next) => {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method);
    if (!isMutation) return next();
    const token = getCookie(c, "session");
    const userId = token ? await verifySession(token) : null;
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    await next();
  })
  .get("/", (c) => {
    return c.text("Hello Hono!");
  });

await initDb();
serve({ fetch: app.fetch, port: 8080 });
console.log("Server is running on http://localhost:8080");
