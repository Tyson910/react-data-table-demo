import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import * as z from "zod";
import { db } from "./db.js";
import { signToken, verifySession, COOKIE_NAME, COOKIE_MAX_AGE } from "./auth.util.js";

export const authRoutes = new Hono()
  .get("/users", async (c) => {
    const users = await db.selectFrom("users").select(["id", "name", "email"]).execute();
    return c.json(users);
  })
  .post("/login", zValidator("json", z.object({ userId: z.number() })), async (c) => {
    const { userId } = c.req.valid("json");
    const user = await db.selectFrom("users").select(["id", "name", "email"]).where("id", "=", userId).executeTakeFirst();
    if (!user) return c.json({ error: "User not found" }, 404);

    const token = await signToken(user.id);
    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return c.json({ user });
  })
  .get("/me", async (c) => {
    const token = getCookie(c, COOKIE_NAME);
    if (!token) return c.json({ user: null });

    const userId = await verifySession(token);
    if (!userId) return c.json({ user: null });

    const user = await db.selectFrom("users").select(["id", "name", "email"]).where("id", "=", userId).executeTakeFirst();
    return c.json({ user: user ?? null });
  })

  .post("/logout", (c) => {
    deleteCookie(c, COOKIE_NAME, { path: "/" });
    return c.json({ ok: true });
  });
