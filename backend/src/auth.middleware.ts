import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import { verifySession } from "./auth.js";

export const authRequired: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, "session");
  const userId = token ? await verifySession(token) : null;

  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  await next();
};
