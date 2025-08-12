const { PrismaClient } = require('@prisma/client');

let aggregatorClient = null;

function getAggregatorClient() {
  const url = process.env.WORKSPACE_PANEL_DATABASE_URL;
  if (!url) return null;
  if (!aggregatorClient) {
    aggregatorClient = new PrismaClient({ datasources: { db: { url } } });
  }
  return aggregatorClient;
}

async function ensureAggregatorSchema() {
  const client = getAggregatorClient();
  if (!client) return false;

  // Create basic aggregator tables if they do not exist
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS aggregator_workspaces (
      workspace_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      database_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS aggregator_admins (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS aggregator_users (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return true;
}

async function upsertWorkspace(workspace) {
  const client = getAggregatorClient();
  if (!client) return false;
  await ensureAggregatorSchema();
  await client.$executeRawUnsafe(
    `INSERT INTO aggregator_workspaces (workspace_id, name, database_url)
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id) DO UPDATE SET name = EXCLUDED.name, database_url = EXCLUDED.database_url`,
    workspace.id, workspace.name, workspace.databaseUrl
  );
  return true;
}

async function deleteWorkspaceCascade(workspaceId) {
  const client = getAggregatorClient();
  if (!client) return false;
  await ensureAggregatorSchema();
  await client.$executeRawUnsafe(`DELETE FROM aggregator_admins WHERE workspace_id = $1`, workspaceId);
  await client.$executeRawUnsafe(`DELETE FROM aggregator_users WHERE workspace_id = $1`, workspaceId);
  await client.$executeRawUnsafe(`DELETE FROM aggregator_workspaces WHERE workspace_id = $1`, workspaceId);
  return true;
}

async function recordAdmin(workspaceId, admin) {
  const client = getAggregatorClient();
  if (!client) return false;
  await ensureAggregatorSchema();
  await client.$executeRawUnsafe(
    `INSERT INTO aggregator_admins (id, workspace_id, name, email, role, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role`,
    admin.id, workspaceId, admin.name, admin.email, admin.role || 'admin'
  );
  return true;
}

async function deleteAdmin(adminId) {
  const client = getAggregatorClient();
  if (!client) return false;
  await ensureAggregatorSchema();
  await client.$executeRawUnsafe(`DELETE FROM aggregator_admins WHERE id = $1`, adminId);
  return true;
}

async function recordUser(workspaceId, user) {
  const client = getAggregatorClient();
  if (!client) return false;
  await ensureAggregatorSchema();
  await client.$executeRawUnsafe(
    `INSERT INTO aggregator_users (id, workspace_id, name, email, role, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role`,
    user.id, workspaceId, user.name, user.email, user.role || 'user'
  );
  return true;
}

async function deleteUser(userId) {
  const client = getAggregatorClient();
  if (!client) return false;
  await ensureAggregatorSchema();
  await client.$executeRawUnsafe(`DELETE FROM aggregator_users WHERE id = $1`, userId);
  return true;
}

module.exports = {
  getAggregatorClient,
  ensureAggregatorSchema,
  upsertWorkspace,
  deleteWorkspaceCascade,
  recordAdmin,
  deleteAdmin,
  recordUser,
  deleteUser,
};