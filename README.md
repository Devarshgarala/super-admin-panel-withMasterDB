# Super Admin Panel (React + Express + Prisma + Neon)

Tech stack: React, Prisma, Neon. This app lets a super admin create/delete workspaces. Each workspace is provisioned as a Neon project with its own `admins` and `users` tables. A master database keeps the list of workspaces and their connection URLs.

## Prerequisites
- Node 18+
- Neon account, API key, and Org ID
- Two Neon projects you create manually:
  - `master-panel` (stores the list of workspaces)
  - Optional: `workspace-panel` (aggregator mirror, unused unless you wire it up)

## Environment
Copy `.env.example` to `.env` and fill in:

- `NEON_API_KEY` and `NEON_ORG_ID`
- `MASTER_DATABASE_URL` pointing to the `master-panel` project's primary database connection string

## Install
```
# Backend deps
npm install

# Prisma client
npm run prisma:generate

# Client deps
npm --prefix client install
```

## Development
Run backend and frontend in two terminals:
```
# Terminal 1 (server on :3000)
npm run dev

# Terminal 2 (React on :5173, proxying /api to :3000)
npm run client:dev
```
Open http://localhost:5173

## Production build
```
# Build React app
npm run client:build

# Start server (serves client/dist if present)
npm start
```

## API Notes
- POST `/api/workspaces` creates a Neon project and persists the workspace in master DB. It then initializes `admins` and `users` tables in the workspace DB.
- DELETE `/api/workspaces/:id` deletes the Neon project (best-effort) and removes the workspace from master DB.
- Workspace-scoped CRUD under `/api/workspace-data/:workspaceId/*`.

## Schema
The master database has a single table `workspaces` with fields: `id`, `name`, `databaseUrl`, `neonProjectId`, timestamps.

Each workspace database has two tables auto-created:
- `admins(id, name, email, password, role, createdAt, updatedAt)`
- `users(id, name, email, password, role, createdAt, updatedAt)`

## Notes
- Ensure your Neon org allows API project creation and that `NEON_ORG_ID` is correct.
- If table creation fails due to extensions (e.g., `gen_random_uuid()`), switch to application-generated UUIDs or enable `pgcrypto` in Neon.