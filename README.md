# MRF Generator

A React application for uploading, validating, and approving claims data to generate Machine-Readable Files (MRFs) in compliance with the Transparency in Coverage regulations.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+

## Setup

Install all workspace dependencies from the project root:

```bash
pnpm install
```

## Running the Application

Start the backend and frontend dev servers in separate terminals:

```bash
# Terminal 1 — backend (Hono on port 8080)
pnpm dev:backend

# Terminal 2 — frontend (Vite on port 5173, proxies API to backend)
pnpm dev:frontend
```

Then open [http://localhost:5173](http://localhost:5173).

## Project Structure

```
frontend/          React application (Vite)
  src/
    components/    Shared reusable components
    layout/        Page layout wrappers
    pages/         Route-level page components
    services/      API client and backend interaction
    stores/        MobX state management (single file)
    utils/         Utility functions (formatting, etc.)
backend/           Hono API server
  src/             Routes, services, repository, middleware
  mrf-output/      Generated MRF JSON files (gitignored)
validators/        Shared Zod schemas (@mano/validators workspace package)
```

## Available Scripts

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `pnpm dev:frontend` | Start the frontend dev server                    |
| `pnpm dev:backend`  | Start the backend dev server                     |
| `pnpm typecheck`    | Run TypeScript type checking across all packages |
| `pnpm lint`         | Run oxlint and prettier checks                   |
| `pnpm fmt`          | Format all files with prettier                   |

## Dependencies

| Tool                                     | Purpose                   |
| ---------------------------------------- | ------------------------- |
| [Mantine](https://mantine.dev/)          | UI component library      |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS styling |
| [MobX](https://mobx.js.org/)             | State management          |
| [Papaparse](https://www.papaparse.com/)  | CSV parsing               |
| [AG Grid](https://www.ag-grid.com/)      | Data table                |
| [React Router](https://reactrouter.com/) | Client-side routing       |
| [Zod](https://zod.dev/)                  | Schema validation         |
| [Hono](https://hono.dev/)                | Backend API framework     |
|                                          |

## Authentication

The app uses cookie-based session authentication with demo users seeded in memory. No registration is needed — click **Sign in** in the header to pick a user, or use **Switch user** to change identities. Authentication is required to approve claims; unauthenticated users can still upload and review CSV data.

## Configuration

The backend uses an in-memory JavaScript array seeded with demo users. Generated MRF files are stored in `backend/mrf-output/`.

The frontend Vite config proxies `/api` requests to the backend during development.
