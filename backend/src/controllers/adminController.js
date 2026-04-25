const prisma = require('../lib/prisma');

// Function to calculate risk level based on case count
// 1-10: 1 (Green)
// 11-20: 2 (Yellow)
// 21-30: 3 (Orange)
// 31-40: 4 (Light Red)
// 41+: 5 (Dark Red)
const calculateRiskLevel = (count) => {
  if (count <= 10) return 1;
  if (count <= 20) return 2;
  if (count <= 30) return 3;
  if (count <= 40) return 4;
  return 5;
};

exports.addRedZone = async (req, res) => {
  try {
    const { 
      name, latitude, longitude, 
      destLatitude, destLongitude, 
      riskLevel, caseCount, crimeType, 
      description, startTime, endTime, radius 
    } = req.body;

    const redZone = await prisma.redZone.create({
      data: {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        destLatitude: destLatitude ? parseFloat(destLatitude) : null,
        destLongitude: destLongitude ? parseFloat(destLongitude) : null,
        riskLevel: riskLevel || calculateRiskLevel(caseCount || 0),
        caseCount: parseInt(caseCount) || 0,
        crimeType,
        description,
        startTime,
        endTime,
        radius: parseFloat(radius) || 500
      }
    });

    res.status(201).json({ success: true, redZone });
  } catch (error) {
    console.error('Add Red Zone Error:', error);
    res.status(500).json({ success: false, error: 'Failed to add red zone' });
  }
};

exports.getRedZones = async (req, res) => {
  try {
    const zones = await prisma.redZone.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, zones });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch zones' });
  }
};

exports.deleteRedZone = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.redZone.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
};

// Analytics Data
// Get Analytics for Admin Dashboard
exports.getAnalytics = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const redZonesCount = await prisma.redZone.count();
    
    // For now, these are 0 since SOS system isn't live yet
    const totalSOS = 0;
    const activeSOS = 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalSOS,
        activeSOS,
        redZonesCount
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};
