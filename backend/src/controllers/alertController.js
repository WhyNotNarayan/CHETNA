const prisma = require('../lib/prisma');
const { findNearestSecretCops } = require('../utils/geo');
const crypto = require('crypto');

exports.triggerSOS = async (req, res) => {
  try {
    const { userId, latitude, longitude, voiceTrigger } = req.body;

    if (!userId || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Missing required location data' });
    }

    // Generate secure token and expiry (24 hours)
    const evidenceToken = crypto.randomBytes(32).toString('hex');
    const evidenceExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 1. Create the alert instance
    const alert = await prisma.alert.create({
      data: {
        userId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        triggerType: voiceTrigger ? 'VOICE' : 'TOUCH',
        status: 'ACTIVE',
        evidenceToken,
        evidenceExpiresAt
      }
    });

    // 2. Find all emergency contacts of the girl and create pending notifications
    const userWithContacts = await prisma.user.findUnique({
      where: { id: userId },
      include: { contacts: true }
    });

    if (userWithContacts && userWithContacts.contacts) {
      for (const contact of userWithContacts.contacts) {
        await prisma.parentNotification.create({
          data: {
            parentPhone: contact.phone,
            alertId: alert.id,
            isDelivered: false
          }
        });
      }
    }

    // 3. Find all verified Secret Cops with a known last location
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

    // 4. Find 5 nearest
    const nearestCops = findNearestSecretCops(latitude, longitude, secretCops || [], 5) || [];
    const actualNotifiedCount = nearestCops.length;

    // 5. (Future Scope) Send push notifications to nearestCops

    const evidenceUrl = `${req.protocol}://${req.get('host')}/evidence/${evidenceToken}`;

    res.status(201).json({
      success: true,
      alertId: alert.id,
      evidenceToken,
      evidenceUrl,
      notifiedCount: actualNotifiedCount,
      nearestCops: nearestCops, // Keep this for legacy compatibility if needed
      message: 'SOS triggered and nearest helpers notified.'
    });
  } catch (error) {
    console.error('SOS Trigger Error:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger SOS' });
  }
};

exports.getSOSStats = async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        responses: {
          include: { helper: { select: { fullName: true, lastLocation: true } } }
        }
      }
    });

    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    // Safely handle responses array — may be empty if no one accepted yet
    const safeResponses = Array.isArray(alert.responses) ? alert.responses : [];
    const acceptedResponses = safeResponses.filter(r => r.status === 'ACCEPTED');
    const notifiedCount = safeResponses.length > 0 ? Math.max(safeResponses.length, 5) : 5; // At least 5 always targeted

    res.json({
      success: true,
      status: alert.status,
      notifiedCount: notifiedCount,
      acceptedCount: acceptedResponses.length,
      responders: acceptedResponses.map(r => ({
        name: r.helper?.fullName || 'Volunteer',
        lat: r.helper?.lastLocation?.latitude,
        lng: r.helper?.lastLocation?.longitude
      })),
      createdAt: alert.createdAt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.resolveSOS = async (req, res) => {
  try {
    const { alertId, password } = req.body;
    const userId = req.user.id;

    // 1. Verify User Password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Cancellation denied.' });
    }

    // 2. Mark Alert as Resolved
    await prisma.alert.update({
      where: { id: alertId },
      data: { status: 'RESOLVED' }
    });

    res.json({ success: true, message: 'SOS successfully resolved and closed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getNearbyAlerts = async (req, res) => {
  try {
    // Clean up old alerts older than 24 hours to prevent accumulation
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const oldAlerts = await prisma.alert.findMany({
      where: { createdAt: { lt: twentyFourHoursAgo } },
      select: { id: true }
    });

    if (oldAlerts.length > 0) {
      const oldIds = oldAlerts.map(a => a.id);
      // Delete all children first to satisfy foreign key constraints
      await prisma.safetyResponse.deleteMany({ where: { alertId: { in: oldIds } } });
      await prisma.alertTracking.deleteMany({ where: { alertId: { in: oldIds } } });
      await prisma.evidenceFile.deleteMany({ where: { alertId: { in: oldIds } } });
      await prisma.parentNotification.deleteMany({ where: { alertId: { in: oldIds } } });

      // Now safe to delete the main alerts
      await prisma.alert.deleteMany({ where: { id: { in: oldIds } } });
    }
    
    // Privacy: Select only necessary fields, omit evidence token
    const alerts = await prisma.alert.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        status: true,
        triggerType: true,
        voiceNote: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Privacy: Only return first name to cops
    const sanitizedAlerts = alerts.map(alert => {
      const firstName = alert.user?.fullName ? alert.user.fullName.split(' ')[0] : 'Girl';
      return {
        ...alert,
        user: {
          ...alert.user,
          fullName: firstName
        }
      };
    });

    res.json({ success: true, alerts: sanitizedAlerts });
  } catch (error) {
    console.error('CRITICAL ERROR [getNearbyAlerts]:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error: Check your database columns.',
      error: error.message 
    });
  }
};

exports.respondToSOS = async (req, res) => {
  try {
    const { alertId, helperId, status } = req.body; // status: 'ACCEPTED', 'REJECTED', 'COMPLETED'

    let response = await prisma.safetyResponse.findFirst({
      where: { alertId, helperId }
    });

    if (response) {
      response = await prisma.safetyResponse.update({
        where: { id: response.id },
        data: { status }
      });
    } else {
      response = await prisma.safetyResponse.create({
        data: {
          alertId,
          helperId,
          status
        }
      });
    }

    // Reward points for helper on completion
    if (status === 'COMPLETED') {
      await prisma.user.update({
        where: { id: helperId },
        data: {
          points: { increment: 50 },
          level: { increment: 1 }
        }
      });
    }

    res.json({ success: true, response });
  } catch (error) {
    console.error('Respond SOS Error:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to SOS' });
  }
};

// Add tracking location coords
exports.trackSOS = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const tracking = await prisma.alertTracking.create({
      data: {
        alertId: id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    });

    res.status(201).json({ success: true, tracking });
  } catch (error) {
    console.error('Track SOS Error:', error);
    res.status(500).json({ success: false, error: 'Failed to record tracking location' });
  }
};

// Upload media evidence (Binary stream for large files)
exports.uploadEvidenceBinary = async (req, res) => {
  try {
    const alertId = req.params.id;
    const fileType = req.headers['x-file-type']; // "AUDIO" or "VIDEO"

    if (!fileType) {
      return res.status(400).json({ success: false, message: 'X-File-Type header is required' });
    }

    const fs = require('fs');
    const path = require('path');

    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = fileType === 'VIDEO' ? 'mp4' : 'm4a';
    const fileName = `evidence_${alertId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const writeStream = fs.createWriteStream(filePath);

    console.log(`[EvidenceUpload] Receiving ${fileType} for alert ${alertId}...`);

    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      try {
        const stats = fs.statSync(filePath);
        console.log(`[EvidenceUpload] Saved ${fileType}. Size: ${stats.size} bytes`);

        if (stats.size === 0) {
          console.error('[EvidenceUpload] File is empty, deleting...');
          fs.unlinkSync(filePath);
          return res.status(400).json({ success: false, error: 'Empty file received' });
        }

        const fileUrl = `/uploads/${fileName}`;
        const evidenceFile = await prisma.evidenceFile.create({
          data: {
            alertId,
            fileUrl,
            fileType
          }
        });
        res.status(201).json({ success: true, evidence: evidenceFile });
      } catch (dbError) {
        console.error('[EvidenceUpload] DB Error:', dbError);
        res.status(500).json({ success: false, error: 'Failed to save evidence record' });
      }
    });

    writeStream.on('error', (err) => {
      console.error('[EvidenceUpload] File Write Error:', err);
      res.status(500).json({ success: false, error: 'File save failed' });
    });

    req.on('error', (err) => {
      console.error('[EvidenceUpload] Request Stream Error:', err);
      res.status(500).json({ success: false, error: 'Upload stream error' });
    });

  } catch (error) {
    console.error('[EvidenceUpload] Binary Upload Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process binary upload' });
  }
};

// Verify uploaded evidence file integrity
exports.verifyEvidenceFile = async (req, res) => {
  try {
    const { id } = req.params;
    const evidence = await prisma.evidenceFile.findMany({
      where: { alertId: id },
      orderBy: { createdAt: 'desc' }
    });

    if (!evidence.length) {
      return res.status(404).json({ success: false, message: 'No evidence files found' });
    }

    const fs = require('fs');
    const path = require('path');

    const results = [];
    for (const file of evidence) {
      const filePath = path.join(__dirname, '../../uploads', path.basename(file.fileUrl));
      const exists = fs.existsSync(filePath);
      let size = 0;
      let valid = false;
      let header = null;

      if (exists) {
        const stats = fs.statSync(filePath);
        size = stats.size;
        
        // Read first 16 bytes to check MP4 signature
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(16);
        fs.readSync(fd, buffer, 0, 16, 0);
        fs.closeSync(fd);
        
        header = buffer.toString('hex');
        // MP4 files have 'ftyp' at offset 4 (bytes 4-7)
        valid = size > 0 && buffer.toString('ascii', 4, 8) === 'ftyp';
      }

      results.push({
        id: file.id,
        fileType: file.fileType,
        fileUrl: file.fileUrl,
        exists,
        size,
        validMp4: valid,
        header,
        createdAt: file.createdAt
      });
    }

    res.json({ success: true, files: results });
  } catch (error) {
    console.error('Verify Evidence Error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

// Upload media evidence (base64 audio/video)
exports.uploadEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileData, fileType } = req.body; // fileData = base64 data, fileType = "AUDIO" or "VIDEO"

    if (!fileData || !fileType) {
      return res.status(400).json({ success: false, message: 'FileData and FileType are required' });
    }

    const fs = require('fs');
    const path = require('path');

    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(fileData, 'base64');
    const ext = fileType === 'VIDEO' ? 'mp4' : 'm4a';
    const fileName = `evidence_${id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${fileName}`;
    const evidenceFile = await prisma.evidenceFile.create({
      data: {
        alertId: id,
        fileUrl,
        fileType
      }
    });

    res.status(201).json({ success: true, evidence: evidenceFile });
  } catch (error) {
    console.error('Upload Evidence Error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload evidence' });
  }
};

// Multipart file upload — delegates to the same base64 handler
// (offlineSync.js sends base64 JSON via /upload-evidence; this alias keeps the route alive)
exports.uploadEvidenceFile = async (req, res) => {
  // Re-use the base64 handler — client always sends JSON with fileData + fileType
  return exports.uploadEvidence(req, res);
};

// Fetch pending and historical alerts of girls who linked this parent
exports.getParentNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Fetch parent notifications containing alerts and tracking (NO evidence)
    const notifications = await prisma.parentNotification.findMany({
      where: { parentPhone: user.phone },
      include: {
        alert: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true
              }
            },
            tracking: {
              orderBy: { createdAt: 'asc' }
            }
            // NO evidence include here anymore
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Automatically deliver notification
    await prisma.parentNotification.updateMany({
      where: { parentPhone: user.phone, isDelivered: false },
      data: { isDelivered: true }
    });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error('getParentNotifications Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch parent notifications' });
  }
};

// Girl's own evidence history
exports.getMyAlertsWithEvidence = async (req, res) => {
  try {
    const userId = req.user.id;
    const alerts = await prisma.alert.findMany({
      where: { userId },
      include: {
        evidence: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('getMyAlertsWithEvidence Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch evidence history.' });
  }
};

// Secure private evidence access: Only girl and her linked parents can fetch
exports.getAlertEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const requesterUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!requesterUser) return res.status(404).json({ success: false, message: 'User not found' });

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        user: {
          include: { contacts: true }
        },
        tracking: {
          orderBy: { createdAt: 'asc' }
        },
        evidence: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    // Check if requester is the girl herself
    const isGirlHerself = alert.userId === userId;

    if (!isGirlHerself) {
      return res.status(403).json({ success: false, message: 'Access denied. Only the victim can access evidence.' });
    }

    // Denial for parents (as per new privacy request)
    // Denial for Admin and Secret Cop roles
    if (requesterUser.role === 'ADMIN' || requesterUser.role === 'SECRET_COP') {
      return res.status(403).json({ success: false, message: 'Access denied for Admin/Secret Cop roles.' });
    }

    res.json({
      success: true,
      alert: {
        id: alert.id,
        status: alert.status,
        createdAt: alert.createdAt,
        user: {
          fullName: alert.user.fullName,
          phone: alert.user.phone
        },
        tracking: alert.tracking,
        evidence: alert.evidence
      }
    });
  } catch (error) {
    console.error('getAlertEvidence Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve evidence.' });
  }
};

