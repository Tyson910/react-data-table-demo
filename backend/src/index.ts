import { serve } from "@hono/node-server";
import { initDb } from "./db.js";
import { app } from "./app.js";

await initDb();
serve({ fetch: app.fetch, port: 8080 });
console.log("Server is running on http://localhost:8080");
