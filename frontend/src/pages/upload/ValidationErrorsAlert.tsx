import type { RefObject } from "react";
import type { DisplayRow, InvalidRow } from "../../stores/store.ts";
import type { AgGridReact } from "ag-grid-react";

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Alert, Badge, Button, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle } from "../../components/Icons.tsx";
import { store } from "../../stores/store.ts";

const ERROR_PREVIEW_COUNT = 5;

function jumpToRow(gridRef: RefObject<AgGridReact<DisplayRow> | null>, id: string) {
  const api = gridRef.current?.api;
  const node = api?.getRowNode(id);
  if (!api || !node || node.rowIndex == null) return;
  api.ensureIndexVisible(node.rowIndex, "middle");
  api.setFocusedCell(node.rowIndex, "Claim ID");
  api.flashCells({ rowNodes: [node] });
}

function ErrorRowEntry({ row, onJump }: { row: InvalidRow; onJump: () => void }) {
  const [first, ...rest] = row.errors;
  return (
    <Tooltip
      label={
        <Text>
          {row.errors.map((error, index) => (
            <span key={`${error.field}-${index}`}>
              {index > 0 && <br />}
              {error.field}: {error.message}
            </span>
          ))}
        </Text>
      }
      multiline
      maw={360}
    >
      <UnstyledButton onClick={onJump} className="block w-full rounded px-1.5 py-0.5 text-left hover:bg-orange-100">
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={600} miw={72}>
            Row {row.rowIndex}
          </Text>
          <Text size="sm" lineClamp={1}>
            {first ? `${first.field}: ${first.message}` : "Invalid row"}
            {rest.length > 0 ? ` (+${rest.length} more)` : ""}
          </Text>
        </Group>
      </UnstyledButton>
    </Tooltip>
  );
}

export const ValidationErrorsAlert = observer(({ gridRef }: { gridRef: RefObject<AgGridReact<DisplayRow> | null> }) => {
  const [expanded, setExpanded] = useState(false);
  const rows = store.invalidRows;

  const byField = rows
    .flatMap(({ errors, rowIndex }) => errors.map(({ field }) => ({ field, rowIndex })))
    .reduce<Record<string, Set<number>>>((acc, { field, rowIndex }) => {
      (acc[field] ??= new Set()).add(rowIndex);
      return acc;
    }, {});

  const summary = Object.entries(byField)
    .map(([field, lines]) => ({ field, count: lines.size }))
    .sort((a, b) => b.count - a.count);

  const shown = expanded ? rows : rows.slice(0, ERROR_PREVIEW_COUNT);

  return (
    <Alert
      color="orange"
      title={`${rows.length} row${rows.length !== 1 ? "s" : ""} failed validation`}
      icon={<IconAlertTriangle size={18} />}
      withCloseButton
      onClose={() => store.dismissErrors()}
    >
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          Click a row to jump to it in the table. Hover for full error details.
        </Text>
        <Group gap={6}>
          {summary.map((s) => (
            <Badge key={s.field} color="orange" variant="light" size="sm">
              {s.field} · {s.count}
            </Badge>
          ))}
        </Group>
        <Stack gap={2}>
          {shown.map((row) => (
            <ErrorRowEntry key={row.id} row={row} onJump={() => jumpToRow(gridRef, row.id)} />
          ))}
        </Stack>
        {rows.length > ERROR_PREVIEW_COUNT && (
          <Button variant="subtle" color="orange" size="compact-xs" className="self-start" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show fewer rows" : `Show all ${rows.length} rows`}
          </Button>
        )}
      </Stack>
    </Alert>
  );
});
