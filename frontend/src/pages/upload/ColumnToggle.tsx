import type { RefObject } from "react";
import type { ColDef } from "ag-grid-community";
import type { AgGridReact } from "ag-grid-react";
import type { DisplayRow } from "../../stores/store.ts";

import { useState } from "react";
import { Button, Checkbox, Popover, ScrollArea, Stack } from "@mantine/core";
import { IconColumns } from "../../components/Icons.tsx";
import { COL_DEFS } from "./columns.ts";

const ALL_COLUMNS: string[] = COL_DEFS.flatMap((c: ColDef<DisplayRow>) => (c.field != null ? [c.field] : []));
const DEFAULT_VISIBLE: Set<string> = new Set(COL_DEFS.filter((c: ColDef<DisplayRow>) => !c.hide).flatMap((c: ColDef<DisplayRow>) => (c.field != null ? [c.field] : [])));

export function ColumnToggle({ gridRef }: { gridRef: RefObject<AgGridReact<DisplayRow> | null> }) {
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
