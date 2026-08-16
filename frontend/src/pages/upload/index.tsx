import type { CellValueChangedEvent, ColDef, FirstDataRenderedEvent, GetRowIdParams, ICellRendererParams, RowSelectionOptions, SelectionChangedEvent } from "ag-grid-community";
import type { DisplayRow } from "../../stores/store.ts";

import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Dropzone } from "@mantine/dropzone";
import { Alert, Badge, Box, Button, Group, Loader, Modal, Skeleton, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { store } from "../../stores/store.ts";
import type { ValidClaim } from "@mano/validators";
import { IconAlertTriangle, IconArrowRight, IconCheck, IconCircleCheck, IconCloudUpload, IconFile, IconTrash, IconX } from "../../components/Icons.tsx";
import { ColumnToggle } from "./ColumnToggle.tsx";
import { ValidationErrorsAlert } from "./ValidationErrorsAlert.tsx";
import { COL_DEFS } from "./columns.ts";

ModuleRegistry.registerModules([AllCommunityModule]);

const ACCEPTED_MIME = ["text/csv", "application/vnd.ms-excel"];

const ROW_SELECTION: RowSelectionOptions<DisplayRow> = {
  mode: "multiRow",
  checkboxes: true,
  headerCheckbox: true,
  enableClickSelection: false,
  isRowSelectable: (node) => node.data?.isValid ?? false,
};

function getRowId(params: GetRowIdParams<DisplayRow>) {
  return params.data.id;
}

function getRowClass(params: { data?: DisplayRow }) {
  return params.data?.isValid ? undefined : "bg-red-50/70";
}

const gridTheme = themeQuartz.withParams({
  accentColor: "#004502",
  headerBackgroundColor: "#f9fafb",
  rowHoverColor: "#f3f4f6",
});

type StepState = "todo" | "active" | "done" | "loading";

function FlowStep({ n, label, state }: { n: number; label: string; state: StepState }) {
  return (
    <Group gap={6} wrap="nowrap">
      <ThemeIcon size={22} radius="xl" variant={state === "todo" ? "light" : "filled"} color={state === "todo" ? "gray" : "green"}>
        {state === "done" ? (
          <IconCheck size={12} />
        ) : state === "loading" ? (
          <Loader size={10} color="white" />
        ) : (
          <Text size="xs" fw={700}>
            {n}
          </Text>
        )}
      </ThemeIcon>
      <Text size="sm" c={state === "todo" ? "dimmed" : state === "active" ? "dark" : "green.7"} fw={state === "active" ? 600 : 400}>
        {label}
      </Text>
    </Group>
  );
}

const UploadPage = observer(() => {
  const gridRef = useRef<AgGridReact<DisplayRow>>(null);
  const navigate = useNavigate();
  const [selectedCount, setSelectedCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // Ref mirrors state so AG Grid's doesExternalFilterPass reads current value without re-rendering the grid
  const [invalidOnly, setInvalidOnly] = useState(false);
  const invalidOnlyRef = useRef(false);

  function approveRow(row: DisplayRow) {
    if (!store.isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    const record = store.allRows.find((r) => r.id === row.id);
    if (!record?.isValid || !record.validData) return;
    void store.submitApproval([record.validData]);
  }

  const colDefs: ColDef<DisplayRow>[] = [
    ...COL_DEFS,
    {
      headerName: "",
      field: undefined,
      width: 90,
      pinned: "right",
      editable: false,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<DisplayRow>) => {
        if (!params.data) return null;
        if (params.data.isValid) {
          return (
            <button
              className="cursor-pointer rounded bg-primary px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
              onClick={() => params.data && approveRow(params.data)}
            >
              Approve
            </button>
          );
        }
        return (
          <button
            className="cursor-pointer rounded px-2 py-0.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
            onClick={() => params.data && store.removeRows([params.data.id])}
          >
            Remove
          </button>
        );
      },
    },
  ];

  function toggleInvalidOnly() {
    invalidOnlyRef.current = !invalidOnlyRef.current;
    setInvalidOnly(invalidOnlyRef.current);
    gridRef.current?.api.onFilterChanged();
  }

  const rowData = [...store.displayRows];

  const hasFile = store.fileName !== "";
  const submitting = store.submission.status === "submitting";
  const succeeded = store.submission.status === "success";

  const uploadStep: StepState = store.isParsing ? "loading" : hasFile ? "done" : "active";
  const reviewStep: StepState = succeeded || submitting ? "done" : store.hasData ? "active" : "todo";
  const approveStep: StepState = succeeded ? "done" : submitting ? "loading" : selectedCount > 0 ? "active" : "todo";

  function onFirstDataRendered(event: FirstDataRenderedEvent<DisplayRow>) {
    event.api.forEachNodeAfterFilterAndSort((node) => {
      if (node.data?.isValid) node.setSelected(true);
    });
    setSelectedCount(event.api.getSelectedRows().length);
  }

  function onSelectionChanged(event: SelectionChangedEvent<DisplayRow>) {
    setSelectedCount(event.api.getSelectedRows().length);
  }

  function onCellValueChanged(event: CellValueChangedEvent<DisplayRow>) {
    if (!event.colDef.field || event.colDef.field === "Claim ID") return;
    const wasValid = event.data.isValid;
    store.updateRow(event.data.id, event.colDef.field, String(event.newValue ?? ""));
    const fixed = !wasValid && store.allRows.find((r) => r.id === event.data.id)?.isValid;
    if (fixed) event.api.flashCells({ rowNodes: [event.node] });
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
    <div className="min-h-screen bg-gray-50">
      <Stack gap={24} className="p-6" maw={1200} mx="auto">
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

        <Group justify="center" gap="sm">
          <FlowStep n={1} label="Upload CSV" state={uploadStep} />
          <IconArrowRight size={14} />
          <FlowStep n={2} label="Review rows" state={reviewStep} />
          <IconArrowRight size={14} />
          <FlowStep n={3} label="Approve" state={approveStep} />
        </Group>

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
          loading={store.isParsing || store.submission.status === "submitting"}
          radius="md"
          p={hasFile ? "xs" : "xl"}
          className="border-2"
        >
          {hasFile ? (
            <Group justify="space-between" wrap="nowrap" px="sm" py={4}>
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size="lg" radius="md" variant="light" color="royalGreen">
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
            <div className="pointer-events-none flex min-h-[300px] items-center justify-center">
              <Dropzone.Accept>
                <Stack align="center" gap="md">
                  <ThemeIcon size={56} radius="xl" variant="light" color="royalGreen">
                    <IconCheck size={28} />
                  </ThemeIcon>
                  <Text size="lg" fw={700} c="royalGreen.5">
                    Drop to upload
                  </Text>
                </Stack>
              </Dropzone.Accept>
              <Dropzone.Reject>
                <Stack align="center" gap="md">
                  <ThemeIcon size={56} radius="xl" variant="light" color="red">
                    <IconX size={28} />
                  </ThemeIcon>
                  <Text size="lg" fw={700} c="red.7">
                    CSV files only
                  </Text>
                </Stack>
              </Dropzone.Reject>
              <Dropzone.Idle>
                <Stack align="center" gap="lg">
                  <ThemeIcon size={56} radius="xl" variant="light" color="royalGreen">
                    <IconCloudUpload size={28} />
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

        {store.fileError && (
          <Alert
            color={store.hasData ? "orange" : "red"}
            title={store.hasData ? "CSV warning" : "Invalid file"}
            icon={<IconAlertTriangle size={18} />}
            withCloseButton
            onClose={store.hasData ? store.clearFileError : store.clearFile}
          >
            {store.fileError}
          </Alert>
        )}

        {store.hasData && store.invalidRows.length > 0 && store.showErrors && <ValidationErrorsAlert gridRef={gridRef} />}

        {store.submission.status === "success" && (
          <Alert color="green" title="Submitted successfully" icon={<IconCircleCheck size={18} />}>
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Text size="sm">
                {selectedCount} claim{selectedCount !== 1 ? "s" : ""} sent for MRF generation.
              </Text>
              <Button component={Link} to="/mrf" size="xs" variant="light" color="green" rightSection={<IconArrowRight size={14} />}>
                View generated files
              </Button>
            </Group>
          </Alert>
        )}

        {store.submission.status === "error" && (
          <Alert color="red" title="Submission failed" icon={<IconAlertTriangle size={18} />} withCloseButton onClose={store.resetSubmission}>
            {store.submission.message}
          </Alert>
        )}

        {store.isParsing && (
          <Stack gap="sm" className="flex-1">
            <Group justify="space-between">
              <Skeleton height={26} radius={32} width={180} />
              <Skeleton height={26} width={340} />
            </Group>
            <Skeleton height={520} radius="sm" />
          </Stack>
        )}

        {store.hasData && (
          <Stack gap="sm" className="flex-1">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Badge size="lg" variant="light" color="green" leftSection={<IconCheck size={12} />}>
                  {store.validClaims.length} valid
                </Badge>
                {store.invalidRows.length > 0 && (
                  <Tooltip label={store.showErrors ? "Hide error details" : "Show error details"}>
                    <Badge size="lg" variant="light" color="orange" leftSection={<IconAlertTriangle size={12} />} className="cursor-pointer" onClick={() => store.toggleErrors()}>
                      {store.invalidRows.length} invalid
                    </Badge>
                  </Tooltip>
                )}
              </Group>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant={invalidOnly ? "light" : "default"}
                  color="orange"
                  leftSection={<IconAlertTriangle size={14} />}
                  disabled={store.invalidRows.length === 0}
                  onClick={toggleInvalidOnly}
                >
                  Invalid only
                </Button>
                <ColumnToggle gridRef={gridRef} />
                <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} disabled={selectedCount === 0} onClick={handleRemoveSelected}>
                  Remove
                </Button>
                <Button size="xs" leftSection={<IconCircleCheck size={14} />} disabled={selectedCount === 0} loading={submitting} onClick={handleApprove}>
                  Approve{selectedCount > 0 ? ` (${selectedCount})` : ""}
                </Button>
              </Group>
            </Group>

            <Box className="h-[520px]">
              <AgGridReact<DisplayRow>
                ref={gridRef}
                theme={gridTheme}
                rowData={rowData}
                columnDefs={colDefs}
                getRowId={getRowId}
                rowSelection={ROW_SELECTION}
                getRowClass={getRowClass}
                isExternalFilterPresent={() => invalidOnlyRef.current && store.invalidRows.length > 0}
                doesExternalFilterPass={(node) => node.data?.isValid === false}
                onFirstDataRendered={onFirstDataRendered}
                onSelectionChanged={onSelectionChanged}
                enableBrowserTooltips
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                  filter: true,
                  editable: true,
                  cellClass: (params) => {
                    if (!params.data || params.data.isValid) return undefined;
                    return params.data.errors.some((e) => e.field === params.colDef.field) ? "bg-red-100 font-medium" : undefined;
                  },
                  tooltipValueGetter: (params) => {
                    const colDef = params.colDef;
                    if (!params.data || params.data.isValid || !colDef || !("field" in colDef)) return null;
                    const field = colDef.field;
                    const messages = params.data.errors.filter((e) => e.field === field).map((e) => e.message);
                    return messages.length > 0 ? messages.join("\n") : null;
                  },
                }}
                onCellValueChanged={onCellValueChanged}
              />
            </Box>
          </Stack>
        )}
      </Stack>
    </div>
  );
});

export default UploadPage;
