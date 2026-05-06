const prisma = require('../lib/prisma');
const { findNearestSecretCops } = require('../utils/geo');

exports.triggerSOS = async (req, res) => {
  try {
    const { userId, latitude, longitude, voiceTrigger } = req.body;

    // 1. Create the alert instance
    const alert = await prisma.alert.create({
      data: {
        userId,
        latitude,
        longitude,
        voiceTrigger,
        status: 'ACTIVE'
      }
    });

    // 2. Find all verified Secret Cops with a known last location
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

    // 3. Find 5 nearest
    const nearestCops = findNearestSecretCops(latitude, longitude, secretCops, 5);

    // 4. (Future Scope) Send push notifications to nearestCops
    // For now, we return them in the response for debugging
    
    res.status(201).json({
      success: true,
      alertId: alert.id,
      nearestCops: nearestCops.map(c => ({ id: c.id, name: c.fullName, distance: c.distance })),
      message: 'SOS triggered and nearest helpers notified.'
    });
  } catch (error) {
    console.error('SOS Trigger Error:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger SOS' });
  }
};

exports.getNearbyAlerts = async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { status: 'ACTIVE' },
      include: { 
        user: {
          select: { fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('CRITICAL ERROR [getNearbyAlerts]:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error: Check your database columns.',
      error: error.message 
    });
  }
};
