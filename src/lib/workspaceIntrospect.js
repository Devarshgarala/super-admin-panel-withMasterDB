const { PrismaClient } = require('@prisma/client');

async function listPublicTables(databaseUrl) {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const rows = await client.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_prisma%' -- ignore prisma tables if any
      ORDER BY table_name
    `);
    return rows.map(r => r.table_name);
  } finally {
    await client.$disconnect();
  }
}

module.exports = { listPublicTables };