export interface User {
  id: number;
  name: string;
  email: string;
}

export const users = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com" },
  { id: 2, name: "Bob Smith", email: "bob@example.com" },
  { id: 3, name: "Carol Williams", email: "carol@example.com" },
] as const satisfies User[];

// Keep the startup hook so the server entrypoint does not need storage-specific logic.
