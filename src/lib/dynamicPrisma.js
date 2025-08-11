const { PrismaClient } = require('@prisma/client');

class DynamicPrismaManager {
    constructor() {
        this.clients = new Map();
    }

    getClient(databaseUrl) {
        if (!this.clients.has(databaseUrl)) {
            const client = new PrismaClient({
                datasources: {
                    db: {
                        url: databaseUrl
                    }
                }
            });

            // Add custom methods for raw SQL operations
            client.admin = {
                findMany: () => client.$queryRaw`SELECT * FROM admins ORDER BY "createdAt" DESC`,
                create: (data) => client.$queryRaw`
                    INSERT INTO admins (name, email, password, role, "createdAt", "updatedAt") 
                    VALUES (${data.data.name}, ${data.data.email}, ${data.data.password}, ${data.data.role || 'admin'}, NOW(), NOW()) 
                    RETURNING *
                `,
                delete: (where) => client.$queryRaw`DELETE FROM admins WHERE id = ${where.where.id} RETURNING *`
            };

            client.user = {
                findMany: () => client.$queryRaw`SELECT * FROM users ORDER BY "createdAt" DESC`,
                create: (data) => client.$queryRaw`
                    INSERT INTO users (name, email, password, role, "createdAt", "updatedAt") 
                    VALUES (${data.data.name}, ${data.data.email}, ${data.data.password}, ${data.data.role || 'user'}, NOW(), NOW()) 
                    RETURNING *
                `,
                delete: (where) => client.$queryRaw`DELETE FROM users WHERE id = ${where.where.id} RETURNING *`
            };

            this.clients.set(databaseUrl, client);
        }
        return this.clients.get(databaseUrl);
    }

    async disconnectAll() {
        for (const client of this.clients.values()) {
            await client.$disconnect();
        }
        this.clients.clear();
    }
}

const dynamicPrismaManager = new DynamicPrismaManager();

module.exports = { dynamicPrismaManager };