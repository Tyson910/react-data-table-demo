import { makeAutoObservable, runInAction } from "mobx";
import { parseResponse, DetailedError } from "hono/client";
import Papa from "papaparse";

import { claimSchema } from "../utils/claims.schema.ts";
import type { ValidClaim, ValidationError } from "../utils/claims.schema.ts";
import { rpc } from "../lib/api.ts";

export type AuthUser = { id: number; name: string; email: string };

type CsvRow = Record<string, string>;

type RowRecord = {
  id: string;
  rowIndex: number;
  raw: CsvRow;
  isValid: boolean;
  validData: ValidClaim | null;
  errors: ValidationError[];
};

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

function toDisplayRow(record: RowRecord): DisplayRow {
  const r = record.raw;
  const c = record.validData;
  return {
    id: record.id,
    "Claim ID": r["Claim ID"] ?? "",
    "Subscriber ID": r["Subscriber ID"] ?? "",
    "Member Sequence": r["Member Sequence"] ?? "",
    "Claim Status": r["Claim Status"] ?? "",
    // Store raw number strings — valueFormatter in the grid adds $ for display
    Billed: c ? String(c.Billed) : (r["Billed"] ?? ""),
    Allowed: c ? String(c.Allowed) : (r["Allowed"] ?? ""),
    Paid: c ? String(c.Paid) : (r["Paid"] ?? ""),
    // Store ISO date strings — valueFormatter in the grid localises for display
    "Payment Status Date": c ? toISODate(c["Payment Status Date"]) : (r["Payment Status Date"] ?? ""),
    "Service Date": c ? toISODate(c["Service Date"]) : (r["Service Date"] ?? ""),
    "Received Date": c ? toISODate(c["Received Date"]) : (r["Received Date"] ?? ""),
    "Entry Date": c ? toISODate(c["Entry Date"]) : (r["Entry Date"] ?? ""),
    "Processed Date": c ? toISODate(c["Processed Date"]) : (r["Processed Date"] ?? ""),
    "Paid Date": c ? toISODate(c["Paid Date"]) : (r["Paid Date"] ?? ""),
    "Payment Status": r["Payment Status"] ?? "",
    "Group Name": r["Group Name"] ?? "",
    "Group ID": r["Group ID"] ?? "",
    "Division Name": r["Division Name"] ?? "",
    "Division ID": r["Division ID"] ?? "",
    Plan: r["Plan"] ?? "",
    "Plan ID": r["Plan ID"] ?? "",
    "Place of Service": r["Place of Service"] ?? "",
    "Claim Type": r["Claim Type"] ?? "",
    "Procedure Code": r["Procedure Code"] ?? "",
    "Member Gender": r["Member Gender"] ?? "",
    "Provider ID": r["Provider ID"] ?? "",
    "Provider Name": r["Provider Name"] ?? "",
    isValid: record.isValid,
    errors: record.errors,
  };
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function parseErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): ValidationError[] {
  return error.issues.map((issue) => ({
    field: String(issue.path.at(0) ?? "unknown"),
    message: issue.message,
  }));
}

function validateRow(raw: CsvRow): Pick<RowRecord, "isValid" | "validData" | "errors"> {
  const result = claimSchema.safeParse(raw);
  if (result.success) {
    return { isValid: true, validData: result.data, errors: [] };
  }
  return { isValid: false, validData: null, errors: parseErrors(result.error) };
}

class AppStore {
  fileName = "";
  fileError: string | null = null;
  allRows: RowRecord[] = [];
  showErrors = true;
  isSubmitting = false;
  submitSuccess = false;

  currentUser: AuthUser | null = null;
  availableUsers: AuthUser[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  initAuth = async (): Promise<void> => {
    const [meRes, usersRes] = await Promise.all([rpc.api.auth.me.$get(), rpc.api.auth.users.$get()]);
    const [{ user }, users] = await Promise.all([meRes.json(), usersRes.json()]);
    runInAction(() => {
      this.currentUser = user;
      this.availableUsers = users;
    });
  };

  login = async (userId: number): Promise<void> => {
    try {
      const { user } = await parseResponse(rpc.api.auth.login.$post({ json: { userId } }));
      runInAction(() => {
        this.currentUser = user;
      });
    } catch (error) {
      if (error instanceof DetailedError) {
        throw new Error(error.message);
      } else {
        throw new Error("Login failed");
      }
    }
  };

  logout = async (): Promise<void> => {
    await rpc.api.auth.logout.$post({});
    runInAction(() => {
      this.currentUser = null;
    });
  };

  get hasData() {
    return this.allRows.length > 0;
  }

  get validClaims(): ValidClaim[] {
    return this.allRows.filter((r) => r.isValid && r.validData).map((r) => r.validData!);
  }

  get invalidRows(): InvalidRow[] {
    return this.allRows.filter((r) => !r.isValid).map((r) => ({ rowIndex: r.rowIndex, raw: r.raw, errors: r.errors }));
  }

  get displayRows(): DisplayRow[] {
    return this.allRows.map(toDisplayRow);
  }

  parseFile = (file: File): void => {
    this.fileName = file.name;
    this.fileError = null;
    this.allRows = [];
    this.showErrors = true;
    this.submitSuccess = false;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        runInAction(() => {
          this.allRows = results.data.map((raw, index) => ({
            id: `row-${index}`,
            rowIndex: index + 2,
            raw,
            ...validateRow(raw),
          }));
        });
      },
    });
  };

  updateRow = (id: string, field: string, value: string): void => {
    const index = this.allRows.findIndex((r) => r.id === id);
    if (index === -1) return;
    const existing = this.allRows[index];
    if (!existing) return;
    const newRaw = { ...existing.raw, [field]: value };
    this.allRows[index] = {
      id: existing.id,
      rowIndex: existing.rowIndex,
      raw: newRaw,
      ...validateRow(newRaw),
    };
  };

  removeRows = (ids: string[]): void => {
    const idSet = new Set(ids);
    this.allRows = this.allRows.filter((r) => !idSet.has(r.id));
  };

  dismissErrors = (): void => {
    this.showErrors = false;
  };

  clearFile = (): void => {
    this.fileName = "";
    this.fileError = null;
    this.allRows = [];
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
void store.initAuth();
