import * as z from "zod";
import { nonEmptyString } from "@mano/validators";

export type ValidationError = {
  field: string;
  message: string;
};

export const claimSchema = z.object({
  "Claim ID": nonEmptyString,
  "Subscriber ID": nonEmptyString,
  "Member Sequence": z.coerce.number().int().nonnegative(),
  "Claim Status": z.enum(["Payable", "Denied", "Partial Deny"]),
  Billed: z.coerce.number().nonnegative(),
  Allowed: z.coerce.number().nonnegative(),
  Paid: z.coerce.number().nonnegative(),
  "Payment Status Date": z.coerce.date(),
  "Service Date": z.coerce.date(),
  "Received Date": z.coerce.date(),
  "Entry Date": z.coerce.date(),
  "Processed Date": z.coerce.date(),
  "Paid Date": z.coerce.date(),
  "Payment Status": nonEmptyString,
  "Group Name": nonEmptyString,
  "Group ID": nonEmptyString,
  "Division Name": nonEmptyString,
  "Division ID": nonEmptyString,
  Plan: nonEmptyString,
  "Plan ID": nonEmptyString,
  "Place of Service": z.enum(["Outpatient Hospital", "Inpatient Hospital", "Emergency Room - Hospital"]),
  "Claim Type": z.enum(["Professional", "Institutional"]),
  "Procedure Code": nonEmptyString,
  "Member Gender": z.enum(["Male", "Female"]),
  "Provider ID": nonEmptyString,
  "Provider Name": nonEmptyString,
});

export type ValidClaim = z.output<typeof claimSchema>;
