import * as z from "zod";
import { nonEmptyString } from "./primitives.validator.js";

export const claimSchema = z
  .object({
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
  })
  // Cross-field rules: money must flow Billed >= Allowed >= Paid, and lifecycle dates must be chronological
  .superRefine((data, ctx) => {
    if (data.Paid > data.Allowed) ctx.addIssue({ code: "custom", path: ["Paid"], message: "Paid must not exceed Allowed", input: data });
    if (data.Allowed > data.Billed) ctx.addIssue({ code: "custom", path: ["Allowed"], message: "Allowed must not exceed Billed", input: data });

    const dates = [
      ["Service Date", data["Service Date"]],
      ["Received Date", data["Received Date"]],
      ["Entry Date", data["Entry Date"]],
      ["Processed Date", data["Processed Date"]],
      ["Paid Date", data["Paid Date"]],
      
    ] as const satisfies [string, Date][];
    dates.slice(1).forEach(([currName, curr], i) => {
      const [prevName, prev] = dates[i]!;
      if (curr < prev) ctx.addIssue({ code: "custom", path: [currName], message: `${currName} must not be before ${prevName}`, input: data });
    });
  });

export type ValidClaim = z.output<typeof claimSchema>;
