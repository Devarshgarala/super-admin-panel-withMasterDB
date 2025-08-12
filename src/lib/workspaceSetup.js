const { PrismaClient } = require('@prisma/client');

async function setupWorkspaceDatabase(databaseUrl) {
    const client = new PrismaClient({
        datasources: {
            db: { url: databaseUrl }
        }
    });

    try {
        console.log('Setting up workspace database tables...');

        // Ensure pgcrypto for gen_random_uuid
        await client.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

        // Create admins table
        await client.$executeRaw`
            CREATE TABLE IF NOT EXISTS admins (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // Create users table
        await client.$executeRaw`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT,
                role TEXT DEFAULT 'user',
                "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
            );
        `;

        console.log('Database tables created successfully');
        return true;
    } catch (error) {
        console.error('Error setting up database:', error);
        throw error;
    } finally {
        await client.$disconnect();
    }
}

module.exports = { setupWorkspaceDatabase };