require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Use the standard, stable Prisma Client for local SQLite
const prisma = new PrismaClient();

module.exports = prisma;
