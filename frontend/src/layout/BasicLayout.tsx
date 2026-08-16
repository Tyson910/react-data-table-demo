import { Outlet, Link } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { Button, Group, Text } from "@mantine/core";
import { store } from "../stores/store.ts";

const BasicLayout = observer(() => {
  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <Text fw={700} size="sm" c="royalGreen.5" component={Link} to="/" style={{ textDecoration: "none" }}>
          MRF Generator
        </Text>
        <Group gap="sm">
          {store.currentUser ? (
            <>
              <Text size="sm" c="dimmed">
                {store.currentUser.name}
              </Text>
              <Button size="xs" variant="default" component={Link} to="/login">
                Switch user
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
