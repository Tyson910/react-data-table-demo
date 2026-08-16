import { makeAutoObservable, runInAction } from "mobx";
import { parseResponse, DetailedError } from "hono/client";
import Papa from "papaparse";

import { claimSchema, AllowedAmountsFileSchema, type ValidClaim, type AllowedAmountsFile } from "@mano/validators";
import { rpc } from "../services/api.ts";

const FIELD_LIST_FORMATTER = new Intl.ListFormat("en-US", { type: "unit" });

export type AuthUser = { id: number; name: string; email: string };

type CsvRow = Record<string, string>;

type ValidationError = {
  field: string;
  message: string;
};

type RowRecord = {
  id: string;
  rowIndex: number;
  raw: CsvRow;
  isValid: boolean;
  validData: ValidClaim | null;
  errors: ValidationError[];
};

export type InvalidRow = {
  id: string;
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
    field: issue.path.length > 0 ? FIELD_LIST_FORMATTER.format(issue.path.map(String)) : "unknown",
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
  // CSV draft state
  fileName = "";
  fileError: string | null = null;
  allRows: RowRecord[] = [];
  showErrors = true;

  // Submission state
  submission: { status: "idle" } | { status: "submitting" } | { status: "success" } | { status: "error"; message: string } = { status: "idle" };

  // Authentication state
  currentUser: AuthUser | null = null;
  availableUsers: AuthUser[] = [];

  // MRF preview state
  mrfPreview: null | { name: string; status: "loading" } | { name: string; status: "error"; error: string } | { name: string; status: "success"; data: AllowedAmountsFile } = null;

  constructor() {
    makeAutoObservable(this);
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Authentication actions
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

  // CSV draft selectors
  get hasData() {
    return this.allRows.length > 0;
  }

  get validClaims(): ValidClaim[] {
    return this.allRows.filter((r) => r.isValid && r.validData).map((r) => r.validData!);
  }

  get invalidRows(): InvalidRow[] {
    return this.allRows.filter((r) => !r.isValid).map((r) => ({ id: r.id, rowIndex: r.rowIndex, raw: r.raw, errors: r.errors }));
  }

  get displayRows(): DisplayRow[] {
    return this.allRows.map(toDisplayRow);
  }

  // CSV draft actions
  parseFile = (file: File): void => {
    this.fileName = file.name;
    this.fileError = null;
    this.allRows = [];
    this.showErrors = true;
    this.resetSubmission();

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        runInAction(() => {
          if (results.data.length === 0) {
            this.fileError = results.errors.length > 0 ? results.errors.map((e) => e.message).join("; ") : "The file contains no data rows";
            return;
          }
          if (results.errors.length > 0) {
            this.fileError = `${results.errors.length} row${results.errors.length !== 1 ? "s" : ""} had CSV formatting issues and may contain incomplete data`;
          }
          this.allRows = results.data.map((raw, index) => ({
            id: `row-${index}`,
            rowIndex: index + 2,
            raw,
            ...validateRow(raw),
          }));
        });
      },
      error: (error) => {
        runInAction(() => {
          this.fileError = `Failed to read file: ${error.message}`;
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

  toggleErrors = (): void => {
    this.showErrors = !this.showErrors;
  };

  clearFileError = (): void => {
    this.fileError = null;
  };

  clearFile = (): void => {
    this.fileName = "";
    this.fileError = null;
    this.allRows = [];
    this.showErrors = true;
    this.resetSubmission();
  };

  resetSubmission = (): void => {
    this.submission = { status: "idle" };
  };

  setFileError = (message: string): void => {
    this.fileError = message;
    this.fileName = "";
  };

  // MRF preview actions
  openMrfPreview = (name: string): void => {
    this.mrfPreview = { name, status: "loading" };
    void this.fetchMrfPreview(name);
  };

  closeMrfPreview = (): void => {
    this.mrfPreview = null;
  };

  private fetchMrfPreview = async (name: string): Promise<void> => {
    try {
      const response = await rpc.api.mrf.files[":name"].preview.$get({ param: { name } });
      if (!response.ok) {
        runInAction(() => {
          this.mrfPreview = { name, status: "error", error: "Failed to load or validate file content." };
        });
        return;
      }
      const parsed: unknown = await response.json();
      const result = AllowedAmountsFileSchema.safeParse(parsed);
      runInAction(() => {
        if (!result.success) {
          this.mrfPreview = { name, status: "error", error: "Preview response did not match the MRF schema." };
        } else {
          this.mrfPreview = { name, status: "success", data: result.data };
        }
      });
    } catch {
      runInAction(() => {
        this.mrfPreview = { name, status: "error", error: "Failed to load file content." };
      });
    }
  };

  // Submission actions
  submitApproval = async (claims: ValidClaim[]): Promise<void> => {
    this.submission = { status: "submitting" };
    try {
      const res = await rpc.api.mrf.generate.$post({ json: claims });
      if (!res.ok) {
        const status: number = res.status;
        if (status === 401) {
          this.submission = { status: "error", message: "You must be signed in to approve claims." };
          return;
        }
        try {
          const { error } = await res.json();
          const messages = error.issues.map((issue: { path: PropertyKey[]; message: string }) => {
            const field = issue.path.length > 0 ? `${FIELD_LIST_FORMATTER.format(issue.path.map(String))}: ` : "";
            return `${field}${issue.message}`;
          });
          this.submission = { status: "error", message: `Request failed: ${FIELD_LIST_FORMATTER.format(messages)}` };
        } catch {
          this.submission = { status: "error", message: `Request failed (${status}).` };
        }
        return;
      }
      this.submission = { status: "success" };
    } catch {
      this.submission = { status: "error", message: "Network error — could not reach the server." };
    }
  };
}

export const store = new AppStore();
void store.initAuth();
