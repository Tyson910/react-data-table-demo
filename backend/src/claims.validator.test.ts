import { describe, expect, it } from "vitest";
import { claimSchema } from "@mano/validators";

const VALID_RAW = {
  "Claim ID": "CLM-001",
  "Subscriber ID": "SUB-001",
  "Member Sequence": "1",
  "Claim Status": "Payable",
  Billed: "500",
  Allowed: "400",
  Paid: "350",
  "Payment Status Date": "2024-01-15",
  "Service Date": "2024-01-01",
  "Received Date": "2024-01-02",
  "Entry Date": "2024-01-03",
  "Processed Date": "2024-01-10",
  "Paid Date": "2024-01-15",
  "Payment Status": "Paid",
  "Group Name": "Acme Corp",
  "Group ID": "GRP-001",
  "Division Name": "Division A",
  "Division ID": "DIV-001",
  Plan: "Gold Plan",
  "Plan ID": "PLAN-001",
  "Place of Service": "Outpatient Hospital",
  "Claim Type": "Professional",
  "Procedure Code": "99213",
  "Member Gender": "Female",
  "Provider ID": "1234567890",
  "Provider Name": "Dr. Smith",
};

describe("claimSchema", () => {
  it("accepts a valid CSV-like row with string values", () => {
    const result = claimSchema.safeParse(VALID_RAW);
    expect(result.success).toBe(true);
  });

  it("rejects when Paid exceeds Allowed", () => {
    const result = claimSchema.safeParse({ ...VALID_RAW, Paid: "500", Allowed: "400" });
    expect(result.success).toBe(false);
  });

  it("rejects when Allowed exceeds Billed", () => {
    const result = claimSchema.safeParse({ ...VALID_RAW, Billed: "100", Allowed: "400" });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-order lifecycle dates", () => {
    const result = claimSchema.safeParse({ ...VALID_RAW, "Service Date": "2024-06-01", "Received Date": "2024-01-01" });
    expect(result.success).toBe(false);
  });

  it("rejects empty required strings", () => {
    const result = claimSchema.safeParse({ ...VALID_RAW, "Claim ID": "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid Claim Status enum", () => {
    const result = claimSchema.safeParse({ ...VALID_RAW, "Claim Status": "Invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects negative monetary values", () => {
    const result = claimSchema.safeParse({ ...VALID_RAW, Billed: "-10" });
    expect(result.success).toBe(false);
  });
});
