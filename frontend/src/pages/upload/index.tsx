import type { RefObject } from "react";
import type {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  IRowNode,
  RowDataUpdatedEvent,
  RowSelectionOptions,
  SelectionChangedEvent,
  ValueFormatterParams,
} from "ag-grid-community";

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Dropzone } from "@mantine/dropzone";
import { Alert, Badge, Box, Button, Checkbox, Group, Menu, Modal, Popover, ScrollArea, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { store } from "../../stores/store.ts";
import type { DisplayRow } from "../../stores/store.ts";
import { type ValidClaim, claimSchema } from "../../utils/claims.schema.ts";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconCloudUpload,
  IconColumns,
  IconFile,
  IconTrash,
  IconX,
} from "../../components/Icons.tsx";

ModuleRegistry.registerModules([AllCommunityModule]);

const ACCEPTED_MIME = ["text/csv", "application/vnd.ms-excel"];

const ROW_SELECTION: RowSelectionOptions<DisplayRow> = {
  mode: "multiRow",
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: false,
  isRowSelectable: (node: IRowNode<DisplayRow>) => node.data?.isValid ?? false,
};

const moneyFormatter = (p: ValueFormatterParams): string => {
  const v: unknown = p.value;
  if (typeof v !== "string" || !v) return "";
  return `$${parseFloat(v).toFixed(2)}`;
};

const dateFormatter = (p: ValueFormatterParams): string => {
  const v: unknown = p.value;
  if (typeof v !== "string" || !v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString();
};

const COL_DEFS: ColDef<DisplayRow>[] = [
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

const ALL_COLUMNS: string[] = COL_DEFS.flatMap((c) => (c.field != null ? [c.field] : []));
const DEFAULT_VISIBLE: Set<string> = new Set(COL_DEFS.filter((c) => !c.hide).flatMap((c) => (c.field != null ? [c.field] : [])));

function ColumnToggle({ gridRef }: { gridRef: RefObject<AgGridReact<DisplayRow> | null> }) {
  const [visible, setVisible] = useState<string[]>(() => [...DEFAULT_VISIBLE]);

  function handleChange(next: string[]) {
    setVisible(next);
    const api = gridRef.current?.api;
    if (!api) return;
    api.applyColumnState({
      state: ALL_COLUMNS.map((col) => ({ colId: col, hide: !next.includes(col) })),
    });
  }

  return (
    <Popover position="bottom-end" shadow="md" width={260}>
      <Popover.Target>
        <Button variant="default" size="xs" leftSection={<IconColumns size={14} />}>
          Columns ({visible.length}/{ALL_COLUMNS.length})
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <ScrollArea.Autosize mah={320}>
          <Checkbox.Group value={visible} onChange={handleChange}>
            <Stack gap={6} p={4}>
              {ALL_COLUMNS.map((col) => (
                <Checkbox key={col} value={col} label={col} size="sm" />
              ))}
            </Stack>
          </Checkbox.Group>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}

function getRowId(params: GetRowIdParams<DisplayRow>) {
  return params.data.id;
}

function getRowStyle(params: { data?: DisplayRow }) {
  if (!params.data?.isValid) return { color: "#9ca3af", background: "#fafafa" };
  return undefined;
}

const gridTheme = themeQuartz.withParams({
  accentColor: "#004502",
  headerBackgroundColor: "#f8faf8",
  rowHoverColor: "#f0f7f0",
});

function FlowStep({ n, label }: { n: number; label: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <ThemeIcon size={22} radius="xl" variant="light" color="gray">
        <Text size="xs" fw={700} c="dimmed">
          {n}
        </Text>
      </ThemeIcon>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}

function ErrorTooltip({ errors }: { errors: { field: string; message: string }[] }) {
  const label = errors.map((e) => `${e.field}: ${e.message}`).join("\n");
  return (
    <Tooltip label={<Text style={{ whiteSpace: "pre-line" }}>{label}</Text>} multiline maw={320}>
      <Badge color="red" variant="light" style={{ cursor: "help" }}>
        {errors.length} error{errors.length !== 1 ? "s" : ""}
      </Badge>
    </Tooltip>
  );
}

const UploadPage = observer(() => {
  const gridRef = useRef<AgGridReact<DisplayRow>>(null);
  const navigate = useNavigate();
  const [selectedCount, setSelectedCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  /**
   * MobX observable arrays are a stable Proxy — same reference forever, even as items change.
   * AG Grid only re-renders when it sees a new array reference, so we spread into a fresh one.
   */
  const rowData = [...store.displayRows];

  const hasFile = store.fileName !== "";

  function onRowDataUpdated(event: RowDataUpdatedEvent<DisplayRow>) {
    event.api.forEachNode((node) => {
      if (node.data?.isValid) node.setSelected(true);
    });
    setSelectedCount(event.api.getSelectedRows().length);
  }

  function onSelectionChanged(event: SelectionChangedEvent<DisplayRow>) {
    setSelectedCount(event.api.getSelectedRows().length);
  }

  function onCellValueChanged(event: CellValueChangedEvent<DisplayRow>) {
    if (!event.colDef.field || event.colDef.field === "Claim ID") return;
    store.updateRow(event.data.id, event.colDef.field, String(event.newValue ?? ""));
  }

  const handleApprove = () => {
    if (!gridRef.current || selectedCount === 0) return;
    if (!store.isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    const selected = gridRef.current.api.getSelectedRows();
    const selectedRowIds = new Set(selected.map((r) => r.id));
    const claims = store.allRows.filter((r) => selectedRowIds.has(r.id) && r.isValid && r.validData).map((r) => r.validData!) satisfies ValidClaim[];
    void store.submitApproval(claims);
  };

  const handleRemoveSelected = () => {
    if (!gridRef.current || selectedCount === 0) return;
    const ids = gridRef.current.api.getSelectedRows().map((r) => r.id);
    store.removeRows(ids);
    setSelectedCount(0);
  };

  return (
    <Stack p="xl" gap="lg" bg="gray.0" style={{ minHeight: "100vh" }}>
      <Modal opened={authModalOpen} onClose={() => setAuthModalOpen(false)} title="Sign in required" centered size="sm">
        <Stack gap="md">
          <Text size="sm">You must be signed in to approve claims.</Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setAuthModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAuthModalOpen(false);
                navigate("/login");
              }}
            >
              Go to sign in
            </Button>
          </Group>
        </Stack>
      </Modal>
      <div>
        <Title order={2}>Claims Upload</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Upload a claims CSV, review the parsed rows, then approve to generate MRF files.
        </Text>
      </div>

      {/* Workflow hint — only shown before the first upload */}
      <Group justify="center" gap="sm">
        <FlowStep n={1} label="Upload CSV" />
        <IconArrowRight size={14} />
        <FlowStep n={2} label="Review rows" />
        <IconArrowRight size={14} />
        <FlowStep n={3} label="Approve" />
      </Group>

      {/* Dropzone — hero when empty, slim file bar once a file is loaded */}
      <div className="rounded-2xl bg-green-50/70 p-1.5 ring-1 ring-green-100">
        <Dropzone
          onDrop={(files) => {
            const file = files[0];
            if (file) store.parseFile(file);
          }}
          onReject={() => {
            store.setFileError("Only CSV files are accepted. Please upload a .csv file.");
          }}
          accept={ACCEPTED_MIME}
          maxFiles={1}
          loading={store.isSubmitting}
          radius="xl"
          p={hasFile ? "xs" : "xl"}
          style={{ borderWidth: 2 }}
        >
          {hasFile ? (
            <Group justify="space-between" wrap="nowrap" px="sm" py={4}>
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size="lg" radius="md" variant="light" color="green">
                  <IconFile size={18} />
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={600}>
                    {store.fileName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Drop a new CSV here or click to replace it
                  </Text>
                </div>
              </Group>
              <Button
                variant="subtle"
                size="xs"
                color="gray"
                leftSection={<IconX size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  store.clearFile();
                }}
              >
                Clear
              </Button>
            </Group>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center" style={{ pointerEvents: "none" }}>
              <Dropzone.Accept>
                <Stack align="center" gap="md">
                  <ThemeIcon size={84} radius="xl" color="green">
                    <IconCheck size={42} />
                  </ThemeIcon>
                  <Text size="xl" fw={700} c="green.7">
                    Drop it!
                  </Text>
                </Stack>
              </Dropzone.Accept>
              <Dropzone.Reject>
                <Stack align="center" gap="md">
                  <ThemeIcon size={84} radius="xl" color="red">
                    <IconX size={42} />
                  </ThemeIcon>
                  <Text size="xl" fw={700} c="red.7">
                    CSV files only
                  </Text>
                </Stack>
              </Dropzone.Reject>
              <Dropzone.Idle>
                <Stack align="center" gap="lg">
                  <ThemeIcon size={84} radius="xl" color="royalGreen">
                    <IconCloudUpload size={42} />
                  </ThemeIcon>
                  <Stack gap={4} align="center">
                    <Text size="xl" fw={700}>
                      Drop your claims CSV here
                    </Text>
                    <Text size="sm" c="dimmed">
                      Only .csv files are supported
                    </Text>
                  </Stack>
                  <Button component="span" size="md" leftSection={<IconFile size={16} />}>
                    Browse files
                  </Button>
                </Stack>
              </Dropzone.Idle>
            </div>
          )}
        </Dropzone>
      </div>

      {/* File format error */}
      {store.fileError && (
        <Alert color="red" title="Invalid file" icon={<IconAlertTriangle size={18} />} withCloseButton onClose={() => store.clearFile()}>
          {store.fileError}
        </Alert>
      )}

      {/* Validation errors */}
      {store.hasData && store.invalidRows.length > 0 && store.showErrors && (
        <Alert
          color="orange"
          title={`${store.invalidRows.length} row${store.invalidRows.length !== 1 ? "s" : ""} failed validation`}
          icon={<IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => store.dismissErrors()}
        >
          <Stack gap={4}>
            {store.invalidRows.map((row) => (
              <Group key={row.rowIndex} gap="xs">
                <Text size="sm">Row {row.rowIndex}:</Text>
                <ErrorTooltip errors={row.errors} />
              </Group>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Success */}
      {store.submitSuccess && (
        <Alert color="green" title="Submitted successfully" icon={<IconCircleCheck size={18} />}>
          {selectedCount} claim{selectedCount !== 1 ? "s" : ""} sent for MRF generation.
        </Alert>
      )}

      {/* Claims table */}
      {store.hasData && (
        <Stack gap="sm" style={{ flex: 1 }}>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Badge size="lg" variant="light" color="green" leftSection={<IconCheck size={12} />}>
                {store.validClaims.length} valid
              </Badge>
              {store.invalidRows.length > 0 && (
                <Badge size="lg" variant="light" color="orange" leftSection={<IconAlertTriangle size={12} />}>
                  {store.invalidRows.length} invalid — not selectable
                </Badge>
              )}
            </Group>
            <Group gap="xs">
              <ColumnToggle gridRef={gridRef} />
              <Menu shadow="md" width={220} position="bottom-end" disabled={selectedCount === 0}>
                <Menu.Target>
                  <Button rightSection={<IconChevronDown size={14} />} disabled={selectedCount === 0} loading={store.isSubmitting}>
                    Actions {selectedCount > 0 ? `(${selectedCount})` : ""}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Selected rows</Menu.Label>
                  <Menu.Item leftSection={<IconCircleCheck size={14} />} onClick={handleApprove} disabled={store.isSubmitting}>
                    Approve selected
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={handleRemoveSelected}>
                    Remove selected
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>

          <Box style={{ height: 520 }}>
            <AgGridReact<DisplayRow>
              ref={gridRef}
              theme={gridTheme}
              rowData={rowData}
              columnDefs={COL_DEFS}
              getRowId={getRowId}
              rowSelection={ROW_SELECTION}
              getRowStyle={getRowStyle}
              onRowDataUpdated={onRowDataUpdated}
              onSelectionChanged={onSelectionChanged}
              defaultColDef={{ sortable: true, resizable: true, filter: true, editable: true }}
              onCellValueChanged={onCellValueChanged}
            />
          </Box>
        </Stack>
      )}
    </Stack>
  );
});

export default UploadPage;
