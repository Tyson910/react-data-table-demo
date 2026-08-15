import * as z from "zod";
import { nonEmptyString, nonNegativeNumber } from "./primitives.validator.js";

const BillingCodeTypeSchema = z.enum(["CPT", "HCPCS", "ICD", "MS-DRG", "R-DRG", "S-DRG", "APS-DRG", "AP-DRG", "APR-DRG", "APC", "NDC", "HIPPS", "LOCAL", "EAPG", "CDT", "RC"], {
  error: "Invalid billing code type — must be a recognized code type (e.g. CPT, HCPCS, ICD, NDC)",
});

const TinSchema = z.object({
  type: z.enum(["ein", "npi"], { error: "TIN type must be 'ein' (Employer Identification Number) or 'npi' (National Provider Identifier)" }),
  value: nonEmptyString,
});

const ProviderSchema = z.object({
  billed_charge: nonNegativeNumber,
  /** CMS spec defines npi as integer, but it's an identifier — arithmetic on it is meaningless */
  npi: z.array(z.number().int({ error: "NPI must be a whole number" })).min(1, { error: "At least one NPI is required per provider" }),
});

const PaymentSchema = z.object({
  allowed_amount: nonNegativeNumber,
  billing_code_modifier: z.array(nonEmptyString).min(1, { error: "billing_code_modifier must contain at least one modifier when provided" }).optional(),
  providers: z.array(ProviderSchema).min(1, { error: "At least one provider is required per payment" }),
});

const ServiceCodePattern = /^([1-9][0-9]|[0-9][1-9])$/;
const serviceCodeItem = z.string().regex(ServiceCodePattern, { error: "Service code must be a two-digit code between 01 and 99 (e.g. '01', '11', '99')" });

/** billing_class drives whether service_code is required */
const ProfessionalAllowedAmountSchema = z.object({
  tin: TinSchema,
  billing_class: z.literal("professional"),
  service_code: z.array(serviceCodeItem).min(1, { error: "Professional billing requires at least one service code" }),
  payments: z.array(PaymentSchema).min(1, { error: "At least one payment is required" }),
});

const InstitutionalAllowedAmountSchema = z.object({
  tin: TinSchema,
  billing_class: z.literal("institutional"),
  service_code: z.array(serviceCodeItem).optional(),
  payments: z.array(PaymentSchema).min(1, { error: "At least one payment is required" }),
});

const AllowedAmountSchema = z.discriminatedUnion("billing_class", [ProfessionalAllowedAmountSchema, InstitutionalAllowedAmountSchema]);

const OutOfNetworkSchema = z.object({
  name: nonEmptyString,
  billing_code_type: BillingCodeTypeSchema,
  billing_code_type_version: nonEmptyString,
  billing_code: nonEmptyString,
  description: nonEmptyString,
  allowed_amounts: z.array(AllowedAmountSchema),
});

const baseFields = {
  reporting_entity_name: nonEmptyString,
  reporting_entity_type: nonEmptyString,
  last_updated_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "last_updated_on must be a date in YYYY-MM-DD format (e.g. '2024-01-15')" }),
  version: z.string(),
  out_of_network: z.array(OutOfNetworkSchema),
};

const sharedPlanFields = {
  plan_name: nonEmptyString,
  issuer_name: nonEmptyString,
  plan_id: nonEmptyString,
  plan_market_type: z.enum(["group", "individual"], { error: "Plan market type must be 'group' or 'individual'" }),
};

/** z.strictObject rejects unknown keys, making this branch mutually exclusive with the plan branches — any plan field present in input will fail here */
const NoPlanSchema = z.strictObject({ ...baseFields });

const HiosPlanSchema = z.object({
  ...baseFields,
  plan_id_type: z.literal("hios"),
  ...sharedPlanFields,
  plan_sponsor_name: nonEmptyString.optional(),
});

const EinPlanSchema = z.object({
  ...baseFields,
  plan_id_type: z.literal("ein"),
  ...sharedPlanFields,
  plan_sponsor_name: nonEmptyString,
});

export const AllowedAmountsFileSchema = z.union([NoPlanSchema, HiosPlanSchema, EinPlanSchema], {
  error: (iss) => {
    const PLAN_GROUP_FIELDS = Object.keys(sharedPlanFields);
    const input: Record<string, unknown> = {};
    if (typeof iss.input === "object" && iss.input !== null) {
      Object.assign(input, iss.input);
    }
    const missing = PLAN_GROUP_FIELDS.filter((f) => input[f] === undefined);
    const present = PLAN_GROUP_FIELDS.filter((f) => input[f] !== undefined);

    if (present.length > 0 && missing.length > 0) {
      return `Missing required plan fields: ${missing.join(", ")}`;
    }
    if (input["plan_id_type"] === "ein" && input["plan_sponsor_name"] === undefined) {
      return "plan_sponsor_name is required when plan_id_type is 'ein'";
    }
    return "Invalid allowed amounts file";
  },
});

export type AllowedAmountsFile = z.infer<typeof AllowedAmountsFileSchema>;
export type OutOfNetwork = z.infer<typeof OutOfNetworkSchema>;
export type AllowedAmount = z.infer<typeof AllowedAmountSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
