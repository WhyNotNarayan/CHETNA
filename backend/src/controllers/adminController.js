const prisma = require('../lib/prisma');

// Function to calculate risk level based on case count
// 0-10: 1 (Green)
// 11-20: 2 (Orange)
// 21+: 3 (Red)
const calculateRiskLevel = (count) => {
  if (count <= 10) return 1;
  if (count <= 20) return 2;
  return 3;
};

exports.addRedZone = async (req, res) => {
  try {
    const { 
      name, latitude, longitude, 
      destLatitude, destLongitude, 
      pathData,
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
        pathData: pathData || null,
        riskLevel: calculateRiskLevel(parseInt(caseCount) || 0),
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

exports.getPendingSecretCops = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'BOY',
        isVerified: false,
        profession: { not: null }
      }
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('CRITICAL ERROR [getPendingSecretCops]:', error);
    res.status(500).json({ success: false, message: 'Server Error: Check User table schema', error: error.message });
  }
};

exports.verifySecretCop = async (req, res) => {
  try {
    const { userId, action } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: action === 'approve' }
    });
    res.json({ success: true, message: `User ${action === 'approve' ? 'verified' : 'rejected'}` });
  } catch (error) {
    console.error('CRITICAL ERROR [verifySecretCop]:', error);
    res.status(500).json({ success: false, message: 'Server Error: Verify User failed', error: error.message });
  }
};

exports.getIntelRequests = async (req, res) => {
  try {
    const requests = await prisma.hazardSuggestion.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            address: true,
            level: true,
            awards: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, requests });
  } catch (error) {
    console.error('CRITICAL ERROR [getIntelRequests]:', error);
    res.status(500).json({ success: false, message: 'Server Error: Check HazardSuggestion schema', error: error.message });
  }
};

exports.verifyIntel = async (req, res) => {
  try {
    const { reportId, action } = req.body;

    const report = await prisma.hazardSuggestion.findUnique({
      where: { id: reportId },
      include: { user: true }
    });

    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (action === 'approve') {
      // 1. Mark report as APPROVED
      await prisma.hazardSuggestion.update({
        where: { id: reportId },
        data: { status: 'APPROVED' }
      });

      // 2. Create a live RedZone with correctly calculated risk level
      await prisma.redZone.create({
        data: {
          name: report.name,
          latitude: report.latitude,
          longitude: report.longitude,
          destLatitude: report.destLatitude,
          destLongitude: report.destLongitude,
          pathData: report.pathData,
          startTime: report.startTime,
          endTime: report.endTime,
          type: report.type,
          description: report.description,
          riskLevel: calculateRiskLevel(report.caseCount || 0),
          caseCount: report.caseCount || 0,
          isVerified: true
        }
      });

      // 3. User Level UP + Award UP
      await prisma.user.update({
        where: { id: report.userId },
        data: {
          level: { increment: 1 },
          awards: { increment: 1 }
        }
      });

    } else if (action === 'reject') {
      // 1. Mark as REJECTED
      await prisma.hazardSuggestion.update({
        where: { id: reportId },
        data: { status: 'REJECTED' }
      });

      // 2. User Level DOWN (Min level 1)
      if (report.user && report.user.level > 1) {
        await prisma.user.update({
          where: { id: report.userId },
          data: { level: { decrement: 1 } }
        });
      }
    }

    res.json({ success: true, message: `Report ${action}d successfully` });
  } catch (error) {
    console.error('Verify Intel Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process verification' });
  }
};
