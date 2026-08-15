import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db.js";

// In a real app this would come from an env var
const JWT_SECRET = new TextEncoder().encode("dummy-auth-secret-do-not-use-in-prod");
const COOKIE_NAME = "session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function signToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
}

export const authRoutes = new Hono()
  .get("/users", async (c) => {
    const users = await db.selectFrom("users").select(["id", "name", "email"]).execute();
    return c.json(users);
  })
  .post("/login", async (c) => {
    const { userId } = await c.req.json<{ userId: number }>();
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
