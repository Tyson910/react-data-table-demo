# Application Design

## Overview

The frontend is a React application using React Router for navigation, Mantine for UI components, Tailwind CSS for layout and styling, AG Grid for claim review, Papa Parse for CSV parsing, and Zod for claim validation. The backend exposes the authentication and MRF-generation APIs and persists generated files through a local file repository.

The main workflow is:

1. The user selects a CSV file.
2. Papa Parse converts the file into rows.
3. Each row is validated against the claims schema.
4. AG Grid displays valid and invalid rows, allowing valid claims to be edited or removed.
5. The user submits selected valid claims to the backend.
6. The backend generates and stores the MRF output.

## State Management

The application uses one MobX `AppStore`, as required by the challenge. The store is intentionally organized into three sections:

- **Authentication:** current user, available users, login, logout, and session initialization.
- **CSV draft:** selected file metadata, parsed rows, row edits, row removal, validation visibility, and derived row collections.
- **Submission:** request progress, success state, and user-facing submission errors.

The CSV draft is client-owned working state. The store keeps the original row data and validation results together so edits can immediately re-run validation. Computed getters expose `validClaims`, `invalidRows`, and `displayRows` without duplicating derived state.

API calls remain inside store actions so the UI can use one consistent observable state source and handle loading and error states in the same place.

### Server-state tradeoff

In a production application, TanStack Query would be a strong fit for server state and asynchronous workflows such as authentication, MRF file listings, caching, refetching, and mutation status. It separates server state from client-owned state and avoids manually managing request lifecycles.

For this challenge, MobX is intentionally used for both client and asynchronous state to satisfy the requirement to use MobX for all state management and keep it in one file. The current separation in `AppStore` preserves clear domain boundaries while remaining compliant. The API calls are isolated in actions, so the CSV draft model could later be retained while server-state concerns are migrated to TanStack Query if the application requirements change.

## API Interaction

The frontend uses the typed Hono RPC client in `frontend/src/lib/api.ts` to call the backend. Authentication uses the `/api/auth` endpoints. Approved claims are sent to the MRF generation endpoint, and the backend repository keeps generated JSON files on disk.

The `authRequired` middleware in `backend/src/auth.middleware.ts` was added because the frontend sign-in check provides user feedback, but the backend must enforce the rule because API clients can bypass the UI. The middleware is attached specifically to `POST /api/mrf/generate`, the endpoint that accepts claims and writes files to the server, but can easily be added on a route by route basis.

The backend persists generated files through a repository abstraction; the pattern and its responsibilities are described below.

## Design Patterns

The MRF generation workflow uses the Strategy pattern to separate billing-class-specific rules. `ProfessionalAllowedAmountStrategy` handles professional claims and service codes, while `InstitutionalAllowedAmountStrategy` handles institutional claims. The strategy registry selects the implementation from the claim type.

The backend uses the Repository pattern through `MrfFileRepository`. `LocalMrfFileRepository` owns filesystem persistence, keeping disk-specific operations out of the routes and generation logic. This allows an in-memory repository for tests or a `RemoteFileRepository` implementation backed by object storage or another remote service later:

```ts
class RemoteFileRepository implements MrfFileRepository {
  async save(name: string, content: string) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: name,
        Body: content,
        ContentType: "application/json",
      }),
    );
  }

  async list() {
    const response = await s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
    return response.Contents ?? [];
  }
}
```

The routes would continue calling `save` and `list` without needing to know whether files are stored locally or remotely.

`mrf.service.ts` acts as a Service Layer. It coordinates claim grouping, averaging, strategy selection, and final MRF schema validation without depending on HTTP or storage concerns. The route layer remains responsible for request validation, service invocation, and persistence.

## Routing

React Router provides the following frontend routes:

- `/` — application home page
- `/upload` — CSV upload, validation, editing, and approval workflow
- `/login` — dummy user selection and authentication

`BasicLayout` provides the shared header and outlet layout.

## Component Responsibilities

- `BasicLayout` renders shared navigation and the current-user affordance.
- `LoginPage` handles user selection and login interaction.
- `UploadPage` coordinates file upload, grid editing, validation feedback, row removal, and approval.
- `AppStore` owns observable state and actions shared by these components.
- Validator utilities and display-row transformations keep schema and presentation logic out of the React components where practical.
