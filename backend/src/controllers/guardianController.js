const prisma = require('../lib/prisma');

exports.startSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { zoneId, entryTime, expectedExitTime, alertTime } = req.body;

    if (!zoneId) {
      return res.status(400).json({ success: false, message: 'zoneId is required' });
    }

    const zone = await prisma.redZone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    const existingActive = await prisma.guardianTimerSession.findFirst({
      where: { userId, status: 'ACTIVE' }
    });

    if (existingActive) {
      await prisma.guardianTimerSession.update({
        where: { id: existingActive.id },
        data: { status: 'COMPLETED' }
      });
    }

    const session = await prisma.guardianTimerSession.create({
      data: {
        userId,
        zoneId,
        entryTime: new Date(entryTime),
        expectedExitTime: new Date(expectedExitTime),
        alertTime: new Date(alertTime),
        status: 'ACTIVE',
      }
    });

    console.log(`[Guardian] Session started for user ${userId} in zone ${zone.name}`);

    res.status(201).json({
      success: true,
      sessionId: session.id,
      entryTime: session.entryTime,
      expectedExitTime: session.expectedExitTime,
      alertTime: session.alertTime,
    });
  } catch (error) {
    console.error('[Guardian] Start session error:', error);
    res.status(500).json({ success: false, message: 'Failed to start guardian session' });
  }
};

exports.completeSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const session = await prisma.guardianTimerSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    await prisma.guardianTimerSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' }
    });

    console.log(`[Guardian] Session completed: ${sessionId}`);

    res.json({ success: true, message: 'Guardian session completed' });
  } catch (error) {
    console.error('[Guardian] Complete session error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete guardian session' });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await prisma.guardianTimerSession.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { zone: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('[Guardian] Get active sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get active sessions' });
  }
};

exports.checkExpiredSessions = async () => {
  try {
    const now = new Date();

    const expiredSessions = await prisma.guardianTimerSession.findMany({
      where: {
        status: 'ACTIVE',
        alertTime: { lte: now }
      },
      include: {
        user: true,
        zone: true
      }
    });

    for (const session of expiredSessions) {
      await prisma.guardianTimerSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' }
      });

      console.log(`[Guardian Cron] Session expired: ${session.id} (user: ${session.user.fullName})`);

      if (session.user.contacts && session.user.contacts.length > 0) {
        const { sendParentAlert } = require('../utils/pushNotification');

        for (const contact of session.user.contacts) {
          try {
            const parentUser = await prisma.user.findUnique({ where: { phone: contact.phone } });
            if (parentUser && parentUser.pushToken) {
              await sendParentAlert(
                parentUser.pushToken,
                session.user.fullName,
                'GUARDIAN',
                { zoneName: session.zone.name, sessionId: session.id }
              );
              console.log(`[Guardian Cron] Parent notified: ${contact.name}`);
            }
          } catch (pushError) {
            console.error('[Guardian Cron] Push notification error:', pushError.message);
          }
        }
      }
    }

    const cleanupTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await prisma.guardianTimerSession.deleteMany({
      where: {
        status: { in: ['COMPLETED', 'EXPIRED'] },
        createdAt: { lt: cleanupTime }
      }
    });

    return expiredSessions.length;
  } catch (error) {
    console.error('[Guardian Cron] Check expired sessions error:', error);
    return 0;
  }
};
