import { SignJWT, jwtVerify } from "jose";

// In a real app this would come from an env var
const JWT_SECRET = new TextEncoder().encode("dummy-auth-secret-do-not-use-in-prod");
export const COOKIE_NAME = "session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function signToken(userId: number): Promise<string> {
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
