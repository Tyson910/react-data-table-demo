import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import type { DisplayRow } from "../../stores/store.ts";

import { claimSchema } from "@mano/validators";
import { formatDate } from "../../utils/format.ts";

const moneyFormatter = (p: ValueFormatterParams): string => {
  const v: unknown = p.value;
  if (typeof v !== "string" || !v) return "";
  return `$${parseFloat(v).toFixed(2)}`;
};

const dateFormatter = (p: ValueFormatterParams): string => {
  const v: unknown = p.value;
  if (typeof v !== "string" || !v) return "";
  return formatDate(v);
};

export const COL_DEFS: ColDef<DisplayRow>[] = [
  { field: "Claim ID", minWidth: 160, pinned: "left", editable: false },
  { field: "Subscriber ID", minWidth: 140 },
  {
    field: "Claim Status",
    minWidth: 130,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: claimSchema.shape["Claim Status"].options },
  },
  { field: "Billed", minWidth: 110, valueFormatter: moneyFormatter },
  { field: "Allowed", minWidth: 110, valueFormatter: moneyFormatter },
  { field: "Paid", minWidth: 110, valueFormatter: moneyFormatter },
  { field: "Provider Name", minWidth: 180, flex: 1 },
  { field: "Service Date", minWidth: 130, valueFormatter: dateFormatter },
  { field: "Member Sequence", minWidth: 160, hide: true },
  { field: "Payment Status Date", minWidth: 180, hide: true, valueFormatter: dateFormatter },
  { field: "Received Date", minWidth: 140, hide: true, valueFormatter: dateFormatter },
  { field: "Entry Date", minWidth: 130, hide: true, valueFormatter: dateFormatter },
  { field: "Processed Date", minWidth: 150, hide: true, valueFormatter: dateFormatter },
  { field: "Paid Date", minWidth: 120, hide: true, valueFormatter: dateFormatter },
  { field: "Payment Status", minWidth: 150, hide: true },
  { field: "Group Name", minWidth: 180, hide: true },
  { field: "Group ID", minWidth: 120, hide: true },
  { field: "Division Name", minWidth: 150, hide: true },
  { field: "Division ID", minWidth: 130, hide: true },
  { field: "Plan", minWidth: 180, hide: true },
  { field: "Plan ID", minWidth: 120, hide: true },
  {
    field: "Place of Service",
    minWidth: 200,
    hide: true,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: claimSchema.shape["Place of Service"].options },
  },
  {
    field: "Claim Type",
    minWidth: 140,
    hide: true,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: claimSchema.shape["Claim Type"].options },
  },
  { field: "Procedure Code", minWidth: 150, hide: true },
  {
    field: "Member Gender",
    minWidth: 140,
    hide: true,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: claimSchema.shape["Member Gender"].options },
  },
  { field: "Provider ID", minWidth: 130, hide: true },
];
