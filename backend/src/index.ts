import { serve } from "@hono/node-server";
import { app } from "./app.js";

serve({ fetch: app.fetch, port: 8080 });
console.log("Server is running on http://localhost:8080");
