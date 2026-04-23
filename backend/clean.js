require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clean() {
  await prisma.user.deleteMany({});
  console.log('Database Users Cleared!');
}

clean()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
