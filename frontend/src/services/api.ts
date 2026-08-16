import { hc } from "hono/client";
import type { AppType } from "backend";

export const rpc = hc<AppType>("/");
