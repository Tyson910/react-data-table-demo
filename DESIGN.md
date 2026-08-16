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

The application uses one MobX `AppStore` (`frontend/src/stores/store.ts`), as required by the challenge. The store is intentionally organized into three sections:

- **Authentication:** current user, available users, login, logout, and session initialization.
- **CSV draft:** selected file metadata, parsed rows, row edits, row removal, validation visibility, and derived row collections.
- **Submission:** request progress, success state, and user-facing submission errors.

The CSV draft is client-owned working state. The store keeps the original row data and validation results together so edits can immediately re-run validation. Computed getters expose `validClaims`, `invalidRows`, and `displayRows` without duplicating derived state.

API calls remain inside store actions so the UI can use one consistent observable state source and handle loading and error states in the same place.

### Server-state tradeoff

In a production application, TanStack Query would be a strong fit for server state and asynchronous workflows such as authentication, MRF file listings, caching, refetching, and mutation status. It separates server state from client-owned state and avoids manually managing request lifecycles.

For this challenge, MobX is intentionally used for both client and asynchronous state to satisfy the requirement to use MobX for all state management and keep it in one file. The current separation in `AppStore` preserves clear domain boundaries while remaining compliant. The API calls are isolated in actions, so the CSV draft model could later be retained while server-state concerns are migrated to TanStack Query if the application requirements change.

## API Interaction

The frontend uses the typed Hono RPC client in `frontend/src/services/api.ts` to call the backend. Authentication uses the `/api/auth` endpoints (`backend/src/auth.routes.ts`). Approved claims are sent to the MRF generation endpoint (`backend/src/mrf.routes.ts`), and the backend repository keeps generated JSON files on disk.

The backend persists generated files through a repository abstraction; the pattern and its responsibilities are described below.

## Design Patterns

The MRF generation workflow uses the Strategy pattern to separate billing-class-specific rules. `ProfessionalAllowedAmountStrategy` handles professional claims and service codes, while `InstitutionalAllowedAmountStrategy` handles institutional claims (both in `backend/src/mrf.service.ts`). The strategy registry selects the implementation from the claim type.

The backend uses the Repository pattern through `MrfFileRepository` (`backend/src/mrf.repository.ts`). `LocalMrfFileRepository` owns filesystem persistence, keeping disk-specific operations out of the routes and generation logic. This allows an in-memory repository for tests or a `RemoteFileRepository` implementation backed by object storage or another remote service later:

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

`backend/src/mrf.service.ts` acts as a Service Layer. It coordinates claim grouping, averaging, strategy selection, and final MRF schema validation without depending on HTTP or storage concerns. The route layer remains responsible for request validation, service invocation, and persistence.

## Routing

React Router provides the following frontend routes (`frontend/src/routes.tsx`):

- `/` — application home page with navigation to upload and MRF views
- `/upload` — CSV upload, validation, editing, and approval workflow
- `/login` — dummy user selection and authentication
- `/mrf` — public compliance page listing generated MRF files (standalone layout, no authentication required)

`BasicLayout` (`frontend/src/layout/BasicLayout.tsx`) provides the shared header and outlet layout for the authenticated pages. The `/mrf` route renders outside `BasicLayout` with its own minimal header, since it is a public-facing compliance page that external users may access directly.

## Component Responsibilities

- `BasicLayout` (`frontend/src/layout/BasicLayout.tsx`) renders shared navigation and the current-user affordance.
- `LoginPage` (`frontend/src/pages/login/index.tsx`) handles user selection and login interaction.
- `UploadPage` (`frontend/src/pages/upload/index.tsx`) coordinates file upload, grid editing, validation feedback, row removal, and approval.
- `AppStore` (`frontend/src/stores/store.ts`) owns observable state and actions shared by these components.
- `MrfFilesPage` (`frontend/src/pages/mrf/index.tsx`) is a standalone public page that fetches and displays generated MRF files with preview and download capabilities.
- Validator utilities (`validators/src/claims.validator.ts`) and display-row transformations keep schema and presentation logic out of the React components where practical.

## Error Handling

Errors are handled at three levels:

- **CSV parsing:** Papaparse may report row-level issues (malformed delimiters, inconsistent column counts). These are surfaced as a dismissible warning in the upload UI. The successfully parsed rows are still displayed so users can review what was extracted.
- **Schema validation:** Each parsed row is validated against the claims Zod schema (`validators/src/claims.validator.ts`), which includes type coercion, enum checks, and cross-field refinements (money ordering: Billed >= Allowed >= Paid; date sequencing: Service <= Received <= Entry <= Processed <= Paid). Validation errors are collected per-row and displayed in `ValidationErrorsAlert` (`frontend/src/pages/upload/ValidationErrorsAlert.tsx`) with field-level detail, clickable jump-to-row navigation, and expandable tooltips. Invalid rows are visually marked in the grid and excluded from selection.
- **API errors:** Network failures and server validation errors from the MRF generation endpoint are caught in the store's `submitApproval` action (`frontend/src/stores/store.ts`) and displayed as dismissible alerts. The backend uses `@hono/zod-validator` (in `backend/src/mrf.routes.ts` and `backend/src/auth.routes.ts`) to return structured validation errors, which the store formats into user-readable messages.
