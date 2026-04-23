require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');

// Force-feeding the absolute path for Windows Prisma 7 stability
const libsql = createClient({
  url: "file:e:/CHETNA/backend/prisma/dev.db",
});
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
