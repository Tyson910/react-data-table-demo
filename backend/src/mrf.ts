import { Hono } from "hono";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { sValidator } from "@hono/standard-validator";
import { AllowedAmountsFileSchema, claimSchema, type ValidClaim } from "@mano/validators";
import * as z from "zod";
import * as path from "node:path";

const MRF_DIR = path.join(import.meta.dirname, "..", "mrf-output");

// Place of Service text → CMS two-digit service code
const PLACE_OF_SERVICE_CODE = {
  "Outpatient Hospital": "22",
  "Inpatient Hospital": "21",
  "Emergency Room - Hospital": "23",
} as const satisfies Record<ValidClaim["Place of Service"], string>;

function buildAllowedAmount(providerClaims: ValidClaim[]) {
  const first = providerClaims[0];
  if (!first) return null;

  // Provider IDs in this dataset are numeric NPIs; fall back to a placeholder if not parseable
  const npiRaw = parseInt(first["Provider ID"], 10);
  const npi = Number.isFinite(npiRaw) && npiRaw > 0 ? npiRaw : 1000000000;

  const tin = { type: "ein" as const, value: first["Provider ID"] };
  const payments = providerClaims.map((c) => ({
    allowed_amount: c.Allowed,
    providers: [{ billed_charge: c.Billed, npi: [npi] }],
  }));

  if (first["Claim Type"] === "Professional") {
    return {
      tin,
      billing_class: "professional" as const,
      service_code: [PLACE_OF_SERVICE_CODE[first["Place of Service"]]],
      payments,
    };
  }
  return { tin, billing_class: "institutional" as const, payments };
}

function buildMrfForPlan(planId: string, claims: ValidClaim[]) {
  const [first] = claims;
  if (!first) throw new Error(`No claims for plan ${planId}`);

  const byProcedure = Object.groupBy(claims, (c) => c["Procedure Code"]);

  const outOfNetwork = Object.entries(byProcedure).map(([procedureCode, procedureClaims = []]) => {
    // Each unique Provider ID + Claim Type combination becomes a separate allowed_amounts entry
    const byProviderKey = Object.groupBy(procedureClaims, (c) => `${c["Provider ID"]}::${c["Claim Type"]}`);

    const allowedAmounts = Object.values(byProviderKey).flatMap((claims) => {
      const allowedAmount = buildAllowedAmount(claims ?? []);
      return allowedAmount ? [allowedAmount] : [];
    });

    return {
      name: procedureCode,
      billing_code_type: "CPT",
      billing_code_type_version: "2024",
      billing_code: procedureCode,
      description: `Procedure ${procedureCode}`,
      allowed_amounts: allowedAmounts,
    } as const;
  });

  return AllowedAmountsFileSchema.parse({
    reporting_entity_name: first["Group Name"],
    reporting_entity_type: "health plan",
    plan_name: first.Plan,
    plan_id_type: "ein" as const,
    plan_id: planId,
    issuer_name: first["Group Name"],
    plan_market_type: "group" as const,
    plan_sponsor_name: first["Group Name"],
    last_updated_on: new Date().toISOString().slice(0, 10),
    version: "1.0.0",
    out_of_network: outOfNetwork,
  });
}

async function readMrfFile(name: string) {
  const filePath = path.join(MRF_DIR, name);
  const [stats, content] = await Promise.all([stat(filePath), readFile(filePath, "utf8")]);

  return { name, size: stats.size, createdAt: stats.birthtime.toISOString(), content };
}

export const mrfRoutes = new Hono()
  .post("/generate", sValidator("json", z.array(claimSchema)), async (c) => {
    const claims = c.req.valid("json");
    if (claims.length === 0) {
      return c.json({ error: "No claims provided" }, 400);
    }

    await mkdir(MRF_DIR, { recursive: true });

    const byPlan = Object.groupBy(claims, (c) => c["Plan ID"]);
    const generatedFiles: string[] = [];

    for (const [planId, planClaims = []] of Object.entries(byPlan)) {
      const mrfData = buildMrfForPlan(planId, planClaims);
      const safePlanId = planId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `mrf-${safePlanId}-${Date.now()}.json`;
      await writeFile(path.join(MRF_DIR, fileName), JSON.stringify(mrfData, null, 2));
      generatedFiles.push(fileName);
    }

    return c.json({ files: generatedFiles }, 201);
  })
  .get("/files", async (c) => {
    await mkdir(MRF_DIR, { recursive: true });
    const allFiles = await readdir(MRF_DIR);
    const jsonFiles = allFiles.filter((name) => name.endsWith(".json"));

    const files = await Promise.all(jsonFiles.map(readMrfFile));
    files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return c.json(files);
  });
