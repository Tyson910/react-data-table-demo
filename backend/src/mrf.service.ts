import { AllowedAmountsFileSchema, type AllowedAmount, type ValidClaim } from "@mano/validators";

const PLACE_OF_SERVICE_CODE = {
  "Outpatient Hospital": "22",
  "Inpatient Hospital": "21",
  "Emergency Room - Hospital": "23",
} as const satisfies Record<ValidClaim["Place of Service"], string>;

export type GeneratedMrfFile = { name: string; content: string };

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function buildPayment(claims: ValidClaim[]) {
  const first = claims[0];
  if (!first) throw new Error("Cannot build a payment without claims");

  const npiRaw = Number(first["Provider ID"]);
  const npi = Number.isInteger(npiRaw) && npiRaw > 0 ? npiRaw : 1000000000;

  return {
    allowed_amount: average(claims.map((claim) => claim.Allowed)),
    providers: [{ billed_charge: average(claims.map((claim) => claim.Billed)), npi: [npi] }],
  };
}

interface AllowedAmountStrategy {
  build(claims: ValidClaim[]): AllowedAmount;
}

class ProfessionalAllowedAmountStrategy implements AllowedAmountStrategy {
  build(claims: ValidClaim[]): AllowedAmount {
    const first = claims[0];
    if (!first) throw new Error("Cannot build a professional allowed amount without claims");

    return {
      tin: { type: "ein", value: first["Provider ID"] },
      billing_class: "professional",
      service_code: [PLACE_OF_SERVICE_CODE[first["Place of Service"]]],
      payments: [buildPayment(claims)],
    };
  }
}

class InstitutionalAllowedAmountStrategy implements AllowedAmountStrategy {
  build(claims: ValidClaim[]): AllowedAmount {
    const first = claims[0];
    if (!first) throw new Error("Cannot build an institutional allowed amount without claims");

    return {
      tin: { type: "ein", value: first["Provider ID"] },
      billing_class: "institutional",
      payments: [buildPayment(claims)],
    };
  }
}

const ALLOWED_AMOUNT_STRATEGIES = {
  Professional: new ProfessionalAllowedAmountStrategy(),
  Institutional: new InstitutionalAllowedAmountStrategy(),
} as const satisfies Record<ValidClaim["Claim Type"], AllowedAmountStrategy>;

// Strategy dispatch: billing_class drives whether service_code is required, so each claim type
// has its own strategy implementation (see ProfessionalAllowedAmountStrategy / InstitutionalAllowedAmountStrategy)
function buildAllowedAmount(claims: ValidClaim[]): AllowedAmount {
  const first = claims[0];
  if (!first) throw new Error("Cannot build an allowed amount without claims");

  return ALLOWED_AMOUNT_STRATEGIES[first["Claim Type"]].build(claims);
}

function buildMrfForPlan(planId: string, claims: ValidClaim[]) {
  const [first] = claims;
  if (!first) throw new Error(`No claims for plan ${planId}`);

  const byProcedure = Object.groupBy(claims, (claim) => claim["Procedure Code"]);
  const outOfNetwork = Object.entries(byProcedure).map(([procedureCode, procedureClaims = []]) => {
    const byProviderKey = Object.groupBy(procedureClaims, (claim) => `${claim["Provider ID"]}::${claim["Place of Service"]}::${claim["Claim Type"]}`);
    const allowedAmounts = Object.values(byProviderKey).flatMap((group) => (group ? [buildAllowedAmount(group)] : []));

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

// Groups claims by Plan ID, then by Procedure Code, then by Provider+Service+Type to compute per-group averages
export function generateMrfFiles(claims: ValidClaim[]): GeneratedMrfFile[] {
  const byPlan = Object.groupBy(claims, (claim) => claim["Plan ID"]);

  return Object.entries(byPlan).map(([planId, planClaims = []]) => {
    const mrfData = buildMrfForPlan(planId, planClaims);
    const safePlanId = planId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const name = `mrf-${safePlanId}-${Date.now()}.json`;

    return { name, content: JSON.stringify(mrfData, null, 2) };
  });
}
