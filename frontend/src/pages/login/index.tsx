import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { Alert, Button, Card, Select, Stack, Text, Title } from "@mantine/core";
import { store } from "../../stores/store.ts";

const LoginPage = observer(() => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userOptions = store.availableUsers.map((u) => ({
    value: String(u.id),
    label: `${u.name} — ${u.email}`,
  }));

  const handleLogin = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      await store.login(Number(selectedId));
      navigate("/upload");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card shadow="xs" padding="xl" radius="md" withBorder w={420}>
        <Stack gap="lg">
          <div>
            <Title order={3}>Sign in</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Select a user to continue
            </Text>
          </div>

          {store.currentUser && (
            <Alert color="blue" variant="light">
              Currently signed in as <strong>{store.currentUser.name}</strong>. Select a different user below to switch.
            </Alert>
          )}

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <Select label="User" placeholder="Select a user…" data={userOptions} value={selectedId} onChange={setSelectedId} searchable />

          <Stack gap="xs">
            <Button onClick={() => void handleLogin()} loading={loading} disabled={!selectedId} fullWidth>
              Sign in
            </Button>
            <Button variant="subtle" color="gray" fullWidth component={Link} to="/upload">
              Continue as guest
            </Button>
          </Stack>
        </Stack>
      </Card>
    </div>
  );
});

export default LoginPage;
