import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Alert, Button, Modal, Select, Stack, Text } from "@mantine/core";
import { store } from "../stores/store.ts";

type UserSwitchModalProps = {
  opened: boolean;
  onClose: () => void;
};

const UserSwitchModal = observer(({ opened, onClose }: UserSwitchModalProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userOptions = store.availableUsers.map((user) => ({
    value: String(user.id),
    label: `${user.name} — ${user.email}`,
  }));

  const handleSwitch = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);

    try {
      await store.login(Number(selectedId));
      setSelectedId(null);
      onClose();
    } catch {
      setError("Unable to switch user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Switch user" centered size="sm">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Currently signed in as <strong>{store.currentUser?.name}</strong>. Select a different user to continue.
        </Text>

        {error && <Alert color="red" variant="light">{error}</Alert>}

        <Select
          label="User"
          placeholder="Select a user…"
          data={userOptions}
          value={selectedId}
          onChange={setSelectedId}
          searchable
        />

        <Button onClick={() => void handleSwitch()} loading={loading} disabled={!selectedId} fullWidth>
          Switch user
        </Button>
      </Stack>
    </Modal>
  );
});

export default UserSwitchModal;
