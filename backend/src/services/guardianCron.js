const cron = require('node-cron');
const guardianController = require('../controllers/guardianController');

let isRunning = false;

const checkExpiredSessions = async () => {
  if (isRunning) {
    console.log('[Guardian Cron] Previous check still running, skipping...');
    return;
  }

  isRunning = true;
  try {
    const expiredCount = await guardianController.checkExpiredSessions();
    if (expiredCount > 0) {
      console.log(`[Guardian Cron] Processed ${expiredCount} expired session(s)`);
    }
  } catch (error) {
    console.error('[Guardian Cron] Error:', error.message);
  } finally {
    isRunning = false;
  }
};

const startGuardianCron = () => {
  cron.schedule('* * * * *', () => {
    console.log('[Guardian Cron] Running expired session check...');
    checkExpiredSessions();
  });

  console.log('✅ Guardian Timer cron job started (checks every minute)');
};

module.exports = { startGuardianCron };
