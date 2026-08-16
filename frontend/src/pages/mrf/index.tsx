import type { AllowedAmountsFile } from "@mano/validators";

import { useLoaderData } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { Alert, Anchor, Badge, Button, Code, Group, Loader, Modal, Paper, ScrollArea, SimpleGrid, Skeleton, Stack, Table, Tabs, Text, Title } from "@mantine/core";
import * as z from "zod";
import { IconDownload, IconEye, IconFileCode } from "../../components/Icons.tsx";
import { formatBytes, formatDate } from "../../utils/format.ts";
import { store } from "../../stores/store.ts";
import { rpc } from "../../services/api.ts";

const mrfFileMetaSchema = z.object({
  name: z.string(),
  size: z.number(),
  createdAt: z.string(),
  reportingEntityName: z.string(),
  planName: z.string(),
  planId: z.string(),
  lastUpdatedOn: z.string(),
});

type MrfFileMeta = z.infer<typeof mrfFileMetaSchema>;

export async function mrfFilesLoader(): Promise<MrfFileMeta[]> {
  const res = await rpc.api.mrf.files.$get();
  if (!res.ok) throw new Error("Failed to fetch MRF files");
  const data = await res.json();
  return data.files;
}

function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text size="sm">{value === null || value === undefined || value === "" ? "—" : String(value)}</Text>
    </Stack>
  );
}

function Summary({ data }: { data: AllowedAmountsFile }) {
  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        <Paper withBorder p="md">
          <Field label="Reporting entity" value={data.reporting_entity_name} />
        </Paper>
        <Paper withBorder p="md">
          <Field label="Plan" value={"plan_name" in data ? data.plan_name : undefined} />
        </Paper>
        <Paper withBorder p="md">
          <Field label="Last updated" value={data.last_updated_on} />
        </Paper>
        <Paper withBorder p="md">
          <Field label="Reporting entity type" value={data.reporting_entity_type} />
        </Paper>
        <Paper withBorder p="md">
          <Field label="Version" value={data.version} />
        </Paper>
        <Paper withBorder p="md">
          <Field label="Billing code entries" value={data.out_of_network.length} />
        </Paper>
      </SimpleGrid>

      <Table.ScrollContainer minWidth={700} type="native">
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Allowed amounts</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.out_of_network.map((entry) => (
              <Table.Tr key={`${entry.billing_code_type}-${entry.billing_code}`}>
                <Table.Td>
                  <Text size="sm" fw={600}>
                    {entry.billing_code}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{entry.description}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{entry.billing_code_type}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{entry.allowed_amounts.length}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}

const PreviewModal = observer(() => {
  const preview = store.mrfPreview;
  if (!preview) return null;

  return (
    <Modal opened onClose={store.closeMrfPreview} title={preview.name} size="xl" centered>
      {preview.status === "loading" && <Loader display="block" mx="auto" my="xl" />}
      {preview.status === "error" && (
        <Text c="red" size="sm">
          {preview.error}
        </Text>
      )}
      {preview.status === "success" && (
        <Tabs defaultValue="summary">
          <Tabs.List>
            <Tabs.Tab value="summary">Summary</Tabs.Tab>
            <Tabs.Tab value="raw">Raw JSON</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="summary" pt="md">
            <Summary data={preview.data} />
          </Tabs.Panel>
          <Tabs.Panel value="raw" pt="md">
            <ScrollArea h={500}>
              <Code block>{JSON.stringify(preview.data, null, 2)}</Code>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      )}
    </Modal>
  );
});

export function MrfFilesLoading() {
  return (
    <Stack p="xl" gap="lg">
      <div>
        <Skeleton height={28} width={300} mb="xs" />
        <Skeleton height={16} width={500} />
      </div>
      <Stack gap="xs">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={48} radius="sm" />
        ))}
      </Stack>
    </Stack>
  );
}

const MrfFilesPage = observer(() => {
  const files = z.array(mrfFileMetaSchema).parse(useLoaderData());

  return (
    <Stack p="xl" gap="lg">
      <div>
        <Title order={2}>Machine-Readable Files</Title>
        <Text size="sm" c="dimmed" mt={4}>
          These machine-readable files are published in compliance with the Transparency in Coverage final rule. Each file contains allowed amount data for out-of-network
          providers.
        </Text>
      </div>

      {files.length === 0 && (
        <Alert color="blue" variant="light">
          No MRF files have been generated yet. Upload and approve claims to generate files.
        </Alert>
      )}

      <PreviewModal />

      {files.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>File</Table.Th>
                <Table.Th>Plan</Table.Th>
                <Table.Th>Reporting Entity</Table.Th>
                <Table.Th>Last Updated</Table.Th>
                <Table.Th>Size</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {files.map((file) => (
                <Table.Tr key={file.name}>
                  <Table.Td>
                    <Group gap={8} wrap="nowrap">
                      <IconFileCode size={16} />
                      <Text size="sm" fw={500} truncate>
                        {file.name}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{file.planName || "—"}</Text>
                    {file.planId && (
                      <Badge size="xs" variant="light" color="gray" mt={2}>
                        {file.planId}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{file.reportingEntityName || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{file.lastUpdatedOn || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatBytes(file.size)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatDate(file.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Button variant="subtle" size="compact-xs" color="gray" leftSection={<IconEye size={14} />} onClick={() => store.openMrfPreview(file.name)}>
                        Preview
                      </Button>
                      <Anchor href={`/api/mrf/files/${file.name}`} target="_blank" size="sm">
                        <Group gap={4} wrap="nowrap">
                          <IconDownload size={14} />
                          Download
                        </Group>
                      </Anchor>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </Stack>
  );
});

export default MrfFilesPage;
