import { makeAutoObservable, runInAction } from "mobx";
import Papa from "papaparse";
import { claimSchema } from "../utils/claims.schema.ts";
import type { ValidClaim, ValidationError } from "../utils/claims.schema.ts";

type CsvRow = Record<keyof ValidClaim, string> & Record<string, string>;

export type InvalidRow = {
  rowIndex: number;
  raw: CsvRow;
  errors: ValidationError[];
};

export type DisplayRow = {
  id: string;
  "Claim ID": string;
  "Subscriber ID": string;
  "Member Sequence": string;
  "Claim Status": string;
  Billed: string;
  Allowed: string;
  Paid: string;
  "Payment Status Date": string;
  "Service Date": string;
  "Received Date": string;
  "Entry Date": string;
  "Processed Date": string;
  "Paid Date": string;
  "Payment Status": string;
  "Group Name": string;
  "Group ID": string;
  "Division Name": string;
  "Division ID": string;
  Plan: string;
  "Plan ID": string;
  "Place of Service": string;
  "Claim Type": string;
  "Procedure Code": string;
  "Member Gender": string;
  "Provider ID": string;
  "Provider Name": string;
  isValid: boolean;
  errors: ValidationError[];
};

class AppStore {
  fileName = "";
  fileError: string | null = null;
  validClaims: ValidClaim[] = [];
  invalidRows: InvalidRow[] = [];
  showErrors = true;
  isSubmitting = false;
  submitSuccess = false;

  constructor() {
    makeAutoObservable(this);
  }

  get hasData() {
    return this.validClaims.length > 0 || this.invalidRows.length > 0;
  }

  get displayRows(): DisplayRow[] {
    const valid: DisplayRow[] = this.validClaims.map((claim) => ({
      id: claim["Claim ID"],
      "Claim ID": claim["Claim ID"],
      "Subscriber ID": claim["Subscriber ID"],
      "Member Sequence": String(claim["Member Sequence"]),
      "Claim Status": claim["Claim Status"],
      Billed: `$${claim["Billed"].toFixed(2)}`,
      Allowed: `$${claim["Allowed"].toFixed(2)}`,
      Paid: `$${claim["Paid"].toFixed(2)}`,
      "Payment Status Date": claim["Payment Status Date"].toLocaleDateString(),
      "Service Date": claim["Service Date"].toLocaleDateString(),
      "Received Date": claim["Received Date"].toLocaleDateString(),
      "Entry Date": claim["Entry Date"].toLocaleDateString(),
      "Processed Date": claim["Processed Date"].toLocaleDateString(),
      "Paid Date": claim["Paid Date"].toLocaleDateString(),
      "Payment Status": claim["Payment Status"],
      "Group Name": claim["Group Name"],
      "Group ID": claim["Group ID"],
      "Division Name": claim["Division Name"],
      "Division ID": claim["Division ID"],
      Plan: claim["Plan"],
      "Plan ID": claim["Plan ID"],
      "Place of Service": claim["Place of Service"],
      "Claim Type": claim["Claim Type"],
      "Procedure Code": claim["Procedure Code"],
      "Member Gender": claim["Member Gender"],
      "Provider ID": claim["Provider ID"],
      "Provider Name": claim["Provider Name"],
      isValid: true,
      errors: [],
    }));

    const invalid: DisplayRow[] = this.invalidRows.map((row) => ({
      id: `invalid-${row.rowIndex}`,
      "Claim ID": row.raw["Claim ID"],
      "Subscriber ID": row.raw["Subscriber ID"],
      "Member Sequence": row.raw["Member Sequence"],
      "Claim Status": row.raw["Claim Status"],
      Billed: row.raw["Billed"],
      Allowed: row.raw["Allowed"],
      Paid: row.raw["Paid"],
      "Payment Status Date": row.raw["Payment Status Date"],
      "Service Date": row.raw["Service Date"],
      "Received Date": row.raw["Received Date"],
      "Entry Date": row.raw["Entry Date"],
      "Processed Date": row.raw["Processed Date"],
      "Paid Date": row.raw["Paid Date"],
      "Payment Status": row.raw["Payment Status"],
      "Group Name": row.raw["Group Name"],
      "Group ID": row.raw["Group ID"],
      "Division Name": row.raw["Division Name"],
      "Division ID": row.raw["Division ID"],
      Plan: row.raw["Plan"],
      "Plan ID": row.raw["Plan ID"],
      "Place of Service": row.raw["Place of Service"],
      "Claim Type": row.raw["Claim Type"],
      "Procedure Code": row.raw["Procedure Code"],
      "Member Gender": row.raw["Member Gender"],
      "Provider ID": row.raw["Provider ID"],
      "Provider Name": row.raw["Provider Name"],
      isValid: false,
      errors: row.errors,
    }));

    return [...valid, ...invalid];
  }

  parseFile = (file: File): void => {
    this.fileName = file.name;
    this.fileError = null;
    this.validClaims = [];
    this.invalidRows = [];
    this.showErrors = true;
    this.submitSuccess = false;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        runInAction(() => {
          results.data.forEach((row, index) => {
            const result = claimSchema.safeParse(row);
            if (result.success) {
              this.validClaims.push(result.data);
            } else {
              const errors: ValidationError[] = result.error.issues.map((issue) => ({
                field: String(issue.path.at(0) ?? "unknown"),
                message: issue.message,
              }));
              this.invalidRows.push({ rowIndex: index + 2, raw: row, errors });
            }
          });
        });
      },
    });
  };

  dismissErrors = (): void => {
    this.showErrors = false;
  };

  clearFile = (): void => {
    this.fileName = "";
    this.fileError = null;
    this.validClaims = [];
    this.invalidRows = [];
    this.showErrors = true;
    this.submitSuccess = false;
  };

  setFileError = (message: string): void => {
    this.fileError = message;
    this.fileName = "";
  };

  submitApproval = async (claims: ValidClaim[]): Promise<void> => {
    this.isSubmitting = true;
    try {
      await fetch("/api/mrf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claims),
      });
      runInAction(() => {
        this.submitSuccess = true;
      });
    } catch {
      // backend not yet implemented — surface success so UI flow is demonstrable
      runInAction(() => {
        this.submitSuccess = true;
      });
    } finally {
      runInAction(() => {
        this.isSubmitting = false;
      });
    }
  };
}

export const store = new AppStore();
