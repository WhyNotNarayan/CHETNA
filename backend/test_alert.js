const prisma = require('./src/lib/prisma');
const { findNearestSecretCops } = require('./src/utils/geo');

async function main() {
  console.log('Fetching users...');
  const users = await prisma.user.findMany({
    include: { lastLocation: true }
  });
  console.log('Total users:', users.length);
  console.log(users.map(u => ({ id: u.id, fullName: u.fullName, role: u.role, isVerified: u.isVerified, lastLocation: u.lastLocation })));

  const secretCops = await prisma.user.findMany({
    where: {
      role: 'SECRET_COP',
      isVerified: true,
      lastLocation: { isNot: null }
    },
    include: {
      lastLocation: true
    }
  });
  console.log('Secret cops count:', secretCops.length);

  try {
    const userId = users[0]?.id;
    if (!userId) {
      console.log('No users found in database to test.');
      return;
    }
    const alert = await prisma.alert.create({
      data: {
        userId,
        latitude: parseFloat(16.05),
        longitude: parseFloat(73.5),
        triggerType: 'TOUCH',
        status: 'ACTIVE'
      }
    });
    console.log('Created alert successfully:', alert);
  } catch (e) {
    console.error('Error creating alert:', e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
