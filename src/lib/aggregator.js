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

  // Registry of workspaces with table names
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS aggregator_registry (
      id TEXT PRIMARY KEY,
      projectname TEXT NOT NULL,
      url TEXT NOT NULL,
      tables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return true;
}

async function upsertWorkspace(workspace, tableNames = []) {
  const client = getAggregatorClient();
  if (!client) return false;
  await ensureAggregatorSchema();
  await client.$executeRawUnsafe(
    `INSERT INTO aggregator_registry (id, projectname, url, tables)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET projectname = EXCLUDED.projectname, url = EXCLUDED.url, tables = EXCLUDED.tables`,
    workspace.id, workspace.name, workspace.databaseUrl, tableNames
  );
  return true;
}

async function deleteWorkspaceCascade(workspaceId) {
  const client = getAggregatorClient();
  if (!client) return false;
  await ensureAggregatorSchema();
  await client.$executeRawUnsafe(`DELETE FROM aggregator_registry WHERE id = $1`, workspaceId);
  return true;
}

async function recordAdmin() { return false }

async function deleteAdmin() { return false }

async function recordUser() { return false }

async function deleteUser() { return false }

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