import { describe, expect, it } from "vitest";
import { generateMrfFiles } from "./mrf.service.js";
import { AllowedAmountsFileSchema, type ValidClaim, type AllowedAmountsFile } from "@mano/validators";

function makeClaim(overrides: Partial<ValidClaim> = {}): ValidClaim {
  return {
    "Claim ID": "CLM-001",
    "Subscriber ID": "SUB-001",
    "Member Sequence": 1,
    "Claim Status": "Payable",
    Billed: 500,
    Allowed: 400,
    Paid: 350,
    "Payment Status Date": new Date("2024-01-15"),
    "Service Date": new Date("2024-01-01"),
    "Received Date": new Date("2024-01-02"),
    "Entry Date": new Date("2024-01-03"),
    "Processed Date": new Date("2024-01-10"),
    "Paid Date": new Date("2024-01-15"),
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
    ...overrides,
  };
}

function parseMrf(content: string): AllowedAmountsFile {
  return AllowedAmountsFileSchema.parse(JSON.parse(content));
}

describe("generateMrfFiles", () => {
  it("generates one file per plan", () => {
    const claims = [makeClaim({ "Plan ID": "A" }), makeClaim({ "Plan ID": "B" })];
    const files = generateMrfFiles(claims);
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.name)).toEqual(expect.arrayContaining([expect.stringContaining("mrf-A-"), expect.stringContaining("mrf-B-")]));
  });

  it("averages Billed and Allowed across claims in the same group", () => {
    const claims = [makeClaim({ Billed: 100, Allowed: 80, Paid: 60 }), makeClaim({ Billed: 200, Allowed: 120, Paid: 100 })];
    const files = generateMrfFiles(claims);
    const mrf = parseMrf(files[0]!.content);
    const payment = mrf.out_of_network[0]!.allowed_amounts[0]!.payments[0]!;
    expect(payment.allowed_amount).toBe(100);
    expect(payment.providers[0]!.billed_charge).toBe(150);
  });

  it("uses professional billing_class with service_code for Professional claims", () => {
    const files = generateMrfFiles([makeClaim({ "Claim Type": "Professional", "Place of Service": "Outpatient Hospital" })]);
    const mrf = parseMrf(files[0]!.content);
    const aa = mrf.out_of_network[0]!.allowed_amounts[0]!;
    expect(aa.billing_class).toBe("professional");
    expect(aa.service_code).toEqual(["22"]);
  });

  it("uses institutional billing_class without service_code for Institutional claims", () => {
    const files = generateMrfFiles([makeClaim({ "Claim Type": "Institutional" })]);
    const mrf = parseMrf(files[0]!.content);
    const aa = mrf.out_of_network[0]!.allowed_amounts[0]!;
    expect(aa.billing_class).toBe("institutional");
    expect(aa.service_code).toBeUndefined();
  });

  it("groups by procedure code within a plan", () => {
    const claims = [makeClaim({ "Procedure Code": "99213" }), makeClaim({ "Procedure Code": "99214" })];
    const files = generateMrfFiles(claims);
    const mrf = parseMrf(files[0]!.content);
    expect(mrf.out_of_network).toHaveLength(2);
    const codes = mrf.out_of_network.map((e) => e.billing_code);
    expect(codes).toContain("99213");
    expect(codes).toContain("99214");
  });

  it("produces valid MRF schema output", () => {
    const files = generateMrfFiles([makeClaim()]);
    expect(files).toHaveLength(1);
    const mrf = parseMrf(files[0]!.content);
    expect(mrf.reporting_entity_name).toBe("Acme Corp");
    expect("plan_name" in mrf && mrf.plan_name).toBe("Gold Plan");
    expect(mrf.version).toBe("1.0.0");
  });

  it("falls back to default NPI when Provider ID is non-numeric", () => {
    const files = generateMrfFiles([makeClaim({ "Provider ID": "NOT-A-NUMBER" })]);
    const mrf = parseMrf(files[0]!.content);
    const npi = mrf.out_of_network[0]!.allowed_amounts[0]!.payments[0]!.providers[0]!.npi;
    expect(npi).toEqual([1000000000]);
  });
});
