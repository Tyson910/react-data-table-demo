import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { Button, Group, Text } from "@mantine/core";
import UserSwitchModal from "../components/UserSwitchModal.tsx";
import { store } from "../stores/store.ts";

const BasicLayout = observer(() => {
  const [switchUserOpen, setSwitchUserOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen w-full flex-col">
      <UserSwitchModal opened={switchUserOpen} onClose={() => setSwitchUserOpen(false)} />
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <Group gap="md">
          <Text fw={700} size="sm" c="royalGreen.5" component={Link} to="/" className="no-underline">
            MRF Generator
          </Text>
          <Button size="xs" variant={pathname === "/upload" ? "light" : "subtle"} color={pathname === "/upload" ? "royalGreen" : "gray"} component={Link} to="/upload">
            Upload
          </Button>
          <Button size="xs" variant={pathname === "/mrf" ? "light" : "subtle"} color={pathname === "/mrf" ? "royalGreen" : "gray"} component={Link} to="/mrf">
            MRF Files
          </Button>
        </Group>
        <Group gap="sm">
          {store.currentUser ? (
            <>
              <Text size="sm" c="dimmed">
                {store.currentUser.name}
              </Text>
              <Button size="xs" variant="default" onClick={() => setSwitchUserOpen(true)}>
                Switch user
              </Button>
              <Button size="xs" variant="subtle" color="gray" onClick={() => void store.logout()}>
                Log out
              </Button>
            </>
          ) : (
            <Button size="xs" variant="default" component={Link} to="/login">
              Sign in
            </Button>
          )}
        </Group>
      </header>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
});

export default BasicLayout;
