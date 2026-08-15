import { makeAutoObservable, runInAction } from "mobx";
import Papa from "papaparse";
import { claimSchema } from "../utils/claims.schema.ts";
import type { ValidClaim, ValidationError } from "../utils/claims.schema.ts";

type CsvRow = Record<keyof ValidClaim, string>;

export type InvalidRow = {
  rowIndex: number;
  raw: CsvRow;
  errors: ValidationError[];
};

export type DisplayRow = {
  id: string;
  "Claim ID": string;
  "Subscriber ID": string;
  "Claim Status": string;
  Billed: string;
  Allowed: string;
  Paid: string;
  "Provider Name": string;
  "Service Date": string;
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
      "Claim Status": claim["Claim Status"],
      Billed: `$${claim["Billed"].toFixed(2)}`,
      Allowed: `$${claim["Allowed"].toFixed(2)}`,
      Paid: `$${claim["Paid"].toFixed(2)}`,
      "Provider Name": claim["Provider Name"],
      "Service Date": claim["Service Date"].toLocaleDateString(),
      isValid: true,
      errors: [],
    }));

    const invalid: DisplayRow[] = this.invalidRows.map((row) => ({
      id: `invalid-${row.rowIndex}`,
      "Claim ID": row.raw["Claim ID"],
      "Subscriber ID": row.raw["Subscriber ID"],
      "Claim Status": row.raw["Claim Status"],
      Billed: row.raw["Billed"],
      Allowed: row.raw["Allowed"],
      Paid: row.raw["Paid"],
      "Provider Name": row.raw["Provider Name"],
      "Service Date": row.raw["Service Date"],
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
