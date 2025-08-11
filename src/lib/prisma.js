const { PrismaClient } = require('@prisma/client');

const masterPrisma = new PrismaClient();

module.exports = { masterPrisma };