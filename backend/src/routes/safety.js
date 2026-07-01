const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

const { protect } = require('../middleware/auth');

// UPDATE LIVE LOCATION (UPSERT)
router.post('/update-location', protect, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    // UPSERT: Create if doesn't exist, update if it does.
    // This ensures only the LATEST location is stored per user.
    await prisma.location.upsert({
      where: { userId },
      update: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        updatedAt: new Date(),
      },
      create: {
        userId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
    });

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error('Location Update Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all red zones
router.get('/red-zones', async (req, res) => {
  try {
    const zones = await prisma.redZone.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, zones });
  } catch (error) {
    console.error('Failed to get red-zones:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch red zones' });
  }
});

// Submit a danger road / unsafe area suggestion
router.post('/suggest-hazard', async (req, res) => {
  try {
    const { 
      userId, name, latitude, longitude, 
      destLatitude, destLongitude, pathData, 
      startTime, endTime, type, description, caseCount 
    } = req.body;

    const suggestion = await prisma.hazardSuggestion.create({
      data: {
        userId,
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        destLatitude: destLatitude ? parseFloat(destLatitude) : null,
        destLongitude: destLongitude ? parseFloat(destLongitude) : null,
        pathData: pathData ? JSON.stringify(pathData) : null,
        startTime,
        endTime,
        type,
        description,
        caseCount: parseInt(caseCount) || 0,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, message: 'Hazard suggestion submitted successfully!', suggestion });
  } catch (error) {
    console.error('Failed to suggest hazard:', error);
    res.status(500).json({ success: false, error: 'Failed to submit unsafe road suggestion' });
  }
});

module.exports = router;
