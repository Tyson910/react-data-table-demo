import { Link } from "react-router-dom";
import { SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCloudUpload, IconFileCode } from "../components/Icons.tsx";

export default function MainPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Stack gap="xl" align="center" maw={640}>
        <Stack gap="xs" align="center">
          <Title order={1} ta="center">
            MRF Generator
          </Title>
          <Text c="dimmed" ta="center" size="lg">
            Upload claims data, validate and review rows, then generate Machine-Readable Files for Transparency in Coverage compliance.
          </Text>
        </Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" w="100%">
          <Link to="/upload" className="no-underline">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-8 transition-shadow hover:shadow-md">
              <ThemeIcon size={48} radius="xl" variant="light">
                <IconCloudUpload size={24} />
              </ThemeIcon>
              <Text fw={600} c="dark">
                Upload Claims
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Parse and validate a CSV file, review rows, and approve claims for MRF generation.
              </Text>
            </div>
          </Link>
          <Link to="/mrf" className="no-underline">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-8 transition-shadow hover:shadow-md">
              <ThemeIcon size={48} radius="xl" variant="light" color="teal">
                <IconFileCode size={24} />
              </ThemeIcon>
              <Text fw={600} c="dark">
                View MRF Files
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Browse and download generated Machine-Readable Files published for compliance.
              </Text>
            </div>
          </Link>
        </SimpleGrid>
      </Stack>
    </div>
  );
}
