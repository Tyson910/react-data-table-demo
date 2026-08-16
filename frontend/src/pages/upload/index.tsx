import type {
  CellValueChangedEvent,
  GetRowIdParams,
  RowDataUpdatedEvent,
  RowSelectionOptions,
  SelectionChangedEvent,
} from "ag-grid-community";
import type { DisplayRow } from "../../stores/store.ts";

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { Dropzone } from "@mantine/dropzone";
import { Alert, Badge, Box, Button, Group, Menu, Modal, Stack, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { store } from "../../stores/store.ts";
import type { ValidClaim } from "@mano/validators";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconCloudUpload,
  IconFile,
  IconTrash,
  IconX,
} from "../../components/Icons.tsx";
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
  return params.data?.isValid ? undefined : "bg-red-50 text-red-700 border-l-4 border-red-500";
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

const UploadPage = observer(() => {
  const gridRef = useRef<AgGridReact<DisplayRow>>(null);
  const navigate = useNavigate();
  const [selectedCount, setSelectedCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [invalidOnly, setInvalidOnly] = useState(false);
  const invalidOnlyRef = useRef(false);

  function toggleInvalidOnly() {
    invalidOnlyRef.current = !invalidOnlyRef.current;
    setInvalidOnly(invalidOnlyRef.current);
    gridRef.current?.api.onFilterChanged();
  }

  const rowData = [...store.displayRows];

  const hasFile = store.fileName !== "";

  function onRowDataUpdated(event: RowDataUpdatedEvent<DisplayRow>) {
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

      <Group justify="center" gap="sm">
        <FlowStep n={1} label="Upload CSV" />
        <IconArrowRight size={14} />
        <FlowStep n={2} label="Review rows" />
        <IconArrowRight size={14} />
        <FlowStep n={3} label="Approve" />
      </Group>

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

      {store.fileError && (
        <Alert color="red" title="Invalid file" icon={<IconAlertTriangle size={18} />} withCloseButton onClose={() => store.clearFile()}>
          {store.fileError}
        </Alert>
      )}

      {store.hasData && store.invalidRows.length > 0 && store.showErrors && <ValidationErrorsAlert gridRef={gridRef} />}

      {store.submitSuccess && (
        <Alert color="green" title="Submitted successfully" icon={<IconCircleCheck size={18} />}>
          {selectedCount} claim{selectedCount !== 1 ? "s" : ""} sent for MRF generation.
        </Alert>
      )}

      {store.submitError && (
        <Alert color="red" title="Submission failed" icon={<IconAlertTriangle size={18} />} withCloseButton onClose={store.clearSubmitError}>
          {store.submitError}
        </Alert>
      )}

      {store.hasData && (
        <Stack gap="sm" style={{ flex: 1 }}>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Badge size="lg" variant="light" color="green" leftSection={<IconCheck size={12} />}>
                {store.validClaims.length} valid
              </Badge>
              {store.invalidRows.length > 0 && (
                <Tooltip label={store.showErrors ? "Hide error details" : "Show error details"}>
                  <Badge size="lg" variant="light" color="orange" leftSection={<IconAlertTriangle size={12} />} style={{ cursor: "pointer" }} onClick={() => store.toggleErrors()}>
                    {store.invalidRows.length} invalid — not selectable
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
              getRowClass={getRowClass}
              isExternalFilterPresent={() => invalidOnlyRef.current && store.invalidRows.length > 0}
              doesExternalFilterPass={(node) => node.data?.isValid === false}
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
