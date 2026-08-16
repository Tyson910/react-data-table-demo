import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import { Alert, Anchor, Badge, Button, Code, Group, Modal, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import * as z from "zod";
import { rpc } from "../../lib/api.ts";
import { IconDownload, IconEye, IconFileCode } from "../../components/Icons.tsx";
import { formatBytes, formatDate } from "../../lib/format.ts";
import { parseResponse } from "hono/client";

const mrfFileMetaSchema = z.object({
  name: z.string(),
  size: z.number(),
  createdAt: z.string(),
  reportingEntityName: z.string(),
  planName: z.string(),
  planId: z.string(),
  lastUpdatedOn: z.string(),
  content: z.string().nullable(),
});

type MrfFileMeta = z.infer<typeof mrfFileMetaSchema>;

export async function mrfFilesLoader(): Promise<MrfFileMeta[]> {
  const data = await parseResponse(rpc.api.mrf.files.$get());
  return Promise.all(
    data.files.map(async (file) => {
      try {
        const contentResponse = await rpc.api.mrf.files[":name"].$get({ param: { name: file.name } });
        if (!contentResponse.ok) return { ...file, content: null };
        return { ...file, content: await contentResponse.text() };
      } catch {
        // Keep the file metadata available even when its content cannot be loaded.
        return {
          ...file,
          content: null,
        };
      }
    }),
  );
}

function PreviewModal({ name, content, opened, onClose }: { name: string; content: string | null; opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title={name} size="xl" centered>
      {content === null && (
        <Text c="red" size="sm">
          Failed to load file content.
        </Text>
      )}
      {content !== null && (
        <ScrollArea h={500}>
          <Code block>{content}</Code>
        </ScrollArea>
      )}
    </Modal>
  );
}

export default function MrfFilesPage() {
  const files = z.array(mrfFileMetaSchema).parse(useLoaderData());
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const selectedFile = files.find((file) => file.name === previewFile);

  return (
    <Stack p="xl" gap="lg" maw={1200} mx="auto">
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

      {selectedFile && <PreviewModal name={selectedFile.name} content={selectedFile.content} opened onClose={() => setPreviewFile(null)} />}

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
                      <Button variant="subtle" size="compact-xs" color="gray" leftSection={<IconEye size={14} />} onClick={() => setPreviewFile(file.name)}>
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
}
