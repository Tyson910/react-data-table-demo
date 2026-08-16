import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import { verifySession, COOKIE_NAME } from "./auth.util.js";

export const authRequired: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, COOKIE_NAME);
  const userId = token ? await verifySession(token) : null;

  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  await next();
};
