import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { claimSchema } from "@mano/validators";
import * as z from "zod";

import { authRequired } from "./auth.middleware.js";
import { mrfFileRepository } from "./mrf.repository.js";
import { generateMrfFiles } from "./mrf.service.js";

export const mrfRoutes = new Hono()
  .post("/generate", authRequired, zValidator("json", z.array(claimSchema).min(1, "No claims provided")), async (c) => {
    const claims = c.req.valid("json");

    const generatedFiles = generateMrfFiles(claims);
    await Promise.all(generatedFiles.map((file) => mrfFileRepository.save(file.name, file.content)));

    return c.json({ files: generatedFiles.map((file) => file.name) }, 201);
  })
  .get("/files", async (c) => {
    const files = await mrfFileRepository.list();

    return c.json({ files });
  })
  .get("/files/:name", zValidator("param", z.object({ name: z.string().min(1, "File name is required") })), async (c) => {
    const { name } = c.req.valid("param");
    const file = await mrfFileRepository.get(name);
    if (!file) return c.json({ error: "File not found" }, 404);

    // c.json() would double-encode: file.content is already a JSON string, and c.json() calls JSON.stringify
    return c.text(file.content, 200, {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${file.name}"`,
    });
  });
